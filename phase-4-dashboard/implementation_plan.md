# Phase 4 — Next.js Dashboard

**Estimated Time:** ~8 hours  
**Demoable Milestone:** Full visual dashboard with live session data, Knowledge Map bubbles, Skill Decay chart, Quiz Engine, and Team Leaderboard.

**Dependency:** Phase 3 database must be migrated and populated with at least 5+ sessions of seed data before the dashboard is meaningful.

---

## Overview

The Next.js 14 dashboard is the visual centrepiece of PromptOS. It surfaces all the analytics collected by the backend and database into an engaging, interactive interface that demonstrates learning progress over time.

> **Seed tip:** Before the hackathon demo, seed the DB with 2 weeks of fake session data. The Skill Decay chart and Knowledge Map need history — don't demo with an empty state.

---

## Tasks

| # | Task | Details | Test | Time | Owner |
|---|---|---|---|---|---|
| 4.1 | Next.js 14 scaffold + Supabase auth | `npx create-next-app@latest --ts --tailwind --app`. Install `@supabase/ssr`. Create `/auth/callback` route handler that exchanges code for session. Create `middleware.ts` that redirects unauthenticated users to `/login`. Add Google login button using `supabase.auth.signInWithOAuth({provider: 'google'})`. | Navigate to `/dashboard` → redirected to `/login`. Click Google → OAuth flow → land at `/dashboard` with valid session. | 1.5 hrs | |
| 4.2 | Dashboard home — Token savings + summary cards | Fetch from `token_savings` and `sessions`. Show 4 metric cards: Sessions this month, Turns saved, Time recovered (min), Cost saved ($). Below: session history table with before/after token counts and scores. Use Recharts `LineChart` for week-over-week trend. | Dashboard loads with real data from 10 test sessions. Numbers match DB values. | 2 hrs | |
| 4.3 | Knowledge Map — concept bubble chart | Use Recharts `ScatterChart` or D3 force layout. Each bubble = one concept tag. Size = encounter_count. Color = score band (green/amber/red). Click bubble → opens quiz modal for that concept. This is the visual centrepiece of the dashboard. | After 5+ sessions: bubbles appear, sized correctly, clicking opens quiz for that concept. | 2 hrs | |
| 4.4 | Skill Decay chart + Quiz Engine | **Skill Decay:** Recharts `LineChart` with 3 lines (dependency_score, thinking_depth, refusal_rate) with week labels on X axis. **Quiz Engine:** when a concept is amber/red, Gemini generates 3 multiple-choice questions. User answers → score saved → concept_map updated → streak counter shown. | Click amber bubble → 3 questions appear → submit → concept score updates → bubble color shifts. | 2 hrs | |
| 4.5 | Team Mode leaderboard | Add `teams` and `team_members` tables. Invite by email. Team dashboard shows leaderboard: ranked by lowest avg dependency score. Shows "Most improved this week". | Create team with 2 users → both appear on leaderboard → rankings update after new sessions. | 1.5 hrs | |

---

## Dashboard Progressive Reveal

The dashboard surfaces features progressively to avoid overwhelming new users.

| Trigger | What becomes visible |
|---|---|
| After 1st session | Summary cards + session history |
| After 5+ sessions | Knowledge Map bubbles appear |
| After 2 weeks of data | Skill Decay chart shows trend |
| After amber concept | Quiz Engine activates |
| After team invite accepted | Team leaderboard appears |

---

## Auth Flow

> Every step must be smooth — onboarding friction kills hackathon demos.

1. **`promptos login`** — Opens `https://promptos.dev/auth/login` in browser. User clicks "Continue with Google". Supabase OAuth → Google → callback to `/auth/callback`.
2. **Dashboard: `/auth/callback`** — Next.js route handler calls `supabase.auth.exchangeCodeForSession(code)`. Stores session. Redirects to `/auth/cli-callback?token=[JWT]`.
3. **CLI polls for token** — After opening the browser, CLI polls `GET /auth/cli-token?state=[random_state]` every 2s for up to 60s. When dashboard callback fires, it stores the JWT at that state key in Supabase temporarily. CLI picks it up and saves to `~/.promptos/token` via `keytar`.
4. **First session creates user profile** — On `POST /session/start`, if no profile row exists for `user_id`, create one with defaults: `agent_cost_per_mtok: 3.0`, `default_agent: "claude"`. No separate onboarding step needed.
5. **Dashboard shows empty state → first session data** — Empty state shows: *"Run your first session with `promptos ask '[your prompt]'`"*. After first session completes, Supabase Realtime pushes the update — dashboard refreshes without page reload.

---

## Repo Structure (this section)

```
dashboard/
├── app/
│   ├── dashboard/
│   │   ├── page.tsx             # Home: metric cards + session history
│   │   ├── knowledge/page.tsx   # Knowledge Map
│   │   ├── decay/page.tsx       # Skill Decay chart
│   │   └── team/page.tsx        # Team leaderboard
│   ├── auth/
│   │   ├── callback/route.ts    # OAuth exchange
│   │   └── cli-callback/route.ts
│   └── api/
│       └── quiz/route.ts        # Gemini quiz generation
├── components/
│   ├── KnowledgeMap.tsx
│   ├── SkillDecayChart.tsx
│   ├── QuizModal.tsx
│   ├── MetricCard.tsx
│   └── SessionTable.tsx
└── middleware.ts
```

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_BASE_URL=
```

---

## Definition of Done

A task is **done** when:
1. The test case listed in its row passes without manual workarounds.
2. The code is committed to `main` (or a PR is merged).
3. No other phase's tasks break as a result.
4. At least one teammate has seen it run on their machine.

**Phase 4 is done** when all 5 tasks pass AND the full dashboard demo can be run top-to-bottom — login → see metrics → click a bubble → answer a quiz → view team leaderboard — in one attempt.
