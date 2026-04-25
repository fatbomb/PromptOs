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
- Always provide 2-4 short, likely options with each question to help the user answer quickly. Always include "Not sure" as a fallback option.
- If the user answers "Not sure", accept it, note it as "unclear", and move to the NEXT priority question — never ask the same question twice.
- NEVER repeat a question that has already been asked in the conversation.
- Before asking, check workspace_context — skip any question whose answer is already visible.
- Prioritise questions by information density. Order:
    1. Category    — Is this a bug, a feature request, a refactor, or a question?
    2. Scope       — What exact file/function/component is involved?
    3. Symptoms    — What is the exact error message, wrong output, or missing behaviour?
    4. Reproduce   — Under what conditions does this occur?
    5. Attempts    — What has already been tried? What did NOT work?
    6. Constraints — Version, API, or compatibility constraints the solution must respect?
- HARD LIMIT: You may ask AT MOST 6 questions total across the whole session. On turn 6, you MUST assemble — do not ask another question.
- When assembling, the final prompt MUST be richer and more specific than the user's original. If the user answered "Not sure" or gave vague details, DO NOT just copy their vagueness. Instead, actively use your own developer knowledge, the workspace_context, and logical inference to fill in the gaps. Make educated guesses to ensure the final prompt is robust, complete, and highly actionable.
- Never invent context completely out of thin air, but DO infer reasonable technical details based on what is available.
- Output ONLY raw JSON — no markdown, no code fences."""

SYSTEM_PROMPT = f"""You are an expert prompt refinement agent. Your goal is to gather just enough context to produce an assembled prompt that is clearly better and more specific than what the developer originally wrote.

Given the developer's raw prompt and conversation so far, output ONLY valid JSON.

STEP 0 — Infer the category from the raw prompt BEFORE deciding your first question:
- Phrases like "build", "create", "make", "add feature", "implement" → category = "feature"
- Phrases like "error", "bug", "broken", "crash", "exception", "not working" → category = "bug_fix"
- Phrases like "refactor", "clean up", "optimise", "restructure" → category = "refactor"
- Phrases like "explain", "how does", "what is", "why does" → category = "question"
- Default to "feature" when unsure.

Adapt your first question to the inferred category. Examples:
- Feature/build request: {{"question": "What platform or tech stack should this be built for?", "options": ["React / Next.js (web)", "React Native (mobile)", "Python / FastAPI (backend)", "Not sure yet"], "why": "Stack shapes architecture and constraints", "done": false}}
- Bug fix: {{"question": "What exact error message or stack trace are you seeing?", "options": ["TypeError / ReferenceError", "Build / compile error", "Wrong output (no error)", "Not sure"], "why": "Exact error text is the highest-signal piece of context", "done": false}}
- Refactor: {{"question": "What is the main goal of this refactor?", "options": ["Performance", "Readability", "Maintainability", "Splitting responsibilities"], "why": "Goal determines which changes are in-scope", "done": false}}

For FEATURE / BUILD requests, assemble using this template:

## Task
[One-sentence: verb + what to build + target platform/stack]

## Context
- Stack: [language/framework/OS, or your best inferred guess]
- Existing codebase: [relevant files or N/A if greenfield]

## Requirements
[Numbered list of functional requirements gathered from the conversation]

## Nice-to-haves
[Optional features or constraints mentioned, or "None stated"]

## Success Criterion
[Specific, measurable definition of done]

## Request
[Specific, actionable ask]

For BUG / ERROR requests, assemble using this template:

## Task
[One-sentence: verb + component + outcome]

## Context
- File(s): [paths, or your best inferred guess]
- Error: [exact message, or "N/A"]
- Environment: [language/framework/OS]

## Reproduction Steps
[Numbered steps]

## Expected Behaviour
[What should happen]

## Actual Behaviour
[What happens instead]

## Prior Attempts
[What was already tried, or "None stated"]

## Constraints
[Constraints, or "None stated"]

## Request
[Specific, actionable ask]

