"use client"

import { motion } from "framer-motion"
import { Hash, ExternalLink } from "lucide-react"

export function SlackPreview() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
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

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <motion.div 
            className="w-10 h-10 rounded-xl flex items-center justify-center relative overflow-hidden"
            style={{ 
              background: "linear-gradient(135deg, #4A154B, #611f69)",
              boxShadow: "0 4px 16px oklch(0.4 0.15 320 / 0.25)",
            }}
            whileHover={{ scale: 1.05 }}
          >
            <svg className="w-5 h-5 text-white relative z-10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
            </svg>
            <div 
              className="absolute inset-0"
              style={{
                background: "linear-gradient(180deg, oklch(1 0 0 / 0.15) 0%, transparent 50%)",
              }}
            />
          </motion.div>
          <div>
            <span className="font-semibold text-sm" style={{ letterSpacing: "-0.01em" }}>Slack Digest</span>
            <div 
              className="flex items-center gap-1 text-xs font-medium"
              style={{ color: "oklch(0.55 0.03 280)" }}
            >
              <Hash className="w-3 h-3" />
              competitive-intel
            </div>
          </div>
        </div>
        <motion.span 
          className="text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ 
            background: "oklch(0.95 0.02 260 / 0.6)",
            color: "oklch(0.5 0.05 260)",
          }}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          2m ago
        </motion.span>
      </div>

      <div 
        className="rounded-xl p-4 space-y-3"
        style={{
          background: "oklch(0.97 0.006 280 / 0.7)",
          border: "1px solid oklch(0.94 0.015 280 / 0.5)",
        }}
      >
        <div className="flex items-start gap-3">
          <motion.div 
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, oklch(0.55 0.18 260), oklch(0.6 0.15 200))",
              boxShadow: "0 4px 12px oklch(0.5 0.15 260 / 0.25)",
            }}
            animate={{ 
              boxShadow: [
                "0 4px 12px oklch(0.5 0.15 260 / 0.25)",
                "0 4px 20px oklch(0.5 0.15 260 / 0.4)",
                "0 4px 12px oklch(0.5 0.15 260 / 0.25)",
              ]
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            AI
            <div 
              className="absolute inset-0"
              style={{
                background: "linear-gradient(180deg, oklch(1 0 0 / 0.2) 0%, transparent 50%)",
              }}
            />
          </motion.div>
          <div className="space-y-2.5 flex-1">
            <p className="text-sm font-semibold" style={{ letterSpacing: "-0.01em" }}>
              Weekly Competitive Summary
            </p>
            <p 
              className="text-sm leading-relaxed"
              style={{ color: "oklch(0.48 0.02 280)" }}
            >
              3 key changes detected across monitored competitors. Linear announced enterprise pricing changes. 
              Notion launched new AI collaboration features.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <motion.span 
                className="text-xs px-2.5 py-1 rounded-lg font-semibold"
                style={{ 
                  background: "oklch(0.94 0.06 260 / 0.7)",
                  color: "oklch(0.5 0.12 260)",
                  border: "1px solid oklch(0.88 0.08 260 / 0.4)",
                }}
                whileHover={{ scale: 1.02 }}
              >
                3 Insights
              </motion.span>
              <motion.span 
                className="text-xs px-2.5 py-1 rounded-lg font-semibold"
                style={{ 
                  background: "oklch(0.95 0.08 70 / 0.7)",
                  color: "oklch(0.55 0.15 70)",
                  border: "1px solid oklch(0.88 0.1 70 / 0.4)",
                }}
                whileHover={{ scale: 1.02 }}
              >
                1 High Priority
              </motion.span>
            </div>
          </div>
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.01, y: -1 }}
        whileTap={{ scale: 0.99 }}
        className="w-full mt-5 flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl transition-all"
        style={{ 
          color: "oklch(0.5 0.08 260)",
          background: "oklch(0.96 0.015 280 / 0.5)",
          border: "1px solid oklch(0.92 0.02 280 / 0.5)",
        }}
      >
        View Full Report
        <ExternalLink className="w-4 h-4" />
      </motion.button>
    </motion.section>
  )
}
