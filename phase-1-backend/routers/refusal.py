"""
Refusal Engine Router — Phase 1, Task 1.6

Endpoint:
  POST /refusal/check → detects if the developer already knows the answer
                         and should be refused AI assistance.

Test: send a confident hypothesis → should_refuse: true
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from middleware.jwt_verify import get_current_user
from services.gemini import check_refusal

router = APIRouter()


class RefusalCheckRequest(BaseModel):
    session_id: str
    user_hypothesis: str  # Answer to "what do you suspect is the root cause?"


@router.post("/check")
async def check_refusal_endpoint(req: RefusalCheckRequest, user=Depends(get_current_user)):
    """
    Task 1.6 — If Gemini detects a confident, specific hypothesis,
    return should_refuse: true with a motivating message.

    Example trigger:
      "I think the refresh token isn't rotating because the Redis TTL is set to 0"
      → should_refuse: true
    """
    result = await check_refusal(hypothesis=req.user_hypothesis)
    return result
