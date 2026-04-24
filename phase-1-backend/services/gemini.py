"""
Gemini Flash Service — Phase 1, Task 1.3

Wraps Google Gemini Flash 2.5 for:
  - run_conversation_turn(): decides next question or assembles final prompt
  - check_refusal(): detects if developer already knows the answer
"""

import os
import json
import asyncio

from google import genai
from google.genai import types
from google.genai.errors import ServerError

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
- Before asking, check workspace_context — skip any question whose answer is already visible (open files, error traces, cursor position).
- Prioritise questions by information density: prefer questions that unlock the most context if unanswered.
- Question priority order:
    1. Scope       — What exact file/function/component is broken?
    2. Symptoms    — What is the exact error message, stack trace, or wrong output?
    3. Reproduce   — Under what conditions does this occur? Always? On save? On specific input?
    4. Attempts    — What has already been tried? What did NOT work?
    5. Constraints — Are there version, API, or compatibility constraints the fix must respect?
- When assembling, the final prompt MUST include: file paths, exact error text, expected vs actual behaviour, reproduction steps, prior attempts, and constraints.
- Never invent context the developer didn't provide.
- Output ONLY raw JSON — no markdown, no code fences."""

SYSTEM_PROMPT = f"""You are an expert prompt refinement agent. Your goal is to gather the minimum, highest-value context needed to produce a complete, actionable prompt for an AI coding assistant.

Given the developer's raw prompt and conversation so far, output ONLY valid JSON.

If more context is needed (follow the priority order in Rules):
{{"question": "What exact error message or stack trace are you seeing?", "why": "Error text is the single highest-signal piece of context for a bug", "done": false}}

Once you have enough to fully specify the problem (after 3-6 questions), assemble using this structure inside assembled_prompt:

## Task
[One-sentence description: verb + component + outcome]

## Context
- File(s): [paths]
- Error: [exact message or stack trace]
- Environment: [language version, framework, OS if relevant]

## Reproduction Steps
1. [Step-by-step to trigger the issue]

## Expected Behaviour
[What the code should do]

## Actual Behaviour
[What it does instead]

## Prior Attempts
[What the developer has already tried and why it failed, or "None stated"]

## Constraints
[Version requirements, API limitations, must-not-break items, or "None stated"]

## Request
[Specific, actionable ask — e.g. "Fix the function so that X happens when Y"]

Return JSON when done:
{{"done": true, "assembled_prompt": "...", "category": "bug_fix"}}

If developer clearly knows the answer already:
{{"done": true, "should_refuse": true, "reason": "You already know: [hypothesis]"}}

{_BASE_RULES}
- Stop at 6 questions maximum."""

# Gemini-optimised variant: Gemini handles structured XML-style sections well.
SYSTEM_PROMPT_GEMINI = f"""You are an expert prompt refinement agent that produces prompts optimised for Google Gemini.

Given the developer's raw prompt and conversation so far, output ONLY valid JSON.

If more context is needed (follow the priority order in Rules):
{{"question": "What exact error message or stack trace are you seeing?", "why": "Error text is the single highest-signal piece of context for a bug", "done": false}}

When assembling, produce a Gemini-optimised prompt using this structure inside assembled_prompt:
<task>[One-sentence description: verb + component + outcome]</task>
<context>
  Files: [paths]
  Error: [exact message or stack trace]
  Environment: [language/framework/OS if relevant]
</context>
<reproduction>
  [Numbered steps to trigger the issue]
</reproduction>
<expected>[What should happen]</expected>
<actual>[What is happening instead]</actual>
<prior_attempts>[What the developer already tried, or "None stated"]</prior_attempts>
<constraints>[Version, API, or compatibility constraints, or "None stated"]</constraints>
<ask>[Specific, actionable request with a measurable success criterion]</ask>

Return JSON when done:
{{"done": true, "assembled_prompt": "...", "category": "bug_fix"}}

If developer clearly knows the answer already:
{{"done": true, "should_refuse": true, "reason": "You already know: [hypothesis]"}}

{_BASE_RULES}"""

# Claude-optimised variant: Claude works best with clear natural-language markdown structure.
SYSTEM_PROMPT_CLAUDE = f"""You are an expert prompt refinement agent that produces prompts optimised for Anthropic Claude.

Given the developer's raw prompt and conversation so far, output ONLY valid JSON.

If more context is needed (follow the priority order in Rules):
{{"question": "What exact error message or stack trace are you seeing?", "why": "Error text is the single highest-signal piece of context for a bug", "done": false}}

When assembling, produce a Claude-optimised prompt with this natural markdown layout inside assembled_prompt:
## Task
[One-sentence description: verb + component + outcome]

## Context
- File(s): [paths]
- Error: [exact message or stack trace]
- Environment: [language version, framework, OS if relevant]

## Reproduction Steps
1. [Step-by-step to trigger the issue]

## Expected Behaviour
[What the code should do]

## Actual Behaviour
[What it does instead]

## Prior Attempts
[What the developer has already tried and why it failed, or "None stated"]

## Constraints
[Version requirements, API limitations, must-not-break items, or "None stated"]

## Request
[Specific, actionable ask with a clear success criterion — e.g. "Rewrite X so that Y happens when Z, without breaking W"]

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

    # -----------------------------------------------------------------------
    # Call Gemini with retry mechanism
    # -----------------------------------------------------------------------
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = await get_client().aio.models.generate_content(
                model="gemini-2.5-flash-lite",
                contents=user_message,
                config=config,
            )
            break
        except ServerError as e:
            if attempt < max_retries - 1 and "503" in str(e):
                delay = (2 ** attempt) + 2
                print(f"  [Gemini] 503 high demand — retrying in {delay}s... (Attempt {attempt+1}/{max_retries})")
                await asyncio.sleep(delay)
            else:
                raise e

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

    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = await get_client().aio.models.generate_content(
                model="gemini-2.5-flash-lite",
                contents=f"Developer hypothesis: {hypothesis}",
                config=config,
            )
            break
        except ServerError as e:
            if attempt < max_retries - 1 and "503" in str(e):
                delay = (2 ** attempt) + 2
                print(f"  [Gemini] 503 high demand — retrying in {delay}s... (Attempt {attempt+1}/{max_retries})")
                await asyncio.sleep(delay)
            else:
                raise e

    try:
        result = _extract_json(response.text)
    except (json.JSONDecodeError, ValueError):
        result = {"should_refuse": False}

    if result.get("should_refuse"):
        result["message"] = "You already know the answer. Try implementing it."
    return result
