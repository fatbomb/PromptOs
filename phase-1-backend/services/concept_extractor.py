"""
Concept Extractor — Phase 3, Task 3.2

Runs as a FastAPI BackgroundTask after every session completes.
Uses Gemini Flash to extract concept tags from the assembled prompt,
then upserts them into the `concept_map` Supabase table.
"""

import os
import json
import google.generativeai as genai

genai.configure(api_key=os.environ["GEMINI_API_KEY"])
_model = genai.GenerativeModel("gemini-2.0-flash")

EXTRACT_PROMPT = """Extract the core programming/engineering concepts from this prompt.
Output ONLY a JSON array of short concept strings (2–4 words max each).
Examples: ["JWT", "Redis TTL", "token rotation", "React hooks", "database indexing"]

Prompt:
{assembled_prompt}

Output ONLY valid JSON array:"""


async def extract_and_store_concepts(
    user_id: str,
    session_id: str,
    assembled_prompt: str,
    scores: dict,
) -> None:
    """
    Task 3.2 — Extracts concept tags from the assembled prompt and upserts
    into the concept_map table. Called as a background task — never blocks response.
    """
    try:
        prompt = EXTRACT_PROMPT.format(assembled_prompt=assembled_prompt)
        response = _model.generate_content(prompt)
        concepts: list[str] = json.loads(response.text.strip())
    except Exception:
        concepts = []

    dependency_score = scores.get("dependency_score", 50)

    for concept in concepts:
        color_band = _score_to_color(dependency_score)
        # TODO (Task 3.2): upsert concept into Supabase `concept_map`
        # supabase.table("concept_map").upsert({
        #     "user_id": user_id,
        #     "concept": concept,
        #     "encounter_count": 1,   # increment via RPC
        #     "avg_score": dependency_score,
        #     "color_band": color_band,
        #     "last_seen_at": "now()",
        # }, on_conflict="user_id,concept").execute()
        print(f"[concept_extractor] Extracted: {concept} ({color_band})")


def _score_to_color(score: int) -> str:
    if score >= 70:
        return "green"
    elif score >= 40:
        return "amber"
    return "red"
