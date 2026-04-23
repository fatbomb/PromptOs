# Phase 2 — CLI Tool

> ✅ At the end of Phase 2 you can do a live terminal demo. Build this before the VS Code extension — it's faster to iterate and easier to debug.

**Estimated Time:** ~5 hours  
**Demoable Milestone:** Full `promptos ask "[prompt]"` terminal flow with conversational questions, assembled prompt, and cost receipt printout.

**Dependency:** Phase 1 backend must be running and returning valid responses before starting this phase.

---

## Overview

The CLI is the fastest path to a working demo. It wraps the backend session API in an interactive Node.js terminal experience with colored prompts, progress indicators, and the iconic Cost Receipt output.

---

## Tasks

| # | Task | Details | Test | Time | Owner |
|---|---|---|---|---|---|
| 2.1 | Node.js CLI scaffold with Commander.js | Create `promptos-cli/`. Commands: `promptos ask "[prompt]"`, `promptos claude "[prompt]"`, `promptos login`, `promptos stats`, `promptos --skip`. Use `inquirer` for interactive questions, `chalk` for colors, `ora` for loading spinners. Store JWT in `~/.promptos/token` via `keytar`. | `promptos --help` shows all commands. `promptos login` opens browser. | 1.5 hrs | |
| 2.2 | Conversational question loop in terminal | Call `/session/start` → then loop: display question from API → read user input via `inquirer.prompt` → POST to `/session/message` → if `done: false` loop again → if `done: true` show assembled prompt + scores. Show progress indicator: "Question 2 of ~4". Show score bar at the end using chalk. | Full loop: type raw prompt → answer 3–4 questions → see assembled prompt + score bar. Time it: under 30 sec total. | 2 hrs | |
| 2.3 | Cost Receipt output | After session ends, print the Cost Receipt to terminal. Show: original token count, assembled token count, estimated turns saved (based on score), estimated wait time saved (turns × 40s), month-to-date totals from API. Use chalk box-drawing chars for the receipt border. | Session complete → receipt prints. Month total updates after 3rd session. | 45 min | |
| 2.4 | `promptos claude` wrapper | After assembled prompt is confirmed, call `claude "[assembled_prompt]"` via Node's `child_process.spawn`. Stream output to terminal. Log session as complete. Add `--skip` flag that bypasses PromptOS and calls claude directly — but shows the "skip penalty" stat first. | `promptos claude "fix my auth"` → question flow → assembled prompt → claude runs with structured prompt. | 45 min | |

---

## Cost Receipt Feature

The receipt prints in the terminal immediately after every session. It's the most memorable feature of the hackathon demo.

### Terminal Output

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

### Computation Logic

- **Turns without PromptOS** = `6 - Math.floor(thinking_depth_score / 20)`. Score 0 → ~6 turns; score 100 → ~1 turn.
- **Wait time** = turns × 40 seconds average per turn.
- **Dependency delta** = previous week's `avg_dependency_score` vs this session's score.
- **Month totals** — fetch from `GET /tokens/summary` on session complete.

### Timing

Print the receipt immediately after `POST /session/complete` responds. Must appear within 200ms of the session ending. **Never block on background tasks** — concept extraction runs async after.

### Skip Penalty Variant

When user runs `promptos --skip`, show a shortened receipt:

> *"Skipped. Your last 5 skipped sessions averaged 5.2 turns. Your PromptOS sessions average 1.4. That's your choice to make."*

No judgment emoji. Just the number.

---

## Repo Structure (this section)

```
promptos-cli/
├── index.js
├── commands/
│   ├── ask.js
│   ├── login.js
│   ├── stats.js
│   └── claude.js
└── utils/
    └── receipt.js
```

---

## Environment Variables

```env
PROMPTOS_API_BASE_URL=http://localhost:8000
```

---

## Testing (Phase 2)

| What to test | How | Pass if |
|---|---|---|
| Full CLI loop | `promptos ask "debug my auth"` in terminal | Questions appear, receipt prints, total time under 60s |
| Login flow | `promptos login` then `promptos stats` | Stats show correct user data |
| Skip flag | `promptos --skip claude "hello"` | Claude runs directly, skip receipt prints |
| `promptos claude` | Run it and confirm assembled prompt reaches Claude Code | Claude output references specific context from assembled prompt |

---

## Definition of Done

A task is **done** when:
1. The test case listed in its row passes without manual workarounds.
2. The code is committed to `main` (or a PR is merged).
3. No other phase's tasks break as a result.
4. At least one teammate has seen it run on their machine.

**Phase 2 is done** when the full CLI demo can be run from scratch — `promptos ask "[prompt]"` → questions → receipt — in under 60 seconds total.
