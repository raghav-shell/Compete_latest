"use client"

import { motion } from "framer-motion"
import { Hash, ExternalLink } from "lucide-react"
import { usePipeline } from "@/providers/pipeline-provider"
import { formatRelativeTime } from "@/lib/pipeline-utils"

export function SlackPreview() {
  const { runs, status } = usePipeline()
  const latest = runs[0]
  const rawSummary =
    latest?.slack_message ||
    (status?.status === "running"
      ? "Pipeline running — Slack digest will post when the Notifier agent completes."
      : "Run analysis to post a competitive intelligence digest to Slack.")

  const summary = rawSummary.replace(/https?:\/\/[^\s]+/g, (urlMatch) => {
    const cleanUrl = urlMatch.replace(/[:.,;]+$/, "")
    const trailing = urlMatch.slice(cleanUrl.length)
    try {
      const hostname = new URL(cleanUrl).hostname.replace(/^www\./, "")
      // Optionally Capitalize the first letter for a cleaner look
      const name = hostname.split('.')[0]
      const capitalized = name.charAt(0).toUpperCase() + name.slice(1)
      return capitalized + trailing
    } catch {
      return urlMatch
    }
  })

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
      className="relative rounded-[1.5rem] p-6 overflow-hidden h-full"
      style={{
        background: "linear-gradient(145deg, oklch(0.995 0.005 280 / 0.9) 0%, oklch(0.99 0.008 270 / 0.85) 100%)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid oklch(0.93 0.025 280 / 0.5)",
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #4A154B, #611f69)" }}
          >
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52z" />
            </svg>
          </div>
          <div>
            <span className="font-semibold text-sm">Slack Digest</span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Hash className="w-3 h-3" />
              competitive-intel
            </div>
          </div>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted">
          {formatRelativeTime(latest?.date ?? null)}
        </span>
      </div>

      <div
        className="rounded-xl p-4"
        style={{
          background: "oklch(0.97 0.006 280 / 0.7)",
          border: "1px solid oklch(0.94 0.015 280 / 0.5)",
        }}
      >
        <p className="text-sm font-semibold mb-2">Weekly Competitive Summary</p>
        <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground break-words">
          {summary}
        </p>
        {latest && (
          <div className="flex gap-2 mt-3">
            <span className="text-xs px-2 py-1 rounded-lg font-semibold bg-primary/10 text-primary">
              {latest.signals_found} signals
            </span>
            <span className="text-xs px-2 py-1 rounded-lg font-semibold bg-muted capitalize">
              {latest.status}
            </span>
          </div>
        )}
      </div>

      {latest?.notion_url && (
        <motion.button
          type="button"
          onClick={() => window.open(latest.notion_url!, "_blank")}
          className="w-full mt-5 flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl border"
        >
          View Full Report
          <ExternalLink className="w-4 h-4" />
        </motion.button>
      )}
    </motion.section>
  )
}
