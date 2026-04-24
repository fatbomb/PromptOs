"""
Gemini Flash Service — Phase 1, Task 1.3

Wraps Google Gemini Flash 2.5 for:
  - run_conversation_turn(): decides next question or assembles final prompt
  - check_refusal(): detects if developer already knows the answer
"""

import os
import json

from google import genai
from google.genai import types

# Initialize the new SDK client. It will automatically pick up GEMINI_API_KEY from the environment.
_client = genai.Client()

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
- When assembling, you MUST include these exact literal words in your assembled_prompt text: "file", "error", "expected", "tried", "suspicion".
- Never invent context the developer didn't provide.
- Output ONLY raw JSON — no markdown, no code fences."""

REFUSAL_PROMPT = """You are evaluating whether a developer already knows how to solve their problem.

Given their hypothesis, output ONLY valid JSON:
- If they clearly know the root cause and next step: {"should_refuse": true, "reason": "specific reason"}
- If they are still uncertain: {"should_refuse": false}

A strong refusal trigger: naming a specific file, function, variable, or config value AND proposing a concrete fix.
"""


def _extract_json(text: str) -> dict:
    """Strip markdown code fences if Gemini wraps JSON in ```json ... ```."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    return json.loads(text.strip())


async def run_conversation_turn(
    raw_prompt: str,
    conversation_history: list[dict],
    workspace_context: dict,
    mode: str = "default",
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

    dynamic_system_prompt = SYSTEM_PROMPT
    if mode == "basic":
        dynamic_system_prompt = SYSTEM_PROMPT.replace("Stop at 5 questions maximum.", "Stop at 3 questions maximum.")
        dynamic_system_prompt = dynamic_system_prompt.replace("after 3-5 questions", "after 1-3 questions")
    elif mode == "skip":
        dynamic_system_prompt = SYSTEM_PROMPT.replace(
            "Ask ONE question per turn. Never two.",
            "DO NOT ASK ANY QUESTIONS. Immediately assemble the prompt and return done: true."
        ).replace("after 3-5 questions", "IMMEDIATELY (0 questions)")

    config = types.GenerateContentConfig(
        system_instruction=dynamic_system_prompt,
        temperature=0.2,
    )

    # Use the native async method from the new genai SDK
    response = await _client.aio.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=user_message,
        config=config,
    )

    try:
        return _extract_json(response.text)
    except (json.JSONDecodeError, ValueError):
        # Fallback: treat as a plain question to keep the session alive
        return {"done": False, "question": response.text.strip()}


async def check_refusal(hypothesis: str) -> dict:
    """
    Task 1.6 — Detects if the developer already knows the answer.
    """
    config = types.GenerateContentConfig(
        system_instruction=REFUSAL_PROMPT,
        temperature=0.1,
    )

    response = await _client.aio.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=f"Developer hypothesis: {hypothesis}",
        config=config,
    )

    try:
        result = _extract_json(response.text)
    except (json.JSONDecodeError, ValueError):
        result = {"should_refuse": False}

    if result.get("should_refuse"):
        result["message"] = "You already know the answer. Try implementing it."
    return result
