"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { toast } from "sonner"

import {
  ApiError,
  addCompetitor as apiAddCompetitor,
  removeCompetitor as apiRemoveCompetitor,
  checkBackendHealth,
  fetchCompetitors,
  fetchRuns,
  fetchStatus,
  fetchTrackedCompetitors,
  getApiBaseUrl,
  startRun,
  subscribeToEvents,
  type SSEEvent,
} from "@/lib/api"
import { shouldPollStatus } from "@/lib/pipeline-utils"
import type { CompetitorCard, RunHistoryItem, StatusResponse, TrackedCompetitor } from "@/lib/types"

interface PipelineContextValue {
  status: StatusResponse | null
  competitors: CompetitorCard[]
  runs: RunHistoryItem[]
  trackedCompetitors: TrackedCompetitor[]
  isConnected: boolean
  isLoading: boolean
  isTriggering: boolean
  error: string | null
  refresh: () => Promise<void>
  triggerAnalysis: () => Promise<void>
  addCompetitor: (domain: string) => Promise<void>
  removeCompetitor: (domain: string) => Promise<void>
  apiBaseUrl: string
}

const PipelineContext = createContext<PipelineContextValue | null>(null)

const IDLE_POLL_MS = 15_000
const RUNNING_POLL_MS = 2_000

export function PipelineProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [competitors, setCompetitors] = useState<CompetitorCard[]>([])
  const [runs, setRuns] = useState<RunHistoryItem[]>([])
  const [trackedCompetitors, setTrackedCompetitors] = useState<TrackedCompetitor[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isTriggering, setIsTriggering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const prevStatus = useRef<string | null>(null)

  const refresh = useCallback(async () => {
    const healthy = await checkBackendHealth()
    setIsConnected(healthy)

    if (!healthy) {
      setStatus(null)
      setError("Cannot reach backend. Start the API on port 8000.")
      setIsLoading(false)
      return
    }

    try {
      const [nextStatus, nextCompetitors, nextRuns, nextTracked] = await Promise.all([
        fetchStatus(),
        fetchCompetitors(),
        fetchRuns(),
        fetchTrackedCompetitors(),
      ])
      setStatus(nextStatus)
      setCompetitors(nextCompetitors)
      setRuns(nextRuns)
      setTrackedCompetitors(nextTracked)
      setError(null)
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to load dashboard data"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const triggerAnalysis = useCallback(async () => {
    if (!isConnected) {
      toast.error("Backend offline", {
        description: `Start the API at ${getApiBaseUrl()}`,
      })
      return
    }

    if (status?.status === "running") {
      toast.message("Pipeline already running")
      return
    }

    setIsTriggering(true)
    try {
      const response = await startRun()
      toast.success("Analysis started", {
        description: `Run ${response.run_id.slice(0, 8)}…`,
      })
      await refresh()
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to start pipeline"
      toast.error("Could not start analysis", { description: message })
    } finally {
      setIsTriggering(false)
    }
  }, [isConnected, refresh, status?.status])

  const addCompetitor = useCallback(async (domain: string) => {
    try {
      await apiAddCompetitor(domain)
      toast.success(`Added ${domain}`)
      await refresh()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to add competitor"
      toast.error("Could not add competitor", { description: message })
    }
  }, [refresh])

  const removeCompetitor = useCallback(async (domain: string) => {
    try {
      await apiRemoveCompetitor(domain)
      toast.success(`Removed ${domain}`)
      await refresh()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to remove competitor"
      toast.error("Could not remove competitor", { description: message })
    }
  }, [refresh])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // SSE for real-time updates during pipeline runs
  useEffect(() => {
    if (!isConnected) return

    const cleanup = subscribeToEvents(
      (event: SSEEvent) => {
        if (event.type === "snapshot" || event.type === "state_update") {
          const d = event.data
          if (d.key === "status" || event.type === "snapshot") {
            const newStatus = (d.status ?? d.value) as string
            setStatus((prev) => {
              if (!prev) return prev
              return { ...prev, status: newStatus as StatusResponse["status"] }
            })
            // When status transitions to completed/failed, do a full refresh
            if (newStatus === "completed" || newStatus === "failed") {
              setTimeout(() => void refresh(), 500)
            }
          }
          if (d.key === "progress") {
            setStatus((prev) => prev ? { ...prev, progress: d.value as number } : prev)
          }
          if (d.key === "current_agent") {
            setStatus((prev) => prev ? { ...prev, current_agent: d.value as string } : prev)
          }
          if (d.key === "current_step") {
            setStatus((prev) => prev ? { ...prev, current_step: d.value as string } : prev)
          }
        }
      },
      () => {
        // SSE disconnected — fall back to polling
      },
    )

    return cleanup
  }, [isConnected, refresh])

  // Polling fallback (slower interval, SSE handles real-time)
  useEffect(() => {
    const ms = status && shouldPollStatus(status.status) ? RUNNING_POLL_MS : IDLE_POLL_MS
    const interval = setInterval(() => void refresh(), ms)
    return () => clearInterval(interval)
  }, [refresh, status?.status])

  useEffect(() => {
    const current = status?.status ?? null
    if (
      prevStatus.current === "running" &&
      (current === "completed" || current === "failed")
    ) {
      void refresh()
      if (current === "completed") {
        toast.success("Pipeline complete")
      } else {
        toast.error("Pipeline failed", {
          description: status?.error_message ?? undefined,
        })
      }
    }
    prevStatus.current = current
  }, [refresh, status?.error_message, status?.status])

  const value = useMemo(
    () => ({
      status,
      competitors,
      runs,
      trackedCompetitors,
      isConnected,
      isLoading,
      isTriggering,
      error,
      refresh,
      triggerAnalysis,
      addCompetitor,
      removeCompetitor,
      apiBaseUrl: getApiBaseUrl(),
    }),
    [
      status,
      competitors,
      runs,
      trackedCompetitors,
      isConnected,
      isLoading,
      isTriggering,
      error,
      refresh,
      triggerAnalysis,
      addCompetitor,
      removeCompetitor,
    ],
  )

  return (
    <PipelineContext.Provider value={value}>{children}</PipelineContext.Provider>
  )
}

export function usePipeline() {
  const context = useContext(PipelineContext)
  if (!context) {
    throw new Error("usePipeline must be used within PipelineProvider")
  }
  return context
}

