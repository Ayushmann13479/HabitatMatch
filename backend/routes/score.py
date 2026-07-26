"""
routes/score.py — HabitatScore composite property rating.

Aggregates all 5 data sources into a 100-point score across
6 dimensions and generates a Gemini verdict.

GET  /api/score?lat=&lng=&address=
POST /api/compare
"""

from flask import Blueprint, jsonify, request

from routes.airquality import get_airquality_data
from routes.disaster import get_disaster_data
from routes.nearby import get_nearby_data
from routes.vibe import get_vibe_data
from utils.cache import CACHE_TTL_SCORE, get_cache, set_cache
from utils.ai import generate_json, generate_text

score_bp = Blueprint("score", __name__)


# ── Helpers ───────────────────────────────────────────────────────────────────
def _nearest(places: list, category: str) -> int:
    matches = [p["distance_metres"] for p in places if p["category"] == category]
    return min(matches) if matches else 9999


def _count_within(places: list, category: str, max_dist: int) -> int:
    return sum(1 for p in places if p["category"] == category and p["distance_metres"] <= max_dist)


# ── Dimension scoring functions ───────────────────────────────────────────────
def _score_safety(places: list, disaster: dict) -> int:
    """
    /20  Uses: hospital proximity, flood risk, elevation.
    No references to police_station or fire_station (removed from OSM query).
    """
    score = 0

    # Hospital emergency access
    hospitals_2km = _count_within(places, "hospital", 2000)
    hospitals_3km = _count_within(places, "hospital", 3000)
    if hospitals_2km >= 1:
        score += 6
    if hospitals_3km >= 2:
        score += 4                      # stacks with the +6 above

    # Flood risk  (accept both field names)
    risk = (
        disaster.get("flood_risk") or
        disaster.get("overall_risk", "medium")
    ).lower()
    if risk == "low":
        score += 4
    elif risk == "medium":
        score += 2
    # high → +0

    # Elevation
    elev = disaster.get("elevation_metres", 0) or 0
    try:
        elev = float(elev)
    except (TypeError, ValueError):
        elev = 0
    if elev > 15:
        score += 4
    elif elev >= 8:
        score += 2
    # below 8 → +0

    # Minimum floor of 1 — one failed API call should not give 0
    return max(1, min(score, 20))


def _score_connectivity(places: list) -> int:
    """
    /20  Uses: railway_station (primary), bus_station (bonus).
    Minimum floor of 2 so OSM data gaps don't devastate the score.
    """
    score = 0

    # Railway distance bracket
    rail_dist = _nearest(places, "railway_station")
    if rail_dist <= 1000:
        score += 10
    elif rail_dist <= 3000:
        score += 6
    elif rail_dist <= 5000:
        score += 4

    # Multiple stations bonus
    rail_3km = _count_within(places, "railway_station", 3000)
    if rail_3km >= 2:
        score += 6

    # Bus station bonus (category may not exist — skip silently)
    bus_dist = _nearest(places, "bus_station")
    if bus_dist <= 1000:
        score += 4

    # Minimum floor of 2 — OSM may simply be missing tags
    return max(2, min(score, 20))


def _score_amenities(places: list) -> int:
    """
    /20  Uses: hospital, pharmacy, school, college, park, gas_station.
    """
    score = 0
    if _nearest(places, "hospital")    <= 2000: score += 5
    if _nearest(places, "pharmacy")    <= 1000: score += 4
    if _nearest(places, "school")      <= 1000: score += 4
    if _nearest(places, "college")     <= 2000: score += 3
    if _nearest(places, "park")        <=  500: score += 2
    if _nearest(places, "gas_station") <= 1000: score += 2
    return max(1, min(score, 20))


def _score_air_quality(aqi: dict) -> int:
    """
    /20  Fallback data uses 12 (neutral) rather than 15 for Moderate.
    """
    rating      = aqi.get("rating") or aqi.get("aqi_rating", "Moderate")
    is_fallback = aqi.get("is_fallback", False)

    base = {
        "Good":                           20,
        "Moderate":                       15,
        "Unhealthy for Sensitive Groups": 10,
        "Unhealthy":                       5,
        "Hazardous":                       0,
    }.get(rating, 10)

    # Downgrade unverified fallback Moderate to 12
    if is_fallback and rating == "Moderate":
        base = 12

    return base


