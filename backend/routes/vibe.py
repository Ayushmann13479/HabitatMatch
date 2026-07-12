"""
routes/vibe.py — Neighbourhood vibe analysis via Gemini AI.

Internally calls get_nearby_data / get_disaster_data / get_airquality_data
(no HTTP overhead) then asks Gemini to synthesise a vibe report.

GET /api/vibe?lat=&lng=&address=
"""

from flask import Blueprint, jsonify, request

from routes.airquality import get_airquality_data
from routes.disaster import get_disaster_data
from routes.nearby import get_nearby_data
from utils.cache import CACHE_TTL_VIBE, get_cache, set_cache
from utils.ai import generate_json

vibe_bp = Blueprint("vibe", __name__)

VIBE_COLOURS = {
    "Family Friendly":   "green",
    "Young and Buzzing": "purple",
    "Peaceful Retreat":  "blue",
    "Up and Coming":     "orange",
    "Avoid For Now":     "red",
}


def _nearest(places: list, category: str) -> int:
    """Return distance in metres to nearest place of given category, or 9999."""
    matches = [p["distance_metres"] for p in places if p["category"] == category]
    return min(matches) if matches else 9999


def get_vibe_data(lat: float, lng: float, address: str) -> dict | None:
    """
    Core vibe logic — returns vibe dict or None on Gemini failure.
    Can be called by score/chat routes without HTTP overhead.
    """
    cache_key = f"vibe:{round(lat,4)}:{round(lng,4)}"
    cached = get_cache(cache_key)
    if cached:
        return cached

    # ── Gather data from sibling routes ──────────────────────────────────────
    import time
    print(f"[VIBE] Fetching data for lat={lat}, lng={lng}")
    start_time = time.time()
    nearby   = get_nearby_data(lat, lng, wait_for_cache=False) or {"places": [], "counts": {}}
    print(f"[VIBE] nearby: {len(nearby.get('places',[]))} places (cache={'hit' if time.time()-start_time < 0.1 else 'miss'})")
    disaster = get_disaster_data(lat, lng, wait_for_cache=False)
    aqi      = get_airquality_data(lat, lng, wait_for_cache=False)
    end_time = time.time()
    print(f"[VIBE] All data ready in {end_time - start_time:.2f}s")

    places = nearby.get("places", [])
    counts = nearby.get("counts", {})

    nearest_hospital  = _nearest(places, "hospital")
    nearest_school    = _nearest(places, "school")
    nearest_park      = _nearest(places, "park")
    nearest_transit   = _nearest(places, "railway_station")
    transit_count = counts.get("railway_station", 0)

    context = f"""
Location: {address}

NEARBY AMENITIES:
Hospitals: {counts.get('hospital', 0)} found, nearest at {nearest_hospital}m
Schools: {counts.get('school', 0)} found, nearest at {nearest_school}m
Parks: {counts.get('park', 0)} found, nearest at {nearest_park}m
Transit (railway): {transit_count} options, nearest at {nearest_transit}m

DISASTER RISK:
Flood risk: {disaster.get('flood_risk', 'unknown')}
Elevation: {disaster.get('elevation_metres', 0)}m above sea level
Coastal distance: {disaster.get('coastal_distance_km', 0)}km
In flood zone: {disaster.get('in_flood_zone', False)}
Zone name: {disaster.get('flood_zone_name', 'None')}

AIR QUALITY:
Annual average AQI: {aqi.get('annual_avg_aqi', 95)}
PM2.5: {aqi.get('annual_avg_pm25', 38.0)} μg/m³
Rating: {aqi.get('rating', 'Moderate')}
Worst month: {aqi.get('worst_month', 'December')}
Best month: {aqi.get('best_month', 'July')}
"""

    prompt = f"""
You are a neighbourhood analyst.
Analyse this location data and return a neighbourhood vibe report.

{context}

Return a JSON object with exactly this structure:
{{
  "vibe_tag": "one of exactly: Family Friendly OR Young and Buzzing OR Peaceful Retreat OR Up and Coming OR Avoid For Now",
  "description": "exactly 3 sentences describing what living here feels like day to day. Be specific to this area.",
  "best_for": ["2 to 3 types of residents this suits"],
  "pros": ["pro 1", "pro 2", "pro 3"],
  "cons": ["con 1", "con 2", "con 3"],
  "vibe_score": 7.4
}}

Rules:
- Be honest. Do not sugarcoat poor areas.
- Base everything strictly on the data above.
- vibe_score must be a decimal between 1.0 and 10.0
- pros and cons must have exactly 3 items each
"""

    print(f"[VIBE] Groq call starting")
    gem_start = time.time()
    result = generate_json(prompt)
    gem_end = time.time()
    print(f"[VIBE] Groq call completed in {gem_end - gem_start:.2f}s")

    # ── Gemini fallback (quota / API failure) ─────────────────────────────────
    if not result:
        # Derive a rule-based vibe from the raw data
        flood_risk = disaster.get("flood_risk", "medium")
        aqi_val    = aqi.get("annual_avg_aqi", 95)
        transit_n  = transit_count

        if flood_risk == "high" or aqi_val > 150:
            tag = "Avoid For Now"
        elif transit_n >= 3 and counts.get("school", 0) >= 5:
            tag = "Family Friendly"
        elif transit_n >= 5:
            tag = "Young and Buzzing"
        elif flood_risk == "low" and aqi_val <= 100:
            tag = "Peaceful Retreat"
        else:
            tag = "Up and Coming"

        result = {
            "vibe_tag":    tag,
            "description": (
                f"This area has {counts.get('hospital',0)} hospitals and "
                f"{counts.get('school',0)} schools within {2000}m. "
                f"Flood risk is {flood_risk} with an AQI of {aqi_val}. "
                f"Transit access includes {transit_n} options."
            ),
            "best_for":   ["Families", "Working professionals"],
            "pros":       [
                f"{counts.get('park',0)} parks within 2km",
                f"Nearest hospital {nearest_hospital}m away",
                f"Flood risk: {flood_risk}",
            ],
            "cons":       [
                f"AQI: {aqi_val} ({aqi.get('rating','Moderate')})",
                f"Nearest transit {nearest_transit}m away",
                "AI analysis unavailable — review score data manually",
            ],
            "vibe_score": 5.0,
        }

    # Normalise vibe_tag and add colour
    tag = result.get("vibe_tag", "Up and Coming")
    if tag not in VIBE_COLOURS:
        tag = "Up and Coming"
    result["vibe_tag"] = tag
    result["vibe_colour"] = VIBE_COLOURS[tag]

    # Ensure score is a float
    try:
        result["vibe_score"] = round(float(result.get("vibe_score", 5.0)), 1)
    except (TypeError, ValueError):
        result["vibe_score"] = 5.0

    set_cache(cache_key, result, CACHE_TTL_VIBE)
    return result


# ── Flask route ───────────────────────────────────────────────────────────────
@vibe_bp.route("/vibe", methods=["GET"])
def get_vibe():
    if "lat" not in request.args:
        return jsonify({"success": False, "error": "lat is required"}), 400
    if "lng" not in request.args:
        return jsonify({"success": False, "error": "lng is required"}), 400
    if "address" not in request.args or not request.args["address"].strip():
        return jsonify({"success": False, "error": "address is required"}), 400
    try:
        lat = float(request.args["lat"])
    except (ValueError, TypeError):
        return jsonify({"success": False, "error": "lat must be a valid number"}), 400
    try:
        lng = float(request.args["lng"])
    except (ValueError, TypeError):
        return jsonify({"success": False, "error": "lng must be a valid number"}), 400

    address = request.args["address"].strip()
    data = get_vibe_data(lat, lng, address)
    if data is None:
        return jsonify({"success": False, "error": "AI vibe analysis failed — check Gemini API key"}), 500
    return jsonify({"success": True, "data": data})
