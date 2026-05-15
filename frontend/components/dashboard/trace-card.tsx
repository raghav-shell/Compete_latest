"use client"

import { motion } from "framer-motion"
import { Activity, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePipeline } from "@/providers/pipeline-provider"
import { AGENT_IDS, agentToIndex, getAgentPillState } from "@/lib/pipeline-utils"

const stepColors = [
  "oklch(0.55 0.18 250)",
  "oklch(0.6 0.15 200)",
  "oklch(0.55 0.12 180)",
  "oklch(0.5 0.12 160)",
  "oklch(0.55 0.15 280)",
]

export function TraceCard() {
  const { status, runs } = usePipeline()
  const pipelineStatus = status?.status ?? "idle"
  const activeIndex = status
    ? agentToIndex(status.current_agent)
    : -1

  const latestNotion = runs[0]?.notion_url

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-[1.5rem] p-6 overflow-hidden h-full border"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-violet-600">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold">Execution Trace</h3>
          <p className="text-xs text-muted-foreground">
            {status?.run_id ? `Run ${status.run_id.slice(0, 8)}…` : "No active run"}
          </p>
        </div>
      </div>

      <div className="relative py-3 px-2">
        {AGENT_IDS.map((id, index) => {
          const pill = getAgentPillState(index, activeIndex, pipelineStatus)
          const active = pill === "running" || pill === "done"
          return (
            <motion.div
              key={id}
              className="relative flex items-center gap-4 py-2.5 pl-10"
            >
              <div
                className="absolute left-2 w-4 h-4 rounded-full"
                style={{
                  background:
                    pill === "failed"
                      ? "oklch(0.6 0.2 50)"
                      : active
                        ? stepColors[index]
                        : "oklch(0.94 0.01 280)",
                }}
              />
              <span className="text-sm font-semibold capitalize">{id}</span>
              <span className="text-xs ml-auto capitalize text-muted-foreground">{pill}</span>
            </motion.div>
          )
        })}
      </div>

      <Button
        variant="outline"
        className="w-full mt-3"
        disabled={!latestNotion}
        onClick={() => latestNotion && window.open(latestNotion, "_blank")}
      >
        View Full Trace
        <ExternalLink className="w-4 h-4 ml-2" />
      </Button>
    </motion.section>
  )
}
