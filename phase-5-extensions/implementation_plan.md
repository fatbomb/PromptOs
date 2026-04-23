# Phase 5 — VS Code + Browser Extension

> Build the VS Code extension last — it's the most complex but also the most impressive demo surface. Scaffold with `yo code`.

**Estimated Time:** ~9 hours  
**Demoable Milestone:** Full session loop running inside the VS Code sidebar with auto-extracted workspace context, plus the "Enhance with PromptOS" button injected on claude.ai.

**Dependency:** Phases 1–3 must be complete. The backend session API must be stable before wiring the extension to it.

---

## Overview

This phase delivers two client surfaces that integrate PromptOS directly into the developer's workflow: a VS Code sidebar extension and a Chrome browser extension for claude.ai / ChatGPT. These are the most visually impressive surfaces for a hackathon demo.

---

## Tasks

| # | Task | Details | Test | Time | Owner |
|---|---|---|---|---|---|
| 5.1 | Extension scaffold + sidebar webview | Run `yo code` → pick "New Extension (TypeScript)". Register sidebar view in `package.json`. Create React webview for the question flow UI. Auth: store JWT in `vscode.SecretStorage`. Auto-open PromptOS sidebar when extension activates. | Extension loads in Extension Development Host. Sidebar opens. JWT stored and retrieved correctly. | 2 hrs | |
| 5.2 | Auto-context extraction from workspace | Extract: open file path, selected text/error, last terminal output (Shell Integration API, VS Code 1.77+), git diff of staged files. Pre-fill these as context when starting a session so the AI can skip questions it can auto-answer. | Open a file with an error selected → start session → AI skips "which file?" question because it's auto-detected. | 2 hrs | |
| 5.3 | Question flow UI in sidebar (React webview) | Show question from AI, text input, progress indicator, "skip this question" button. Show before/after panel after assembly. Show score bar and Cost Receipt card inline. "Send to Claude Code" button calls `vscode.commands.executeCommand` to paste assembled prompt into terminal. | Full loop in VS Code sidebar: type prompt → answer 3 questions → see receipt → send to terminal. | 3 hrs | |
| 5.4 | Chrome extension for claude.ai / ChatGPT | Inject "Enhance with PromptOS" button below chat input on `claude.ai` and `chat.openai.com`. On click: open floating overlay with question flow. On complete: inject assembled prompt into page input and simulate Enter. Use Shadow DOM to isolate extension CSS from page styles. | On claude.ai: button appears → click → overlay → assembled prompt injected into chat input. | 2 hrs | |

---

## VS Code Extension Details

### Tech Stack
- **Extension host:** TypeScript (Node.js)
- **Webview UI:** React (bundled with esbuild or webpack)
- **Auth storage:** `vscode.SecretStorage` (encrypted, OS keychain-backed)
- **Scaffold tool:** `yo code` (Yeoman VS Code generator)

### Auto-Context Extraction (Task 5.2)

The VS Code extension automatically extracts workspace context to pre-fill session answers:

| Context | API | Notes |
|---|---|---|
| Open file path | `vscode.window.activeTextEditor.document.uri` | Always available |
| Selected text / error | `editor.selection` + `editor.document.getText(selection)` | Selected on session start |
| Terminal output | Shell Integration API (VS Code 1.77+) | Last N lines of active terminal |
| Git staged diff | `vscode.extensions.getExtension('vscode.git')` | Staged changes only |

This pre-filled context is sent to the backend as `workspace_context` in `POST /session/start`, allowing Gemini to skip questions it can auto-answer.

### Webview UI (Task 5.3)

The sidebar React app communicates with the extension host via `vscode.postMessage`:

```
Webview                         Extension Host
  │                                  │
  │ → { type: 'startSession' }  ──→  │
  │                                  │ → POST /session/start
  │ ← { type: 'question', ... } ←── │
  │                                  │
  │ → { type: 'answer', ... }   ──→  │
  │                                  │ → POST /session/message
  │ ← { type: 'receipt', ... }  ←── │
```

---

## Browser Extension Details

### Tech Stack
- **Manifest:** Chrome MV3
- **Content script:** Vanilla JS + Shadow DOM
- **Overlay UI:** Injected iframe or Shadow DOM component

### Injection Targets

| Site | Input selector | Button placement |
|---|---|---|
| claude.ai | `div[contenteditable="true"]` | Below the chat input bar |
| chat.openai.com | `textarea#prompt-textarea` | Below the chat input bar |

### Shadow DOM Isolation

The extension UI is injected via Shadow DOM to prevent the host page's CSS from leaking into the extension overlay:

```js
const shadow = hostElement.attachShadow({ mode: 'closed' });
shadow.innerHTML = `<link rel="stylesheet" href="${chrome.runtime.getURL('overlay.css')}">...`;
```

---

## Repo Structure (this section)

```
vscode-extension/
├── src/
│   ├── extension.ts         # Activation + sidebar registration
│   ├── contextExtractor.ts  # Workspace context extraction
│   ├── webview/
│   │   ├── App.tsx          # React question flow UI
│   │   ├── Receipt.tsx      # Cost Receipt card
│   │   └── ScoreBar.tsx
│   └── utils/
│       └── api.ts           # Backend API calls
└── package.json

browser-extension/
├── content.js               # Injection logic
├── overlay.js               # Question flow overlay
├── overlay.css              # Shadow DOM styles
└── manifest.json            # Chrome MV3 manifest
```

---

## Testing (Phase 5)

| What to test | How | Pass if |
|---|---|---|
| VS Code sidebar loads | Open Extension Development Host | Sidebar visible, JWT stored on login |
| Auto-context extraction | Open file with error selected → start session | AI skips "which file?" question |
| Full sidebar loop | Type prompt → answer questions → click "Send to Claude Code" | Assembled prompt appears in terminal |
| Chrome extension injection | Navigate to claude.ai | "Enhance with PromptOS" button appears below input |
| Overlay question flow | Click button on claude.ai | Overlay opens, question flow runs, assembled prompt injected |

---

## Demo Preparation Checklist

| ✅ | Check | Why it matters |
|---|---|---|
| ☐ | Seed DB with 2 weeks of fake session data | Skill Decay chart needs history |
| ☐ | Pre-create a team with 2 accounts | Team leaderboard demo needs 2 real users |
| ☐ | Test internet speed at demo venue | Gemini Flash is <300ms on good connection. Bad wifi = awkward pauses |
| ☐ | Have `--skip` flag ready as safety valve | If API goes down during demo, you can still show the dashboard |
| ☐ | Screenshot all 5 dashboard sections | Show static fallback if live demo breaks |
| ☐ | Rehearse the 90-second demo script | Lead with Refusal Engine, not the question flow |

---

## Definition of Done

A task is **done** when:
1. The test case listed in its row passes without manual workarounds.
2. The code is committed to `main` (or a PR is merged).
3. No other phase's tasks break as a result.
4. At least one teammate has seen it run on their machine.

**Phase 5 is done** when both the VS Code sidebar demo and the claude.ai injection demo can be run top-to-bottom in one attempt — ideally as a single, continuous 90-second rehearsed demo.
