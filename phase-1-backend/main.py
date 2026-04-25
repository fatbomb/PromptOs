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

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

env_path = _root / ".env"
load_dotenv(dotenv_path=env_path)

from routers import session, refusal, tokens, auth, quiz

app = FastAPI(title="PromptOS API", version="1.0.0")

# ---------------------------------------------------------------------------
# CORS — allow Next.js dashboard and CLI to reach the API
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://prompt-os-dusky.vercel.app",
        # Add your dashboard Vercel URL here if different
    ],
    allow_credentials=True,
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