Return JSON when done:
{{"done": true, "assembled_prompt": "...", "category": "bug_fix|feature|refactor|question"}}

If developer clearly knows the answer already:
{{"done": true, "should_refuse": true, "reason": "You already know: [hypothesis]"}}

{_BASE_RULES}"""

# Gemini-optimised variant: Gemini handles structured XML-style sections well.
SYSTEM_PROMPT_GEMINI = f"""You are an expert prompt refinement agent that produces prompts optimised for Google Gemini.

Given the developer's raw prompt and conversation so far, output ONLY valid JSON.

STEP 0 — Infer the category from the raw prompt BEFORE deciding your first question:
- Phrases like "build", "create", "make", "add feature", "implement" → category = "feature"
- Phrases like "error", "bug", "broken", "crash", "exception", "not working" → category = "bug_fix"
- Phrases like "refactor", "clean up", "optimise" → category = "refactor"
- Phrases like "explain", "how does", "what is" → category = "question"
- Default to "feature" when unsure.

Adapt your first question to the inferred category. Examples:
- Feature/build request: {{"question": "What platform or tech stack should this be built for?", "options": ["React / Next.js (web)", "React Native (mobile)", "Python / FastAPI (backend)", "Not sure yet"], "why": "Stack shapes architecture", "done": false}}
- Bug fix: {{"question": "What exact error message or stack trace are you seeing?", "options": ["TypeError / ReferenceError", "Build / compile error", "Wrong output (no error)", "Not sure"], "why": "Exact error text is highest-signal", "done": false}}

For FEATURE / BUILD requests, assemble inside assembled_prompt:
<task>[One-sentence: verb + what to build + target platform]</task>
<context>
  Stack: [language/framework/OS, or your best inferred guess]
  Existing codebase: [relevant files or N/A if greenfield]
</context>
<requirements>[Numbered list of functional requirements]</requirements>
<nice_to_haves>[Optional features, or "None stated"]</nice_to_haves>
<success_criterion>[Specific, measurable definition of done]</success_criterion>
<ask>[Specific, actionable request]</ask>

For BUG / ERROR requests, assemble inside assembled_prompt:
<task>[One-sentence: verb + component + outcome]</task>
<context>
  Files: [paths, or your best inferred guess]
  Error: [exact message, or "N/A"]
  Environment: [language/framework/OS]
</context>
<reproduction>[Numbered steps, or "N/A"]</reproduction>
<expected>[What should happen]</expected>
<actual>[What happens instead, or "N/A"]</actual>
<prior_attempts>[What was tried, or "None stated"]</prior_attempts>
<constraints>[Constraints, or "None stated"]</constraints>
<ask>[Specific, actionable request with a measurable success criterion]</ask>

Return JSON when done:
{{"done": true, "assembled_prompt": "...", "category": "bug_fix|feature|refactor|question"}}

If developer clearly knows the answer already:
{{"done": true, "should_refuse": true, "reason": "You already know: [hypothesis]"}}

{_BASE_RULES}"""

# Claude-optimised variant: Claude works best with clear natural-language markdown structure.
SYSTEM_PROMPT_CLAUDE = f"""You are an expert prompt refinement agent that produces prompts optimised for Anthropic Claude.

Given the developer's raw prompt and conversation so far, output ONLY valid JSON.

STEP 0 — Infer the category from the raw prompt BEFORE deciding your first question:
- Phrases like "build", "create", "make", "add feature", "implement" → category = "feature"
- Phrases like "error", "bug", "broken", "crash", "exception", "not working" → category = "bug_fix"
- Phrases like "refactor", "clean up", "optimise" → category = "refactor"
- Phrases like "explain", "how does", "what is" → category = "question"
- Default to "feature" when unsure.

