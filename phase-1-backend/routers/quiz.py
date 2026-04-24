from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.gemini import get_client
import json

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

@router.post("/generate")
async def generate_quiz(request: QuizRequest):
    try:
        from services.gemini import get_client
        response = await get_client().aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=QUIZ_PROMPT.format(concept=request.concept),
        )
        
        text = response.text.strip()
        # Clean potential markdown fences
        if text.startswith("```"):
            lines = text.splitlines()
            text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
            
        questions = json.loads(text)
        return {"questions": questions}
    except Exception as e:
        print(f"[quiz] Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate quiz")

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
