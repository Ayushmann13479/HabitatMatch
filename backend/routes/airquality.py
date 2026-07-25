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


# ── EPA AQI Calculations ──────────────────────────────────────────────────────
# Using standard US EPA breakpoints (with 2024 PM2.5 updates).
# Note: OpenWeatherMap returns concentrations in µg/m³. EPA uses ppb/ppm for some gases.
# We convert gases to their EPA units before calculating the index.

def _calc_subindex(c: float, breakpoints: list[tuple[float, float, int, int]]) -> int:
    """Standard EPA linear interpolation formula."""
    for lo_c, hi_c, lo_i, hi_i in breakpoints:
        if lo_c <= c <= hi_c:
            return round(((hi_i - lo_i) / (hi_c - lo_c)) * (c - lo_c) + lo_i)
    # If above max breakpoint, extrapolate or cap at 500
    if breakpoints:
        _, hi_c, _, hi_i = breakpoints[-1]
        if c > hi_c:
            # We'll just return max defined or scale linearly (simplified to 500 cap for now)
            return hi_i 
    return 0


def calculate_epa_aqi(components: dict) -> tuple[int, str]:
    """
    Calculate the overall US AQI based on the maximum sub-index of all pollutants.
    Returns (overall_aqi, dominant_pollutant_name).
    """
    sub_indices = {}

    # PM2.5 (µg/m³) - 2024 breakpoints
    pm25 = components.get("pm2_5", -1)
    if pm25 >= 0:
        sub_indices["PM2.5"] = _calc_subindex(pm25, [
            (0.0, 9.0, 0, 50),
            (9.1, 35.4, 51, 100),
            (35.5, 55.4, 101, 150),
            (55.5, 125.4, 151, 200),
            (125.5, 225.4, 201, 300),
            (225.5, 500.0, 301, 500),
        ])

    # PM10 (µg/m³)
    pm10 = components.get("pm10", -1)
    if pm10 >= 0:
        sub_indices["PM10"] = _calc_subindex(pm10, [
            (0.0, 54.0, 0, 50),
            (55.0, 154.0, 51, 100),
            (155.0, 254.0, 101, 150),
            (255.0, 354.0, 151, 200),
            (355.0, 424.0, 201, 300),
            (425.0, 604.0, 301, 500),
        ])

    # O3 (ppb) - OpenWeatherMap gives µg/m³. 1 ppb O3 ≈ 2.00 µg/m³.
    o3_ugm3 = components.get("o3", -1)
    if o3_ugm3 >= 0:
        o3_ppb = o3_ugm3 / 2.00
        sub_indices["O3"] = _calc_subindex(o3_ppb, [
            (0.0, 54.0, 0, 50),
            (55.0, 70.0, 51, 100),
            (71.0, 85.0, 101, 150),
            (86.0, 105.0, 151, 200),
            (106.0, 200.0, 201, 300),
            (201.0, 604.0, 301, 500), # Simplified blending of 8hr/1hr
        ])

    # NO2 (ppb) - OpenWeatherMap gives µg/m³. 1 ppb NO2 ≈ 1.88 µg/m³.
    no2_ugm3 = components.get("no2", -1)
    if no2_ugm3 >= 0:
        no2_ppb = no2_ugm3 / 1.88
        sub_indices["NO2"] = _calc_subindex(no2_ppb, [
            (0.0, 53.0, 0, 50),
            (54.0, 100.0, 51, 100),
            (101.0, 360.0, 101, 150),
            (361.0, 649.0, 151, 200),
            (650.0, 1249.0, 201, 300),
            (1250.0, 2049.0, 301, 500),
        ])

    # SO2 (ppb) - OpenWeatherMap gives µg/m³. 1 ppb SO2 ≈ 2.62 µg/m³.
    so2_ugm3 = components.get("so2", -1)
    if so2_ugm3 >= 0:
        so2_ppb = so2_ugm3 / 2.62
        sub_indices["SO2"] = _calc_subindex(so2_ppb, [
            (0.0, 35.0, 0, 50),
            (36.0, 75.0, 51, 100),
            (76.0, 185.0, 101, 150),
            (186.0, 304.0, 151, 200),
            (305.0, 604.0, 201, 300),
            (605.0, 1004.0, 301, 500),
        ])

    # CO (ppm) - OpenWeatherMap gives µg/m³. 1 ppm CO ≈ 1150 µg/m³.
    co_ugm3 = components.get("co", -1)
    if co_ugm3 >= 0:
        co_ppm = co_ugm3 / 1150.0
        sub_indices["CO"] = _calc_subindex(co_ppm, [
            (0.0, 4.4, 0, 50),
            (4.5, 9.4, 51, 100),
            (9.5, 12.4, 101, 150),
            (12.5, 15.4, 151, 200),
            (15.5, 30.4, 201, 300),
            (30.5, 50.4, 301, 500),
        ])

    if not sub_indices:
        return 0, "Unknown"

    # AQI is the maximum of all sub-indices
    dominant = max(sub_indices.items(), key=lambda x: x[1])
    return dominant[1], dominant[0]


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
    if aqi <= 200:  return "red"
    if aqi <= 300:  return "purple"
    return "maroon"


# ── Pure data function (reusable internally) ──────────────────────────────────
def get_airquality_data(lat: float, lng: float, wait_for_cache: bool = False) -> tuple[dict | None, str | None]:
    """
    Core AQI logic — returns (data, error_code) tuple.
    data is None on failure; error_code describes why.
    """
    # Updated cache key to prevent serving old single-pollutant calculation
    cache_key = f"airquality:v2:{round(lat, 4)}:{round(lng, 4)}"

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

            # Calculate full EPA AQI across all pollutants
            us_aqi, dominant_pollutant = calculate_epa_aqi(components)

            # Build HabitatScore-compatible score (0-100)
            habitat_score = AQI_SCORE_MAP.get(eu_aqi, 60)

            data = {
                "aqi_current":        us_aqi,
                "aqi_dominant":       dominant_pollutant,
                "aqi_score":          habitat_score,
                "annual_avg_pm25":    round(components.get("pm2_5", 0), 2),
                "aqi_rating":         aqi_rating(us_aqi),
                "rating":             aqi_rating(us_aqi),
                "aqi_colour":         aqi_colour(us_aqi),
                "is_fallback":        False,
                "station_name":       "OpenWeatherMap",
                "pollutants": {
                    "pm2_5": round(components.get("pm2_5", 0), 2),
                    "pm10":  round(components.get("pm10", 0), 2),
                    "no2":   round(components.get("no2", 0), 2),
                    "o3":    round(components.get("o3", 0), 2),
                    "so2":   round(components.get("so2", 0), 2),
                    "co":    round(components.get("co", 0), 2),
                },
            }

            print(f"[AQ] Done — US AQI={us_aqi} ({aqi_rating(us_aqi)}) [Dominant: {dominant_pollutant}], "
                  f"EU AQI={eu_aqi} ({AQI_LABEL_MAP.get(eu_aqi, '?')})")
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
