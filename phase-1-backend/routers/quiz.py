from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
import asyncio
from google.genai import types
from google.genai.errors import ServerError

router = APIRouter(prefix="/quiz", tags=["quiz"])

class QuizRequest(BaseModel):
    concept: str

class QuizSubmitRequest(BaseModel):
    user_id: str
    concept: str
    score: float # Percentage 0-100

QUIZ_PROMPT = """Generate 3 multiple choice questions (MCQ) for the programming concept: "{concept}".
Focus on common pitfalls or technical details.

Output ONLY a valid JSON array of objects with this structure:
[
  {{
    "q": "Question text?",
    "options": ["A", "B", "C", "D"],
    "correct_index": 0
  }}
]

Do not include markdown or code fences."""

MAX_RETRIES = 3

@router.post("/generate")
async def generate_quiz(request: QuizRequest):
    from services.gemini import get_client

    last_error: Exception | None = None

    for attempt in range(MAX_RETRIES):
        try:
            print(f"  [quiz] Generating quiz for '{request.concept}' (attempt {attempt + 1}/{MAX_RETRIES})")
            response = await get_client().aio.models.generate_content(
                model="gemini-2.5-flash-lite",
                contents=QUIZ_PROMPT.format(concept=request.concept),
            )

            text = response.text.strip()
            # Clean potential markdown fences
            if text.startswith("```"):
                lines = text.splitlines()
                text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

            questions = json.loads(text)
            print(f"  [quiz] Successfully generated {len(questions)} questions for '{request.concept}'")
            return {"questions": questions}

        except ServerError as e:
            last_error = e
            if attempt < MAX_RETRIES - 1 and "503" in str(e):
                delay = (2 ** attempt) + 3  # 4s, 6s, ...
                print(f"  [quiz] 503 high demand — retrying in {delay}s... (attempt {attempt + 1}/{MAX_RETRIES})")
                await asyncio.sleep(delay)
            else:
                print(f"  [quiz] ServerError on attempt {attempt + 1}: {e}")
                break

        except (json.JSONDecodeError, ValueError) as e:
            last_error = e
            if attempt < MAX_RETRIES - 1:
                delay = 2
                print(f"  [quiz] Bad JSON response — retrying in {delay}s... (attempt {attempt + 1}/{MAX_RETRIES})")
                await asyncio.sleep(delay)
            else:
                print(f"  [quiz] Persistent JSON parse error after {MAX_RETRIES} attempts: {e}")
                break

        except Exception as e:
            last_error = e
            print(f"  [quiz] Unexpected error on attempt {attempt + 1}: {e}")
            break

    print(f"  [quiz] All attempts failed for '{request.concept}'. Last error: {last_error}")
    raise HTTPException(status_code=503, detail="Quiz generation temporarily unavailable. Please try again in a few seconds.")

@router.post("/submit")
async def submit_quiz(request: QuizSubmitRequest):
    try:
        from services.supabase_client import upsert_concept_db
        # Determine color band based on score
        band = "red"
        if request.score >= 80:
            band = "green"
        elif request.score >= 50:
            band = "amber"
            
        upsert_concept_db(request.user_id, request.concept, request.score, band)
        return {"status": "success"}
    except Exception as e:
        print(f"[quiz] Error submitting result: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit quiz result")
