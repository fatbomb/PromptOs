"""
Auth Router — Phase 1, Task 1.2

Endpoints:
  GET /auth/cli-token?state=xxx → CLI polls this every 2s to pick up JWT after OAuth
  POST /auth/cli-token          → Dashboard callback stores JWT here by state key
"""

import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# Temporary in-memory store for CLI token handoff
# Key: state string, Value: JWT token
_cli_token_store: dict[str, str] = {}


class StoreTokenRequest(BaseModel):
    state: str
    token: str


@router.post("/cli-token")
async def store_cli_token(req: StoreTokenRequest):
    """Dashboard callback stores JWT here after successful OAuth."""
    _cli_token_store[req.state] = req.token
    return {"stored": True}


@router.get("/cli-token")
async def get_cli_token(state: str):
    """
    CLI polls this every 2 seconds for up to 60 seconds.
    Once the token is stored, return it and remove it from the store.
    """
    token = _cli_token_store.pop(state, None)
    if not token:
        raise HTTPException(status_code=404, detail="Token not ready yet")
    return {"token": token}


from middleware.jwt_verify import get_current_user
from fastapi import Depends

@router.get("/verify")
async def verify_token(user=Depends(get_current_user)):
    """
    Verifies the given JWT token is still valid.
    """
    return {"valid": True, "user_id": user["sub"]}
