# PromptOS

**Stop wasting AI turns.** PromptOS is a prompt refinement layer that sits in front of any AI coding assistant. Before you send a vague prompt to Claude, Gemini, or ChatGPT, PromptOS runs a short conversational flow (3–5 questions) to assemble a structured, high-context prompt. 

It tracks dependency scores, knowledge gaps, and skill decay over time — turning every AI interaction into a learning event.

---

## 🚀 The Core Philosophy
AI assistants are incredibly powerful, but developers often waste time iterating on vague prompts. PromptOS forces you to think about the *context* before you ask the AI to solve the problem. By adding a tiny bit of upfront friction, you get your answer significantly faster.

## ✨ Key Features
- 🧠 **Conversational Prompt Refinement Engine:** Uses Gemini Flash to ask you targeted clarifying questions before sending your prompt to an AI assistant.
- 🚫 **Refusal Engine:** Detects when you already know the answer to your own question and tells you to try implementing it yourself.
- 🧾 **Cost Receipt:** Shows you the turns saved, time recovered, and cost delta immediately after every session.
- 🗺️ **Knowledge Map:** A visual bubble chart of concepts you repeatedly ask about, highlighting knowledge gaps.
- 📉 **Skill Decay Chart:** A week-over-week trend of your AI-dependence score.
- 🎓 **Quiz Engine:** Auto-generated quizzes for concepts you rely on AI for too heavily (amber/red concepts).
- 🏆 **Team Leaderboard:** Ranked by lowest dependency score to encourage independent problem solving.

---

## 🛠️ Ecosystem Components

PromptOS is a multi-platform ecosystem consisting of five core pieces:

### 1. The Dashboard (Next.js)
The central hub where all your telemetry lives. It features the Knowledge Map, Skill Decay charts, Quiz Engine, and Team Leaderboards. 
- **Tech:** Next.js 14, Tailwind, Recharts, @supabase/ssr

### 2. The CLI (`promptos`)
A terminal-first interface for refining prompts without leaving your workflow. It supports interactive sessions, auto-saving telemetry, and printing the Cost Receipt directly to your console.
- **Tech:** Node.js, Commander.js, Inquirer

### 3. VS Code Extension
Brings PromptOS directly into your IDE. It can automatically extract context (open files, selected text, terminal errors) so the AI skips questions it can auto-answer, and it can inject the refined prompt directly into your terminal.
- **Tech:** TypeScript, React Webview

### 4. Browser Extension (Chrome)
Injects a "Enhance with PromptOS" button directly into the chat interfaces of `claude.ai` and `chat.openai.com`. It opens a floating overlay with the question flow and injects the assembled prompt into the page input.
- **Tech:** Vanilla JS, Shadow DOM

### 5. Backend API (FastAPI)
The core engine powering everything. It manages the conversational flow with Gemini, scores the sessions (Token Efficiency, Thinking Depth, Dependency Score), and manages auth state.
- **Tech:** Python, FastAPI, Supabase (Postgres)

---

## 🏗️ Architecture & Tech Stack
- **AI Engine:** Google Gemini Flash 2.0 (for prompt refinement and concept extraction)
- **Backend:** FastAPI (Python)
- **Database:** Supabase (Postgres)
- **Frontend / Dashboard:** Next.js 14 (App Router)
- **CLI:** Node.js

## 📚 Documentation
For detailed installation and usage instructions for each ecosystem component, please refer to the **[PromptOS Documentation](https://prompt-os-dashboard.vercel.app/dashboard/docs)**.
