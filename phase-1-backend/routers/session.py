"""
Session Router — Phase 1, Tasks 1.3 & 1.4

Endpoints:
  POST /session/start    → creates a new session, returns session_id
  POST /session/message  → appends user message, calls Gemini, returns next question or assembled prompt
  POST /session/complete → finalises session, triggers background concept extraction
"""

import uuid
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from pydantic import BaseModel

from middleware.jwt_verify import get_current_user
from services.gemini import run_conversation_turn
from services.scoring import compute_scores
from services.concept_extractor import extract_and_store_concepts
from services.supabase_client import store_session_db, update_weekly_aggregates

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class StartSessionRequest(BaseModel):
    raw_prompt: str
    workspace_context: dict | None = None  # VS Code auto-extracted context
    mode: str = "default"  # "default", "mid", "skip"
    target_tool: str | None = None  # e.g. "gemini", "claude" — used to tailor the assembled prompt


class MessageRequest(BaseModel):
    session_id: str
    user_message: str


class CompleteRequest(BaseModel):
    session_id: str


# ---------------------------------------------------------------------------
# In-memory session store (replace with Supabase in Task 1.4)
# ---------------------------------------------------------------------------
_sessions: dict = {}


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/start")
async def start_session(req: StartSessionRequest, user=Depends(get_current_user)):
    """Task 1.4 — Creates a new session and stores the raw prompt."""
    session_id = str(uuid.uuid4())
    _sessions[session_id] = {
        "user_id": user["sub"],
        "raw_prompt": req.raw_prompt,
        "workspace_context": req.workspace_context or {},
        "mode": req.mode,
        "target_tool": req.target_tool,
        "conversation_history": [],
        "assembled_prompt": None,
        "scores": None,
    }
    return {"session_id": session_id}


@router.post("/message")
async def send_message(req: MessageRequest, user=Depends(get_current_user)):
    """
    Task 1.3 & 1.4 — Appends user message, calls Gemini, returns next question
    or the assembled prompt + scores when done.
    """
    session = _sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")


    # Append user turn
    session["conversation_history"].append({"role": "user", "content": req.user_message})

    # Call Gemini (Task 1.3)
    gemini_response = await run_conversation_turn(
        raw_prompt=session["raw_prompt"],
        conversation_history=session["conversation_history"],
        workspace_context=session["workspace_context"],
        mode=session.get("mode", "default"),
        target_tool=session.get("target_tool"),
    )

    if gemini_response.get("done"):
        # Compute scores (Task 1.5)
        scores = await compute_scores(
            raw_prompt=session["raw_prompt"],
            assembled_prompt=gemini_response["assembled_prompt"],
            conversation_history=session["conversation_history"],
            was_refused=gemini_response.get("should_refuse", False),
        )
        session["assembled_prompt"] = gemini_response["assembled_prompt"]
        session["scores"] = scores
        return {
            "done": True,
            "assembled_prompt": gemini_response["assembled_prompt"],
            "should_refuse": gemini_response.get("should_refuse", False),
            "scores": scores,
        }

    # Not done yet — return next question
    session["conversation_history"].append(
        {"role": "assistant", "content": gemini_response["question"]}
    )
    return {
        "done": False,
        "question": gemini_response["question"],
        "turn": len([m for m in session["conversation_history"] if m["role"] == "assistant"]),
    }


@router.post("/complete")
async def complete_session(
    req: CompleteRequest,
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user),
):
    """
    Task 3.2 — Finalises session. Triggers async concept extraction.
    Returns token savings summary for the Cost Receipt.
    """
    session = _sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")


    # Task 1.4 & 3.2 — Persist session row to Supabase
    if session.get("assembled_prompt"):
        store_session_db(session)
        update_weekly_aggregates(session["user_id"], session.get("scores", {}))
        
        from services.supabase_client import update_daily_quality
        update_daily_quality(session["user_id"], session.get("scores", {}))

    # Background: extract concepts and update concept_map (Task 3.2)
    if session.get("assembled_prompt"):
        background_tasks.add_task(
            extract_and_store_concepts,
            user_id=session["user_id"],
            session_id=req.session_id,
            assembled_prompt=session["assembled_prompt"],
            scores=session.get("scores", {}),
        )

    return {"status": "complete", "session_id": req.session_id}
