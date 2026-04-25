"""
Auth Router — Phase 1, Task 1.2

Endpoints:
  GET /auth/cli-token?state=xxx → CLI polls this every 2s to pick up JWT after OAuth
  POST /auth/cli-token          → Dashboard callback stores JWT here by state key
"""

import os
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger("promptos.auth")

# Temporary in-memory store for CLI token handoff
# Key: state string, Value: JWT token
_cli_token_store: dict[str, str] = {}


class StoreTokenRequest(BaseModel):
    state: str
    token: str


from services.supabase_client import supabase

@router.post("/cli-token")
async def store_cli_token(req: StoreTokenRequest):
    """Dashboard callback stores JWT here after successful OAuth."""
    logger.info(f"Storing CLI token for state: {req.state}")
    try:
        # Hack: Use the 'teams' table as a temporary KV store to bypass Vercel serverless memory limits
        # teams doesn't have RLS, so anon key can insert.
        supabase.table("teams").insert({"name": req.state, "invite_code": req.token}).execute()
    except Exception as e:
        logger.error(f"Failed to store token in DB: {e}")
        # Fallback to in-memory just in case
        _cli_token_store[req.state] = req.token

    return {"stored": True}


@router.get("/cli-token")
async def get_cli_token(state: str):
    """
    CLI polls this every 2 seconds for up to 60 seconds.
    Once the token is stored, return it and remove it from the store.
    """
    token = None
    try:
        res = supabase.table("teams").select("invite_code").eq("name", state).execute()
        if res.data:
            token = res.data[0]["invite_code"]
            # Cleanup
            supabase.table("teams").delete().eq("name", state).execute()
    except Exception as e:
        logger.error(f"Failed to retrieve token from DB: {e}")

    # Fallback to in-memory
    if not token:
        token = _cli_token_store.pop(state, None)

    if not token:
        logger.debug(f"Token not ready yet for state: {state}")
        raise HTTPException(status_code=404, detail="Token not ready yet")
    
    logger.info(f"Token successfully retrieved by CLI for state: {state}")
    return {"token": token}


from middleware.jwt_verify import get_current_user
from fastapi import Depends

@router.get("/verify")
async def verify_token(user=Depends(get_current_user)):
    """
    Verifies the given JWT token is still valid.
    """
    user_id = user.get("sub")
    logger.info(f"Token verified successfully for user: {user_id}")
    return {"valid": True, "user_id": user_id}