def _score_vibe(vibe: dict) -> int:
    """
    /10  Default 5 (not 0) if vibe data failed to load.
    """
    return max(1, min(round(vibe.get("vibe_score", 5.0)), 10))


def _score_green_cover(places: list) -> int:
    """
    /10  Minimum floor of 1 — dense urban areas often have untagged parks.
    """
    parks_1km = _count_within(places, "park", 1000)
    if parks_1km >= 3:
        return 10
    if parks_1km >= 1:
        return 6
    if _nearest(places, "park") <= 2000:
        return 3
    return 1   # floor — OSM park coverage is incomplete in dense urban areas


def _grade(total: int) -> str:
    if total >= 90: return "A+"
    if total >= 80: return "A"
    if total >= 70: return "B+"
    if total >= 60: return "B"
    if total >= 50: return "C"
    return "D"


def _grade_colour(total: int) -> str:
    if total >= 70: return "green"
    if total >= 50: return "yellow"
    return "red"


# ── Pure data function ────────────────────────────────────────────────────────
def get_score_data(lat: float, lng: float, address: str) -> dict | None:
    """Core score logic. Returns score dict or None if vibe fails."""
    cache_key = f"score:{round(lat,4)}:{round(lng,4)}"
    cached = get_cache(cache_key)
    if cached:
        return cached

    import time
    print(f"[SCORE] Fetching data for lat={lat}, lng={lng}")
    start_time = time.time()
    nearby   = get_nearby_data(lat, lng, wait_for_cache=False) or {"places": [], "counts": {}}
    print(f"[SCORE] nearby: {len(nearby.get('places',[]))} places (cache={'hit' if time.time()-start_time < 0.1 else 'miss'})")
    disaster = get_disaster_data(lat, lng, wait_for_cache=False) or {}
    aqi = get_airquality_data(lat, lng, wait_for_cache=False)
    aqi      = aqi or {}
    vibe     = get_vibe_data(lat, lng, address)
    end_time = time.time()
    print(f"[SCORE] All data ready in {end_time - start_time:.2f}s")

    if vibe is None:
        vibe = {"vibe_score": 5.0}

    places = nearby.get("places", [])

    safety       = _score_safety(places, disaster)
    connectivity = _score_connectivity(places)
    amenities    = _score_amenities(places)
    air_quality  = _score_air_quality(aqi)
    vibe_score   = _score_vibe(vibe)
    green_cover  = _score_green_cover(places)

    print(f"[SCORE] Dimensions: safety={safety} conn={connectivity} amen={amenities} air={air_quality} vibe={vibe_score} green={green_cover}")

    total = safety + connectivity + amenities + air_quality + vibe_score + green_cover
    grade = _grade(total)

    # Groq verdict
    verdict_prompt = f"""
Property: {address}
HabitatScore: {total}/100  Grade: {grade}
Safety: {safety}/20  (based on hospital access, flood risk, and elevation)
Connectivity: {connectivity}/20
Amenities: {amenities}/20
Air Quality: {air_quality}/20
Vibe: {vibe_score}/10
Green Cover: {green_cover}/10

Write exactly 2 sentences as an honest verdict for someone considering buying
or renting here. Be specific. Mention the strongest and weakest dimension.
Do not mention police stations or fire stations — safety is evaluated using
hospital proximity, flood risk level, and terrain elevation.
"""
    print(f"[SCORE] Groq call starting")
    gem_start = time.time()
    verdict = generate_text(verdict_prompt, max_words=60)
    gem_end = time.time()
    print(f"[SCORE] Groq call completed in {gem_end - gem_start:.2f}s")
    if not verdict:
        strongest = max(
            [("safety", safety/20), ("connectivity", connectivity/20),
             ("amenities", amenities/20), ("air quality", air_quality/20)],
            key=lambda x: x[1]
        )[0]
        verdict = (
            f"This property scores {total}/100 ({grade}) with {strongest} as its "
            f"strongest dimension. Review individual scores above for a complete picture."
        )

    data = {
        "total":        total,
        "total_score":  total,          # alias for frontend
        "grade":        grade,
        "grade_colour": _grade_colour(total),
        "dimensions": {
            "safety":       {"score": safety,       "max": 20},
            "connectivity": {"score": connectivity, "max": 20},
            "amenities":    {"score": amenities,    "max": 20},
            "air_quality":  {"score": air_quality,  "max": 20},
            "vibe":         {"score": vibe_score,   "max": 10},
            "green_cover":  {"score": green_cover,  "max": 10},
        },
        "verdict": verdict,
    }

    set_cache(cache_key, data, CACHE_TTL_SCORE)
    return data


