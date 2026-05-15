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

        <main className="px-6 pt-28 pb-12 max-w-7xl mx-auto">
          <div className="space-y-8">
            <section id="dashboard" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <AgentPipeline />
              </div>
              <div id="reports">
                <ActivityFeed />
              </div>
            </section>

            <div id="competitors">
              <CompetitorCards />
            </div>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div>
                <SlackPreview />
              </div>
              <div id="runs">
                <RunHistory />
              </div>
              <div id="traces">
                <TraceCard />
              </div>
            </section>
          </div>
        </main>
      </div>
    </PipelineProvider>
  )
}
