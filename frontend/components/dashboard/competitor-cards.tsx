"use client"

import { motion } from "framer-motion"
import { ArrowRight, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePipeline } from "@/providers/pipeline-provider"

const gradients = [
  "from-indigo-500 via-violet-500 to-purple-500",
  "from-slate-600 via-slate-700 to-slate-800",
  "from-neutral-700 via-neutral-800 to-neutral-900",
]

const severityConfig = {
  high: { 
    icon: AlertTriangle, 
    color: "oklch(0.65 0.18 70)", 
    bg: "oklch(0.95 0.08 70 / 0.6)",
    border: "oklch(0.85 0.12 70 / 0.4)",
  },
  medium: { 
    icon: TrendingUp, 
    color: "oklch(0.55 0.18 250)", 
    bg: "oklch(0.95 0.06 250 / 0.6)",
    border: "oklch(0.85 0.1 250 / 0.4)",
  },
  low: { 
    icon: CheckCircle, 
    color: "oklch(0.5 0.15 160)", 
    bg: "oklch(0.95 0.06 160 / 0.6)",
    border: "oklch(0.85 0.1 160 / 0.4)",
  },
}

export function CompetitorCards() {
  const { competitors: cards, isLoading } = usePipeline()

  const competitors = cards.map((c, index) => ({
    id: c.name,
    name: c.name,
    url: c.url,
    logo: c.name.charAt(0),
    insight: c.top_insight,
    confidence: Math.min(70 + c.signals_count * 8 + (c.notion_url ? 10 : 0), 99),
    severity: c.severity,
    notionUrl: c.notion_url,
    gradient: gradients[index % gradients.length],
  }))

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 
            className="text-xl font-semibold mb-1"
            style={{ letterSpacing: "-0.02em" }}
          >
            Competitor Intelligence
          </h3>
          <p className="text-sm font-medium" style={{ color: "oklch(0.5 0.03 280)" }}>
            Latest strategic insights from monitored competitors
          </p>
        </div>
        <motion.div whileHover={{ x: 4 }} transition={{ duration: 0.2 }}>
          <Button 
            variant="ghost" 
            className="text-sm font-medium gap-1.5"
            style={{ color: "oklch(0.5 0.05 260)" }}
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {competitors.map((competitor, index) => {
          const severity = severityConfig[competitor.severity as keyof typeof severityConfig]
          const SeverityIcon = severity.icon

          return (
            <motion.div
              key={competitor.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                delay: 0.5 + index * 0.1, 
                duration: 0.6, 
                ease: [0.16, 1, 0.3, 1] 
              }}
              whileHover={{ 
                y: -6, 
                transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } 
              }}
              className="relative rounded-[1.5rem] p-6 cursor-pointer group overflow-hidden"
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
              {/* Top edge highlight */}
              <div 
                className="absolute top-0 left-4 right-4 h-px"
                style={{
                  background: "linear-gradient(90deg, transparent, oklch(1 0 0 / 0.3), transparent)",
                }}
              />
              
              {/* Hover glow effect */}
              <motion.div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse at top, oklch(0.85 0.08 260 / 0.15) 0%, transparent 60%)",
                }}
              />

              {/* Header */}
              <div className="flex items-center gap-3.5 mb-5 relative z-10">
                <motion.div 
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${competitor.gradient} flex items-center justify-center text-white font-semibold text-base relative overflow-hidden`}
                  style={{
                    boxShadow: "0 4px 16px oklch(0.4 0.1 260 / 0.25)",
                  }}
                  whileHover={{ scale: 1.05, rotate: 2 }}
                  transition={{ duration: 0.2 }}
                >
                  {competitor.logo}
                  <div 
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(180deg, oklch(1 0 0 / 0.15) 0%, transparent 50%)",
                    }}
                  />
                </motion.div>
                <div className="flex-1">
                  <h4 className="font-semibold text-base" style={{ letterSpacing: "-0.01em" }}>{competitor.name}</h4>
                  <div 
                    className="inline-flex items-center gap-1.5 text-xs font-semibold mt-0.5 px-2 py-0.5 rounded-full"
                    style={{ 
                      background: severity.bg,
                      color: severity.color,
                      border: `1px solid ${severity.border}`,
                    }}
                  >
                    <SeverityIcon className="w-3 h-3" />
                    <span className="capitalize">{competitor.severity}</span>
                  </div>
                </div>
              </div>

              {/* Insight */}
              <p 
                className="text-sm mb-5 line-clamp-2 leading-relaxed relative z-10"
                style={{ color: "oklch(0.45 0.02 280)" }}
              >
                {competitor.insight}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div 
                    className="h-2 w-20 rounded-full overflow-hidden"
                    style={{ 
                      background: "oklch(0.94 0.015 280)",
                      boxShadow: "inset 0 1px 2px oklch(0.5 0.03 280 / 0.1)",
                    }}
                  >
                    <motion.div
                      className="h-full rounded-full relative overflow-hidden"
                      style={{
                        background: "linear-gradient(90deg, oklch(0.55 0.18 260), oklch(0.65 0.15 200))",
                        boxShadow: "0 0 8px oklch(0.6 0.15 260 / 0.3)",
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${competitor.confidence}%` }}
                      transition={{ delay: 0.7 + index * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <motion.div
                        className="absolute inset-0"
                        style={{
                          background: "linear-gradient(90deg, transparent, oklch(1 0 0 / 0.25), transparent)",
                        }}
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 1 }}
                      />
                    </motion.div>
                  </div>
                  <span 
                    className="text-xs font-semibold"
                    style={{ color: "oklch(0.5 0.08 260)" }}
                  >
                    {competitor.confidence}%
                  </span>
                </div>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  whileHover={{ x: 0 }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs font-semibold h-8 px-3"
                    style={{ color: "oklch(0.5 0.1 260)" }}
                    disabled={!competitor.notionUrl}
                    onClick={() => {
                      if (competitor.notionUrl) window.open(competitor.notionUrl, "_blank")
                    }}
                  >
                    View Report
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.section>
  )
}
