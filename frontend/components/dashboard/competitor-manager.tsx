"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Plus, X, Globe, Loader2 } from "lucide-react"
import { useState } from "react"
import { usePipeline } from "@/providers/pipeline-provider"

export function CompetitorManager() {
  const { trackedCompetitors, addCompetitor, removeCompetitor, isConnected } = usePipeline()
  const [input, setInput] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [removingDomain, setRemovingDomain] = useState<string | null>(null)

  const handleAdd = async () => {
    const domain = input.trim().toLowerCase()
    if (!domain || !domain.includes(".")) return
    setIsAdding(true)
    await addCompetitor(domain)
    setInput("")
    setIsAdding(false)
  }

  const handleRemove = async (domain: string) => {
    setRemovingDomain(domain)
    await removeCompetitor(domain)
    setRemovingDomain(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") void handleAdd()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative rounded-2xl p-5 overflow-hidden"
      style={{
        background: "linear-gradient(145deg, oklch(0.995 0.005 280 / 0.9) 0%, oklch(0.99 0.008 270 / 0.85) 100%)",
        border: "1px solid oklch(0.93 0.025 280 / 0.5)",
        boxShadow: "0 4px 20px oklch(0.5 0.08 260 / 0.06)",
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Globe className="w-4 h-4" style={{ color: "oklch(0.5 0.15 260)" }} />
        <span className="text-sm font-semibold" style={{ letterSpacing: "-0.01em" }}>
          Tracked Competitors
        </span>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full ml-auto"
          style={{
            background: "oklch(0.93 0.04 260 / 0.5)",
            color: "oklch(0.45 0.1 260)",
          }}
        >
          {trackedCompetitors.length}
        </span>
      </div>

      {/* Add input */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. slack.com"
          disabled={!isConnected || isAdding}
          className="flex-1 text-sm px-3 py-2 rounded-xl outline-none transition-all placeholder:text-muted-foreground/50"
          style={{
            background: "oklch(0.97 0.006 280 / 0.8)",
            border: "1px solid oklch(0.92 0.02 280 / 0.5)",
          }}
        />
        <motion.button
          type="button"
          onClick={() => void handleAdd()}
          disabled={!input.trim() || isAdding || !isConnected}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-3 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-40 transition-opacity"
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

      {/* Tracked list */}
      <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {trackedCompetitors.map((c) => (
            <motion.div
              key={c.domain}
              layout
              initial={{ opacity: 0, x: -20, height: 0 }}
              animate={{ opacity: 1, x: 0, height: "auto" }}
              exit={{ opacity: 0, x: 20, height: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center justify-between px-3 py-2 rounded-xl group"
              style={{
                background: "oklch(0.97 0.006 280 / 0.5)",
                border: "1px solid oklch(0.94 0.015 280 / 0.3)",
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.55 0.18 260), oklch(0.6 0.15 230))",
                  }}
                >
                  {c.display_name.charAt(0)}
                </div>
                <span className="text-sm font-medium truncate">{c.domain}</span>
              </div>
              <motion.button
                type="button"
                onClick={() => void handleRemove(c.domain)}
                disabled={removingDomain === c.domain}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-50"
              >
                {removingDomain === c.domain ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                ) : (
                  <X className="w-3.5 h-3.5 text-red-400" />
                )}
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>

        {trackedCompetitors.length === 0 && (
          <p className="text-xs text-center py-3 text-muted-foreground">
            No competitors tracked yet
          </p>
        )}
      </div>
    </motion.div>
  )
}
