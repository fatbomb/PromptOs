# Shared — Tech Stack, Environment, Repo Structure & Definition of Done

This document contains shared context that applies to **all phases** of the PromptOS implementation. Every team member should read this before starting any phase.

---

## Project Overview

PromptOS is a prompt refinement layer that sits in front of any AI coding assistant. Before a developer sends a vague prompt to Claude or ChatGPT, PromptOS runs a short conversational flow (3–5 questions) to assemble a structured, high-context prompt. It tracks dependency scores, knowledge gaps, and skill decay over time — turning every AI interaction into a learning event.

**Core features:**
- Conversational prompt refinement engine (Gemini Flash, stateful)
- Refusal Engine: tells you to try it yourself when you already know the answer
- Cost Receipt: shows turns saved, time recovered, and cost delta after every session
- Knowledge Map: bubble chart of concepts you keep asking about
- Skill Decay chart: week-over-week trend of your AI-dependence score
- Quiz Engine: auto-generated quizzes for amber/red concepts
- Team Leaderboard: ranked by lowest dependency score

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| AI engine | Google Gemini Flash 2.0 | Free tier: 1M tokens/day. No credit card needed. Get key at aistudio.google.com |
| Backend | FastAPI (Python) | Routers, JWT middleware, BackgroundTasks |
| Database | Supabase (Postgres) | Auth, RLS, Realtime |
| CLI | Node.js + Commander.js | inquirer, chalk, ora, keytar |
| Dashboard | Next.js 14 (App Router) | Tailwind, Recharts, @supabase/ssr |
| VS Code ext | TypeScript + React Webview | yo code scaffold |
| Browser ext | Vanilla JS + Shadow DOM | Injects into claude.ai / ChatGPT |
| Fallback AI | Claude Haiku or Groq Llama 3.1 8B | Identical system prompt works across all three |

---

## Phase Summary

| Phase | Folder | Title | Est. Time | Demoable? |
|---|---|---|---|---|
| 1 | `phase-1-backend/` | Core AI Conversation Engine + FastAPI Backend | ~8 hrs | ✅ via test script |
| 2 | `phase-2-cli/` | CLI Tool | ~5 hrs | ✅ live terminal demo |
| 3 | `phase-3-database/` | Database Schema + Progress Tracking | ~4 hrs | ✅ with real stored data |
| 4 | `phase-4-dashboard/` | Next.js Dashboard | ~8 hrs | ✅ full visual dashboard |
| 5 | `phase-5-extensions/` | VS Code + Browser Extension | ~9 hrs | ✅ most impressive surface |
| **Total** | | | **~34 hrs** | |

> ⚠️ Build left to right — never skip a phase. Every phase ends with a demoable product.

---

## Full Repo Structure

```
promptos/
├── backend/                  # FastAPI — Phase 1
│   ├── main.py
│   ├── routers/
│   │   ├── session.py
│   │   ├── refusal.py
│   │   ├── tokens.py
│   │   └── auth.py
│   ├── services/
│   │   ├── gemini.py
│   │   ├── scoring.py
│   │   └── concept_extractor.py
│   └── middleware/
│       └── jwt_verify.py
├── promptos-cli/             # Node.js CLI — Phase 2
│   ├── index.js
│   ├── commands/
│   └── utils/receipt.js
├── dashboard/                # Next.js 14 — Phase 4
│   ├── app/
│   │   ├── dashboard/
│   │   ├── auth/
│   │   └── api/
│   └── components/
│       ├── KnowledgeMap.tsx
│       ├── SkillDecayChart.tsx
│       └── QuizModal.tsx
├── vscode-extension/         # TypeScript + React Webview — Phase 5
│   ├── src/
│   └── package.json
├── browser-extension/        # Chrome MV3 — Phase 5
│   ├── content.js
│   └── manifest.json
└── supabase/                 # Migrations — Phase 3
    └── migrations/
        └── 001_initial_schema.sql
```

---

## Environment Variables (all services)

```env
# Backend (FastAPI)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_JWT_SECRET=
GEMINI_API_KEY=                  # aistudio.google.com, free
ANTHROPIC_API_KEY=               # fallback only
GROQ_API_KEY=                    # fallback only

# CLI
PROMPTOS_API_BASE_URL=https://prompt-os-dusky.vercel.app

# Dashboard (Next.js)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_BASE_URL=
```

> Store all secrets in `.env` files — never commit them. Add `.env` to `.gitignore` before the first commit.

---

## Definition of Done (Global)

A **task** is done when:
1. The test case listed in its row passes without manual workarounds.
2. The code is committed to `main` (or a PR is merged).
3. No other phase's tasks break as a result.
4. At least one teammate has seen it run on their machine.

A **phase** is done when all its tasks are done AND the demo flow for that phase can be run top-to-bottom in one attempt.

---

## Pre-Hackathon Demo Readiness Checklist

| ✅ | Check | Why it matters |
|---|---|---|
| ☐ | Seed DB with 2 weeks of fake session data | Skill Decay chart needs history — don't demo an empty chart |
| ☐ | Pre-create a team with 2 accounts | Team leaderboard demo needs 2 real users |
| ☐ | Test internet speed at demo venue | Gemini Flash is <300ms on good connection. Bad wifi = awkward pauses |
| ☐ | Have `--skip` flag ready as safety valve | If API goes down during demo, you can still show the dashboard |
| ☐ | Screenshot all 5 dashboard sections | Show static fallback if live demo breaks |
| ☐ | Rehearse the 90-second demo script | Lead with Refusal Engine, not the question flow |
