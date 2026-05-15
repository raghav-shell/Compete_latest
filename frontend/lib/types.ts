/** Spec-aligned API types for CompeteIQ dashboard */

export type PipelineStatus = "idle" | "running" | "completed" | "failed"

export type CurrentAgent =
  | "scout"
  | "signal"
  | "analyst"
  | "evaluator"
  | "report"
  | "notifier"
  | "done"

export interface StatusResponse {
  status: PipelineStatus
  current_agent: CurrentAgent | string
  run_id: string | null
  started_at: string | null
  competitors: string[]
  progress?: number
  error_message?: string | null
}

export interface CompetitorCard {
  name: string
  url: string
  signals_count: number
  top_insight: string
  severity: "high" | "medium" | "low"
  notion_url: string | null
  last_run: string | null
}

export interface RunHistoryItem {
  id: string
  date: string
  competitors_count: number
  signals_found: number
  status: string
  notion_url: string | null
  slack_message: string | null
}

export interface RunResponse {
  status: string
  run_id: string
}

/** @deprecated Legacy — use StatusResponse */
export interface PipelineStatusResponse extends StatusResponse {
  current_step?: string
  last_run?: string | null
  last_run_result?: LastRunResult | null
}

export interface LastRunResult {
  run_id?: string
  status?: string
  competitors?: string[]
  raw_data?: Record<string, string>
  signals?: Record<string, string[]>
  analysis?: Record<string, string>
  report_urls?: Record<string, string>
  slack_sent?: boolean
  errors?: string[]
}

/** Tracked competitor from DB */
export interface TrackedCompetitor {
  domain: string
  display_name: string
  added_at: string | null
}

/** Full detail view for a single competitor */
export interface CompetitorDetails {
  domain: string
  raw_data: Record<string, unknown>
  signals: Array<Record<string, unknown>>
  analysis: Record<string, unknown>
  notion_url: string | null
}
