"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { Loader2, Mail, Lock, AlertCircle, ArrowRight } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const router = useRouter()
  const supabase = createClient()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push("/")
        router.refresh()
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        
        // With email confirmation disabled, user is signed in immediately
        // Redirect to onboarding to collect integrations
        router.push("/onboarding")
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during authentication.")
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px 12px 42px",
    borderRadius: "12px",
    border: "1px solid oklch(0.9 0.02 280 / 0.5)",
    background: "oklch(0.99 0.005 280 / 0.8)",
    fontSize: "14px",
    fontFamily: "var(--font-sans)",
    color: "oklch(0.3 0.03 280)",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
      {/* Background decorations */}
      <div 
        className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] opacity-40 pointer-events-none"
        style={{ background: "oklch(0.95 0.05 250)" }}
      />
      <div 
        className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] opacity-30 pointer-events-none"
        style={{ background: "oklch(0.95 0.05 280)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md p-8 relative z-10"
      >
        <div className="text-center mb-8">
          <div 
            className="w-12 h-12 rounded-xl mx-auto mb-6 flex items-center justify-center relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, oklch(0.6 0.15 280) 0%, oklch(0.5 0.2 300) 100%)",
              boxShadow: "0 8px 24px oklch(0.55 0.2 280 / 0.3)",
            }}
          >
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)" }} />
            <span className="text-xl font-bold text-white relative z-10 font-outfit">C</span>
          </div>
          <h1 className="text-3xl font-bold font-outfit mb-2" style={{ letterSpacing: "-0.02em" }}>
            Welcome to CompeteIQ
          </h1>
          <p className="text-sm font-medium" style={{ color: "oklch(0.55 0.03 280)" }}>
            Sign in to access your competitive intelligence dashboard.
          </p>
        </div>

        <div
          className="rounded-2xl overflow-hidden relative"
          style={{
            background: "linear-gradient(145deg, oklch(0.995 0.005 280 / 0.95) 0%, oklch(0.99 0.01 270 / 0.9) 100%)",
            border: "1px solid oklch(0.92 0.03 280 / 0.5)",
            boxShadow: `
              0 0 0 1px oklch(1 0 0 / 0.05) inset,
              0 12px 40px oklch(0.5 0.08 260 / 0.08),
              0 4px 12px oklch(0.5 0.06 280 / 0.05)
            `,
          }}
        >
          {/* Tabs */}
          <div className="flex border-b" style={{ borderColor: "oklch(0.92 0.03 280 / 0.5)" }}>
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(""); setMessage(""); }}
              className="flex-1 py-4 text-sm font-semibold transition-colors relative"
              style={{ color: isLogin ? "oklch(0.3 0.03 280)" : "oklch(0.6 0.03 280)" }}
            >
              Sign In
              {isLogin && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{ background: "oklch(0.55 0.2 280)" }}
                />
              )}
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(""); setMessage(""); }}
              className="flex-1 py-4 text-sm font-semibold transition-colors relative"
              style={{ color: !isLogin ? "oklch(0.3 0.03 280)" : "oklch(0.6 0.03 280)" }}
            >
              Sign Up
              {!isLogin && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{ background: "oklch(0.55 0.2 280)" }}
                />
              )}
            </button>
          </div>

          <form onSubmit={handleAuth} className="p-6 space-y-5">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 p-3 rounded-lg text-sm font-medium" style={{ background: "oklch(0.95 0.08 25)", color: "oklch(0.45 0.18 25)" }}>
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                </motion.div>
              )}
              {message && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 p-3 rounded-lg text-sm font-medium" style={{ background: "oklch(0.95 0.08 160)", color: "oklch(0.35 0.15 160)" }}>
                    <div className="w-4 h-4 shrink-0 rounded-full flex items-center justify-center border-2 border-current">
                      <span className="text-[10px] leading-none mb-px">✓</span>
                    </div>
                    <span>{message}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 transition-colors" style={{ color: "oklch(0.6 0.03 280)" }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  style={inputStyle}
                  onFocus={(e) => {
                    e.target.style.borderColor = "oklch(0.7 0.15 280)"
                    e.target.style.boxShadow = "0 0 0 3px oklch(0.7 0.15 280 / 0.1)"
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "oklch(0.9 0.02 280 / 0.5)"
                    e.target.style.boxShadow = "none"
                  }}
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 transition-colors" style={{ color: "oklch(0.6 0.03 280)" }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  style={inputStyle}
                  onFocus={(e) => {
                    e.target.style.borderColor = "oklch(0.7 0.15 280)"
                    e.target.style.boxShadow = "0 0 0 3px oklch(0.7 0.15 280 / 0.1)"
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "oklch(0.9 0.02 280 / 0.5)"
                    e.target.style.boxShadow = "none"
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all cursor-pointer relative overflow-hidden group"
              style={{
                background: loading || (!email || !password)
                  ? "oklch(0.75 0.05 280)"
                  : "linear-gradient(135deg, oklch(0.55 0.2 280) 0%, oklch(0.5 0.22 300) 100%)",
                boxShadow: loading || (!email || !password)
                  ? "none"
                  : "0 4px 14px oklch(0.5 0.2 280 / 0.3)",
                opacity: loading || (!email || !password) ? 0.7 : 1,
              }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 100%)" }} />
              {loading ? (
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? "Sign In" : "Create Account"}</span>
                  <ArrowRight className="w-4 h-4 opacity-70 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
