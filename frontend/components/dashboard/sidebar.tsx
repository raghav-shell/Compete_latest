"use client"

import { motion } from "framer-motion"
import { LayoutDashboard, Users, FileText, Play, Activity, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Users, label: "Competitors", active: false },
  { icon: FileText, label: "Reports", active: false },
  { icon: Play, label: "Runs", active: false },
  { icon: Activity, label: "Traces", active: false },
]

export function Sidebar() {
  return (
    <motion.aside
      initial={{ x: -30, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="fixed left-6 top-1/2 -translate-y-1/2 z-50"
    >
      <div 
        className="rounded-2xl p-3 flex flex-col gap-2 relative overflow-hidden"
        style={{
          background: "linear-gradient(145deg, oklch(0.995 0.005 280 / 0.9) 0%, oklch(0.99 0.008 270 / 0.85) 100%)",
          backdropFilter: "blur(40px)",
          border: "1px solid oklch(0.93 0.025 280 / 0.5)",
          boxShadow: `
            0 0 0 1px oklch(1 0 0 / 0.06) inset,
            0 12px 40px oklch(0.5 0.1 260 / 0.1),
            0 4px 12px oklch(0.5 0.08 280 / 0.06)
          `,
        }}
      >
        {/* Top highlight */}
        <div 
          className="absolute top-0 left-2 right-2 h-px"
          style={{
            background: "linear-gradient(90deg, transparent, oklch(1 0 0 / 0.4), transparent)",
          }}
        />

        {navItems.map((item, index) => (
          <motion.button
            key={item.label}
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ 
              delay: 0.1 * index, 
              duration: 0.5,
              ease: [0.16, 1, 0.3, 1],
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "relative p-3.5 rounded-xl transition-all duration-300 group",
              item.active
                ? "text-white"
                : "text-muted-foreground hover:text-foreground"
            )}
            style={{
              background: item.active 
                ? "linear-gradient(135deg, oklch(0.55 0.2 260), oklch(0.6 0.18 230))"
                : "transparent",
              boxShadow: item.active 
                ? "0 4px 16px oklch(0.5 0.2 260 / 0.35)"
                : "none",
            }}
          >
            <item.icon className="w-5 h-5 relative z-10" />
            
            {/* Inner light for active */}
            {item.active && (
              <div 
                className="absolute inset-0 rounded-xl"
                style={{
                  background: "linear-gradient(180deg, oklch(1 0 0 / 0.15) 0%, transparent 50%)",
                }}
              />
            )}
            
            {/* Hover background */}
            {!item.active && (
              <motion.div
                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: "oklch(0.95 0.015 280 / 0.8)",
                }}
              />
            )}
            
            {/* Tooltip */}
            <motion.div 
              className="absolute left-full ml-4 px-3.5 py-2 rounded-xl text-sm font-semibold opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 whitespace-nowrap pointer-events-none"
              style={{
                background: "linear-gradient(135deg, oklch(0.2 0.02 280), oklch(0.25 0.03 270))",
                color: "oklch(0.95 0.01 280)",
                boxShadow: "0 8px 24px oklch(0.1 0.02 280 / 0.4)",
                letterSpacing: "-0.01em",
              }}
              initial={{ x: -5 }}
              whileHover={{ x: 0 }}
            >
              {item.label}
              {/* Tooltip arrow */}
              <div 
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 rotate-45"
                style={{
                  background: "oklch(0.2 0.02 280)",
                }}
              />
            </motion.div>
          </motion.button>
        ))}

        {/* Separator */}
        <div 
          className="mx-2 my-1 h-px"
          style={{ background: "oklch(0.92 0.015 280 / 0.6)" }}
        />

        {/* Settings button */}
        <motion.button
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ 
            delay: 0.5, 
            duration: 0.5,
            ease: [0.16, 1, 0.3, 1],
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative p-3.5 rounded-xl transition-all duration-300 group text-muted-foreground hover:text-foreground"
        >
          <Settings className="w-5 h-5 relative z-10" />
          
          <motion.div
            className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: "oklch(0.95 0.015 280 / 0.8)",
            }}
          />
          
          {/* Tooltip */}
          <motion.div 
            className="absolute left-full ml-4 px-3.5 py-2 rounded-xl text-sm font-semibold opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 whitespace-nowrap pointer-events-none"
            style={{
              background: "linear-gradient(135deg, oklch(0.2 0.02 280), oklch(0.25 0.03 270))",
              color: "oklch(0.95 0.01 280)",
              boxShadow: "0 8px 24px oklch(0.1 0.02 280 / 0.4)",
              letterSpacing: "-0.01em",
            }}
          >
            Settings
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 rotate-45"
              style={{
                background: "oklch(0.2 0.02 280)",
              }}
            />
          </motion.div>
        </motion.button>
      </div>
    </motion.aside>
  )
}
