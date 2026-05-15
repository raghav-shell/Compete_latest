"use client"

import { motion } from "framer-motion"
import { CheckCircle, Clock, FileText } from "lucide-react"

const runs = [
  { id: 1, date: "Today, 2:34 PM", status: "completed", competitors: 3, reports: 1, duration: "4m 23s" },
  { id: 2, date: "Today, 10:00 AM", status: "completed", competitors: 3, reports: 1, duration: "3m 58s" },
  { id: 3, date: "Yesterday, 6:00 PM", status: "completed", competitors: 3, reports: 1, duration: "4m 12s" },
  { id: 4, date: "Yesterday, 10:00 AM", status: "completed", competitors: 3, reports: 1, duration: "4m 01s" },
]

export function RunHistory() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.65 }}
      className="relative rounded-[1.5rem] p-6 overflow-hidden h-full"
      style={{
        background: "linear-gradient(145deg, oklch(0.995 0.005 280 / 0.9) 0%, oklch(0.99 0.008 270 / 0.85) 100%)",
        backdropFilter: "blur(40px)",
        border: "1px solid oklch(0.93 0.025 280 / 0.5)",
        boxShadow: `
          0 0 0 1px oklch(1 0 0 / 0.06) inset,
          0 8px 32px oklch(0.5 0.08 260 / 0.06)
        `,
      }}
    >
      {/* Top highlight */}
      <div 
        className="absolute top-0 left-4 right-4 h-px"
        style={{
          background: "linear-gradient(90deg, transparent, oklch(1 0 0 / 0.3), transparent)",
        }}
      />

      <h3 
        className="font-semibold text-lg mb-5"
        style={{ letterSpacing: "-0.01em" }}
      >
        Run History
      </h3>

      <div className="space-y-2">
        {runs.map((run, index) => (
          <motion.div
            key={run.id}
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ 
              delay: 0.75 + index * 0.1, 
              duration: 0.5,
              ease: [0.16, 1, 0.3, 1],
            }}
            whileHover={{ 
              x: 4,
              background: "oklch(0.96 0.01 280 / 0.7)",
            }}
            className="flex items-center justify-between p-3 rounded-xl cursor-pointer group transition-colors"
            style={{
              background: "oklch(0.97 0.006 280 / 0.5)",
              border: "1px solid oklch(0.94 0.015 280 / 0.3)",
            }}
          >
            <div className="flex items-center gap-3">
              <motion.div 
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ 
                  background: "linear-gradient(135deg, oklch(0.92 0.06 160 / 0.7), oklch(0.95 0.04 160 / 0.5))",
                  border: "1px solid oklch(0.85 0.08 160 / 0.4)",
                }}
                whileHover={{ scale: 1.05 }}
              >
                <CheckCircle className="w-4 h-4" style={{ color: "oklch(0.5 0.15 160)" }} />
              </motion.div>
              <div>
                <span 
                  className="text-sm font-semibold block"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  {run.date}
                </span>
                <div 
                  className="flex items-center gap-3 text-xs font-medium"
                  style={{ color: "oklch(0.55 0.03 280)" }}
                >
                  <span>{run.competitors} competitors</span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {run.reports} report
                  </span>
                </div>
              </div>
            </div>
            <div 
              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg"
              style={{ 
                background: "oklch(0.95 0.015 280 / 0.6)",
                color: "oklch(0.5 0.03 280)",
              }}
            >
              <Clock className="w-3 h-3" />
              {run.duration}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  )
}
