import os
from supabase import create_client, Client
from datetime import datetime, timedelta

_url = os.environ.get("SUPABASE_URL", "")
_key = os.environ.get("SUPABASE_ANON_KEY", "") # Usually use Service Role for backend, but Anon works if RLS is off or configured

supabase: Client = create_client(_url, _key)

def store_session_db(session_data: dict):
    """Phase 1.4 — Persists the session to the `sessions` table."""
    try:
        # Prepare row for Supabase
        row = {
            "user_id": session_data["user_id"],
            "raw_prompt": session_data["raw_prompt"],
            "assembled_prompt": session_data["assembled_prompt"],
            "category": session_data.get("category", "bug_fix"),
            "conversation_history": session_data["conversation_history"],
            "token_efficiency_score": session_data["scores"].get("token_efficiency", 0),
            "thinking_depth_score": session_data["scores"].get("thinking_depth", 0),
            "dependency_score": session_data["scores"].get("dependency_score", 50),
            "estimated_turns_saved": session_data["scores"].get("estimated_turns_saved", 0),
            "raw_specificity_score": session_data["scores"].get("raw_specificity_score", 0),
            "assembled_specificity_score": session_data["scores"].get("assembled_specificity_score", 0),
            "quality_delta": session_data["scores"].get("quality_delta", 0),
            "ai_self_awareness_score": session_data["scores"].get("ai_self_awareness_score", 0),
            "was_refused": session_data.get("was_refused", False),
            "source": session_data.get("source", "cli"),
        }
        res = supabase.table("sessions").insert(row).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        print(f"[supabase_client] Error storing session: {e}")
        return None

def upsert_concept_db(user_id: str, concept: str, score: int, band: str):
    """Phase 3.2 — Upserts a concept into the `concept_map` table."""
    try:
        # Check if exists
        res = supabase.table("concept_map").select("*").eq("user_id", user_id).eq("concept", concept).execute()
        
        if res.data:
            existing = res.data[0]
            new_count = existing["encounter_count"] + 1
            # Simple rolling average
            new_score = (existing["avg_score"] * existing["encounter_count"] + score) / new_count
            
            supabase.table("concept_map").update({
                "encounter_count": new_count,
                "avg_score": new_score,
                "color_band": band,
                "last_seen_at": datetime.now().isoformat()
            }).eq("id", existing["id"]).execute()
        else:
            supabase.table("concept_map").insert({
                "user_id": user_id,
                "concept": concept,
                "encounter_count": 1,
                "avg_score": score,
                "color_band": band,
                "last_seen_at": datetime.now().isoformat()
            }).execute()
    except Exception as e:
        print(f"[supabase_client] Error upserting concept: {e}")

def update_weekly_aggregates(user_id: str, scores: dict):
    """Phase 3.3 & 3.4 — Updates `skill_decay` and `token_savings` weekly rows."""
    try:
        # Get start of current week (Monday)
        now = datetime.now()
        monday = (now - timedelta(days=now.weekday())).date().isoformat()
        
        # 1. Update skill_decay
        res = supabase.table("skill_decay").select("*").eq("user_id", user_id).eq("week_start", monday).execute()
        if res.data:
            existing = res.data[0]
            count = existing["total_sessions"] + 1
            supabase.table("skill_decay").update({
                "total_sessions": count,
                "avg_dependency_score": (existing["avg_dependency_score"] * existing["total_sessions"] + scores.get("dependency_score", 50)) / count,
                "avg_thinking_depth": (existing["avg_thinking_depth"] * existing["total_sessions"] + scores.get("thinking_depth", 0)) / count,
            }).eq("id", existing["id"]).execute()
        else:
            supabase.table("skill_decay").insert({
                "user_id": user_id,
                "week_start": monday,
                "total_sessions": 1,
                "avg_dependency_score": scores.get("dependency_score", 50),
                "avg_thinking_depth": scores.get("thinking_depth", 0),
            }).execute()
            
        # 2. Update token_savings
        res = supabase.table("token_savings").select("*").eq("user_id", user_id).eq("week_start", monday).execute()
        turns_saved = scores.get("estimated_turns_saved", 0)
        time_saved = turns_saved * 0.67
        cost_saved = turns_saved * 0.02 # Placeholder cost
        
        if res.data:
            existing = res.data[0]
            supabase.table("token_savings").update({
                "estimated_turns_saved": existing["estimated_turns_saved"] + turns_saved,
                "estimated_wait_time_saved_min": existing["estimated_wait_time_saved_min"] + time_saved,
                "estimated_cost_saved_usd": existing["estimated_cost_saved_usd"] + cost_saved,
            }).eq("id", existing["id"]).execute()
        else:
            supabase.table("token_savings").insert({
                "user_id": user_id,
                "week_start": monday,
                "estimated_turns_saved": turns_saved,
                "estimated_wait_time_saved_min": time_saved,
                "estimated_cost_saved_usd": cost_saved,
            }).execute()
            
            
    except Exception as e:
        print(f"[supabase_client] Error updating aggregates: {e}")

def update_daily_quality(user_id: str, scores: dict):
    """Phase 4.3 — Updates the daily_quality aggregation table."""
    try:
        today = datetime.now().date().isoformat()
        res = supabase.table("daily_quality").select("*").eq("user_id", user_id).eq("day", today).execute()
        
        raw_score = scores.get("raw_specificity_score", 0)
        assembled_score = scores.get("assembled_specificity_score", 0)
        delta = scores.get("quality_delta", 0)

        if res.data:
            existing = res.data[0]
            count = existing["session_count"] + 1
            supabase.table("daily_quality").update({
                "session_count": count,
                "avg_raw_score": (existing["avg_raw_score"] * existing["session_count"] + raw_score) / count,
                "avg_assembled": (existing["avg_assembled"] * existing["session_count"] + assembled_score) / count,
                "avg_delta": (existing["avg_delta"] * existing["session_count"] + delta) / count,
            }).eq("id", existing["id"]).execute()
        else:
            supabase.table("daily_quality").insert({
                "user_id": user_id,
                "day": today,
                "session_count": 1,
                "avg_raw_score": raw_score,
                "avg_assembled": assembled_score,
                "avg_delta": delta,
            }).execute()
    except Exception as e:
        print(f"[supabase_client] Error updating daily quality: {e}")
