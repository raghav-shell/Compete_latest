"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Search, Zap, Brain, FileText, MessageSquare } from "lucide-react"
import { useEffect, useState } from "react"

const activities = [
  { id: 1, agent: "Scout", icon: Search, message: "Analyzing Linear pricing page", time: "Just now", color: "oklch(0.55 0.2 250)" },
  { id: 2, agent: "Signal", icon: Zap, message: "Detected pricing delta: +15% enterprise tier", time: "1m ago", color: "oklch(0.6 0.18 200)" },
  { id: 3, agent: "Analyst", icon: Brain, message: "Reasoning about enterprise expansion strategy", time: "2m ago", color: "oklch(0.55 0.15 180)" },
  { id: 4, agent: "Report", icon: FileText, message: "Generated competitive insight report", time: "3m ago", color: "oklch(0.5 0.15 160)" },
  { id: 5, agent: "Notifier", icon: MessageSquare, message: "Slack digest posted to #competitive-intel", time: "4m ago", color: "oklch(0.55 0.18 280)" },
]

export function ActivityFeed() {
  const [visibleActivities, setVisibleActivities] = useState<typeof activities>([])

  useEffect(() => {
    activities.forEach((activity, index) => {
      setTimeout(() => {
        setVisibleActivities((prev) => [...prev, activity])
      }, index * 600)
    })
  }, [])

  return (
    <motion.section
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
      className="relative rounded-[2rem] p-6 h-fit overflow-hidden"
      style={{
        background: "linear-gradient(135deg, oklch(0.995 0.005 280 / 0.85) 0%, oklch(0.99 0.008 270 / 0.8) 100%)",
        backdropFilter: "blur(40px)",
        border: "1px solid oklch(0.93 0.025 280 / 0.5)",
        boxShadow: `
          0 0 0 1px oklch(1 0 0 / 0.08) inset,
          0 12px 40px oklch(0.5 0.1 260 / 0.08)
        `,
      }}
    >
      {/* Top highlight */}
      <div 
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent, oklch(1 0 0 / 0.4), transparent)",
        }}
      />

      <div className="flex items-center justify-between mb-5">
        <h3 
          className="font-semibold text-lg"
          style={{ letterSpacing: "-0.01em" }}
        >
          Live Execution
        </h3>
        <motion.div 
          className="flex items-center gap-2 text-xs font-medium px-2.5 py-1.5 rounded-full"
          style={{ 
            background: "oklch(0.95 0.04 160 / 0.6)",
            color: "oklch(0.4 0.1 160)",
          }}
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <motion.span 
              className="absolute inline-flex h-full w-full rounded-full"
              style={{ background: "oklch(0.55 0.15 160)" }}
              animate={{ scale: [1, 2, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span 
              className="relative inline-flex rounded-full h-1.5 w-1.5"
              style={{ background: "oklch(0.5 0.15 160)" }}
            />
          </span>
          Live
        </motion.div>
      </div>

      <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
        <AnimatePresence>
          {visibleActivities.map((activity, index) => {
            const Icon = activity.icon
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto", marginBottom: 10 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ 
                  duration: 0.5, 
                  ease: [0.16, 1, 0.3, 1],
                  height: { duration: 0.4 },
                }}
                className="relative p-3.5 rounded-xl cursor-pointer group"
                style={{
                  background: "oklch(0.97 0.008 280 / 0.6)",
                  border: "1px solid oklch(0.94 0.015 280 / 0.5)",
                }}
                whileHover={{
                  background: "oklch(0.96 0.012 280 / 0.8)",
                  y: -2,
                  boxShadow: "0 4px 16px oklch(0.5 0.1 260 / 0.1)",
                }}
              >
                <div className="flex items-start gap-3">
                  <motion.div 
                    className="p-2 rounded-xl shrink-0"
                    style={{ 
                      background: `linear-gradient(135deg, ${activity.color} / 0.15, ${activity.color} / 0.05)`,
                      border: `1px solid ${activity.color} / 0.2`,
                    }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <Icon className="w-4 h-4" style={{ color: activity.color }} />
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold" style={{ letterSpacing: "-0.01em" }}>{activity.agent}</span>
                      <span className="text-xs font-medium" style={{ color: "oklch(0.55 0.03 280)" }}>{activity.time}</span>
                    </div>
                    <p className="text-sm truncate" style={{ color: "oklch(0.5 0.02 280)" }}>{activity.message}</p>
                  </div>
                </div>
                
                {/* Subtle left accent */}
                <motion.div
                  className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full"
                  style={{ background: activity.color }}
                  initial={{ opacity: 0, scaleY: 0 }}
                  animate={{ opacity: 0.6, scaleY: 1 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                />
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </motion.section>
  )
}
