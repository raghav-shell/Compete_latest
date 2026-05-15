import { Navbar } from "@/components/dashboard/navbar"
import { AgentPipeline } from "@/components/dashboard/agent-pipeline"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { CompetitorCards } from "@/components/dashboard/competitor-cards"
import { SlackPreview } from "@/components/dashboard/slack-preview"
import { RunHistory } from "@/components/dashboard/run-history"
import { TraceCard } from "@/components/dashboard/trace-card"
import { Background } from "@/components/dashboard/background"
import { PipelineProvider } from "@/providers/pipeline-provider"

export default function Dashboard() {
  return (
    <PipelineProvider>
      <div className="min-h-screen relative">
        <Background />
        <Navbar />

        <main className="px-6 pt-36 pb-16 max-w-[90rem] mx-auto">
          <div className="space-y-20">
            
            {/* Section 1: Live Orchestration */}
            <section>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2">
                  <AgentPipeline />
                </div>
                <div className="lg:col-span-1">
                  <ActivityFeed />
                </div>
              </div>
            </section>

            {/* Section 2: Competitive Intelligence */}
            <section className="relative">
              <div className="absolute -top-10 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, oklch(0.9 0.05 280 / 0.5), transparent)" }} />
              <CompetitorCards />
            </section>

            {/* Section 3: System Diagnostics & History */}
            <section className="relative">
              <div className="absolute -top-10 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, oklch(0.9 0.05 280 / 0.5), transparent)" }} />
              <div className="mb-6 px-2">
                <h3 className="text-xl font-semibold mb-1" style={{ letterSpacing: "-0.02em" }}>
                  System Diagnostics & History
                </h3>
                <p className="text-sm font-medium" style={{ color: "oklch(0.5 0.03 280)" }}>
                  Logs, execution traces, and output digests
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                <RunHistory />
                <TraceCard />
                <SlackPreview />
              </div>
            </section>

          </div>
        </main>
      </div>
    </PipelineProvider>
  )
}
