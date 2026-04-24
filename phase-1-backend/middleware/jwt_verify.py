"""
JWT Verify Middleware — Phase 1, Task 1.2

Validates Supabase-issued JWTs on every protected route.
Usage:  user = Depends(get_current_user)
"""

import os
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

_bearer = HTTPBearer()
_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")
_ALGORITHM = "HS256"


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(_bearer),
) -> dict:
    """
    Task 1.2 — Verifies the Supabase JWT.
    Returns the decoded payload (includes `sub` = user UUID).

    Test:
      - No token          → 401
      - Invalid token     → 401
      - Valid token       → passes, returns payload
    """
    try:
        payload = jwt.decode(
            credentials.credentials,
            _JWT_SECRET,
            algorithms=[_ALGORITHM],
            audience="authenticated",
        )
        return payload
    except JWTError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")
