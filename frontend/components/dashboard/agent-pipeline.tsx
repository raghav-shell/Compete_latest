"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Search, Zap, Brain, FileText, Bell } from "lucide-react"
import { useEffect, useState } from "react"
import { usePipeline } from "@/providers/pipeline-provider"
import { getActiveAgentIndex } from "@/lib/pipeline-utils"

const agents = [
  { id: "scout", name: "Scout", icon: Search, status: "Analyzing pricing pages...", color: "from-blue-500 to-cyan-400" },
  { id: "signal", name: "Signal", icon: Zap, status: "Detecting changes...", color: "from-cyan-400 to-teal-400" },
  { id: "analyst", name: "Analyst", icon: Brain, status: "Processing insights...", color: "from-teal-400 to-emerald-400" },
  { id: "report", name: "Report", icon: FileText, status: "Generating report...", color: "from-emerald-400 to-blue-400" },
  { id: "notifier", name: "Notifier", icon: Bell, status: "Sending updates...", color: "from-blue-400 to-indigo-500" },
]

// Removed expensive FlowingParticles to improve performance

export function AgentPipeline() {
  const { status, isConnected } = usePipeline()
  const [demoProgress, setDemoProgress] = useState(0)

  const isRunning = status?.status === "running"
  const isFailed = status?.status === "failed"
  const backendProgress = status?.progress ?? 0
  const activeAgent = status
    ? getActiveAgentIndex(status.current_agent, status.status)
    : -1

  // Subtle animation between backend poll ticks while running
  useEffect(() => {
    if (!isRunning) {
      setDemoProgress(0)
      return
    }
    const interval = setInterval(() => {
      setDemoProgress((prev) => (prev >= 95 ? 0 : prev + 5))
    }, 200)
    return () => clearInterval(interval)
  }, [isRunning, backendProgress])

  const displayProgress = isRunning
    ? Math.min(backendProgress + demoProgress * 0.05, 99)
    : backendProgress

  const statusBadge = isFailed
    ? "Failed"
    : isRunning
      ? "Running"
      : status?.status === "completed"
        ? "Completed"
        : isConnected
          ? "Idle"
          : "Offline"

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-[2rem] p-10 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, oklch(0.99 0.005 280 / 0.9) 0%, oklch(0.98 0.01 260 / 0.85) 100%)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid oklch(0.92 0.03 280 / 0.6)",
        boxShadow: `
          0 0 0 1px oklch(1 0 0 / 0.1) inset,
          0 20px 60px oklch(0.6 0.15 260 / 0.1),
          0 8px 24px oklch(0.5 0.1 200 / 0.08)
        `,
      }}
    >
      {/* Ambient glow behind the panel */}
      <div 
        className="absolute -inset-20 -z-10 opacity-60"
        style={{
          background: "radial-gradient(ellipse at center, oklch(0.8 0.1 260 / 0.15) 0%, transparent 60%)",
        }}
      />
      
      {/* Inner light reflection */}
      <div 
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent, oklch(1 0 0 / 0.4), transparent)",
        }}
      />

      <div className="flex items-center justify-between mb-10">
        <div>
          <motion.h2 
            className="text-2xl font-semibold tracking-tight mb-1.5"
            style={{ letterSpacing: "-0.02em" }}
          >
            Multi-Agent Orchestration
          </motion.h2>
          <p className="text-sm text-muted-foreground font-medium">Live autonomous pipeline execution</p>
        </div>
        <motion.div 
          className="flex items-center gap-2.5 px-4 py-2 rounded-full text-sm font-medium"
          style={{
            background: "linear-gradient(135deg, oklch(0.95 0.05 160 / 0.8) 0%, oklch(0.92 0.08 160 / 0.6) 100%)",
            color: "oklch(0.35 0.12 160)",
            border: "1px solid oklch(0.85 0.1 160 / 0.4)",
            boxShadow: "0 0 20px oklch(0.7 0.15 160 / 0.2)",
          }}
          animate={{ 
            boxShadow: [
              "0 0 20px oklch(0.7 0.15 160 / 0.2)",
              "0 0 30px oklch(0.7 0.15 160 / 0.3)",
              "0 0 20px oklch(0.7 0.15 160 / 0.2)",
            ]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="relative flex h-2.5 w-2.5">
            <motion.span 
              className="absolute inline-flex h-full w-full rounded-full"
              style={{ background: "oklch(0.55 0.15 160)" }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.7, 0, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span 
              className="relative inline-flex rounded-full h-2.5 w-2.5"
              style={{ background: "oklch(0.5 0.15 160)" }}
            />
          </span>
          {statusBadge}
        </motion.div>
      </div>

      {/* Pipeline Visualization */}
      <div className="relative py-8">
        {/* Connection segments with particles */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-[calc(10%+2rem)]" style={{ zIndex: 5 }}>
          {agents.slice(0, -1).map((_, index) => {
            const isActive = index < activeAgent
            const isAnimating = index === activeAgent - 1

            return (
              <div 
                key={index}
                className="flex-1 mx-1 relative h-8 flex items-center"
              >
                {/* Base line */}
                <div 
                  className="absolute inset-x-0 h-[2px] top-1/2 -translate-y-1/2 rounded-full"
                  style={{ background: "oklch(0.92 0.02 280)" }}
                />
                
                {/* Active gradient line */}
                <motion.div 
                  className="absolute inset-y-0 left-0 w-full h-[2px] top-1/2 -translate-y-1/2 rounded-full origin-left"
                  style={{
                    background: "linear-gradient(90deg, oklch(0.6 0.2 260), oklch(0.75 0.15 200))",
                    boxShadow: isActive ? "0 0 12px oklch(0.6 0.2 260 / 0.5)" : "none",
                  }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: isActive ? 1 : 0 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            )
          })}
        </div>

        {/* Agent Nodes */}
        <div className="relative flex items-center justify-between px-4" style={{ zIndex: 10 }}>
          {agents.map((agent, index) => {
            const isActive = isRunning && index === activeAgent
            const isCompleted =
              isRunning ? index < activeAgent : displayProgress >= 100 && activeAgent >= agents.length
            const Icon = agent.icon

            return (
              <motion.div
                key={agent.id}
                className="relative flex flex-col items-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * index, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Ambient glow behind active node */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 -z-10"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1.8 }}
                      exit={{ opacity: 0, scale: 1 }}
                      style={{
                        background: "radial-gradient(circle, oklch(0.7 0.15 260 / 0.4) 0%, transparent 70%)",
                        filter: "blur(20px)",
                      }}
                    />
                  )}
                </AnimatePresence>

                {/* Node container */}
                <motion.div
                  className="relative"
                  animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ duration: 2, repeat: isActive ? Infinity : 0, ease: "easeInOut" }}
                >
                  {/* Outer pulse ring */}
                  {isActive && (
                    <>
                      <motion.div
                        className="absolute -inset-3 rounded-[1.25rem]"
                        style={{ border: "1px solid oklch(0.6 0.2 260 / 0.3)" }}
                        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
                      />
                      <motion.div
                        className="absolute -inset-1.5 rounded-[1.1rem]"
                        style={{ border: "1px solid oklch(0.6 0.2 260 / 0.5)" }}
                        animate={{ scale: [1, 1.1, 1], opacity: [0.6, 0.2, 0.6] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
                      />
                    </>
                  )}

                  {/* Main node */}
                  <motion.div
                    className="relative w-[4.5rem] h-[4.5rem] rounded-2xl flex items-center justify-center overflow-hidden"
                    style={{
                      background: isActive
                        ? `linear-gradient(135deg, ${agent.color.replace('from-', '').replace(' to-', ', ')})`
                        : isCompleted
                        ? "linear-gradient(135deg, oklch(0.55 0.18 260), oklch(0.65 0.15 200))"
                        : "oklch(0.95 0.01 280)",
                      boxShadow: isActive
                        ? "0 8px 32px oklch(0.5 0.2 260 / 0.35), 0 0 0 1px oklch(1 0 0 / 0.1) inset"
                        : isCompleted
                        ? "0 4px 20px oklch(0.5 0.15 260 / 0.2)"
                        : "0 2px 8px oklch(0.5 0.05 280 / 0.1)",
                      border: isActive || isCompleted ? "none" : "1px solid oklch(0.9 0.02 280)",
                    }}
                  >
                    {/* Inner light for active state */}
                    {isActive && (
                      <motion.div
                        className="absolute inset-0"
                        style={{
                          background: "linear-gradient(180deg, oklch(1 0 0 / 0.2) 0%, transparent 50%)",
                        }}
                        animate={{ opacity: [0.5, 0.8, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                    
                    <Icon className={`w-7 h-7 relative z-10 ${isActive || isCompleted ? "text-white" : "text-muted-foreground"}`} />
                  </motion.div>
                </motion.div>

                {/* Label */}
                <motion.span 
                  className="mt-4 text-sm font-semibold tracking-tight"
                  style={{ 
                    color: isActive ? "oklch(0.25 0.05 280)" : "oklch(0.5 0.03 280)",
                  }}
                  animate={isActive ? { opacity: [0.8, 1, 0.8] } : {}}
                  transition={{ duration: 2, repeat: isActive ? Infinity : 0 }}
                >
                  {agent.name}
                </motion.span>

                {/* Status (only for active) */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute -bottom-8 whitespace-nowrap text-xs font-medium"
                      style={{ color: "oklch(0.5 0.08 260)" }}
                    >
                      {isRunning && status?.current_agent === agent.id
                        ? `${agent.name} running…`
                        : agent.status}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Timestamp */}
                {isCompleted && (
                  <motion.span 
                    className="text-xs mt-1.5 font-medium"
                    style={{ color: "oklch(0.55 0.05 260)" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {new Date(Date.now() - (activeAgent - index) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </motion.span>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-14">
        <div className="flex items-center justify-between text-xs font-medium mb-2">
          <span style={{ color: "oklch(0.5 0.05 280)" }}>Pipeline Progress</span>
          <span style={{ color: "oklch(0.45 0.08 260)" }}>{Math.round(displayProgress)}%</span>
        </div>
        <div 
          className="h-2 rounded-full overflow-hidden"
          style={{ 
            background: "oklch(0.94 0.015 280)",
            boxShadow: "inset 0 1px 2px oklch(0.5 0.05 280 / 0.1)",
          }}
        >
          <motion.div
            className="h-full rounded-full relative overflow-hidden"
            style={{
              background: "linear-gradient(90deg, oklch(0.55 0.2 260), oklch(0.65 0.18 220), oklch(0.7 0.15 200))",
              boxShadow: "0 0 12px oklch(0.6 0.2 260 / 0.4)",
            }}
            initial={{ width: "0%" }}
            animate={{ width: `${displayProgress}%` }}
            transition={{ duration: 0.3, ease: "linear" }}
          >
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(90deg, transparent, oklch(1 0 0 / 0.3), transparent)",
              }}
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
        </div>
      </div>
    </motion.section>
  )
}
