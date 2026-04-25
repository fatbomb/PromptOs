# PromptOS — Full Implementation Roadmap

> **For team distribution.** Build left to right — never skip a phase. Every phase ends with a demoable product. Assign owners per phase or per task using the `Owner` column in each table.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Phase Summary](#phase-summary)
4. [Phase 1 — Core AI Conversation Engine + FastAPI Backend](#phase-1--core-ai-conversation-engine--fastapi-backend) *(~8 hrs)*
5. [Phase 2 — CLI Tool](#phase-2--cli-tool) *(~5 hrs)*
6. [Phase 3 — Database Schema + User Progress Tracking](#phase-3--database-schema--user-progress-tracking) *(~4 hrs)*
7. [Phase 4 — Next.js Dashboard](#phase-4--nextjs-dashboard) *(~8 hrs)*
8. [Phase 5 — VS Code + Browser Extension](#phase-5--vs-code--browser-extension) *(~9 hrs)*
9. [Database Schema](#database-schema)
10. [AI Conversation Engine](#ai-conversation-engine)
11. [Auth Flow](#auth-flow)
12. [Cost Receipt Feature](#cost-receipt-feature)
13. [Testing Plan](#testing-plan)
14. [Environment Variables](#environment-variables)
15. [Repo Structure](#repo-structure)
16. [Definition of Done](#definition-of-done)

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

| Phase | Title | Est. Time | Demoable? |
|---|---|---|---|
| 1 | Core AI Conversation Engine + FastAPI Backend | ~8 hrs | ✅ via test script |
| 2 | CLI Tool | ~5 hrs | ✅ live terminal demo |
| 3 | Database Schema + Progress Tracking | ~4 hrs | ✅ with real stored data |
| 4 | Next.js Dashboard | ~8 hrs | ✅ full visual dashboard |
| 5 | VS Code + Browser Extension | ~9 hrs | ✅ most impressive surface |
| **Total** | | **~34 hrs** | |

---

## Phase 1 — Core AI Conversation Engine + FastAPI Backend

> ⚠️ **This is the heart of everything. Do not move to Phase 2 until the AI conversation loop works end-to-end in a test script.**

| # | Task | Details | Test | Time | Owner |
|---|---|---|---|---|---|
| 1.1 | FastAPI skeleton + health check + CORS | Set up `main.py`, register routers, configure CORS for `localhost:3000`. Add `/health` endpoint returning `{"status":"ok"}`. | `curl https://prompt-os-dusky.vercel.app/health` returns 200 | 45 min | |
| 1.2 | Supabase project + Google OAuth | Create Supabase project. Enable Google OAuth in Auth settings. Set redirect URL to `http://localhost:3000/auth/callback`. Copy `SUPABASE_URL` and `ANON_KEY`. Create JWT verify middleware in FastAPI using `SUPABASE_JWT_SECRET`. | Hit any protected endpoint without token → 401. With valid Supabase JWT → passes. | 1 hr | |
| 1.3 | Gemini Flash conversational classifier | Use **Google Gemini Flash 2.0** (free tier, 1M tokens/day). When user sends a prompt, call Gemini Flash with a system prompt that: (1) classifies the prompt category, (2) decides what single question to ask next based on what's already been answered. Pass full conversation history each turn. Model outputs JSON: `{"question": "...", "done": false}` or `{"done": true, "assembled_prompt": "..."}` when enough context is gathered. | Send raw prompt `"fix my auth bug"` → model asks ≥3 questions over multiple turns → returns assembled prompt. | 2.5 hrs | |
| 1.4 | Session state management (in-memory + DB) | `POST /session/start` → returns `session_id`. `POST /session/message` → accepts `{session_id, user_message}`, appends to conversation history, calls Gemini, returns next question or assembled prompt. Store full conversation history per session in `sessions` table. | Start session → send 4 messages → confirm conversation history preserved → assembled prompt returned. | 1.5 hrs | |
| 1.5 | Scoring engine (3 scores) | After assembled prompt returned, compute: **Token Efficiency** (assembled_tokens / raw_tokens), **Thinking Depth** (how many context dimensions filled: file, error, expected, tried, suspicion — each = 20pts), **Dependency Score** (how many questions user could NOT answer; lower = better). Return all 3 with assembled prompt. | Minimal prompt with 1 answer → low scores. Full context → 80+ scores. | 1 hr | |
| 1.6 | Refusal Engine endpoint | `POST /refusal/check`. After user answers "what do you suspect is the root cause?" — if Gemini detects high confidence (specific file/function named, clear hypothesis), return `{"should_refuse": true, "message": "You already know the answer. Try implementing it."}`. This is the hackathon's most memorable feature. | Send "I think the refresh token is not rotating because the Redis TTL is set to 0" → `should_refuse: true`. | 45 min | |

---

## Phase 2 — CLI Tool

> ✅ At the end of Phase 2 you can do a live terminal demo. Build this before the VS Code extension — it's faster to iterate and easier to debug.

| # | Task | Details | Test | Time | Owner |
|---|---|---|---|---|---|
| 2.1 | Node.js CLI scaffold with Commander.js | Create `promptos-cli/`. Commands: `promptos ask "[prompt]"`, `promptos claude "[prompt]"`, `promptos login`, `promptos stats`, `promptos --skip`. Use `inquirer` for interactive questions, `chalk` for colors, `ora` for loading spinners. Store JWT in `~/.promptos/token` via `keytar`. | `promptos --help` shows all commands. `promptos login` opens browser. | 1.5 hrs | |
| 2.2 | Conversational question loop in terminal | Call `/session/start` → then loop: display question from API → read user input via `inquirer.prompt` → POST to `/session/message` → if `done: false` loop again → if `done: true` show assembled prompt + scores. Show progress indicator: "Question 2 of ~4". Show score bar at the end using chalk. | Full loop: type raw prompt → answer 3–4 questions → see assembled prompt + score bar. Time it: under 30 sec total. | 2 hrs | |
| 2.3 | Cost Receipt output | After session ends, print the Cost Receipt to terminal. Show: original token count, assembled token count, estimated turns saved (based on score), estimated wait time saved (turns × 40s), month-to-date totals from API. Use chalk box-drawing chars for the receipt border. | Session complete → receipt prints. Month total updates after 3rd session. | 45 min | |
| 2.4 | `promptos claude` wrapper | After assembled prompt is confirmed, call `claude "[assembled_prompt]"` via Node's `child_process.spawn`. Stream output to terminal. Log session as complete. Add `--skip` flag that bypasses PromptOS and calls claude directly — but shows the "skip penalty" stat first. | `promptos claude "fix my auth"` → question flow → assembled prompt → claude runs with structured prompt. | 45 min | |

---

## Phase 3 — Database Schema + User Progress Tracking

| # | Task | Details | Test | Time | Owner |
|---|---|---|---|---|---|
| 3.1 | Run full schema migration in Supabase SQL editor | Create all 6 tables (see [Database Schema](#database-schema) section for full DDL). Enable RLS on all tables. Add policy: `auth.uid() = user_id`. Enable Realtime on `sessions` table so dashboard updates live. | Logged in as user A → cannot read user B's sessions. RLS toggle shows enabled. | 1 hr | |
| 3.2 | Concept extraction after session complete | After `POST /session/complete`, run a FastAPI `BackgroundTask`: pass assembled prompt + agent response to Gemini Flash. Ask it to extract concept tags (e.g. "JWT", "Redis TTL", "token rotation"). Upsert into `concept_map`: increment encounter_count, recalculate avg_score, set color (green ≥70, amber 40–69, red <40). | Run 3 JWT-related sessions → `concept_map` has "JWT" with `encounter_count: 3`. | 1.5 hrs | |
| 3.3 | Weekly skill decay aggregation | On every `/session/complete`, upsert a row in `skill_decay` for the current week. Recalculate: avg_dependency_score, avg_thinking_depth, total_sessions, refusals_triggered. This powers the Skill Decay Chart showing week-over-week improvement. | Run 5 sessions in a week → `skill_decay` has 1 row for that week with correct averages. | 45 min | |
| 3.4 | Token savings aggregation | Upsert `token_savings` weekly row on session complete. Calculate `estimated_cost_saved_usd` using user's configured agent cost per MTok (default: Claude Sonnet at $3/MTok). Calculate `estimated_wait_time_saved_min` = estimated_turns_saved × 0.67 min. | After 10 sessions → `token_savings` has correct cumulative cost estimate. | 45 min | |

---

## Phase 4 — Next.js Dashboard

| # | Task | Details | Test | Time | Owner |
|---|---|---|---|---|---|
| 4.1 | Next.js 14 scaffold + Supabase auth | `npx create-next-app@latest --ts --tailwind --app`. Install `@supabase/ssr`. Create `/auth/callback` route handler that exchanges code for session. Create `middleware.ts` that redirects unauthenticated users to `/login`. Add Google login button using `supabase.auth.signInWithOAuth({provider: 'google'})`. | Navigate to `/dashboard` → redirected to `/login`. Click Google → OAuth flow → land at `/dashboard` with valid session. | 1.5 hrs | |
| 4.2 | Dashboard home — Token savings + summary cards | Fetch from `token_savings` and `sessions`. Show 4 metric cards: Sessions this month, Turns saved, Time recovered (min), Cost saved ($). Below: session history table with before/after token counts and scores. Use Recharts `LineChart` for week-over-week trend. | Dashboard loads with real data from 10 test sessions. Numbers match DB values. | 2 hrs | |
| 4.3 | Knowledge Map — concept bubble chart | Use Recharts `ScatterChart` or D3 force layout. Each bubble = one concept tag. Size = encounter_count. Color = score band (green/amber/red). Click bubble → opens quiz modal for that concept. This is the visual centrepiece of the dashboard. | After 5+ sessions: bubbles appear, sized correctly, clicking opens quiz for that concept. | 2 hrs | |
| 4.4 | Skill Decay chart + Quiz Engine | **Skill Decay:** Recharts `LineChart` with 3 lines (dependency_score, thinking_depth, refusal_rate) with week labels on X axis. **Quiz Engine:** when a concept is amber/red, Gemini generates 3 multiple-choice questions. User answers → score saved → concept_map updated → streak counter shown. | Click amber bubble → 3 questions appear → submit → concept score updates → bubble color shifts. | 2 hrs | |
| 4.5 | Team Mode leaderboard | Add `teams` and `team_members` tables. Invite by email. Team dashboard shows leaderboard: ranked by lowest avg dependency score. Shows "Most improved this week". | Create team with 2 users → both appear on leaderboard → rankings update after new sessions. | 1.5 hrs | |

### Dashboard progressive reveal

| Trigger | What becomes visible |
|---|---|
| After 1st session | Summary cards + session history |
| After 5+ sessions | Knowledge Map bubbles appear |
| After 2 weeks of data | Skill Decay chart shows trend |
| After amber concept | Quiz Engine activates |
| After team invite accepted | Team leaderboard appears |

---

## Phase 5 — VS Code + Browser Extension

> Build the VS Code extension last — it's the most complex but also the most impressive demo surface. Scaffold with `yo code`.

| # | Task | Details | Test | Time | Owner |
|---|---|---|---|---|---|
| 5.1 | Extension scaffold + sidebar webview | Run `yo code` → pick "New Extension (TypeScript)". Register sidebar view in `package.json`. Create React webview for the question flow UI. Auth: store JWT in `vscode.SecretStorage`. Auto-open PromptOS sidebar when extension activates. | Extension loads in Extension Development Host. Sidebar opens. JWT stored and retrieved correctly. | 2 hrs | |
| 5.2 | Auto-context extraction from workspace | Extract: open file path, selected text/error, last terminal output (Shell Integration API, VS Code 1.77+), git diff of staged files. Pre-fill these as context when starting a session so the AI can skip questions it can auto-answer. | Open a file with an error selected → start session → AI skips "which file?" question because it's auto-detected. | 2 hrs | |
| 5.3 | Question flow UI in sidebar (React webview) | Show question from AI, text input, progress indicator, "skip this question" button. Show before/after panel after assembly. Show score bar and Cost Receipt card inline. "Send to Claude Code" button calls `vscode.commands.executeCommand` to paste assembled prompt into terminal. | Full loop in VS Code sidebar: type prompt → answer 3 questions → see receipt → send to terminal. | 3 hrs | |
| 5.4 | Chrome extension for claude.ai / ChatGPT | Inject "Enhance with PromptOS" button below chat input on `claude.ai` and `chat.openai.com`. On click: open floating overlay with question flow. On complete: inject assembled prompt into page input and simulate Enter. Use Shadow DOM to isolate extension CSS from page styles. | On claude.ai: button appears → click → overlay → assembled prompt injected into chat input. | 2 hrs | |

---

## Database Schema

### `sessions` (core)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | Auto-generated |
| user_id | uuid FK | References auth.users — RLS key |
| created_at | timestamptz | Auto-set by Supabase |
| raw_prompt | text | Exactly what the developer typed |
| raw_token_count | int | Tiktoken count |
| assembled_prompt | text | Final structured prompt |
| assembled_token_count | int | Tiktoken count |
| category | text | `bug_fix` \| `feature` \| `refactor` \| `architecture` \| `explanation` |
| conversation_history | jsonb | Full Q&A turns `[{role, content}]` |
| token_efficiency_score | int | 0–100 |
| thinking_depth_score | int | 0–100: context dimensions filled |
| dependency_score | int | 0–100: lower = more independent (good) |
| estimated_turns_saved | int | Computed from thinking_depth_score |
| was_refused | bool | True if Refusal Engine fired |
| concept_tags | text[] | Extracted after session via Gemini |
| source | text | `vscode` \| `cli` \| `browser_extension` |

### `concept_map` (tracking)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | RLS key |
| concept | text | e.g. "JWT", "Redis TTL", "React hooks" |
| encounter_count | int | How many times this concept appeared |
| avg_score | float | Rolling average of sessions featuring this concept |
| color_band | text | `green` \| `amber` \| `red` (from avg_score) |
| last_seen_at | timestamptz | For decay: fade if not seen in 30 days |
| quiz_score | int | Last quiz result (0–100) |

### `skill_decay` (progress)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | RLS key |
| week_start | date | Monday of tracked week — unique per user |
| total_sessions | int | |
| avg_dependency_score | float | Going down = getting better |
| avg_thinking_depth | float | Going up = getting better |
| refusals_triggered | int | Developer self-solved sessions |
| self_solve_rate | float | refusals / total_sessions |

### `token_savings` (analytics)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | RLS key |
| week_start | date | Unique per user per week |
| total_raw_tokens | int | Sum across all raw prompts |
| total_assembled_tokens | int | Sum across all assembled prompts |
| estimated_turns_saved | int | Sum of per-session estimates |
| estimated_wait_time_saved_min | float | turns_saved × 0.67 min avg per turn |
| estimated_cost_saved_usd | float | Based on user's agent cost config |

### `teams` + `team_members`

| Column | Type | Notes |
|---|---|---|
| teams.id | uuid PK | |
| teams.name | text | Team display name |
| teams.invite_code | text | 6-char code for joining without email |
| team_members.team_id | uuid FK | References teams |
| team_members.user_id | uuid FK | References auth.users |
| team_members.role | text | `owner` \| `member` |

### `quiz_attempts`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | RLS key |
| concept | text | Concept being quizzed |
| questions | jsonb | `[{q, options, correct_index}]` generated by Gemini |
| answers | jsonb | User's answers array |
| score | int | 0–100, computed after submission |
| completed_at | timestamptz | |

### `user_profiles` *(added — not in original)*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | Same as auth.users id |
| agent_cost_per_mtok | float | Default 3.0 (Sonnet pricing) |
| default_agent | text | `claude` \| `chatgpt` \| `gemini` |
| timezone | text | For accurate weekly rollups |
| created_at | timestamptz | |

> **Migration tip:** Run all DDL in the Supabase SQL Editor in one transaction. Enable Realtime on `sessions` *after* RLS is confirmed active.

---

## AI Conversation Engine

The engine uses Gemini Flash as a stateful conversational agent — not static question templates. Each turn it decides what to ask next based on what's already been answered.

### Flow

1. **User sends raw prompt** — e.g. `"fix my JWT middleware"`. New session created, `conversation_history = []`.
2. **Backend calls Gemini Flash** with the system prompt below + full conversation history. Gemini decides: *what single question would most improve this prompt right now?*
3. **Gemini returns JSON** — either the next question (`done: false`) or the assembled prompt (`done: true`).
4. **User answers** — appended to history as `{role: "user", content: "..."}`.
5. **Loop until `done: true`** — typically 3–5 turns. Gemini adapts: rich answers → fewer questions; sparse answers → probes deeper.
6. **Assembled prompt + scores returned** — scoring runs server-side deterministically, not by Gemini.

### Gemini Flash System Prompt

```
You are a prompt refinement agent. Your job is to help a developer write a better prompt for their AI coding assistant.

Given the developer's raw prompt and conversation so far, output ONLY valid JSON:

If more context needed:
{"question": "Which file is this happening in?", "why": "file path", "done": false}

If you have enough context (after 3-5 questions):
{"done": true, "assembled_prompt": "...[full structured prompt]...", "category": "bug_fix"}

If developer clearly knows the answer already:
{"done": true, "should_refuse": true, "reason": "You already know: [their hypothesis]"}

Rules:
- Ask ONE question per turn. Never two.
- Use workspace_context to skip questions you can auto-answer.
- Stop at 5 questions maximum.
- When assembling, include: file, error, expected vs actual, tried, suspicion.
- Never invent context the developer didn't provide.
```

### Why Gemini Flash (free)?

Gemini Flash 2.0 allows up to 1 million tokens/day on the free API tier. At ~500 tokens per session (system prompt + conversation), that's ~2,000 free sessions per day — far beyond hackathon scale. Get the key at [aistudio.google.com](https://aistudio.google.com) — no credit card required.

**Fallback:** If Gemini is down or rate-limited, fall back to Claude Haiku (~$0.25/MTok) or Groq's free Llama 3.1 8B endpoint. The system prompt works identically across all three.

---

## Auth Flow

> Every step must be smooth — onboarding friction kills hackathon demos.

1. **`promptos login`** — Opens `https://promptos.dev/auth/login` in browser. User clicks "Continue with Google". Supabase OAuth → Google → callback to `/auth/callback`.
2. **Dashboard: `/auth/callback`** — Next.js route handler calls `supabase.auth.exchangeCodeForSession(code)`. Stores session. Redirects to `/auth/cli-callback?token=[JWT]`.
3. **CLI polls for token** — After opening the browser, CLI polls `GET /auth/cli-token?state=[random_state]` every 2s for up to 60s. When dashboard callback fires, it stores the JWT at that state key in Supabase temporarily. CLI picks it up and saves to `~/.promptos/token` via `keytar`.
4. **First session creates user profile** — On `POST /session/start`, if no profile row exists for `user_id`, create one with defaults: `agent_cost_per_mtok: 3.0`, `default_agent: "claude"`. No separate onboarding step needed.
5. **Dashboard shows empty state → first session data** — Empty state shows: *"Run your first session with `promptos ask '[your prompt]'`"*. After first session completes, Supabase Realtime pushes the update — dashboard refreshes without page reload.

---

## Cost Receipt Feature

The receipt prints in the terminal immediately after every session. It's the single feature that makes the hackathon demo memorable.

### Terminal output

```
╔══════════════════════════════════════════╗
║  SESSION RECEIPT — promptos              ║
║                                          ║
║  You typed:  "fix my JWT middleware"     ║
║  Words:       4                          ║
║                                          ║
║  Without PromptOS:  ~5 turns, 3.3 min   ║
║  With PromptOS:      1 turn,  0.7 min   ║
║  Time recovered:  ✓  2.6 minutes        ║
║                                          ║
║  This month:  47 sessions · 2h 14m back ║
║  Dependency:  71 → 68  (↓ improving)    ║
╚══════════════════════════════════════════╝
```

### Computation logic

- **Turns without PromptOS** = `6 - Math.floor(thinking_depth_score / 20)`. Score 0 → ~6 turns; score 100 → ~1 turn.
- **Wait time** = turns × 40 seconds average per turn.
- **Dependency delta** = previous week's `avg_dependency_score` vs this session's score.
- **Month totals** — fetch from `GET /tokens/summary` on session complete.

### Timing

Print the receipt immediately after `POST /session/complete` responds. Must appear within 200ms of the session ending. **Never block on background tasks** — concept extraction runs async after.

### Skip penalty variant

When user runs `promptos --skip`, show a shortened receipt:

> *"Skipped. Your last 5 skipped sessions averaged 5.2 turns. Your PromptOS sessions average 1.4. That's your choice to make."*

No judgment emoji. Just the number.

---

## Testing Plan

> For a hackathon, focus on integration tests you can run manually in 5 minutes. Unit tests come after you ship.

### Phase 1 — Core API Tests

| What to test | How | Pass if |
|---|---|---|
| AI conversation loop | Python test script: send raw prompt → simulate 4 user answers → print result | Assembled prompt contains all provided context, no hallucinated details |
| Refusal Engine | Answer Q4 with a specific, confident hypothesis | `should_refuse: true` returned |
| Score computation | Send minimal vs full context sessions | Scores differ by ≥30 points between minimal and full |
| JWT auth | `curl` with and without Authorization header | 401 without, 200 with valid JWT |

### Phase 2 — CLI Tests

| What to test | How | Pass if |
|---|---|---|
| Full CLI loop | `promptos ask "debug my auth"` in terminal | Questions appear, receipt prints, total time under 60s |
| Login flow | `promptos login` then `promptos stats` | Stats show correct user data |
| Skip flag | `promptos --skip claude "hello"` | Claude runs directly, skip receipt prints |
| `promptos claude` | Run it and confirm assembled prompt reaches Claude Code | Claude output references specific context from assembled prompt |

### Phase 3 — Database Tests

| What to test | How | Pass if |
|---|---|---|
| Session logging | Run 3 sessions → query Supabase `sessions` table | 3 rows with correct `user_id` and scores |
| Concept extraction | Run 2 JWT sessions → query `concept_map` | "JWT" row with `encounter_count: 2` |
| RLS isolation | Log in as user B → try to fetch user A's sessions via API | Empty result set, no error exposure |
| Skill decay | Run 5 sessions in same week → query `skill_decay` | 1 row for current week with correct averages |

### Pre-Hackathon Demo Readiness Checklist

| ✅ | Check | Why it matters |
|---|---|---|
| ☐ | Seed DB with 2 weeks of fake session data | Skill Decay chart needs history — don't demo an empty chart |
| ☐ | Pre-create a team with 2 accounts | Team leaderboard demo needs 2 real users |
| ☐ | Test internet speed at demo venue | Gemini Flash is <300ms on good connection. Bad wifi = awkward pauses |
| ☐ | Have `--skip` flag ready as safety valve | If API goes down during demo, you can still show the dashboard |
| ☐ | Screenshot all 5 dashboard sections | Show static fallback if live demo breaks |
| ☐ | Rehearse the 90-second demo script | Lead with Refusal Engine, not the question flow |

---

## Environment Variables

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

## Repo Structure

```
promptos/
├── backend/                  # FastAPI
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
├── promptos-cli/             # Node.js CLI
│   ├── index.js
│   ├── commands/
│   └── utils/receipt.js
├── dashboard/                # Next.js 14
│   ├── app/
│   │   ├── dashboard/
│   │   ├── auth/
│   │   └── api/
│   └── components/
│       ├── KnowledgeMap.tsx
│       ├── SkillDecayChart.tsx
│       └── QuizModal.tsx
├── vscode-extension/         # TypeScript + React Webview
│   ├── src/
│   └── package.json
├── browser-extension/        # Chrome MV3
│   ├── content.js
│   └── manifest.json
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql
```

---

## Definition of Done

A task is **done** when:

1. The test case listed in its row passes without manual workarounds.
2. The code is committed to `main` (or a PR is merged).
3. No other phase's tasks break as a result.
4. At least one teammate has seen it run on their machine.

A **phase** is done when all its tasks are done AND the demo flow for that phase can be run top-to-bottom in one attempt.

---