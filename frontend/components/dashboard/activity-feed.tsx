"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Search, Zap, Brain, FileText, MessageSquare } from "lucide-react"
import { useMemo } from "react"
import { usePipeline } from "@/providers/pipeline-provider"
import { AGENT_IDS } from "@/lib/pipeline-utils"

const agentMeta: Record<string, { icon: typeof Search; color: string }> = {
  scout: { icon: Search, color: "oklch(0.55 0.2 250)" },
  signal: { icon: Zap, color: "oklch(0.6 0.18 200)" },
  analyst: { icon: Brain, color: "oklch(0.55 0.15 180)" },
  report: { icon: FileText, color: "oklch(0.5 0.15 160)" },
  notifier: { icon: MessageSquare, color: "oklch(0.55 0.18 280)" },
}

export function ActivityFeed() {
  const { status, competitors, isConnected } = usePipeline()

  const activities = useMemo(() => {
    if (!isConnected) {
      return [
        {
          id: "offline",
          agent: "System",
          message: "Backend offline — start API on port 8000",
          time: "",
          color: "oklch(0.6 0.15 50)",
          icon: Zap,
        },
      ]
    }

    const items: {
      id: string
      agent: string
      message: string
      time: string
      color: string
      icon: typeof Search
    }[] = []

    if (status?.status === "running" && status.current_agent) {
      const agentId = AGENT_IDS.includes(status.current_agent as (typeof AGENT_IDS)[number])
        ? status.current_agent
        : "scout"
      const meta = agentMeta[agentId]
      items.push({
        id: "current",
        agent: agentId.charAt(0).toUpperCase() + agentId.slice(1),
        message: `Running ${agentId} agent…`,
        time: "Now",
        color: meta.color,
        icon: meta.icon,
      })
    }

    competitors.slice(0, 3).forEach((c) => {
      if (c.top_insight && !c.top_insight.includes("Run analysis")) {
        items.push({
          id: c.name,
          agent: "Analyst",
          message: `${c.name}: ${c.top_insight.slice(0, 100)}`,
          time: "Latest",
          color: agentMeta.analyst.color,
          icon: agentMeta.analyst.icon,
        })
      }
    })

    if (items.length === 0) {
      items.push({
        id: "idle",
        agent: "CompeteIQ",
        message: "Click Run Analysis to start the autonomous pipeline",
        time: "",
        color: "oklch(0.55 0.1 260)",
        icon: Search,
      })
    }

    return items
  }, [status, competitors, isConnected])

  return (
    <motion.section
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative rounded-[2rem] p-6 h-fit overflow-hidden"
      style={{
        background: "linear-gradient(135deg, oklch(0.995 0.005 280 / 0.85) 0%, oklch(0.99 0.008 270 / 0.8) 100%)",
        border: "1px solid oklch(0.93 0.025 280 / 0.5)",
      }}
    >
      <motion.div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-lg">Live Execution</h3>
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-500/10 text-green-700">
          {status?.status === "running" ? "Live" : "Updates"}
        </span>
      </motion.div>

      <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
        <AnimatePresence>
          {activities.map((activity) => {
            const Icon = activity.icon
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-3.5 rounded-xl"
                style={{
                  background: "oklch(0.97 0.008 280 / 0.6)",
                  border: "1px solid oklch(0.94 0.015 280 / 0.5)",
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl shrink-0">
                    <Icon className="w-4 h-4" style={{ color: activity.color }} />
                  </div>
                  <div className="min-w-0">
                    <motion.div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold">{activity.agent}</span>
                      {activity.time && (
                        <span className="text-xs text-muted-foreground">{activity.time}</span>
                      )}
                    </motion.div>
                    <p className="text-sm line-clamp-2 text-muted-foreground">{activity.message}</p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </motion.section>
  )
}
