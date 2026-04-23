"""
Tokens Router — Phase 3, Task 3.4

Endpoint:
  GET /tokens/summary → returns month-to-date token savings for the Cost Receipt
"""

from fastapi import APIRouter, Depends
from middleware.jwt_verify import get_current_user

router = APIRouter()


@router.get("/summary")
async def get_token_summary(user=Depends(get_current_user)):
    """
    Task 3.4 — Fetch aggregated token savings from `token_savings` table.
    Used by CLI to populate the Cost Receipt month totals.

    TODO: query Supabase `token_savings` where user_id = user["sub"]
    and return current month totals.
    """
    # Placeholder — replace with real Supabase query
    return {
        "sessions_this_month": 0,
        "turns_saved": 0,
        "time_recovered_min": 0.0,
        "cost_saved_usd": 0.0,
    }
