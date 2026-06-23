"""
inferencache testing dashboard — dev-only FastAPI shim.

For production, use `inferencache serve` from the main library.
This module re-exports the shared control API for hot-reload frontend dev.

  pip install -e "../../inferencache[serve]"
  ./run.sh
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from inferencache.paths import default_cache_dir
from inferencache.proxy.control import db as control_db
from inferencache.proxy.control.router import router as control_router
from inferencache.proxy.state import init_state

app = FastAPI(title="inferencache dashboard (dev)", version="0.1.0")

init_state(default_cache_dir())

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _startup() -> None:
    control_db.ensure_schema()


app.include_router(control_router)
