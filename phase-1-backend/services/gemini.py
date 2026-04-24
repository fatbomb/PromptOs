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

# Lazy-initialize the client to ensure environment variables are loaded first.
_client_instance = None

def get_client():
    global _client_instance
    if _client_instance is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
             # Fallback to GOOGLE_API_KEY if GEMINI_API_KEY is not set
             api_key = os.environ.get("GOOGLE_API_KEY")
        
        _client_instance = genai.Client(api_key=api_key)
    return _client_instance

# ---------------------------------------------------------------------------
# System prompt variants — base (general), Gemini-optimised, Claude-optimised
# ---------------------------------------------------------------------------

_BASE_RULES = """\
Rules:
- Ask ONE question per turn. Never two.
- Use workspace_context to skip questions you can auto-answer.
- When assembling, include key details like file paths, error messages, expected vs actual behaviour, and developer hypotheses.
- Never invent context the developer didn't provide.
- Output ONLY raw JSON — no markdown, no code fences."""

SYSTEM_PROMPT = f"""You are a prompt refinement agent. Your job is to help a developer write a better prompt for their AI coding assistant.

Given the developer's raw prompt and conversation so far, output ONLY valid JSON:

If more context needed:
{{"question": "Which file is this happening in?", "why": "file path needed", "done": false}}

If you have enough context (after 3-6 questions):
{{"done": true, "assembled_prompt": "...[full structured prompt]...", "category": "bug_fix"}}

If developer clearly knows the answer already:
{{"done": true, "should_refuse": true, "reason": "You already know: [their hypothesis]"}}

{_BASE_RULES}
- Stop at 6 questions maximum."""

# Gemini-optimised variant: Gemini handles structured XML-style sections well.
SYSTEM_PROMPT_GEMINI = f"""You are a prompt refinement agent that produces prompts optimised for Google Gemini.

Given the developer's raw prompt and conversation so far, output ONLY valid JSON.

If more context needed:
{{"question": "Which file is this happening in?", "why": "file path needed", "done": false}}

When assembling, produce a Gemini-optimised prompt using this structure inside assembled_prompt:
<task>[One-sentence task description]</task>
<context>[File names, error messages, stack traces, environment]</context>
<expected>[What should happen]</expected>
<actual>[What is happening]</actual>
<hypothesis>[Developer's suspicion, if any]</hypothesis>
<ask>[Specific, actionable request]</ask>

Return JSON when done:
{{"done": true, "assembled_prompt": "...", "category": "bug_fix"}}

If developer clearly knows the answer already:
{{"done": true, "should_refuse": true, "reason": "You already know: [hypothesis]"}}

{_BASE_RULES}"""

# Claude-optimised variant: Claude works best with clear natural-language markdown structure.
SYSTEM_PROMPT_CLAUDE = f"""You are a prompt refinement agent that produces prompts optimised for Anthropic Claude.

Given the developer's raw prompt and conversation so far, output ONLY valid JSON.

If more context needed:
{{"question": "Which file is this happening in?", "why": "file path needed", "done": false}}

When assembling, produce a Claude-optimised prompt with this natural markdown layout inside assembled_prompt:
## Task
[One-sentence task description]

## Context
[File names, error messages, stack traces, environment details]

## Expected Behaviour
[What should happen]

## Actual Behaviour
[What is happening]

## My Hypothesis
[Developer's suspicion, if any]

## Request
[Specific, actionable request for Claude]

Return JSON when done:
{{"done": true, "assembled_prompt": "...", "category": "bug_fix"}}

If developer clearly knows the answer already:
{{"done": true, "should_refuse": true, "reason": "You already know: [hypothesis]"}}

{_BASE_RULES}"""

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
    target_tool: str | None = None,
) -> dict:
    """
    Calls Gemini Flash with the full conversation history.
    Applies mode logic (skip / mid / default) and tool-specific prompt optimisation.
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

    # -----------------------------------------------------------------------
    # Select the right base system prompt based on target tool
    # -----------------------------------------------------------------------
    tool_key = (target_tool or "").lower()
    if tool_key == "gemini":
        base_prompt = SYSTEM_PROMPT_GEMINI
    elif tool_key == "claude":
        base_prompt = SYSTEM_PROMPT_CLAUDE
    else:
        base_prompt = SYSTEM_PROMPT

    # -----------------------------------------------------------------------
    # Apply mode-specific overrides
    # -----------------------------------------------------------------------
    if mode == "skip":
        # 0 questions — immediately assemble using the tool-specific structure
        dynamic_system_prompt = (
            base_prompt
            + "\n\nMODE OVERRIDE — SKIP: You MUST NOT ask any questions. "
            "Immediately assemble the best possible prompt from the raw input alone and return done=true. "
            "Use any workspace_context available to fill gaps."
        )
    elif mode == "mid":
        # ≤ 3 questions — then assemble using the tool-specific structure
        dynamic_system_prompt = (
            base_prompt
            + "\n\nMODE OVERRIDE — MID: You may ask AT MOST 3 questions total. "
            "If you already have enough context, assemble immediately. "
            "Prioritise the single most impactful clarifying question each turn."
        )
    else:
        # default — up to 6 questions
        dynamic_system_prompt = (
            base_prompt
            + "\n\nMODE: Default. You may ask up to 6 questions before assembling."
        )

    config = types.GenerateContentConfig(
        system_instruction=dynamic_system_prompt,
        temperature=0.2,
    )

    response = await get_client().aio.models.generate_content(
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

    response = await get_client().aio.models.generate_content(
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