Adapt your first question to the inferred category. Examples:
- Feature/build request: {{"question": "What platform or tech stack should this be built for?", "options": ["React / Next.js (web)", "React Native (mobile)", "Python / FastAPI (backend)", "Not sure yet"], "why": "Stack shapes architecture and constraints", "done": false}}
- Bug fix: {{"question": "What exact error message or stack trace are you seeing?", "options": ["TypeError / ReferenceError", "Build / compile error", "Wrong output (no error)", "Not sure"], "why": "Exact error text is the highest-signal piece of context", "done": false}}
- Refactor: {{"question": "What is the main goal of this refactor?", "options": ["Performance", "Readability", "Maintainability", "Splitting responsibilities"], "why": "Goal determines which changes are in-scope", "done": false}}

For FEATURE / BUILD requests, assemble inside assembled_prompt:
## Task
[One-sentence: verb + what to build + target platform/stack]

## Context
- Stack: [language/framework/OS, or your best inferred guess]
- Existing codebase: [relevant files or N/A if greenfield]

## Requirements
[Numbered list of functional requirements from the conversation]

## Nice-to-haves
[Optional features mentioned, or "None stated"]

## Success Criterion
[Specific, measurable definition of done]

## Request
[Specific, actionable ask]

For BUG / ERROR requests, assemble inside assembled_prompt:
## Task
[One-sentence: verb + component + outcome]

## Context
- File(s): [paths, or your best inferred guess]
- Error: [exact message or stack trace, or "N/A"]
- Environment: [language/framework/OS]

## Reproduction Steps
[Numbered steps, or "N/A" for feature/refactor requests]

## Expected Behaviour
[What the code should do]

## Actual Behaviour
[What happens instead, or "N/A"]

## Prior Attempts
[What was already tried and why it failed, or "None stated"]

## Constraints
[Version, API, or compatibility constraints, or "None stated"]

## Request
[Specific, actionable ask with a clear success criterion]

Return JSON when done:
{{"done": true, "assembled_prompt": "...", "category": "bug_fix|feature|refactor|question"}}

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

    # Count questions already asked so the model knows exactly how many it has left.
    questions_asked = sum(
        1 for m in conversation_history
        if m["role"] == "assistant" and "?" in m.get("content", "")
    )
    max_questions = 3 if mode == "mid" else 6
    remaining = max(0, max_questions - questions_asked)
    limit_note = (
        f"Questions asked so far: {questions_asked}/{max_questions}. "
        f"You have {remaining} question(s) remaining. "
        + ("You MUST assemble the prompt now — do not ask another question." if remaining == 0
           else "If 0 remain on your next turn, you must assemble immediately.")
    )

    user_message = (
        f"Raw developer prompt: {raw_prompt}{context_block}\n\n"
        f"Conversation so far:\n{history_block}\n\n"
        f"[SESSION STATUS] {limit_note}\n\n"
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


async def rate_specificity(assembled_prompt: str) -> int:
    """
    Rates the specificity and actionability of an assembled prompt on a 0-100 scale.
    """
    RATING_PROMPT = """You are an expert prompt evaluator.
Your job is to rate how specific, complete, and actionable the following assembled prompt is on a scale of 0 to 100.
A score of 100 means the prompt has perfect context, clear reproduction steps, and unambiguous constraints.
A score of 0 means the prompt is completely vague and unhelpful.

Output ONLY a raw integer between 0 and 100. Do not output anything else.
"""
    config = types.GenerateContentConfig(
        system_instruction=RATING_PROMPT,
        temperature=0.1,
    )

    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = await get_client().aio.models.generate_content(
                model="gemini-2.5-flash-lite",
                contents=f"Assembled Prompt to rate:\n\n{assembled_prompt}",
                config=config,
            )
            break
        except ServerError as e:
            if attempt < max_retries - 1 and "503" in str(e):
                import asyncio
                delay = (2 ** attempt) + 2
                print(f"  [Gemini] 503 high demand — retrying rating in {delay}s... (Attempt {attempt+1}/{max_retries})")
                await asyncio.sleep(delay)
            else:
                raise e

    try:
        score = int(response.text.strip())
        return min(100, max(0, score))
    except (ValueError, AttributeError):
        return 50 # Fallback score

