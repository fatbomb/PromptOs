"""
JWT Verify Middleware — Phase 1, Task 1.2

Validates Supabase-issued JWTs on every protected route.
Usage:  user = Depends(get_current_user)
"""

import os
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx
from jose import jwt, JWTError

_bearer = HTTPBearer()
_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")
_SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
_ALGORITHMS = ["HS256", "RS256", "ES256"]

# Cache for JWKS to avoid fetching on every request
_jwks_cache = None

async def _get_jwks():
    global _jwks_cache
    if _jwks_cache is None:
        async with httpx.AsyncClient() as client:
            # Supabase JWKS endpoint
            url = f"{_SUPABASE_URL}/auth/v1/.well-known/jwks.json"
            print(f"DEBUG: Fetching JWKS from {url}")
            resp = await client.get(url)
            print(f"DEBUG: JWKS Status: {resp.status_code}")
            if resp.status_code == 200:
                _jwks_cache = resp.json()
                print(f"DEBUG: Fetched JWKS keys: {[k.get('kid') for k in _jwks_cache.get('keys', [])]}")
            else:
                _jwks_cache = {"keys": []}
    return _jwks_cache

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(_bearer),
) -> dict:
    """
    Task 1.2 — Verifies the Supabase JWT securely.
    Supports HS256 (via secret) and ES256/RS256 (via JWKS).
    """
    try:
        header = jwt.get_unverified_header(credentials.credentials)
        print(f"DEBUG: JWT Header: {header}")
        alg = header.get("alg")

        if alg == "HS256":
            # Symmetric verification using project secret
            payload = jwt.decode(
                credentials.credentials,
                _JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False}
            )
        else:
            # Asymmetric verification using JWKS
            jwks = await _get_jwks()
            payload = jwt.decode(
                credentials.credentials,
                jwks,
                algorithms=_ALGORITHMS,
                options={"verify_aud": False}
            )
        
        return payload
    except JWTError as exc:
        print(f"JWT Verification Failed: {exc}")
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")
