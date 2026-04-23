"""
Scoring Engine — Phase 1, Task 1.5

Computes three deterministic scores after a session completes:
  1. Token Efficiency  (0–100) — assembled_tokens / raw_tokens ratio
  2. Thinking Depth    (0–100) — how many context dimensions were filled
  3. Dependency Score  (0–100) — how many questions the user could NOT answer (lower = better)
"""

import tiktoken

_encoder = tiktoken.get_encoding("cl100k_base")

# The five context dimensions Thinking Depth checks for
CONTEXT_DIMENSIONS = ["file", "error", "expected", "tried", "suspicion"]


def _count_tokens(text: str) -> int:
    return len(_encoder.encode(text))


def compute_scores(
    raw_prompt: str,
    assembled_prompt: str,
    conversation_history: list[dict],
) -> dict:
    """
    Task 1.5 — Returns token_efficiency, thinking_depth, dependency_score,
    and estimated_turns_saved.
    """
    raw_tokens = _count_tokens(raw_prompt)
    assembled_tokens = _count_tokens(assembled_prompt)

    # 1. Token Efficiency — reward longer, richer assembled prompts
    #    Cap at 100. If assembled < raw, score is low (prompt didn't improve).
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
    #    Formula from implementation plan: 6 - floor(thinking_depth / 20)
    estimated_turns_saved = max(0, 6 - (thinking_depth // 20))

    return {
        "raw_token_count": raw_tokens,
        "assembled_token_count": assembled_tokens,
        "token_efficiency_score": token_efficiency,
        "thinking_depth_score": thinking_depth,
        "dependency_score": dependency_score,
        "estimated_turns_saved": estimated_turns_saved,
    }
