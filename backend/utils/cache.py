"""
utils/cache.py — Upstash Redis caching helpers for HabitatMatch.

Provides get_cache / set_cache / delete_cache that gracefully
degrade to no-ops when Redis is unavailable (e.g. env vars not set).
"""

import json
from upstash_redis import Redis
from config import UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN

# ── Client initialisation ─────────────────────────────────────────────────────
try:
    if UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN:
        redis_client = Redis(
            url=UPSTASH_REDIS_REST_URL,
            token=UPSTASH_REDIS_REST_TOKEN,
        )
    else:
        redis_client = None
except Exception:
    redis_client = None


# ── TTL constants (seconds) ───────────────────────────────────────────────────
CACHE_TTL_NEARBY = 86400      # 24 h  — amenities don't change often
CACHE_TTL_DISASTER = 43200    # 12 h  — risk data is semi-static
CACHE_TTL_AIRQUALITY = 3600   #  1 h  — AQI updates hourly
CACHE_TTL_VIBE = 21600        #  6 h  — vibe score is stable
CACHE_TTL_SCORE = 21600       #  6 h  — composite score is stable


# ── Helpers ───────────────────────────────────────────────────────────────────
def get_cache(key: str):
    """Return cached value for *key*, or None on miss / unavailability."""
    if not redis_client:
        return None
    try:
        data = redis_client.get(key)
        return json.loads(data) if data else None
    except Exception as e:
        print(f"[CACHE] get_cache failed for '{key}': {type(e).__name__}: {e}")
        return None


def set_cache(key: str, data, ttl: int) -> None:
    """Store *data* (JSON-serialisable) under *key* with expiry *ttl* seconds."""
    if not redis_client:
        return
    try:
        redis_client.set(key, json.dumps(data), ex=ttl)
    except Exception as e:
        print(f"[CACHE] set_cache failed for '{key}': {type(e).__name__}: {e}")


def delete_cache(key: str) -> None:
    """Delete the cached entry for *key*."""
    if not redis_client:
        return
    try:
        redis_client.delete(key)
    except Exception as e:
        print(f"[CACHE] delete_cache failed for '{key}': {type(e).__name__}: {e}")

