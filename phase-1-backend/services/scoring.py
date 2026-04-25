"""
Scoring Engine — Phase 1, Task 1.5

Computes deterministic scores after a session completes:
  1. Token Efficiency  (0–100) — assembled_tokens / raw_tokens ratio
  2. Thinking Depth    (0–100) — how many context dimensions were filled
  3. Dependency Score  (0–100) — how many questions the user could NOT answer (lower = better)
  4. Raw Specificity   (0–100) — Gemini-rated quality of the original raw prompt
  5. Assembled Specificity (0–100) — Gemini-rated quality of the refined prompt
  6. Quality Delta     (int)   — assembled_specificity - raw_specificity (the improvement)
  7. AI Self-Awareness Score (0–100) — composite metric
"""

import asyncio
import tiktoken

_encoder = tiktoken.get_encoding("cl100k_base")

# The five context dimensions Thinking Depth checks for
CONTEXT_DIMENSIONS = ["file", "error", "expected", "tried", "suspicion"]


def _count_tokens(text: str) -> int:
    return len(_encoder.encode(text))


async def compute_scores(
    raw_prompt: str,
    assembled_prompt: str,
    conversation_history: list[dict],
    was_refused: bool = False,
) -> dict:
    """
    Returns all scoring metrics including the new quality delta between
    the raw and assembled prompts.
    """
    from services.gemini import rate_specificity

    raw_tokens = _count_tokens(raw_prompt)
    assembled_tokens = _count_tokens(assembled_prompt)

    # 1. Token Efficiency — reward longer, richer assembled prompts
    token_efficiency = min(100, int((assembled_tokens / max(raw_tokens, 1)) * 50))

    # 2. Thinking Depth — check assembled prompt for presence of each dimension
    assembled_lower = assembled_prompt.lower()
    dimensions_filled = sum(
        1 for dim in CONTEXT_DIMENSIONS if dim in assembled_lower
    )
    thinking_depth = dimensions_filled * 20  # each dimension = 20 pts

    # 3. Dependency Score — count user turns with short / vague answers
    user_turns = [m for m in conversation_history if m["role"] == "user"]
    vague_turns = sum(
        1 for m in user_turns if len(m["content"].split()) < 4
    )
    dependency_score = max(0, 100 - int((vague_turns / max(len(user_turns), 1)) * 100))

    # 4. Estimated turns saved
    estimated_turns_saved = max(0, 6 - (thinking_depth // 20))

    # 5. Score both raw AND assembled quality in parallel (2 Gemini calls at once)
    raw_specificity_score, assembled_specificity_score = await asyncio.gather(
        rate_specificity(raw_prompt),
        rate_specificity(assembled_prompt),
    )
    quality_delta = assembled_specificity_score - raw_specificity_score

    # 6. AI Self-Awareness Score
    refusal_points = 0 if was_refused else 20
    ai_self_awareness_score = int(
        (thinking_depth * 0.4) + (assembled_specificity_score * 0.4) + refusal_points
    )
    ai_self_awareness_score = min(100, max(0, ai_self_awareness_score))

    return {
        "raw_token_count": raw_tokens,
        "assembled_token_count": assembled_tokens,
        "token_efficiency_score": token_efficiency,
        "thinking_depth_score": thinking_depth,
        "dependency_score": dependency_score,
        "estimated_turns_saved": estimated_turns_saved,
        "raw_specificity_score": raw_specificity_score,
        "specificity_score": assembled_specificity_score,        # alias kept for back-compat
        "assembled_specificity_score": assembled_specificity_score,
        "quality_delta": quality_delta,
        "ai_self_awareness_score": ai_self_awareness_score,
    }
