"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Settings, Slack, Activity, Save, Zap, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { fetchSettings, updateSettings, testSlackConnection, type SettingsResponse } from "@/lib/api"

type TestState = "idle" | "testing" | "success" | "error"

export function SettingsPanel() {
  const [settings, setSettings] = useState<SettingsResponse | null>(null)
  const [slackUrl, setSlackUrl] = useState("")
  const [omiumKey, setOmiumKey] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")
  const [slackTest, setSlackTest] = useState<TestState>("idle")
  const [slackTestMsg, setSlackTestMsg] = useState("")

  useEffect(() => {
    fetchSettings()
      .then((data) => setSettings(data))
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaveMessage("")
    try {
      const body: Record<string, string> = {}
      if (slackUrl) body.slack_webhook_url = slackUrl
      if (omiumKey) body.omium_api_key = omiumKey

      if (Object.keys(body).length === 0) {
        setSaveMessage("No changes to save")
        setSaving(false)
        return
      }

      await updateSettings(body)
      setSaveMessage("Settings saved!")
      setSlackUrl("")
      setOmiumKey("")
      // Refresh settings
      const updated = await fetchSettings()
      setSettings(updated)
    } catch (err) {
      setSaveMessage("Failed to save settings")
    }
    setSaving(false)
    setTimeout(() => setSaveMessage(""), 3000)
  }

  const handleTestSlack = async () => {
    setSlackTest("testing")
    setSlackTestMsg("")
    try {
      const result = await testSlackConnection()
      setSlackTest("success")
      setSlackTestMsg(result.message)
    } catch {
      setSlackTest("error")
      setSlackTestMsg("Failed to send test message")
    }
    setTimeout(() => {
      setSlackTest("idle")
      setSlackTestMsg("")
    }, 4000)
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid oklch(0.9 0.02 280 / 0.5)",
    background: "oklch(0.99 0.005 280 / 0.8)",
    fontSize: "13px",
    fontFamily: "'SF Mono', 'Fira Code', monospace",
    color: "oklch(0.3 0.03 280)",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  }

  return (
    <motion.div
      id="settings"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
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
      {/* Header */}
      <div className="px-6 py-5 flex items-center gap-3" style={{ borderBottom: "1px solid oklch(0.93 0.02 280 / 0.4)" }}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, oklch(0.65 0.18 280) 0%, oklch(0.55 0.2 300) 100%)",
            boxShadow: "0 4px 12px oklch(0.55 0.2 280 / 0.3)",
          }}
        >
          <Settings className="w-4.5 h-4.5 text-white" />
        </div>
        <div>
          <h3 className="text-base font-semibold" style={{ letterSpacing: "-0.02em" }}>
            Integrations
          </h3>
          <p className="text-xs font-medium" style={{ color: "oklch(0.55 0.03 280)" }}>
            Connect your own Slack & Omium
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5 space-y-5">
        {/* Slack */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Slack className="w-4 h-4" style={{ color: "oklch(0.55 0.15 350)" }} />
            <label className="text-sm font-semibold" style={{ color: "oklch(0.35 0.03 280)" }}>
              Slack Webhook URL
            </label>
            {settings?.slack_webhook_url.configured && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{
                  background: settings.slack_webhook_url.source === "user"
                    ? "oklch(0.92 0.08 160)"
                    : "oklch(0.93 0.05 280)",
                  color: settings.slack_webhook_url.source === "user"
                    ? "oklch(0.35 0.12 160)"
                    : "oklch(0.45 0.05 280)",
                }}
              >
                {settings.slack_webhook_url.source === "user" ? "Custom" : "Default"}
              </span>
            )}
          </div>
          <input
            type="text"
            value={slackUrl}
            onChange={(e) => setSlackUrl(e.target.value)}
            placeholder={settings?.slack_webhook_url.value || "https://hooks.slack.com/services/..."}
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
          <button
            onClick={handleTestSlack}
            disabled={slackTest === "testing"}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
            style={{
              background: slackTest === "success" ? "oklch(0.92 0.08 160)" : slackTest === "error" ? "oklch(0.92 0.08 25)" : "oklch(0.95 0.03 280)",
              color: slackTest === "success" ? "oklch(0.35 0.12 160)" : slackTest === "error" ? "oklch(0.4 0.12 25)" : "oklch(0.45 0.05 280)",
              border: "1px solid oklch(0.9 0.02 280 / 0.3)",
            }}
          >
            {slackTest === "testing" ? (
              <><Loader2 className="w-3 h-3 animate-spin" /> Testing...</>
            ) : slackTest === "success" ? (
              <><CheckCircle2 className="w-3 h-3" /> {slackTestMsg}</>
            ) : slackTest === "error" ? (
              <><XCircle className="w-3 h-3" /> {slackTestMsg}</>
            ) : (
              <><Zap className="w-3 h-3" /> Test Connection</>
            )}
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, oklch(0.9 0.03 280 / 0.5), transparent)" }} />

        {/* Omium */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" style={{ color: "oklch(0.6 0.18 180)" }} />
            <label className="text-sm font-semibold" style={{ color: "oklch(0.35 0.03 280)" }}>
              Omium API Key
            </label>
            {settings?.omium_api_key.configured && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{
                  background: settings.omium_api_key.source === "user"
                    ? "oklch(0.92 0.08 160)"
                    : "oklch(0.93 0.05 280)",
                  color: settings.omium_api_key.source === "user"
                    ? "oklch(0.35 0.12 160)"
                    : "oklch(0.45 0.05 280)",
                }}
              >
                {settings.omium_api_key.source === "user" ? "Custom" : "Default"}
              </span>
            )}
          </div>
          <input
            type="password"
            value={omiumKey}
            onChange={(e) => setOmiumKey(e.target.value)}
            placeholder={settings?.omium_api_key.value || "omium_..."}
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

      {/* Footer */}
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{ borderTop: "1px solid oklch(0.93 0.02 280 / 0.4)" }}
      >
        <AnimatePresence mode="wait">
          {saveMessage && (
            <motion.span
              key={saveMessage}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs font-semibold"
              style={{ color: saveMessage.includes("Failed") ? "oklch(0.55 0.18 25)" : "oklch(0.45 0.15 160)" }}
            >
              {saveMessage}
            </motion.span>
          )}
        </AnimatePresence>
        <button
          onClick={handleSave}
          disabled={saving || (!slackUrl && !omiumKey)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all cursor-pointer"
          style={{
            background: saving || (!slackUrl && !omiumKey)
              ? "oklch(0.75 0.05 280)"
              : "linear-gradient(135deg, oklch(0.55 0.2 280) 0%, oklch(0.5 0.22 300) 100%)",
            boxShadow: saving || (!slackUrl && !omiumKey)
              ? "none"
              : "0 4px 14px oklch(0.5 0.2 280 / 0.3)",
            opacity: saving || (!slackUrl && !omiumKey) ? 0.5 : 1,
          }}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Settings
        </button>
      </div>
    </motion.div>
  )
}
