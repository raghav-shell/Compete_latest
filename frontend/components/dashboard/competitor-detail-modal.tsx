"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, ExternalLink, AlertTriangle, TrendingUp, Lightbulb, Eye, ChevronDown, ChevronRight } from "lucide-react"
import { useEffect, useState, useCallback } from "react"
import { fetchCompetitorDetails } from "@/lib/api"
import type { CompetitorDetails } from "@/lib/types"

interface Props {
  domain: string | null
  onClose: () => void
}

export function CompetitorDetailModal({ domain, onClose }: Props) {
  const [details, setDetails] = useState<CompetitorDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"signals" | "analysis" | "raw">("signals")
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const loadDetails = useCallback(async () => {
    if (!domain) return
    setIsLoading(true)
    try {
      const data = await fetchCompetitorDetails(domain)
      setDetails(data)
    } catch {
      setDetails(null)
    } finally {
      setIsLoading(false)
    }
  }, [domain])

  useEffect(() => {
    if (domain) {
      void loadDetails()
      setActiveTab("signals")
    }
  }, [domain, loadDetails])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose])

  const signals = details?.signals ?? []
  const analysis = details?.analysis ?? {}
  const rawData = details?.raw_data ?? {}
  const hasData = signals.length > 0 || Object.keys(analysis).length > 0 || Object.keys(rawData).length > 0

  const tabs = [
    { id: "signals" as const, label: "Signals", count: signals.length },
    { id: "analysis" as const, label: "Analysis", count: Object.keys(analysis).length },
    { id: "raw" as const, label: "Raw Data", count: Object.keys(rawData).length },
  ]

  return (
    <AnimatePresence>
      {domain && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50"
            style={{ background: "oklch(0.1 0.02 280 / 0.5)", backdropFilter: "blur(8px)" }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-4 md:inset-x-[10%] md:inset-y-[5%] z-50 rounded-3xl overflow-hidden flex flex-col"
            style={{
              background: "linear-gradient(145deg, oklch(0.995 0.005 280 / 0.98) 0%, oklch(0.99 0.008 270 / 0.96) 100%)",
              border: "1px solid oklch(0.92 0.03 280 / 0.6)",
              boxShadow: `
                0 0 0 1px oklch(1 0 0 / 0.08) inset,
                0 24px 80px oklch(0.3 0.1 260 / 0.3),
                0 8px 24px oklch(0.4 0.1 260 / 0.15)
              `,
            }}
          >
            {/* Top highlight */}
            <div
              className="absolute top-0 left-4 right-4 h-px"
              style={{ background: "linear-gradient(90deg, transparent, oklch(1 0 0 / 0.4), transparent)" }}
            />

            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b" style={{ borderColor: "oklch(0.93 0.02 280 / 0.5)" }}>
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.55 0.2 260), oklch(0.65 0.18 220))",
                    boxShadow: "0 4px 16px oklch(0.5 0.2 260 / 0.3)",
                  }}
                >
                  {domain.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-semibold" style={{ letterSpacing: "-0.02em" }}>
                    {domain}
                  </h2>
                  <p className="text-sm text-muted-foreground">Competitive Intelligence Deep Dive</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {details?.notion_url && (
                  <motion.button
                    type="button"
                    onClick={() => window.open(details.notion_url!, "_blank")}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                    style={{
                      background: "oklch(0.95 0.03 260 / 0.6)",
                      color: "oklch(0.45 0.12 260)",
                      border: "1px solid oklch(0.9 0.04 260 / 0.4)",
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Notion Report
                  </motion.button>
                )}
                <motion.button
                  type="button"
                  onClick={onClose}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-xl"
                  style={{ background: "oklch(0.95 0.01 280 / 0.6)" }}
                >
                  <X className="w-5 h-5" style={{ color: "oklch(0.45 0.03 280)" }} />
                </motion.button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-8 pt-4 pb-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: activeTab === tab.id
                      ? "linear-gradient(135deg, oklch(0.55 0.2 260), oklch(0.6 0.18 230))"
                      : "transparent",
                    color: activeTab === tab.id ? "white" : "oklch(0.5 0.03 280)",
                    boxShadow: activeTab === tab.id ? "0 4px 12px oklch(0.5 0.2 260 / 0.25)" : "none",
                  }}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span
                      className="ml-2 px-1.5 py-0.5 rounded-md text-xs"
                      style={{
                        background: activeTab === tab.id ? "oklch(1 0 0 / 0.2)" : "oklch(0.93 0.02 280 / 0.6)",
                      }}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-8 py-4">
              {isLoading && (
                <div className="flex items-center justify-center py-20">
                  <motion.div
                    className="w-8 h-8 rounded-full border-2 border-t-transparent"
                    style={{ borderColor: "oklch(0.6 0.15 260)", borderTopColor: "transparent" }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                </div>
              )}

              {!isLoading && !hasData && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Eye className="w-12 h-12 mb-4" style={{ color: "oklch(0.7 0.08 260)" }} />
                  <p className="text-lg font-semibold mb-1">No data yet</p>
                  <p className="text-sm text-muted-foreground">
                    Run the analysis pipeline to gather intelligence on {domain}
                  </p>
                </div>
              )}

              {!isLoading && hasData && (
                <AnimatePresence mode="wait">
                  {/* Signals Tab */}
                  {activeTab === "signals" && (
                    <motion.div
                      key="signals"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-3"
                    >
                      {signals.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">No signals detected in the last run.</p>
                      ) : (
                        signals.map((signal, i) => {
                          const sig = signal as Record<string, string>
                          const significance = sig.significance ?? "medium"
                          const isHigh = significance === "high"
                          return (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="p-4 rounded-xl"
                              style={{
                                background: "oklch(0.97 0.006 280 / 0.7)",
                                border: `1px solid ${isHigh ? "oklch(0.85 0.12 70 / 0.4)" : "oklch(0.94 0.015 280 / 0.5)"}`,
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className="p-1.5 rounded-lg shrink-0 mt-0.5"
                                  style={{
                                    background: isHigh ? "oklch(0.95 0.08 70 / 0.6)" : "oklch(0.93 0.04 260 / 0.5)",
                                  }}
                                >
                                  {isHigh ? (
                                    <AlertTriangle className="w-4 h-4" style={{ color: "oklch(0.6 0.18 70)" }} />
                                  ) : (
                                    <TrendingUp className="w-4 h-4" style={{ color: "oklch(0.55 0.15 260)" }} />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-semibold capitalize">
                                      {sig.change_type ?? "Change"}
                                    </span>
                                    <span
                                      className="text-xs font-medium px-2 py-0.5 rounded-full capitalize"
                                      style={{
                                        background: isHigh ? "oklch(0.95 0.08 70 / 0.6)" : "oklch(0.93 0.04 260 / 0.5)",
                                        color: isHigh ? "oklch(0.5 0.15 70)" : "oklch(0.45 0.1 260)",
                                      }}
                                    >
                                      {significance}
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    {sig.description ?? JSON.stringify(signal)}
                                  </p>
                                  {sig.reasoning && (
                                    <p className="text-xs text-muted-foreground mt-2 italic">
                                      💡 {sig.reasoning}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )
                        })
                      )}
                    </motion.div>
                  )}

                  {/* Analysis Tab */}
                  {activeTab === "analysis" && (
                    <motion.div
                      key="analysis"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-4"
                    >
                      {Object.keys(analysis).length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">No analysis available.</p>
                      ) : (
                        Object.entries(analysis).map(([key, value], i) => (
                          <motion.div
                            key={key}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="p-4 rounded-xl"
                            style={{
                              background: "oklch(0.97 0.006 280 / 0.7)",
                              border: "1px solid oklch(0.94 0.015 280 / 0.5)",
                            }}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Lightbulb className="w-4 h-4" style={{ color: "oklch(0.6 0.15 80)" }} />
                              <span className="text-sm font-semibold capitalize">
                                {key.replace(/_/g, " ")}
                              </span>
                            </div>
                            {Array.isArray(value) ? (
                              <ul className="space-y-1.5 ml-6">
                                {(value as string[]).map((item, j) => (
                                  <li key={j} className="text-sm text-muted-foreground list-disc leading-relaxed">
                                    {typeof item === "string" ? item : JSON.stringify(item)}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
                              </p>
                            )}
                          </motion.div>
                        ))
                      )}
                    </motion.div>
                  )}

                  {/* Raw Data Tab */}
                  {activeTab === "raw" && (
                    <motion.div
                      key="raw"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-2"
                    >
                      {Object.keys(rawData).length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">No raw data available.</p>
                      ) : (
                        Object.entries(rawData).map(([key, value]) => {
                          const isExpanded = expandedSections.has(key)
                          return (
                            <div
                              key={key}
                              className="rounded-xl overflow-hidden"
                              style={{
                                background: "oklch(0.97 0.006 280 / 0.7)",
                                border: "1px solid oklch(0.94 0.015 280 / 0.5)",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => toggleSection(key)}
                                className="w-full flex items-center gap-2 px-4 py-3 text-left"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
                                )}
                                <span className="text-sm font-semibold capitalize flex-1">
                                  {key.replace(/_/g, " ")}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {Array.isArray(value) ? `${(value as unknown[]).length} items` : typeof value}
                                </span>
                              </button>
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="overflow-hidden"
                                  >
                                    <pre
                                      className="px-4 pb-4 text-xs leading-relaxed overflow-x-auto"
                                      style={{ color: "oklch(0.45 0.03 280)" }}
                                    >
                                      {JSON.stringify(value, null, 2)}
                                    </pre>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )
                        })
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
