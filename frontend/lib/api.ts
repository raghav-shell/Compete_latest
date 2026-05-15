import type {
  CompetitorCard,
  CompetitorDetails,
  RunHistoryItem,
  RunResponse,
  StatusResponse,
  TrackedCompetitor,
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

// ---------------------------------------------------------------------------
// Tracked competitors CRUD
// ---------------------------------------------------------------------------

/** GET /tracked-competitors */
export async function fetchTrackedCompetitors(): Promise<TrackedCompetitor[]> {
  return request<TrackedCompetitor[]>("/tracked-competitors")
}

/** POST /tracked-competitors */
export async function addCompetitor(domain: string): Promise<TrackedCompetitor> {
  return request<TrackedCompetitor>("/tracked-competitors", {
    method: "POST",
    body: JSON.stringify({ domain }),
  })
}

/** DELETE /tracked-competitors/:domain */
export async function removeCompetitor(domain: string): Promise<void> {
  await request(`/tracked-competitors/${encodeURIComponent(domain)}`, {
    method: "DELETE",
  })
}

// ---------------------------------------------------------------------------
// Competitor deep dive
// ---------------------------------------------------------------------------

/** GET /competitors/:domain/details */
export async function fetchCompetitorDetails(
  domain: string,
): Promise<CompetitorDetails> {
  return request<CompetitorDetails>(
    `/competitors/${encodeURIComponent(domain)}/details`,
  )
}

// ---------------------------------------------------------------------------
// Server-Sent Events
// ---------------------------------------------------------------------------

export interface SSEEvent {
  type: string
  data: Record<string, unknown>
}

/**
 * Subscribe to SSE pipeline events. Returns a cleanup function.
 */
export function subscribeToEvents(
  onMessage: (event: SSEEvent) => void,
  onError?: () => void,
): () => void {
  const url = `${API_BASE}/events`
  const eventSource = new EventSource(url)

  eventSource.onmessage = (e) => {
    try {
      const parsed = JSON.parse(e.data) as SSEEvent
      onMessage(parsed)
    } catch {
      // ignore malformed
    }
  }

  eventSource.onerror = () => {
    onError?.()
  }

  return () => eventSource.close()
}

// Legacy aliases
export const fetchPipelineStatus = fetchStatus
export const fetchRunHistory = fetchRuns
export const triggerPipeline = startRun

export { DEFAULT_COMPETITORS, ApiError }


// ---------------------------------------------------------------------------
// User Integration Settings
// ---------------------------------------------------------------------------

export interface SettingValue {
  value: string
  source: "user" | "default" | "none"
  configured: boolean
}

export interface SettingsResponse {
  slack_webhook_url: SettingValue
  omium_api_key: SettingValue
}

export async function fetchSettings(): Promise<SettingsResponse> {
  return request<SettingsResponse>("/settings")
}

export async function updateSettings(body: {
  slack_webhook_url?: string
  omium_api_key?: string
}): Promise<{ status: string; fields: string }> {
  return request("/settings", {
    method: "PUT",
    body: JSON.stringify(body),
  })
}

export async function testSlackConnection(): Promise<{ status: string; message: string }> {
  return request("/settings/test-slack", { method: "POST" })
}
