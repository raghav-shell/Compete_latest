<div align="center">
  <img src="https://raw.githubusercontent.com/raghav-shell/Compete_latest/main/frontend/public/logo.png" alt="CompeteIQ Logo" width="120" />
  <h1>🚀 CompeteIQ</h1>
  <p><strong>Next-Generation Autonomous Competitive Intelligence Platform</strong></p>

  [![Live Demo](https://img.shields.io/badge/Live_Demo-competeiq--three.vercel.app-blue?style=for-the-badge&logo=vercel)](https://competeiq-three.vercel.app/)
  [![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](#)
</div>

---

## 🌟 Overview

**CompeteIQ** is an advanced, autonomous competitive intelligence platform that leverages multi-agent AI architectures to track, analyze, and report on competitor activities in real-time. Say goodbye to manual competitor research and hello to automated insights.

The platform continuously scouts competitor domains, detects subtle strategy shifts, evaluates their market impact, and delivers comprehensive reports directly to your team's Slack and Notion workspaces.

> **Check out the live demo:** [https://competeiq-three.vercel.app/](https://competeiq-three.vercel.app/)

---

## ✨ Key Features

- **🤖 Autonomous Multi-Agent Pipeline**: Powered by LangGraph, featuring specialized AI agents (Scout, Signal, Analyst, Evaluator, Report, Notifier) that collaborate to generate deep insights.
- **📊 Real-Time Competitor Tracking**: Continuously monitors competitor domains for pricing changes, new feature launches, and marketing shifts.
- **⚡ Blazing Fast UI**: A premium, responsive, dark-mode optimized dashboard built with Next.js 14 and Tailwind CSS.
- **integrations Seamless Integrations**: Automatically pushes actionable reports to **Slack** and exports structured data to **Notion**.
- **🔭 Deep Observability**: Full execution tracing, latency monitoring, and pipeline debugging powered by **Omium**.
- **🔐 Secure & Scalable**: Authentication and database management handled seamlessly by **Supabase**.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS & Radix UI
- **State Management**: React Hooks & Context API
- **Authentication**: Supabase Auth
- **Deployment**: Vercel

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **AI Orchestration**: LangGraph & LangChain
- **LLM Providers**: Anthropic, Groq, G0I
- **Database**: PostgreSQL (via Supabase)
- **Observability**: Omium
- **Scheduling**: APScheduler
- **Deployment**: Render

---

## 🚀 Getting Started

Follow these steps to set up the project locally.

### Prerequisites
- Node.js 18+ and `pnpm`
- Python 3.11+
- A [Supabase](https://supabase.com/) project
- An [Omium](https://omium.ai/) account for tracing

### 1. Clone the repository
```bash
git clone https://github.com/raghav-shell/Compete_latest.git
cd Compete_latest
```

### 2. Frontend Setup
```bash
cd frontend
pnpm install

# Create a .env.local file and add your Supabase credentials
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
echo "NEXT_PUBLIC_SUPABASE_URL=your_supabase_url" >> .env.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key" >> .env.local

# Start the development server
pnpm run dev
```

### 3. Backend Setup
```bash
cd competewise_backend

# Create a virtual environment and install dependencies
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Create your .env file inside the competeiq directory
cd competeiq
cp .env.example .env # Add all your API keys (LLM, Slack, Notion, Supabase, Omium)

# Start the FastAPI server
cd ..
uvicorn competeiq.main:app --reload --port 8000
```

---

## 📈 Observability with Omium

CompeteIQ is deeply integrated with **Omium** to monitor the LangGraph AI pipeline. To view your agent execution traces:
1. Ensure `OMIUM_API_KEY` and `OMIUM_PROJECT=production` are set in your backend `.env`.
2. Trigger a pipeline run via the dashboard.
3. Log in to your Omium dashboard to view real-time agent thoughts, latencies, and execution graphs.

---

<div align="center">
  <p>Built with ❤️ by <a href="https://github.com/raghav-shell">Raghav Sharma</a></p>
</div>
