"""
JWT Verify Middleware — Phase 1, Task 1.2

Validates Supabase-issued JWTs on every protected route.
Usage:  user = Depends(get_current_user)

DEV MODE: When AUTH_REQUIRED=false (default) the middleware accepts requests
with no token and returns a fixed dev user payload. Set AUTH_REQUIRED=true
to enforce real JWT validation (production / Supabase connected).
"""

import os
from fastapi import HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Security
from jose import jwt, JWTError

_bearer = HTTPBearer(auto_error=False)   # auto_error=False → returns None instead of 403
_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")
_ALGORITHM = "HS256"
_AUTH_REQUIRED = os.environ.get("AUTH_REQUIRED", "false").lower() == "true"

# Fixed dev user returned when auth is disabled
_DEV_USER = {"sub": "dev-user-00000000-0000-0000-0000-000000000000", "role": "authenticated"}


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Security(_bearer),
) -> dict:
    """
    Returns the decoded JWT payload (includes `sub` = user UUID).

    - AUTH_REQUIRED=false (default): no token needed → returns _DEV_USER
    - AUTH_REQUIRED=true:            valid Supabase JWT required → 401 otherwise
    """
    if not _AUTH_REQUIRED:
        # Dev mode — skip auth entirely
        return _DEV_USER

    if credentials is None:
        raise HTTPException(status_code=401, detail="Authorization header missing")

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
