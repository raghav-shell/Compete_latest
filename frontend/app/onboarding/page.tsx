"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { Loader2, Slack, Activity, Save, ArrowRight } from "lucide-react"
import { updateSettings } from "@/lib/api"

export default function OnboardingPage() {
  const [slackUrl, setSlackUrl] = useState("")
  const [omiumKey, setOmiumKey] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const body: Record<string, string> = {}
      if (slackUrl) body.slack_webhook_url = slackUrl
      if (omiumKey) body.omium_api_key = omiumKey

      if (Object.keys(body).length > 0) {
        await updateSettings(body)
      }
      
      router.push("/")
      router.refresh()
    } catch (err) {
      setError("Failed to save settings. You can try again later from the dashboard.")
      setSaving(false)
    }
  }

  const handleSkip = () => {
    router.push("/")
    router.refresh()
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
            <Activity className="w-5 h-5 text-white relative z-10" />
          </div>
          <h1 className="text-3xl font-bold font-outfit mb-2" style={{ letterSpacing: "-0.02em" }}>
            Connect Integrations
          </h1>
          <p className="text-sm font-medium" style={{ color: "oklch(0.55 0.03 280)" }}>
            Let's get your competitive intelligence pipeline connected to your workspace.
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
          <form onSubmit={handleSave} className="p-6 space-y-6">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 p-3 rounded-lg text-sm font-medium mb-4" style={{ background: "oklch(0.95 0.08 25)", color: "oklch(0.45 0.18 25)" }}>
                    <span>{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold" style={{ color: "oklch(0.35 0.03 280)" }}>
                  Slack Webhook URL
                </label>
                <div className="relative group">
                  <Slack className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 transition-colors" style={{ color: "oklch(0.6 0.15 350)" }} />
                  <input
                    type="text"
                    value={slackUrl}
                    onChange={(e) => setSlackUrl(e.target.value)}
                    placeholder="https://hooks.slack.com/services/..."
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

              <div className="space-y-2">
                <label className="text-sm font-semibold" style={{ color: "oklch(0.35 0.03 280)" }}>
                  Omium API Key
                </label>
                <div className="relative group">
                  <Activity className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 transition-colors" style={{ color: "oklch(0.6 0.18 180)" }} />
                  <input
                    type="password"
                    value={omiumKey}
                    onChange={(e) => setOmiumKey(e.target.value)}
                    placeholder="omium_..."
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
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all cursor-pointer relative overflow-hidden group"
                style={{
                  background: saving
                    ? "oklch(0.75 0.05 280)"
                    : "linear-gradient(135deg, oklch(0.55 0.2 280) 0%, oklch(0.5 0.22 300) 100%)",
                  boxShadow: saving
                    ? "none"
                    : "0 4px 14px oklch(0.5 0.2 280 / 0.3)",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 100%)" }} />
                {saving ? (
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save & Continue</span>
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={handleSkip}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                style={{
                  color: "oklch(0.5 0.03 280)",
                  background: "transparent",
                }}
              >
                Skip for now
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
