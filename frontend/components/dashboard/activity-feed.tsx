"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Search, Zap, Brain, FileText, MessageSquare, Radio } from "lucide-react"
import { useEffect, useMemo, useRef } from "react"
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
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new items arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [status?.current_agent, status?.progress])

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
          isLive: false,
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
      isLive: boolean
    }[] = []

    // Show completed agents as log entries during a run
    if (status?.status === "running" && status.current_agent) {
      const currentIdx = AGENT_IDS.indexOf(status.current_agent as typeof AGENT_IDS[number])

      // Show completed steps
      AGENT_IDS.forEach((agentId, idx) => {
        if (idx < currentIdx) {
          const meta = agentMeta[agentId]
          items.push({
            id: `done-${agentId}`,
            agent: agentId.charAt(0).toUpperCase() + agentId.slice(1),
            message: `✓ ${agentId.charAt(0).toUpperCase() + agentId.slice(1)} agent completed`,
            time: "Done",
            color: meta.color,
            icon: meta.icon,
            isLive: false,
          })
        }
      })

      // Show current running agent
      if (currentIdx >= 0) {
        const agentId = AGENT_IDS[currentIdx]
        const meta = agentMeta[agentId]
        items.push({
          id: "current",
          agent: agentId.charAt(0).toUpperCase() + agentId.slice(1),
          message: `Running ${agentId} agent… ${status.progress ?? 0}%`,
          time: "Now",
          color: meta.color,
          icon: meta.icon,
          isLive: true,
        })
      }
    }

    // Show insights from last run
    if (status?.status !== "running") {
      competitors.slice(0, 3).forEach((c) => {
        if (c.top_insight && !c.top_insight.includes("Run analysis")) {
          items.push({
            id: c.name,
            agent: "Analyst",
            message: `${c.name}: ${c.top_insight.slice(0, 100)}`,
            time: "Latest",
            color: agentMeta.analyst.color,
            icon: agentMeta.analyst.icon,
            isLive: false,
          })
        }
      })
    }

    if (items.length === 0) {
      items.push({
        id: "idle",
        agent: "CompeteIQ",
        message: "Click Run Analysis to start the autonomous pipeline",
        time: "",
        color: "oklch(0.55 0.1 260)",
        icon: Search,
        isLive: false,
      })
    }

    return items
  }, [status, competitors, isConnected])

  const isLive = status?.status === "running"

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
        <span
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
          style={{
            background: isLive ? "oklch(0.93 0.08 160 / 0.5)" : "oklch(0.95 0.02 280 / 0.5)",
            color: isLive ? "oklch(0.4 0.12 160)" : "oklch(0.5 0.03 280)",
          }}
        >
          {isLive && (
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Radio className="w-3 h-3" />
            </motion.span>
          )}
          {isLive ? "Streaming" : "Updates"}
        </span>
      </motion.div>

      <div ref={scrollRef} className="space-y-2.5 max-h-[300px] overflow-y-auto scroll-smooth">
        <AnimatePresence>
          {activities.map((activity) => {
            const Icon = activity.icon
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-3.5 rounded-xl relative overflow-hidden"
                style={{
                  background: "oklch(0.97 0.008 280 / 0.6)",
                  border: activity.isLive
                    ? "1px solid oklch(0.85 0.1 260 / 0.4)"
                    : "1px solid oklch(0.94 0.015 280 / 0.5)",
                }}
              >
                {/* Live pulse background */}
                {activity.isLive && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: "linear-gradient(90deg, oklch(0.9 0.06 260 / 0.15), transparent 50%)",
                    }}
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}

                <div className="flex items-start gap-3 relative z-10">
                  <div className="p-2 rounded-xl shrink-0">
                    <Icon className="w-4 h-4" style={{ color: activity.color }} />
                  </div>
                  <div className="min-w-0">
                    <motion.div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold">{activity.agent}</span>
                      {activity.time && (
                        <span className="text-xs text-muted-foreground">{activity.time}</span>
                      )}
                      {activity.isLive && (
                        <motion.span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: "oklch(0.55 0.18 160)" }}
                          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
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