# ── GET /api/score ────────────────────────────────────────────────────────────
@score_bp.route("/score", methods=["GET"])
def get_score():
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
    data = get_score_data(lat, lng, address)
    if data is None:
        return jsonify({"success": False, "error": "Score computation failed"}), 500
    return jsonify({"success": True, "data": data})


# ── POST /api/compare ─────────────────────────────────────────────────────────
@score_bp.route("/compare", methods=["POST"])
def post_compare():
    """
    Compare two locations using their pre-fetched score objects.
    Body: { location_a: {address, scores}, location_b: {address, scores} }
    """
    body    = request.get_json(silent=True) or {}
    loc_a   = body.get("location_a", {})
    loc_b   = body.get("location_b", {})

    addr_a   = loc_a.get("address", "Location A")
    addr_b   = loc_b.get("address", "Location B")
    scores_a = loc_a.get("scores", {})
    scores_b = loc_b.get("scores", {})

    dims_a = scores_a.get("dimensions", {})
    dims_b = scores_b.get("dimensions", {})

    safety_a       = dims_a.get("safety",       {}).get("score", 0)
    connectivity_a = dims_a.get("connectivity", {}).get("score", 0)
    amenities_a    = dims_a.get("amenities",    {}).get("score", 0)
    airquality_a   = dims_a.get("air_quality",  {}).get("score", 0)

    safety_b       = dims_b.get("safety",       {}).get("score", 0)
    connectivity_b = dims_b.get("connectivity", {}).get("score", 0)
    amenities_b    = dims_b.get("amenities",    {}).get("score", 0)
    airquality_b   = dims_b.get("air_quality",  {}).get("score", 0)

    total_a = scores_a.get("total", 0)
    total_b = scores_b.get("total", 0)
    grade_a = scores_a.get("grade", "C")
    grade_b = scores_b.get("grade", "C")

    prompt = f"""Compare these two locations for a property buyer:

Location A: {addr_a}
Score: {total_a}/100  Grade: {grade_a}
Safety: {safety_a}/20, Connectivity: {connectivity_a}/20,
Amenities: {amenities_a}/20, Air Quality: {airquality_a}/20

Location B: {addr_b}
Score: {total_b}/100  Grade: {grade_b}
Safety: {safety_b}/20, Connectivity: {connectivity_b}/20,
Amenities: {amenities_b}/20, Air Quality: {airquality_b}/20

Return ONLY raw JSON with exactly these keys:
{{
  "winner": "A or B",
  "winner_address": "full address string of the winner",
  "reason": "Exactly 2 sentences explaining why the winner is the better choice. Be specific about the data.",
  "a_best": "the single dimension name where Location A scores best",
  "b_best": "the single dimension name where Location B scores best"
}}"""

    result = generate_json(prompt)

    # Rule-based fallback if Gemini fails
    if not result:
        winner = "A" if total_a >= total_b else "B"
        # Compute actual best dimension per location (highest normalised score)
        dim_labels = {
            "safety": "Safety", "connectivity": "Connectivity",
            "amenities": "Amenities", "air_quality": "Air Quality",
            "vibe": "Vibe", "green_cover": "Green Cover",
        }
        dim_maxes = {"safety": 20, "connectivity": 20, "amenities": 20,
                     "air_quality": 20, "vibe": 10, "green_cover": 10}
        best_a = max(dim_labels, key=lambda k: dims_a.get(k, {}).get("score", 0) / dim_maxes[k])
        best_b = max(dim_labels, key=lambda k: dims_b.get(k, {}).get("score", 0) / dim_maxes[k])
        result = {
            "winner":         winner,
            "winner_address": addr_a if winner == "A" else addr_b,
            "reason": (
                f"{addr_a} scores {total_a}/100 while {addr_b} scores {total_b}/100. "
                f"{'Location A' if winner == 'A' else 'Location B'} has a higher overall HabitatScore."
            ),
            "a_best": dim_labels[best_a],
            "b_best": dim_labels[best_b],
        }

    return jsonify({"success": True, "data": result})
