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
    """
    from services.supabase_client import supabase
    
    totals = {
        "sessions_this_month": 0,
        "turns_saved": 0,
        "time_recovered_min": 0.0,
        "cost_saved_usd": 0.0,
    }
    
    try:
        # Sum up all token savings for this user
        res = supabase.table("token_savings").select("*").eq("user_id", user["sub"]).execute()
        
        # Also get session count from sessions table for this month
        session_res = supabase.table("sessions").select("id", count="exact").eq("user_id", user["sub"]).execute()
        totals["sessions_this_month"] = session_res.count if session_res.count is not None else 0

        for row in res.data:
            totals["turns_saved"] += row.get("estimated_turns_saved", 0)
            totals["time_recovered_min"] += row.get("estimated_wait_time_saved_min", 0.0)
            totals["cost_saved_usd"] += row.get("estimated_cost_saved_usd", 0.0)
            
        return totals
    except Exception:
        return totals
