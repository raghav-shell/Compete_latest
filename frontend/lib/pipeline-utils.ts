import type { CurrentAgent, PipelineStatus } from "@/lib/types"

export const AGENT_IDS = ["scout", "signal", "analyst", "report", "notifier"] as const

const AGENT_INDEX: Record<string, number> = {
  scout: 0,
  signal: 1,
  analyst: 2,
  report: 3,
  notifier: 4,
  done: 5,
}

export function agentToIndex(agent: string | undefined): number {
  if (!agent) return -1
  return AGENT_INDEX[agent.toLowerCase()] ?? -1
}

export function getActiveAgentIndex(
  currentAgent: string,
  status: PipelineStatus,
): number {
  if (status === "completed") return AGENT_IDS.length
  if (status === "failed") return agentToIndex(currentAgent)
  if (status === "idle") return -1
  return agentToIndex(currentAgent)
}

export type AgentPillState = "pending" | "running" | "done" | "failed"

export function getAgentPillState(
  index: number,
  activeIndex: number,
  status: PipelineStatus,
): AgentPillState {
  if (status === "failed" && index === activeIndex) return "failed"
  if (status === "completed" || index < activeIndex) return "done"
  if (status === "running" && index === activeIndex) return "running"
  return "pending"
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "No runs yet"

  const date = new Date(iso)
  if (isNaN(date.getTime())) return "No runs yet"

  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)

  if (diffSec < 60) return "Just now"
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatRunTimestamp(iso: string | null | undefined): string {
  if (!iso) return "Unknown time"
  const date = new Date(iso)
  if (isNaN(date.getTime())) return "Unknown time"

  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  if (isToday) return `Today, ${time}`
  if (isYesterday) return `Yesterday, ${time}`
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function isPipelineActive(status: PipelineStatus): boolean {
  return status === "running"
}

export function shouldPollStatus(status: PipelineStatus): boolean {
  return status === "running"
}
