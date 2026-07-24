"""
routes/disaster.py — Flood risk, elevation, and coastal distance analysis.

GET /api/disaster?lat=&lng=
"""

import math

import requests
from flask import Blueprint, jsonify, request

from utils.cache import CACHE_TTL_DISASTER, get_cache, set_cache

disaster_bp = Blueprint("disaster", __name__)

# ── Coastal reference points ──────────────────────────────────────────────────
COASTLINE = [
    (19.0500, 73.1200),
    (18.9800, 73.0800),
    (19.1000, 73.1500),
    (19.0200, 73.1100),
    (18.9500, 73.0600),
]

# ── Known flood-prone zones (polygon vertices as lat/lng tuples) ──────────────
FLOOD_ZONES = [
    {
        "name": "Belapur Creek Zone",
        "polygon": [(19.01, 73.04), (19.03, 73.06), (19.02, 73.07), (19.00, 73.05)],
    },
    {
        "name": "Kharghar Valley Zone",
        "polygon": [(19.04, 73.06), (19.06, 73.08), (19.05, 73.09), (19.03, 73.07)],
    },
    {
        "name": "Panvel Creek Belt",
        "polygon": [(18.98, 73.09), (19.01, 73.11), (19.00, 73.13), (18.97, 73.11)],
    },
    {
        "name": "Nerul Low Belt",
        "polygon": [(19.01, 73.01), (19.03, 73.03), (19.02, 73.04), (19.00, 73.02)],
    },
]


# ── Geometry helpers ──────────────────────────────────────────────────────────
def haversine(lat1, lon1, lat2, lon2):
    """Great-circle distance in km between two points."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.asin(math.sqrt(a))


def point_in_polygon(lat, lng, polygon):
    """Ray-casting point-in-polygon test."""
    n = len(polygon)
    inside = False
    j = n - 1
    for i in range(n):
        if (polygon[i][1] > lng) != (polygon[j][1] > lng) and lat < (
            (polygon[j][0] - polygon[i][0])
            * (lng - polygon[i][1])
            / (polygon[j][1] - polygon[i][1])
            + polygon[i][0]
        ):
            inside = not inside
        j = i
    return inside


# ── Pure data function (reusable internally) ──────────────────────────────────
def get_disaster_data(lat: float, lng: float, wait_for_cache: bool = False) -> dict:
    """Core disaster logic — returns data dict (always succeeds; uses fallbacks)."""
    cache_key = f"disaster:{round(lat,4)}:{round(lng,4)}"
    
    if wait_for_cache:
        import time
        for _ in range(15):
            cached = get_cache(cache_key)
            if cached:
                return cached
            time.sleep(1)
        return {
            "flood_risk": "medium", "overall_risk": "Medium",
            "elevation_metres": 10.0, "distance_to_coast_km": 5.0,
            "coastal_distance_km": 5.0, "in_flood_zone": False,
            "flood_zone_name": None, "risk_summary": "Cache timeout fallback.",
            "risk_colour": "yellow",
        }

    cached = get_cache(cache_key)
    if cached:
        return cached

    # 1. Elevation
    elevation = 10
    try:
        elev_resp = requests.get(
            "https://api.open-elevation.com/api/v1/lookup",
            params={"locations": f"{lat},{lng}"},
            timeout=5,
        )
        if elev_resp.status_code == 200:
            elevation = elev_resp.json()["results"][0]["elevation"]
    except Exception:
        pass

    # 2. Coastal distance
    coastal_distance = min(haversine(lat, lng, cp[0], cp[1]) for cp in COASTLINE)

    # 3. Flood zone check
    in_flood_zone = False
    flood_zone_name = None
    for zone in FLOOD_ZONES:
        if point_in_polygon(lat, lng, zone["polygon"]):
            in_flood_zone = True
            flood_zone_name = zone["name"]
            break

    # 4. Risk level
    if elevation < 5 or in_flood_zone:
        risk, risk_colour, risk_cap = "high",   "red",    "High"
        risk_summary = "Low elevation relative to sea level. Historically higher rainfall accumulation in monsoon months (June–Sept). Consider flood insurance and drainage when evaluating."
    elif elevation <= 15 or coastal_distance < 3:
        risk, risk_colour, risk_cap = "medium", "yellow", "Medium"
        risk_summary = "Moderate elevation with some coastal proximity. Seasonal rainfall may be a factor — drainage infrastructure worth reviewing."
    else:
        risk, risk_colour, risk_cap = "low",    "green",  "Low"
        risk_summary = "Higher elevation and adequate distance from coastline. Historically low flood exposure for this area."

    data = {
        "flood_risk":            risk,
        "overall_risk":          risk_cap,        # ← capitalized for frontend
        "elevation_metres":      round(elevation, 1),
        "distance_to_coast_km":  round(coastal_distance, 2),
        "coastal_distance_km":   round(coastal_distance, 2),
        "in_flood_zone":         in_flood_zone,
        "flood_zone_name":       flood_zone_name,
        "risk_summary":          risk_summary,
        "risk_colour":           risk_colour,
    }
    set_cache(cache_key, data, CACHE_TTL_DISASTER)
    return data


# ── Flask route ───────────────────────────────────────────────────────────────
@disaster_bp.route("/disaster", methods=["GET"])
def get_disaster():
    if "lat" not in request.args:
        return jsonify({"success": False, "error": "lat is required"}), 400
    if "lng" not in request.args:
        return jsonify({"success": False, "error": "lng is required"}), 400
    try:
        lat = float(request.args["lat"])
    except (ValueError, TypeError):
        return jsonify({"success": False, "error": "lat must be a valid number"}), 400
    try:
        lng = float(request.args["lng"])
    except (ValueError, TypeError):
        return jsonify({"success": False, "error": "lng must be a valid number"}), 400

    return jsonify({"success": True, "data": get_disaster_data(lat, lng)})
