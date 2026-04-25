# PromptOS — Prompt Refinement for VS Code

**Stop wasting AI turns.** PromptOS analyzes your intent and asks the right clarifying questions _before_ you send a prompt to Claude, Gemini, or any AI coding assistant — so your first message is already your best one.

---

## Features

- 🧠 **Intelligent prompt refinement** — Conversational pre-flight questions sharpen your prompt automatically
- 🔐 **Google OAuth login** — Securely links to your PromptOS account
- 📊 **Live telemetry** — Every session is logged to your [PromptOS Dashboard](https://prompt-os-dashboard.vercel.app) with efficiency scores
- ⚡ **Send to Terminal** — Injects the refined prompt directly into your VS Code terminal
- 🛡️ **Refusal detection** — Identifies and warns you about prompts that AI models are likely to refuse
- 🗺️ **Knowledge mapping** — Tracks which concepts you rely on AI for, surfacing skill decay over time

---

## Getting Started

1. Install the extension
2. Click the **PromptOS** icon in the Activity Bar (sidebar)
3. Click **Continue with Google** to authenticate
4. Type a prompt and hit **Refine** — PromptOS will ask a few quick questions
5. Copy or send the refined prompt directly to your terminal

---

## Requirements

- VS Code `^1.77.0`
- A free [PromptOS account](https://prompt-os-dashboard.vercel.app)

---

## Extension Settings

| Setting | Default | Description |
|---|---|---|
| `promptos.apiUrl` | `https://prompt-os-dusky.vercel.app` | PromptOS backend API URL |
| `promptos.dashboardUrl` | `https://prompt-os-dashboard.vercel.app` | PromptOS Dashboard URL |

---

## Changelog

### 0.2.1
- Added README and marketplace description
- Added `.vscodeignore` to reduce package size
- Production URL fixes and CSP hardening

### 0.2.0
- Production CORS and URL fixes
- Removed localhost from Content Security Policy

### 0.1.0
- Initial release

---

## Links

- 🌐 [Dashboard](https://prompt-os-dashboard.vercel.app)
- 📖 [Docs](https://prompt-os-dashboard.vercel.app/dashboard/docs)
