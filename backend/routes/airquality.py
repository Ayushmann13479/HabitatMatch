"""
routes/airquality.py — Real-time AQI via OpenWeatherMap Air Pollution API.

GET /api/airquality?lat=&lng=
"""

import requests
from flask import Blueprint, jsonify, request

from config import OPENWEATHER_API_KEY
from utils.cache import CACHE_TTL_AIRQUALITY, get_cache, set_cache

airquality_bp = Blueprint("airquality", __name__)

OPENWEATHER_AQI_URL = "https://api.openweathermap.org/data/2.5/air_pollution"

# ── European AQI (1-5) → HabitatScore (0-100) ────────────────────────────────
AQI_SCORE_MAP = {1: 95, 2: 80, 3: 60, 4: 35, 5: 15}

# ── European AQI (1-5) → human-readable label ────────────────────────────────
AQI_LABEL_MAP = {
    1: "Good",
    2: "Fair",
    3: "Moderate",
    4: "Poor",
    5: "Very Poor",
}


# ── Helpers ───────────────────────────────────────────────────────────────────
def pm25_to_aqi(pm25: float) -> int:
    """Convert PM2.5 µg/m³ to US AQI integer."""
    breakpoints = [
        (0.0,   12.0,   0,   50),
        (12.1,  35.4,  51,  100),
        (35.5,  55.4, 101,  150),
        (55.5, 150.4, 151,  200),
        (150.5, 500.0, 201, 500),
    ]
    for lo_pm, hi_pm, lo_aqi, hi_aqi in breakpoints:
        if lo_pm <= pm25 <= hi_pm:
            return round(lo_aqi + (pm25 - lo_pm) / (hi_pm - lo_pm) * (hi_aqi - lo_aqi))
    return 201


def aqi_rating(aqi: int) -> str:
    if aqi <= 50:   return "Good"
    if aqi <= 100:  return "Moderate"
    if aqi <= 150:  return "Unhealthy for Sensitive Groups"
    if aqi <= 200:  return "Unhealthy"
    return "Hazardous"


def aqi_colour(aqi: int) -> str:
    if aqi <= 50:   return "green"
    if aqi <= 100:  return "yellow"
    if aqi <= 150:  return "orange"
    return "red"


# ── Pure data function (reusable internally) ──────────────────────────────────
def get_airquality_data(lat: float, lng: float, wait_for_cache: bool = False) -> dict | None:
    """
    Core AQI logic — returns data dict or None on genuine failure.
    No hardcoded fallback: if the API fails, callers get None.
    """
    cache_key = f"airquality:{round(lat, 4)}:{round(lng, 4)}"

    # wait_for_cache: poll for a cached result (used by score/vibe)
    if wait_for_cache:
        import time
        for _ in range(15):
            cached = get_cache(cache_key)
            if cached:
                return cached
            time.sleep(1)
        return None

    cached = get_cache(cache_key)
    if cached:
        print(f"[AQ] Cache hit for {lat},{lng}")
        return cached

    try:
        print(f"[AQ] Fetching OpenWeatherMap Air Pollution for {lat},{lng}")
        resp = requests.get(
            OPENWEATHER_AQI_URL,
            params={"lat": lat, "lon": lng, "appid": OPENWEATHER_API_KEY},
            timeout=10,
        )
        print(f"[AQ] Response status: {resp.status_code}")

        if resp.status_code != 200:
            print(f"[AQ] API error: {resp.text[:300]}")
            return None

        payload = resp.json()
        items = payload.get("list", [])
        if not items:
            print("[AQ] Empty 'list' in response — no data available")
            return None

        entry = items[0]

        # European AQI index (1–5)
        eu_aqi = entry.get("main", {}).get("aqi")
        if eu_aqi is None:
            print("[AQ] Missing main.aqi in response")
            return None

        components = entry.get("components", {})

        # PM2.5 for US-style AQI conversion
        pm25_val = components.get("pm2_5", 0)
        us_aqi = pm25_to_aqi(pm25_val) if pm25_val > 0 else 0

        # Build HabitatScore-compatible score (0-100)
        habitat_score = AQI_SCORE_MAP.get(eu_aqi, 60)

        data = {
            "aqi_current":     us_aqi,
            "aqi_score":       habitat_score,
            "annual_avg_pm25": round(pm25_val, 2),
            "aqi_rating":      aqi_rating(us_aqi),
            "rating":          aqi_rating(us_aqi),
            "aqi_colour":      aqi_colour(us_aqi),
            "is_fallback":     False,
            "station_name":    "OpenWeatherMap",
            "pollutants": {
                "pm2_5": round(components.get("pm2_5", 0), 2),
                "pm10":  round(components.get("pm10", 0), 2),
                "no2":   round(components.get("no2", 0), 2),
                "o3":    round(components.get("o3", 0), 2),
                "so2":   round(components.get("so2", 0), 2),
                "co":    round(components.get("co", 0), 2),
            },
        }

        print(f"[AQ] Done — US AQI={us_aqi} ({aqi_rating(us_aqi)}), "
              f"EU AQI={eu_aqi} ({AQI_LABEL_MAP.get(eu_aqi, '?')}), "
              f"PM2.5={pm25_val} µg/m³")
        set_cache(cache_key, data, CACHE_TTL_AIRQUALITY)
        return data

    except Exception as e:
        import traceback
        print(f"[AQ] Exception: {str(e)}")
        traceback.print_exc()
        return None


# ── Flask route ───────────────────────────────────────────────────────────────
@airquality_bp.route("/airquality", methods=["GET"])
def get_airquality():
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

    data = get_airquality_data(lat, lng)
    if data is None:
        return jsonify({"success": False, "error": "Air quality data unavailable for this location"}), 502
    return jsonify({"success": True, "data": data})
