"use client"

import { motion, AnimatePresence } from "framer-motion"
import { TrendingUp, AlertTriangle, CheckCircle, Plus, Loader2, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { usePipeline } from "@/providers/pipeline-provider"
import { CompetitorDetailModal } from "./competitor-detail-modal"

const gradients = [
  "from-[#00c6ff] to-[#0072ff]",
  "from-[#f857a6] to-[#ff5858]",
  "from-[#8E2DE2] to-[#4A00E0]",
  "from-[#11998e] to-[#38ef7d]",
  "from-[#f7971e] to-[#ffd200]",
  "from-[#ee0979] to-[#ff6a00]",
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
  const { competitors: cards, addCompetitor, removeCompetitor, trackedCompetitors, isConnected } = usePipeline()
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [removingDomain, setRemovingDomain] = useState<string | null>(null)

  const competitors = cards.map((c, index) => {
    // match to trackedCompetitor by display_name to get the clean domain
    const tracked = trackedCompetitors.find(
      (t) => t.display_name.toLowerCase() === c.name.toLowerCase() || c.url.includes(t.domain)
    )
    return {
      id: c.name,
      name: c.name,
      url: c.url,
      domain: tracked?.domain ?? new URL(c.url.startsWith("http") ? c.url : `https://${c.url}`).hostname.replace(/^www\./, ""),
      logo: c.name.charAt(0),
      insight: c.top_insight,
      confidence: Math.min(70 + c.signals_count * 8 + (c.notion_url ? 10 : 0), 99),
      severity: c.severity,
      notionUrl: c.notion_url,
      gradient: gradients[index % gradients.length],
    }
  })

  const handleAdd = async () => {
    let domain = input.trim().toLowerCase()
    
    // Extract clean domain from full URLs
    try {
      if (domain.startsWith("http")) {
        domain = new URL(domain).hostname
      }
      domain = domain.replace(/^www\./, "").split("/")[0]
    } catch {
      // Ignore URL parse errors, fallback to raw input
    }

    if (!domain || !domain.includes(".")) {
      toast.error("Please enter a valid domain (e.g. stripe.com)")
      return
    }
    setIsAdding(true)
    await addCompetitor(domain)
    setInput("")
    setIsAdding(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") void handleAdd()
  }

  const handleRemove = async (domain: string) => {
    setRemovingDomain(domain)
    await removeCompetitor(domain)
    setRemovingDomain(null)
  }

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
      >
        <div className="mb-6">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <AnimatePresence mode="popLayout">
            {competitors.map((competitor, index) => {
              const severity = severityConfig[competitor.severity as keyof typeof severityConfig]
              const SeverityIcon = severity.icon

              return (
                <motion.div
                  key={competitor.domain}
                  layout
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  transition={{ 
                    delay: 0.5 + index * 0.1, 
                    duration: 0.6, 
                    ease: [0.16, 1, 0.3, 1] 
                  }}
                  whileHover={{ 
                    y: -6, 
                    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } 
                  }}
                  onClick={() => setSelectedDomain(competitor.url)}
                  className="relative rounded-[1.5rem] p-6 cursor-pointer group overflow-hidden"
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
                  {/* Top edge highlight */}
                  <div 
                    className="absolute top-0 left-4 right-4 h-px"
                    style={{
                      background: "linear-gradient(90deg, transparent, oklch(1 0 0 / 0.3), transparent)",
                    }}
                  />
                  
                  {/* Hover glow */}
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background: "radial-gradient(ellipse at top, oklch(0.85 0.08 260 / 0.15) 0%, transparent 60%)",
                    }}
                  />

                  {/* Remove button — visible at low opacity, full on hover */}
                  <motion.button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      void handleRemove(competitor.domain)
                    }}
                    disabled={removingDomain === competitor.domain}
                    className="absolute top-3.5 right-3.5 z-20 opacity-30 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: "oklch(0.96 0.01 280)", border: "1px solid oklch(0.9 0.02 280)" }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {removingDomain === competitor.domain ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-red-400" />
                    )}
                  </motion.button>

                  {/* Header */}
                  <div className="flex items-center gap-3.5 mb-5 relative z-10">
                    <motion.div 
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${competitor.gradient} flex items-center justify-center text-white font-semibold text-base relative overflow-hidden`}
                      style={{ boxShadow: "0 4px 16px oklch(0.4 0.1 260 / 0.25)" }}
                      whileHover={{ scale: 1.05, rotate: 2 }}
                      transition={{ duration: 0.2 }}
                    >
                      {competitor.logo}
                      <div 
                        className="absolute inset-0"
                        style={{ background: "linear-gradient(180deg, oklch(1 0 0 / 0.15) 0%, transparent 50%)" }}
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
                        style={{ background: "oklch(0.94 0.015 280)", boxShadow: "inset 0 1px 2px oklch(0.5 0.03 280 / 0.1)" }}
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
                            style={{ background: "linear-gradient(90deg, transparent, oklch(1 0 0 / 0.25), transparent)" }}
                            animate={{ x: ["-100%", "100%"] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 1 }}
                          />
                        </motion.div>
                      </div>
                      <span className="text-xs font-semibold" style={{ color: "oklch(0.5 0.08 260)" }}>
                        {competitor.confidence}%
                      </span>
                    </div>
                    <motion.div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs font-semibold h-8 px-3"
                        style={{ color: "oklch(0.5 0.1 260)" }}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedDomain(competitor.url)
                        }}
                      >
                        Deep Dive →
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              )
            })}

            {/* Add Competitor Card — always the last slot in the grid */}
            <motion.div
              key="add-card"
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative rounded-[1.5rem] p-6 overflow-hidden flex flex-col justify-center items-center gap-4 min-h-[220px]"
              style={{
                background: "linear-gradient(145deg, oklch(0.98 0.008 270 / 0.5) 0%, oklch(0.97 0.01 260 / 0.4) 100%)",
                border: "2px dashed oklch(0.88 0.04 270 / 0.7)",
              }}
            >
              <div className="flex flex-col items-center gap-3 w-full">
                <div 
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-1"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.55 0.2 260 / 0.12), oklch(0.65 0.15 220 / 0.08))",
                    border: "1px solid oklch(0.85 0.08 260 / 0.4)",
                  }}
                >
                  <Plus className="w-5 h-5" style={{ color: "oklch(0.55 0.18 260)" }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: "oklch(0.4 0.05 280)" }}>
                  Track a Competitor
                </p>

                <div className="flex gap-2 w-full">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g. stripe.com"
                    disabled={!isConnected || isAdding}
                    className="flex-1 text-sm px-3 py-2 rounded-xl outline-none transition-all placeholder:text-muted-foreground/50"
                    style={{
                      background: "oklch(0.99 0.005 280 / 0.8)",
                      border: "1px solid oklch(0.9 0.03 280 / 0.6)",
                    }}
                  />
                  <motion.button
                    type="button"
                    onClick={() => void handleAdd()}
                    disabled={!input.trim() || isAdding || !isConnected}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-3 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-40 transition-opacity shrink-0"
                    style={{
                      background: "linear-gradient(135deg, oklch(0.55 0.2 260), oklch(0.6 0.18 230))",
                      boxShadow: "0 4px 12px oklch(0.5 0.2 260 / 0.25)",
                    }}
                  >
                    {isAdding ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.section>

      <CompetitorDetailModal
        domain={selectedDomain}
        onClose={() => setSelectedDomain(null)}
      />
    </>
  )
}
