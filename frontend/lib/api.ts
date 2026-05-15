import type {
  CompetitorCard,
  RunHistoryItem,
  RunResponse,
  StatusResponse,
} from "@/lib/types"

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "/api-backend"

const DEFAULT_COMPETITORS = ["linear.app", "notion.so", "vercel.com"]

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  })

  if (!response.ok) {
    let detail = response.statusText
    try {
      const body = await response.json()
      const raw = body.detail ?? body.message
      detail = typeof raw === "string" ? raw : JSON.stringify(raw) ?? detail
    } catch {
      // ignore
    }
    throw new ApiError(detail, response.status)
  }

  return response.json() as Promise<T>
}

export function getApiBaseUrl(): string {
  return API_BASE
}

/** GET /status — poll every 2s while running */
export async function fetchStatus(): Promise<StatusResponse> {
  return request<StatusResponse>("/status")
}

/** GET /competitors — competitor intelligence cards */
export async function fetchCompetitors(): Promise<CompetitorCard[]> {
  return request<CompetitorCard[]>("/competitors")
}

/** GET /runs — last 10 runs */
export async function fetchRuns(): Promise<RunHistoryItem[]> {
  return request<RunHistoryItem[]>("/runs")
}

/** POST /run — trigger pipeline */
export async function startRun(
  competitors?: string[],
): Promise<RunResponse> {
  return request<RunResponse>("/run", {
    method: "POST",
    body: JSON.stringify(
      competitors?.length ? { competitors } : {},
    ),
  })
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`, { cache: "no-store" })
    return response.ok
  } catch {
    return false
  }
}

// Legacy aliases
export const fetchPipelineStatus = fetchStatus
export const fetchRunHistory = fetchRuns
export const triggerPipeline = startRun

export { DEFAULT_COMPETITORS, ApiError }
