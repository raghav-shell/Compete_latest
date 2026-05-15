"use client"

import { motion } from "framer-motion"
import { CheckCircle, Clock, FileText, XCircle, Loader2, ExternalLink } from "lucide-react"
import { usePipeline } from "@/providers/pipeline-provider"
import { formatRunTimestamp } from "@/lib/pipeline-utils"

export function RunHistory() {
  const { runs, isConnected, isLoading } = usePipeline()

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.65 }}
      className="relative rounded-[1.5rem] p-6 overflow-hidden h-full"
      style={{
        background: "linear-gradient(145deg, oklch(0.995 0.005 280 / 0.9) 0%, oklch(0.99 0.008 270 / 0.85) 100%)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid oklch(0.93 0.025 280 / 0.5)",
        boxShadow: `
          0 0 0 1px oklch(1 0 0 / 0.06) inset,
          0 8px 32px oklch(0.5 0.08 260 / 0.06)
        `,
      }}
    >
      <h3 className="font-semibold text-lg mb-5" style={{ letterSpacing: "-0.01em" }}>
        Run History
      </h3>

      {!isConnected && (
        <p className="text-sm px-1" style={{ color: "oklch(0.5 0.03 280)" }}>
          Connect to the backend to load run history.
        </p>
      )}

      {isConnected && isLoading && runs.length === 0 && (
        <p className="text-sm px-1" style={{ color: "oklch(0.5 0.03 280)" }}>
          Loading runs…
        </p>
      )}

      {isConnected && !isLoading && runs.length === 0 && (
        <p className="text-sm px-1" style={{ color: "oklch(0.5 0.03 280)" }}>
          No runs yet. Click Run Analysis to start.
        </p>
      )}

      <div className="space-y-2">
        {runs.map((run, index) => {
          const isSuccess = run.status === "completed"
          const Icon = isSuccess ? CheckCircle : XCircle

          return (
            <motion.div
              key={`${run.id}-${index}`}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.75 + index * 0.1, duration: 0.5 }}
              className="flex items-center justify-between p-3 rounded-xl"
              style={{
                background: "oklch(0.97 0.006 280 / 0.5)",
                border: "1px solid oklch(0.94 0.015 280 / 0.3)",
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <motion.div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: isSuccess
                      ? "linear-gradient(135deg, oklch(0.92 0.06 160 / 0.7), oklch(0.95 0.04 160 / 0.5))"
                      : "linear-gradient(135deg, oklch(0.95 0.08 50 / 0.7), oklch(0.97 0.05 50 / 0.5))",
                  }}
                >
                  <Icon
                    className="w-4 h-4"
                    style={{ color: isSuccess ? "oklch(0.5 0.15 160)" : "oklch(0.55 0.18 50)" }}
                  />
                </motion.div>
                <div className="min-w-0">
                  <span className="text-sm font-semibold block truncate">
                    {formatRunTimestamp(run.date)}
                  </span>
                  <div
                    className="flex items-center gap-3 text-xs font-medium"
                    style={{ color: "oklch(0.55 0.03 280)" }}
                  >
                    <span>{run.competitors_count} competitors</span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {run.signals_found} signals
                    </span>
                  </div>
                </div>
              </div>
              <motion.div className="flex items-center gap-2 shrink-0 ml-2">
                <span
                  className="text-xs font-medium px-2 py-1 rounded-lg capitalize"
                  style={{
                    background: "oklch(0.95 0.015 280 / 0.6)",
                    color: "oklch(0.5 0.03 280)",
                  }}
                >
                  {run.status === "running" ? (
                    <Loader2 className="w-3 h-3 animate-spin inline" />
                  ) : (
                    <Clock className="w-3 h-3 inline mr-1" />
                  )}
                  {run.status}
                </span>
                {run.notion_url && (
                  <button
                    type="button"
                    onClick={() => window.open(run.notion_url!, "_blank")}
                    className="p-1 rounded hover:bg-black/5"
                    aria-label="Open Notion report"
                  >
                    <ExternalLink className="w-3.5 h-3.5" style={{ color: "oklch(0.5 0.08 260)" }} />
                  </button>
                )}
              </motion.div>
            </motion.div>
          )
        })}
      </div>
    </motion.section>
  )
}
