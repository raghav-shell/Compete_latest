"use client"

import { motion } from "framer-motion"
import { Sparkles, Clock, ChevronDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { usePipeline } from "@/providers/pipeline-provider"
import { formatRelativeTime } from "@/lib/pipeline-utils"
import { useAuth } from "@/providers/auth-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, User as UserIcon } from "lucide-react"

const DEFAULT_AVATARS = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&h=100&fit=crop", // Liquid abstract
  "https://images.unsplash.com/photo-1614729939124-032f0b56c9ce?w=100&h=100&fit=crop", // Space abstract
  "https://images.unsplash.com/photo-1634152962476-4b8a00e1915c?w=100&h=100&fit=crop", // Glass abstract
  "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=100&h=100&fit=crop", // Cyberpunk abstract
]

export function Navbar() {
  const { status, runs, isConnected, isTriggering, triggerAnalysis } = usePipeline()
  const { user, signOut } = useAuth()

  // Deterministically pick an avatar based on email length/characters
  const avatarIndex = user?.email
    ? user.email.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % DEFAULT_AVATARS.length
    : 0
  const profileImage = DEFAULT_AVATARS[avatarIndex]

  const pipelineLabel =
    status?.status === "running"
      ? "Pipeline Active"
      : status?.status === "failed"
        ? "Pipeline Failed"
        : status?.status === "completed"
          ? "Last Run Complete"
          : isConnected
            ? "Ready"
            : "Backend Offline"

  const statusColor =
    status?.status === "running"
      ? "oklch(0.55 0.18 160)"
      : status?.status === "failed"
        ? "oklch(0.6 0.2 50)"
        : isConnected
          ? "oklch(0.55 0.12 250)"
          : "oklch(0.55 0.05 280)"
  return (
    <motion.header
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-40 px-6 py-4"
    >
      <div className="max-w-7xl mx-auto">
        {/* Ambient glow line above navbar */}
        <motion.div
          className="absolute -top-4 left-1/2 -translate-x-1/2 w-[60%] h-px"
          style={{
            background: "linear-gradient(90deg, transparent, oklch(0.7 0.15 260 / 0.4), oklch(0.75 0.12 200 / 0.3), transparent)",
          }}
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        <div 
          className="rounded-2xl px-6 py-3.5 flex items-center justify-between relative overflow-hidden"
          style={{
            background: "linear-gradient(180deg, oklch(0.995 0.005 280 / 0.95) 0%, oklch(0.99 0.008 270 / 0.85) 100%)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: "1px solid oklch(0.92 0.03 280 / 0.6)",
            boxShadow: `
              0 0 0 1px oklch(1 0 0 / 0.05) inset,
              0 8px 32px oklch(0.5 0.1 260 / 0.08),
              0 2px 8px oklch(0.5 0.05 280 / 0.05)
            `,
          }}
        >
          {/* Top edge highlight */}
          <div 
            className="absolute top-0 left-0 right-0 h-px"
            style={{
              background: "linear-gradient(90deg, transparent 10%, oklch(1 0 0 / 0.5) 50%, transparent 90%)",
            }}
          />

          {/* Logo */}
          <div className="flex items-center gap-3.5">
            <motion.div 
              className="relative w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden"
              style={{
                background: "linear-gradient(135deg, oklch(0.55 0.2 260), oklch(0.65 0.18 220))",
                boxShadow: "0 4px 16px oklch(0.5 0.2 260 / 0.3)",
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Sparkles className="w-5 h-5 text-white relative z-10" />
              <motion.div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(180deg, oklch(1 0 0 / 0.2) 0%, transparent 50%)",
                }}
              />
            </motion.div>
            <span 
              className="text-lg font-semibold"
              style={{ letterSpacing: "-0.02em" }}
            >
              CompeteIQ
            </span>
          </div>

          {/* Center - Status */}
          <div className="flex items-center gap-8">
            {/* Live Status */}
            <motion.div 
              className="flex items-center gap-2.5 text-sm font-medium"
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <span className="relative flex h-2.5 w-2.5">
                <motion.span 
                  className="absolute inline-flex h-full w-full rounded-full"
                  style={{ background: statusColor }}
                  animate={
                    status?.status === "running"
                      ? { scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }
                      : {}
                  }
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span 
                  className="relative inline-flex rounded-full h-2.5 w-2.5"
                  style={{ 
                    background: statusColor,
                    boxShadow: `0 0 8px ${statusColor} / 0.5`,
                  }}
                />
              </span>
              <span style={{ color: "oklch(0.45 0.05 280)" }}>{pipelineLabel}</span>
            </motion.div>

            {/* Separator */}
            <div className="w-px h-5" style={{ background: "oklch(0.9 0.02 280)" }} />

            {/* Last Run */}
            <div className="flex items-center gap-2 text-sm" style={{ color: "oklch(0.5 0.03 280)" }}>
              <Clock className="w-4 h-4" />
              <span className="font-medium">
                Last run {formatRelativeTime(runs[0]?.date ?? status?.started_at ?? null)}
              </span>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-5">
            {/* Run Analysis Button */}
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Button
                onClick={() => void triggerAnalysis()}
                disabled={isTriggering || status?.status === "running" || !isConnected}
                className="relative overflow-hidden border-0 px-5 py-2.5 h-auto text-white font-semibold disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, oklch(0.55 0.2 260), oklch(0.6 0.18 230))",
                  boxShadow: `
                    0 8px 24px oklch(0.5 0.2 260 / 0.35),
                    0 0 0 1px oklch(0.6 0.15 260 / 0.3) inset,
                    0 1px 0 oklch(1 0 0 / 0.1) inset
                  `,
                }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  {isTriggering || status?.status === "running" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {status?.status === "running" ? "Running…" : "Run Analysis"}
                </span>
                {/* Animated shimmer */}
                <motion.div 
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(90deg, transparent, oklch(1 0 0 / 0.15), transparent)",
                  }}
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                />
                {/* Glow effect on hover */}
                <motion.div
                  className="absolute inset-0 opacity-0 transition-opacity"
                  style={{
                    background: "radial-gradient(circle at center, oklch(0.7 0.15 260 / 0.3), transparent)",
                  }}
                />
              </Button>
            </motion.div>

            {/* Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.div 
                  className="flex items-center gap-2.5 cursor-pointer rounded-xl px-2.5 py-2 transition-all"
                  style={{ 
                    background: "transparent",
                  }}
                  whileHover={{ 
                    background: "oklch(0.95 0.01 280)",
                  }}
                >
                  <Avatar className="w-8 h-8 ring-2 ring-offset-1" style={{ ringColor: "oklch(0.92 0.03 260)" }}>
                    <AvatarImage src={profileImage} />
                    <AvatarFallback style={{ background: "linear-gradient(135deg, oklch(0.9 0.05 260), oklch(0.92 0.04 200))" }}>
                      {user?.email?.charAt(0).toUpperCase() || "CQ"}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="w-4 h-4" style={{ color: "oklch(0.5 0.03 280)" }} />
                </motion.div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 font-sans">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Account</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={() => void signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </motion.header>
  )
}
