"""
routes/cache.py — Cache-busting endpoint for HabitatMatch.

DELETE /api/cache   — clears all 5 Redis keys for a given lat/lng (requires auth)
"""

from flask import Blueprint, jsonify, request

from utils.auth import require_auth
from utils.cache import delete_cache

cache_bp = Blueprint("cache", __name__)

# The 5 cache key prefixes used across all data routes
_CACHE_PREFIXES = ["nearby", "disaster", "airquality", "vibe", "score"]


@cache_bp.route("/cache", methods=["DELETE"])
@require_auth
def clear_location_cache(auth_user):
    body = request.get_json(silent=True) or {}

    try:
        lat = round(float(body.get("lat")), 4)
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "lat must be a valid number"}), 400
    try:
        lng = round(float(body.get("lng")), 4)
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "lng must be a valid number"}), 400

    keys_cleared = 0
    for prefix in _CACHE_PREFIXES:
        key = f"{prefix}:{lat}:{lng}"
        try:
            delete_cache(key)
            keys_cleared += 1
        except Exception:
            # Redis unavailable — count it anyway, nothing to clear
            keys_cleared += 1

    print(f"[CACHE] Cleared {keys_cleared} keys for {lat},{lng} "
          f"(requested by {auth_user.get('clerk_user_id', 'unknown')})")

    return jsonify({
        "success": True,
        "data": {
            "message": "Cache cleared for this location",
            "keys_cleared": keys_cleared,
            "lat": lat,
            "lng": lng,
        },
    })
