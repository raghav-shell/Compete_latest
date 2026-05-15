"use client"

import { motion } from "framer-motion"
import { Activity, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

const steps = [
  { label: "Scout", time: "0ms", active: true, color: "oklch(0.55 0.18 250)" },
  { label: "Signal", time: "892ms", active: true, color: "oklch(0.6 0.15 200)" },
  { label: "Analyst", time: "2.4s", active: true, color: "oklch(0.55 0.12 180)" },
  { label: "Report", time: "3.8s", active: false, color: "oklch(0.5 0.12 160)" },
  { label: "Notifier", time: "4.2s", active: false, color: "oklch(0.55 0.15 280)" },
]

export function TraceCard() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.7 }}
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
            className="w-11 h-11 rounded-xl flex items-center justify-center relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, oklch(0.5 0.2 280), oklch(0.55 0.18 300))",
              boxShadow: "0 4px 16px oklch(0.4 0.2 280 / 0.3)",
            }}
            animate={{
              boxShadow: [
                "0 4px 16px oklch(0.4 0.2 280 / 0.3)",
                "0 4px 24px oklch(0.4 0.2 280 / 0.45)",
                "0 4px 16px oklch(0.4 0.2 280 / 0.3)",
              ]
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Activity className="w-5 h-5 text-white relative z-10" />
            <div 
              className="absolute inset-0"
              style={{
                background: "linear-gradient(180deg, oklch(1 0 0 / 0.2) 0%, transparent 50%)",
              }}
            />
          </motion.div>
          <div>
            <h3 className="font-semibold" style={{ letterSpacing: "-0.01em" }}>Execution Trace</h3>
            <p className="text-xs font-medium" style={{ color: "oklch(0.55 0.03 280)" }}>
              Full observability into AI pipeline
            </p>
          </div>
        </div>
      </div>

      {/* Timeline Preview */}
      <div className="relative py-3 px-2">
        {/* Gradient line */}
        <div 
          className="absolute left-[18px] top-2 bottom-2 w-0.5 rounded-full"
          style={{
            background: "linear-gradient(180deg, oklch(0.55 0.18 260), oklch(0.6 0.15 200), oklch(0.5 0.12 160), oklch(0.85 0.02 280))",
          }}
        />
        
        {steps.map((step, index) => (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ 
              delay: 0.85 + index * 0.1, 
              duration: 0.5,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="relative flex items-center gap-4 py-2.5 pl-10"
          >
            {/* Node */}
            <motion.div 
              className="absolute left-2 w-4 h-4 rounded-full flex items-center justify-center"
              style={{
                background: step.active ? step.color : "oklch(0.94 0.01 280)",
                border: step.active ? "none" : "2px solid oklch(0.85 0.02 280)",
                boxShadow: step.active ? `0 0 12px ${step.color} / 0.4` : "none",
              }}
              animate={step.active ? { 
                boxShadow: [
                  `0 0 8px ${step.color} / 0.3`,
                  `0 0 16px ${step.color} / 0.5`,
                  `0 0 8px ${step.color} / 0.3`,
                ]
              } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {step.active && (
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              )}
            </motion.div>
            
            <span 
              className="text-sm font-semibold"
              style={{ 
                color: step.active ? "oklch(0.25 0.03 280)" : "oklch(0.6 0.02 280)",
                letterSpacing: "-0.01em",
              }}
            >
              {step.label}
            </span>
            <span 
              className="text-xs font-medium ml-auto px-2 py-0.5 rounded-md"
              style={{ 
                background: step.active ? `${step.color} / 0.1` : "oklch(0.95 0.01 280)",
                color: step.active ? step.color : "oklch(0.55 0.02 280)",
              }}
            >
              {step.time}
            </span>
          </motion.div>
        ))}
      </div>

      <motion.div whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.99 }}>
        <Button 
          variant="outline" 
          className="w-full mt-3 text-sm font-semibold h-10"
          style={{
            background: "oklch(0.97 0.008 280 / 0.6)",
            border: "1px solid oklch(0.92 0.02 280 / 0.6)",
            color: "oklch(0.45 0.05 260)",
          }}
        >
          View Full Trace
          <ExternalLink className="w-4 h-4 ml-2" />
        </Button>
      </motion.div>
    </motion.section>
  )
}
