#!/usr/bin/env python3
"""
ADA Opera — NotebookLM Server
Lightweight FastAPI bridge between Opera UI and notebooklm-py.
Port: 8310

Usage:
    pip install fastapi uvicorn notebooklm-py
    python notebook_server.py

Grade: Colonel | Shadows Company
"""

import asyncio
import json
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# Add parent paths for ADA imports
ADA_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ADA_ROOT))

try:
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    import uvicorn
except ImportError:
    print("pip install fastapi uvicorn")
    sys.exit(1)

log = logging.getLogger("Opera.NotebookLM")

app = FastAPI(title="ADA Opera NotebookLM Server", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8300", "http://127.0.0.1:8300"],
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUT_DIR = Path(__file__).parent / "notebook_output"
OUTPUT_DIR.mkdir(exist_ok=True)

# ── Engine singleton ─────────────────────────────────────────────

_engine = None


async def get_engine():
    global _engine
    if _engine is None:
        try:
            from core.orchestration.notebooklm_engine import NotebookLMEngine
            _engine = NotebookLMEngine()
            ok = await _engine.initialize()
            if not ok:
                log.warning("NotebookLM engine init failed, CLI mode only")
        except ImportError:
            # Direct notebooklm-py usage
            try:
                from notebooklm import NotebookLMClient
                _engine = DirectEngine()
                await _engine.initialize()
            except ImportError:
                log.error("Neither core.orchestration nor notebooklm-py available")
                return None
    return _engine


class DirectEngine:
    """Lightweight wrapper when core.orchestration is not available."""

    def __init__(self):
        self._client = None
        self._available = False
        self._mode = "api"

    async def initialize(self):
        from notebooklm import NotebookLMClient
        storage_path = os.environ.get("NOTEBOOKLM_STORAGE")
        ctx = await NotebookLMClient.from_storage(path=storage_path)
        self._client = await ctx.__aenter__()
        self._available = True
        log.info("DirectEngine: NotebookLM API ready")
        return True

    async def create_notebook(self, name: str) -> dict:
        nb = await self._client.notebooks.create(name)
        return {"ok": True, "notebook_id": nb.id, "name": nb.name}

    async def add_source(self, notebook_id: str, source_type: str, value: str, title: str = "") -> dict:
        if source_type in ("url", "youtube"):
            src = await self._client.sources.add_url(notebook_id, value, wait=True)
        elif source_type == "text":
            src = await self._client.sources.add_text(notebook_id, value, title=title)
        elif source_type == "file":
            src = await self._client.sources.add_file(notebook_id, value)
        else:
            return {"ok": False, "error": f"Unknown type: {source_type}"}
        return {"ok": True, "source_id": src.id}

    async def generate_audio(self, notebook_id: str, fmt: str = "deep-dive", language: str = "fr") -> dict:
        status = await self._client.artifacts.generate_audio(notebook_id, format=fmt, language=language)
        await self._client.artifacts.wait_for_completion(notebook_id, status.task_id)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        out = OUTPUT_DIR / f"audio_{ts}.mp3"
        await self._client.artifacts.download_audio(notebook_id, str(out))
        return {"ok": True, "local_path": str(out)}

    async def generate_video(self, notebook_id: str, style: str = "whiteboard") -> dict:
        status = await self._client.artifacts.generate_video(notebook_id, style=style)
        await self._client.artifacts.wait_for_completion(notebook_id, status.task_id)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        out = OUTPUT_DIR / f"video_{ts}.mp4"
        await self._client.artifacts.download_video(notebook_id, str(out))
        return {"ok": True, "local_path": str(out)}

    async def generate_report(self, notebook_id: str) -> dict:
        status = await self._client.artifacts.generate_report(notebook_id)
        await self._client.artifacts.wait_for_completion(notebook_id, status.task_id)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        out = OUTPUT_DIR / f"report_{ts}.md"
        await self._client.artifacts.download_report(notebook_id, str(out))
        return {"ok": True, "local_path": str(out)}


# ── Request Models ───────────────────────────────────────────────

class SourceModel(BaseModel):
    type: str = "url"
    value: str
    title: str = ""


class QuickRequest(BaseModel):
    source: str
    source_type: str = "url"
    format: str = "deep-dive"
    style: str = "whiteboard"
    language: str = "fr"


class PipelineRequest(BaseModel):
    name: str
    sources: list[SourceModel] = []
    language: str = "fr"
    audio_format: str = "deep-dive"
    video_style: str = "whiteboard"
    artifacts: list[str] = ["audio", "report"]


class EmpireArticleRequest(BaseModel):
    theme: str
    seed_title: str
    seed_text: str
    seed_url: str = ""


class ShortsRequest(BaseModel):
    topic: str
    content: str = ""
    style: str = "cinematic-explainer"


# ── Endpoints ────────────────────────────────────────────────────

@app.get("/status")
async def status():
    engine = await get_engine()
    if engine is None:
        return {"ok": False, "mode": "unavailable", "error": "NotebookLM not configured"}
    return {"ok": True, "mode": getattr(engine, "_mode", "unknown")}


@app.get("/notebooks")
async def list_notebooks():
    engine = await get_engine()
    if engine is None:
        return {"ok": False, "notebooks": []}
    if hasattr(engine, "_client") and engine._client:
        nbs = await engine._client.notebooks.list()
        return {"ok": True, "notebooks": [{"id": nb.id, "name": nb.name} for nb in nbs]}
    return {"ok": True, "notebooks": []}


@app.post("/quick/podcast")
async def quick_podcast(req: QuickRequest):
    engine = await get_engine()
    if engine is None:
        return {"ok": False, "error": "NotebookLM not available"}

    try:
        # Create temp notebook
        ts = datetime.now().strftime("%H%M")
        nb = await engine.create_notebook(f"Podcast_{ts}")
        if not nb.get("ok"):
            return nb
        nb_id = nb["notebook_id"]

        # Add source
        await engine.add_source(nb_id, req.source_type, req.source, "")
        await asyncio.sleep(3)  # Wait for processing

        # Generate audio
        result = await engine.generate_audio(nb_id, fmt=req.format, language=req.language)
        return result
    except Exception as e:
        return {"ok": False, "error": str(e)}


@app.post("/quick/video")
async def quick_video(req: QuickRequest):
    engine = await get_engine()
    if engine is None:
        return {"ok": False, "error": "NotebookLM not available"}

    try:
        ts = datetime.now().strftime("%H%M")
        nb = await engine.create_notebook(f"Video_{ts}")
        if not nb.get("ok"):
            return nb
        nb_id = nb["notebook_id"]

        await engine.add_source(nb_id, req.source_type, req.source, "")
        await asyncio.sleep(3)

        result = await engine.generate_video(nb_id, style=req.style)
        return result
    except Exception as e:
        return {"ok": False, "error": str(e)}


@app.post("/quick/shorts")
async def quick_shorts(req: ShortsRequest):
    engine = await get_engine()
    if engine is None:
        return {"ok": False, "error": "NotebookLM not available"}

    try:
        # Use Shorts Pipeline workflow if available
        try:
            from core.orchestration.notebooklm_workflows import start_shorts_pipeline
            result = await start_shorts_pipeline(
                topic=req.topic,
                content=req.content,
                cinematic=True,
                cinematic_style=req.style,
                run_all=True,
            )
            return result
        except ImportError:
            pass

        # Fallback: manual notebook + brief audio + video
        ts = datetime.now().strftime("%H%M")
        nb = await engine.create_notebook(f"Shorts_{req.topic[:30]}_{ts}")
        if not nb.get("ok"):
            return nb
        nb_id = nb["notebook_id"]

        content = req.content or req.topic
        await engine.add_source(nb_id, "text", content, req.topic)
        await asyncio.sleep(3)

        audio = await engine.generate_audio(nb_id, fmt="brief", language="fr")
        video = await engine.generate_video(nb_id, style=req.style)

        return {
            "ok": True,
            "audio": audio.get("local_path", ""),
            "video": video.get("local_path", ""),
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}


@app.post("/pipeline/run")
async def run_pipeline(req: PipelineRequest):
    engine = await get_engine()
    if engine is None:
        return {"ok": False, "error": "NotebookLM not available"}

    try:
        # Create notebook
        nb = await engine.create_notebook(req.name)
        if not nb.get("ok"):
            return nb
        nb_id = nb["notebook_id"]

        # Add sources
        for src in req.sources:
            await engine.add_source(nb_id, src.type, src.value, src.title)
            await asyncio.sleep(2)

        results = {"ok": True, "notebook_id": nb_id, "artifacts": {}}

        # Generate requested artifacts
        for art in req.artifacts:
            try:
                if art == "audio":
                    r = await engine.generate_audio(nb_id, fmt=req.audio_format, language=req.language)
                elif art == "video":
                    r = await engine.generate_video(nb_id, style=req.video_style)
                elif art == "report":
                    r = await engine.generate_report(nb_id)
                else:
                    r = {"ok": False, "error": f"Unsupported artifact: {art}"}
                results["artifacts"][art] = r
            except Exception as e:
                results["artifacts"][art] = {"ok": False, "error": str(e)}

        return results
    except Exception as e:
        return {"ok": False, "error": str(e)}


@app.post("/empire/article")
async def empire_article(req: EmpireArticleRequest):
    """Generate an Empire blog article via NotebookLM instead of Ollama."""
    engine = await get_engine()
    if engine is None:
        return {"ok": False, "error": "NotebookLM not available"}

    try:
        ts = datetime.now().strftime("%H%M")
        nb = await engine.create_notebook(f"Empire_{req.theme}_{ts}")
        if not nb.get("ok"):
            return nb
        nb_id = nb["notebook_id"]

        # Inject seed as source
        content = f"# {req.seed_title}\n\n{req.seed_text}\n\nSource: {req.seed_url}"
        await engine.add_source(nb_id, "text", content, req.seed_title)

        if req.seed_url:
            await engine.add_source(nb_id, "url", req.seed_url, "")
            await asyncio.sleep(2)

        # Generate report (article)
        result = await engine.generate_report(nb_id)
        return {**result, "theme": req.theme, "notebook_id": nb_id}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ── Main ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )
    log.info("Starting ADA Opera NotebookLM Server on :8310")
    uvicorn.run(app, host="0.0.0.0", port=8310, log_level="info")
