# Phase 1 — Core AI Conversation Engine + FastAPI Backend

> ⚠️ **This is the heart of everything. Do not move to Phase 2 until the AI conversation loop works end-to-end in a test script.**

**Estimated Time:** ~8 hours  
**Demoable Milestone:** Test script runs a full multi-turn refinement loop and returns an assembled prompt with scores.

---

## Overview

This phase builds the FastAPI backend and the core Gemini-powered conversational engine. Everything downstream (CLI, Dashboard, Extensions) depends on this being solid and thoroughly tested before moving on.

---

## Tasks

| # | Task | Details | Test | Time | Owner |
|---|---|---|---|---|---|
| 1.1 | FastAPI skeleton + health check + CORS | Set up `main.py`, register routers, configure CORS for `localhost:3000`. Add `/health` endpoint returning `{"status":"ok"}`. | `curl https://prompt-os-dusky.vercel.app/health` returns 200 | 45 min | |
| 1.2 | Supabase project + Google OAuth | Create Supabase project. Enable Google OAuth in Auth settings. Set redirect URL to `http://localhost:3000/auth/callback`. Copy `SUPABASE_URL` and `ANON_KEY`. Create JWT verify middleware in FastAPI using `SUPABASE_JWT_SECRET`. | Hit any protected endpoint without token → 401. With valid Supabase JWT → passes. | 1 hr | |
| 1.3 | Gemini Flash conversational classifier | Use **Google Gemini Flash 2.0** (free tier, 1M tokens/day). When user sends a prompt, call Gemini Flash with a system prompt that: (1) classifies the prompt category, (2) decides what single question to ask next based on what's already been answered. Pass full conversation history each turn. Model outputs JSON: `{"question": "...", "done": false}` or `{"done": true, "assembled_prompt": "..."}` when enough context is gathered. | Send raw prompt `"fix my auth bug"` → model asks ≥3 questions over multiple turns → returns assembled prompt. | 2.5 hrs | |
| 1.4 | Session state management (in-memory + DB) | `POST /session/start` → returns `session_id`. `POST /session/message` → accepts `{session_id, user_message}`, appends to conversation history, calls Gemini, returns next question or assembled prompt. Store full conversation history per session in `sessions` table. | Start session → send 4 messages → confirm conversation history preserved → assembled prompt returned. | 1.5 hrs | |
| 1.5 | Scoring engine (3 scores) | After assembled prompt returned, compute: **Token Efficiency** (assembled_tokens / raw_tokens), **Thinking Depth** (how many context dimensions filled: file, error, expected, tried, suspicion — each = 20pts), **Dependency Score** (how many questions user could NOT answer; lower = better). Return all 3 with assembled prompt. | Minimal prompt with 1 answer → low scores. Full context → 80+ scores. | 1 hr | |
| 1.6 | Refusal Engine endpoint | `POST /refusal/check`. After user answers "what do you suspect is the root cause?" — if Gemini detects high confidence (specific file/function named, clear hypothesis), return `{"should_refuse": true, "message": "You already know the answer. Try implementing it."}`. This is the hackathon's most memorable feature. | Send "I think the refresh token is not rotating because the Redis TTL is set to 0" → `should_refuse: true`. | 45 min | |

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

Gemini Flash 2.0 allows up to 1 million tokens/day on the free API tier. At ~500 tokens per session (system prompt + conversation), that's ~2,000 free sessions per day. Get the key at [aistudio.google.com](https://aistudio.google.com) — no credit card required.

**Fallback:** If Gemini is down or rate-limited, fall back to Claude Haiku (~$0.25/MTok) or Groq's free Llama 3.1 8B endpoint. The system prompt works identically across all three.

---

## Repo Structure (this section)

```
backend/
├── main.py
├── routers/
│   ├── session.py
│   ├── refusal.py
│   ├── tokens.py
│   └── auth.py
├── services/
│   ├── gemini.py
│   ├── scoring.py
│   └── concept_extractor.py
└── middleware/
    └── jwt_verify.py
```

---

## Environment Variables

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_JWT_SECRET=
GEMINI_API_KEY=        # aistudio.google.com, free
ANTHROPIC_API_KEY=     # fallback only
GROQ_API_KEY=          # fallback only
```

---

## Testing (Phase 1)

| What to test | How | Pass if |
|---|---|---|
| AI conversation loop | Python test script: send raw prompt → simulate 4 user answers → print result | Assembled prompt contains all provided context, no hallucinated details |
| Refusal Engine | Answer Q4 with a specific, confident hypothesis | `should_refuse: true` returned |
| Score computation | Send minimal vs full context sessions | Scores differ by ≥30 points between minimal and full |
| JWT auth | `curl` with and without Authorization header | 401 without, 200 with valid JWT |

---

## Definition of Done

A task is **done** when:
1. The test case listed in its row passes without manual workarounds.
2. The code is committed to `main` (or a PR is merged).
3. No other phase's tasks break as a result.
4. At least one teammate has seen it run on their machine.

**Phase 1 is done** when all 6 tasks are complete AND a test script can run a full end-to-end session loop in one attempt.
