"""
PromptOS — FastAPI Entry Point
Phase 1, Task 1.1

Sets up the app, registers all routers, and configures CORS.
Run with: uvicorn main:app --reload
"""

import sys
import os
from pathlib import Path

# Ensure the directory containing main.py is on sys.path.
# This is required for Vercel's serverless runtime, which may not add the
# project root automatically — causing `from routers import ...` to fail.
_root = Path(__file__).parent.resolve()
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("promptos")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Local dev: load from .env file.
# Production (Vercel): env vars are set in the Vercel Dashboard → Settings → Environment Variables.
# override=False ensures Vercel's real env vars always win over a local .env file.
env_path = _root / ".env"
_env_file_found = env_path.exists()
load_dotenv(dotenv_path=env_path, override=False)

# ── Startup env diagnostics (values redacted for security) ──────────────────
logger.info("[ENV] .env file found locally: %s", _env_file_found)
_REQUIRED_VARS = [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_JWT_SECRET",
    "GEMINI_API_KEY",
    "ANTHROPIC_API_KEY",
    "GROQ_API_KEY",
]
for _var in _REQUIRED_VARS:
    _val = os.environ.get(_var)
    if _val:
        logger.info("[ENV] %-22s = %s***  (set)", _var, _val[:6])
    else:
        logger.warning("[ENV] %-22s = (MISSING — add to Vercel Dashboard)", _var)
# ────────────────────────────────────────────────────────────────────────────

# ── Router imports (wrapped so failures are visible in Vercel logs) ─────────
try:
    from routers import session, refusal, tokens, auth, quiz
    logger.info("[ROUTER] All routers imported successfully")
except Exception as _router_err:
    logger.error("[ROUTER] IMPORT FAILED: %s", _router_err, exc_info=True)
    raise  # re-raise so Vercel reports a 500 instead of silently 404ing
# ────────────────────────────────────────────────────────────────────────────

app = FastAPI(title="PromptOS API", version="1.0.0")

# ---------------------------------------------------------------------------
# CORS — allow Next.js dashboard and CLI to reach the API
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # Must be False when allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(session.router, prefix="/session", tags=["session"])
app.include_router(refusal.router, prefix="/refusal", tags=["refusal"])
app.include_router(tokens.router, prefix="/tokens", tags=["tokens"])
app.include_router(quiz.router, tags=["quiz"])


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    """Task 1.1 — curl https://prompt-os-dusky.vercel.app/health → {"status":"ok"}"""
    return {"status": "ok"}
