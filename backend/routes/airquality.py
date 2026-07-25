"""
routes/airquality.py — Real-time AQI via OpenWeatherMap Air Pollution API.

GET /api/airquality?lat=&lng=
"""

import time

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
def get_airquality_data(lat: float, lng: float, wait_for_cache: bool = False) -> tuple[dict | None, str | None]:
    """
    Core AQI logic — returns (data, error_code) tuple.
    data is None on failure; error_code describes why.
    """
    cache_key = f"airquality:{round(lat, 4)}:{round(lng, 4)}"

    # wait_for_cache: poll for a cached result (used by score/vibe)
    if wait_for_cache:
        for _ in range(15):
            cached = get_cache(cache_key)
            if cached:
                return cached, None
            time.sleep(1)
        return None, "CACHE_TIMEOUT"

    cached = get_cache(cache_key)
    if cached:
        print(f"[AQ] Cache hit for {lat},{lng}")
        return cached, None

    last_error = None
    for attempt in range(1, 3):
        try:
            print(f"[AQ] Fetching OpenWeatherMap Air Pollution for {lat},{lng} (attempt {attempt}/2)")
            resp = requests.get(
                OPENWEATHER_AQI_URL,
                params={"lat": lat, "lon": lng, "appid": OPENWEATHER_API_KEY},
                timeout=10,
            )
            print(f"[AQ] Response status: {resp.status_code}")

            if resp.status_code == 401:
                print(f"[AQ] API key invalid — not retrying")
                return None, "AUTH_FAILURE"

            if resp.status_code == 429:
                print(f"[AQ] Rate limited (attempt {attempt}/2)")
                last_error = "RATE_LIMITED"
                if attempt < 2:
                    time.sleep(2)
                continue

            if resp.status_code != 200:
                print(f"[AQ] API error {resp.status_code}: {resp.text[:300]}")
                last_error = "UPSTREAM_ERROR"
                if attempt < 2:
                    time.sleep(1.5)
                continue

            payload = resp.json()
            items = payload.get("list", [])
            if not items:
                print("[AQ] Empty 'list' in response — no data available")
                return None, "NO_DATA"

            entry = items[0]

            # European AQI index (1–5)
            eu_aqi = entry.get("main", {}).get("aqi")
            if eu_aqi is None:
                print("[AQ] Missing main.aqi in response")
                return None, "NO_DATA"

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
            return data, None

        except requests.exceptions.Timeout:
            print(f"[AQ] Timeout (attempt {attempt}/2)")
            last_error = "TIMEOUT"
            if attempt < 2:
                time.sleep(1.5)
        except Exception as e:
            print(f"[AQ] Exception: {type(e).__name__}: {e}")
            last_error = "UPSTREAM_ERROR"
            if attempt < 2:
                time.sleep(1.5)

    print(f"[AQ] Failed after 2 attempts — last_error={last_error}")
    return None, last_error or "UPSTREAM_ERROR"


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

    data, error_code = get_airquality_data(lat, lng)
    if data is None:
        error_map = {
            "AUTH_FAILURE":   ("Air quality API key is invalid",   502),
            "RATE_LIMITED":   ("Air quality service is busy — try again shortly", 429),
            "TIMEOUT":        ("Air quality service timed out",    504),
            "UPSTREAM_ERROR": ("Air quality service unavailable",  502),
            "NO_DATA":        ("No air quality data for this location", 404),
        }
        msg, status = error_map.get(error_code, ("Air quality data unavailable", 502))
        return jsonify({"success": False, "error": msg, "error_code": error_code}), status
    return jsonify({"success": True, "data": data})
