# Phase 3 — Database Schema + User Progress Tracking

**Estimated Time:** ~4 hours  
**Demoable Milestone:** Run 5 sessions → query Supabase directly and see concept tags, skill decay row, and token savings all correctly populated.

**Dependency:** Phase 1 backend must be complete. Supabase project must be created (Task 1.2).

---

## Overview

This phase wires the backend to persistent storage. After this phase every session is fully logged, concepts are extracted asynchronously, and weekly aggregations power the dashboard charts.

---

## Tasks

| # | Task | Details | Test | Time | Owner |
|---|---|---|---|---|---|
| 3.1 | Run full schema migration in Supabase SQL editor | Create all 6 tables (see [Database Schema](#database-schema) below for full DDL). Enable RLS on all tables. Add policy: `auth.uid() = user_id`. Enable Realtime on `sessions` table so dashboard updates live. | Logged in as user A → cannot read user B's sessions. RLS toggle shows enabled. | 1 hr | |
| 3.2 | Concept extraction after session complete | After `POST /session/complete`, run a FastAPI `BackgroundTask`: pass assembled prompt + agent response to Gemini Flash. Ask it to extract concept tags (e.g. "JWT", "Redis TTL", "token rotation"). Upsert into `concept_map`: increment encounter_count, recalculate avg_score, set color (green ≥70, amber 40–69, red <40). | Run 3 JWT-related sessions → `concept_map` has "JWT" with `encounter_count: 3`. | 1.5 hrs | |
| 3.3 | Weekly skill decay aggregation | On every `/session/complete`, upsert a row in `skill_decay` for the current week. Recalculate: avg_dependency_score, avg_thinking_depth, total_sessions, refusals_triggered. This powers the Skill Decay Chart showing week-over-week improvement. | Run 5 sessions in a week → `skill_decay` has 1 row for that week with correct averages. | 45 min | |
| 3.4 | Token savings aggregation | Upsert `token_savings` weekly row on session complete. Calculate `estimated_cost_saved_usd` using user's configured agent cost per MTok (default: Claude Sonnet at $3/MTok). Calculate `estimated_wait_time_saved_min` = estimated_turns_saved × 0.67 min. | After 10 sessions → `token_savings` has correct cumulative cost estimate. | 45 min | |

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

### `user_profiles`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | Same as auth.users id |
| agent_cost_per_mtok | float | Default 3.0 (Sonnet pricing) |
| default_agent | text | `claude` \| `chatgpt` \| `gemini` |
| timezone | text | For accurate weekly rollups |
| created_at | timestamptz | |

> **Migration tip:** Run all DDL in the Supabase SQL Editor in one transaction. Enable Realtime on `sessions` *after* RLS is confirmed active.

---

## Repo Structure (this section)

```
supabase/
└── migrations/
    └── 001_initial_schema.sql
```

Backend additions:
```
backend/
└── services/
    └── concept_extractor.py   # BackgroundTask for tag extraction
```

---

## Testing (Phase 3)

| What to test | How | Pass if |
|---|---|---|
| Session logging | Run 3 sessions → query Supabase `sessions` table | 3 rows with correct `user_id` and scores |
| Concept extraction | Run 2 JWT sessions → query `concept_map` | "JWT" row with `encounter_count: 2` |
| RLS isolation | Log in as user B → try to fetch user A's sessions via API | Empty result set, no error exposure |
| Skill decay | Run 5 sessions in same week → query `skill_decay` | 1 row for current week with correct averages |

---

## Definition of Done

A task is **done** when:
1. The test case listed in its row passes without manual workarounds.
2. The code is committed to `main` (or a PR is merged).
3. No other phase's tasks break as a result.
4. At least one teammate has seen it run on their machine.

**Phase 3 is done** when all 4 tasks pass AND you can query Supabase and confirm real session data, concept tags, and weekly aggregations are all populated correctly.
