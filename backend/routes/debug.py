"""
routes/debug.py — Dependency health checks for HabitatMatch.

GET /api/debug/dependencies — Pings every external provider and reports status.
"""

import time
import requests
from flask import Blueprint, jsonify

from config import OPENAQ_API_KEY, GROQ_API_KEY
from utils.cache import redis_client

debug_bp = Blueprint("debug", __name__)


def _check_provider(name: str, fn) -> dict:
    """Run a health check function and return status dict."""
    start = time.time()
    try:
        result = fn()
        elapsed = round((time.time() - start) * 1000)
        return {"name": name, "status": "up", "latency_ms": elapsed, **result}
    except Exception as e:
        elapsed = round((time.time() - start) * 1000)
        return {
            "name": name,
            "status": "down",
            "latency_ms": elapsed,
            "error": f"{type(e).__name__}: {str(e)[:200]}",
        }


def _check_redis():
    if not redis_client:
        return {"status": "not_configured", "detail": "No UPSTASH_REDIS_REST_URL"}
    redis_client.ping()
    return {"detail": "PONG received"}


def _check_elevation():
    resp = requests.get(
        "https://api.open-elevation.com/api/v1/lookup",
        params={"locations": "0,0"},
        timeout=5,
    )
    return {"http_status": resp.status_code, "detail": "reachable"}


def _check_openaq():
    if not OPENAQ_API_KEY:
        return {"status": "not_configured", "detail": "No OPENAQ_API_KEY"}
    resp = requests.get(
        "https://api.openaq.org/v3/locations",
        headers={"X-API-Key": OPENAQ_API_KEY},
        params={"limit": 1},
        timeout=5,
    )
    if resp.status_code == 401 or resp.status_code == 403:
        return {"http_status": resp.status_code, "detail": "API key invalid or not yet activated"}
    return {"http_status": resp.status_code, "detail": "reachable"}


def _check_overpass():
    resp = requests.get(
        "https://overpass.kumi.systems/api/status",
        timeout=5,
    )
    return {"http_status": resp.status_code, "detail": "reachable"}


def _check_groq():
    if not GROQ_API_KEY:
        return {"status": "not_configured", "detail": "No GROQ_API_KEY"}
    from groq import Groq
    client = Groq(api_key=GROQ_API_KEY)
    resp = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": "Say OK"}],
        max_tokens=5,
        timeout=10,
    )
    return {"detail": f"responded: {resp.choices[0].message.content.strip()[:20]}"}


@debug_bp.route("/debug/dependencies", methods=["GET"])
def check_dependencies():
    checks = [
        _check_provider("upstash_redis", _check_redis),
        _check_provider("open_elevation", _check_elevation),
        _check_provider("openaq", _check_openaq),
        _check_provider("overpass_osm", _check_overpass),
        _check_provider("groq_llm", _check_groq),
    ]

    all_up = all(c["status"] == "up" for c in checks)

    return jsonify({
        "success": True,
        "overall": "healthy" if all_up else "degraded",
        "dependencies": checks,
    })
