import { Sidebar } from "@/components/dashboard/sidebar"
import { Navbar } from "@/components/dashboard/navbar"
import { AgentPipeline } from "@/components/dashboard/agent-pipeline"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { CompetitorCards } from "@/components/dashboard/competitor-cards"
import { SlackPreview } from "@/components/dashboard/slack-preview"
import { RunHistory } from "@/components/dashboard/run-history"
import { TraceCard } from "@/components/dashboard/trace-card"
import { Background } from "@/components/dashboard/background"

export default function Dashboard() {
  return (
    <div className="min-h-screen relative">
      <Background />
      <Navbar />
      <Sidebar />

      {/* Main Content */}
      <main className="pl-24 pr-6 pt-28 pb-12 max-w-7xl mx-auto">
        <div className="space-y-8">
          {/* Hero Section - Agent Pipeline */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <AgentPipeline />
            </div>
            <div>
              <ActivityFeed />
            </div>
          </section>

          {/* Competitor Intelligence */}
          <CompetitorCards />

          {/* Bottom Section */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <SlackPreview />
            </div>
            <div>
              <RunHistory />
            </div>
            <div>
              <TraceCard />
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
