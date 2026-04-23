"""
Gemini Flash Service — Phase 1, Task 1.3

Wraps Google Gemini Flash 2.0 for:
  - run_conversation_turn(): decides next question or assembles final prompt
  - check_refusal(): detects if developer already knows the answer
"""

import os
import json
import google.generativeai as genai

genai.configure(api_key=os.environ["GEMINI_API_KEY"])
_model = genai.GenerativeModel("gemini-2.0-flash")

SYSTEM_PROMPT = """You are a prompt refinement agent. Your job is to help a developer write a better prompt for their AI coding assistant.

Given the developer's raw prompt and conversation so far, output ONLY valid JSON:

If more context needed:
{"question": "Which file is this happening in?", "why": "file path needed", "done": false}

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
- Output ONLY raw JSON — no markdown, no code fences."""

REFUSAL_PROMPT = """You are evaluating whether a developer already knows how to solve their problem.

Given their hypothesis, output ONLY valid JSON:
- If they clearly know the root cause and next step: {"should_refuse": true, "reason": "specific reason"}
- If they are still uncertain: {"should_refuse": false}

A strong refusal trigger: naming a specific file, function, variable, or config value AND proposing a concrete fix.
"""


async def run_conversation_turn(
    raw_prompt: str,
    conversation_history: list[dict],
    workspace_context: dict,
) -> dict:
    """
    Task 1.3 — Calls Gemini Flash with the full conversation history.
    Returns either a next question or the assembled prompt.
    """
    context_block = ""
    if workspace_context:
        context_block = f"\n\nWorkspace context (auto-extracted):\n{json.dumps(workspace_context, indent=2)}"

    history_block = "\n".join(
        f"{m['role'].upper()}: {m['content']}" for m in conversation_history
    )

    user_message = (
        f"Raw developer prompt: {raw_prompt}{context_block}\n\n"
        f"Conversation so far:\n{history_block}\n\n"
        "What should happen next?"
    )

    response = _model.generate_content(
        [{"role": "user", "parts": [SYSTEM_PROMPT + "\n\n" + user_message]}]
    )

    try:
        return json.loads(response.text.strip())
    except json.JSONDecodeError:
        # Fallback: treat as a plain question
        return {"done": False, "question": response.text.strip()}


async def check_refusal(hypothesis: str) -> dict:
    """
    Task 1.6 — Detects if the developer already knows the answer.
    """
    prompt = f"{REFUSAL_PROMPT}\n\nDeveloper hypothesis: {hypothesis}"
    response = _model.generate_content(prompt)

    try:
        result = json.loads(response.text.strip())
    except json.JSONDecodeError:
        result = {"should_refuse": False}

    if result.get("should_refuse"):
        result["message"] = "You already know the answer. Try implementing it."
    return result
