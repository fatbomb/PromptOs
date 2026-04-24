# PromptOS CLI

The PromptOS CLI is an interactive wrapper that helps you refine your natural language prompts into highly structured, context-rich prompts before passing them to your favorite AI coding assistant (like Claude, Gemini, Cursor, etc.).

## Setup Instructions

1. Ensure the **PromptOS Backend** (`phase-1-backend`) is running.
2. Navigate to the CLI directory:
   ```bash
   cd phase-2-cli
   npm install
   ```
3. Set up your environment variables:
   ```bash
   cp .env.example .env
   ```
   *(Ensure `PROMPTOS_API_BASE_URL` points to your running backend, usually `http://localhost:8000`)*

## Authentication (Development)

Because the full frontend dashboard is not yet deployed, you can use the built-in development authentication flow to get started immediately.

1. Open a new terminal and navigate to the backend to generate a test token:
   ```bash
   cd phase-1-backend
   python generate_test_token.py
   ```
2. Copy the output JWT token.
3. Inject the token into your local CLI keychain:
   ```bash
   cd phase-2-cli
   node index.js dev-login <YOUR_TOKEN>
   ```

## Usage

You can run the CLI using `node index.js` (or you can link it globally with `npm link` to just type `promptos`).

### 1. Interactive Refinement (Default)
Asks you a few targeted questions to extract context (files, errors, expectations) before assembling the final prompt.
```bash
node index.js ask "fix the auth bug"
```

### 2. Auto-Run with an AI Tool
You can automatically pass the refined prompt to another CLI tool (e.g. `claude` or `gemini`).
```bash
node index.js run claude "build a navbar"
```
Shortcuts available:
```bash
node index.js claude "build a navbar"
node index.js gemini "build a navbar"
```

### 3. Custom Conversation Modes
Control how interactive the refinement process is:
- `--basic`: Limits the AI to a maximum of 3 questions.
  ```bash
  node index.js run claude "fix the database schema" --basic
  ```
- `--skip`: Skips the interactive questions entirely. It takes your raw prompt, structures it automatically (0-shot), and immediately passes it to the tool.
  ```bash
  node index.js run claude "write a regex for emails" --skip
  ```

### 4. Check Your Usage Stats
View your token savings, time recovered, and session history:
```bash
node index.js stats
```

## Testing Your Environment

To quickly verify that your CLI, backend, and authentication are correctly hooked up, run the built-in diagnostic test tool:
```bash
node test-cli.js
```
