"""
routes/airquality.py — Real-time AQI via OpenAQ API.

GET /api/airquality?lat=&lng=
"""

from collections import defaultdict

import requests
from flask import Blueprint, jsonify, request

from config import OPENAQ_API_KEY
from utils.cache import CACHE_TTL_AIRQUALITY, get_cache, set_cache

airquality_bp = Blueprint("airquality", __name__)

OPENAQ_HEADERS = {"X-API-Key": OPENAQ_API_KEY}

MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]

# ── Regional fallback ─────────────────────────────────────────────────────────
FALLBACK = {
    "aqi_current":      95,
    "annual_avg_aqi":   95,
    "annual_avg_pm25":  38.0,
    "aqi_rating":       "Moderate",
    "rating":           "Moderate",
    "worst_month":      "December",
    "best_month":       "July",
    "station_name":     "Estimated - Regional Average",
    "distance_km":      0,
    "is_fallback":      True,
    "aqi_colour":       "yellow",
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


def haversine_km(lat1, lng1, lat2, lng2) -> float:
    import math
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))


# ── Pure data function (reusable internally) ──────────────────────────────────
def get_airquality_data(lat: float, lng: float, wait_for_cache: bool = False) -> dict:
    """Core AQI logic — returns data dict (always succeeds; uses fallbacks)."""
    cache_key = f"airquality:{round(lat,4)}:{round(lng,4)}"

    if wait_for_cache:
        import time
        for _ in range(15):
            cached = get_cache(cache_key)
            if cached:
                return cached
            time.sleep(1)
        return FALLBACK

    cached = get_cache(cache_key)
    if cached:
        print(f"[AQ] Cache hit for {lat},{lng}")
        return cached

    try:
        # 1. Find nearest station
        print(f"[AQ] Searching for stations near {lat},{lng}")
        loc_resp = requests.get(
            "https://api.openaq.org/v3/locations",
            headers=OPENAQ_HEADERS,
            params={"coordinates": f"{lat},{lng}", "radius": 25000, "limit": 5},
            timeout=10,
        )
        print(f"[AQ] Locations status: {loc_resp.status_code}")
        print(f"[AQ] Locations response: {loc_resp.text[:500]}")

        if loc_resp.status_code != 200:
            raise ValueError(f"locations API returned {loc_resp.status_code}")

        locations = loc_resp.json().get("results", [])
        if not locations:
            print(f"[AQ] No stations found within 25km, using fallback")
            set_cache(cache_key, FALLBACK, CACHE_TTL_AIRQUALITY)
            return FALLBACK

        station      = locations[0]
        station_id   = station.get("id")
        station_name = station.get("name", "Unknown Station")
        station_lat  = station.get("coordinates", {}).get("latitude", lat)
        station_lng  = station.get("coordinates", {}).get("longitude", lng)
        dist_km      = round(haversine_km(lat, lng, station_lat, station_lng), 2)
        print(f"[AQ] Found station: {station_name}, id: {station_id}")

        # 2. Get sensors for this station
        print(f"[AQ] Fetching sensors for station {station_id}")
        sensors_resp = requests.get(
            f"https://api.openaq.org/v3/locations/{station_id}/sensors",
            headers=OPENAQ_HEADERS,
            timeout=10,
        )
        print(f"[AQ] Sensors status: {sensors_resp.status_code}")

        sensors      = sensors_resp.json().get("results", []) if sensors_resp.status_code == 200 else []
        pm25_sensor  = next(
            (s for s in sensors
             if s.get("parameter", {}).get("name", "").lower() in ("pm25", "pm2.5")),
            None
        )
        print(f"[AQ] PM2.5 sensor: {pm25_sensor}")

        if not pm25_sensor:
            print(f"[AQ] No PM2.5 sensor at this station — using fallback")
            result = {**FALLBACK, "station_name": station_name, "distance_km": dist_km}
            set_cache(cache_key, result, CACHE_TTL_AIRQUALITY)
            return result

        sensor_id = pm25_sensor["id"]
        print(f"[AQ] Fetching measurements for sensor {sensor_id}")
        meas_resp = requests.get(
            f"https://api.openaq.org/v3/sensors/{sensor_id}/measurements",
            headers=OPENAQ_HEADERS,
            params={"limit": 1000, "period_name": "day"},
            timeout=10,
        )
        print(f"[AQ] Measurements status: {meas_resp.status_code}")

        if meas_resp.status_code != 200:
            raise ValueError(f"measurements API returned {meas_resp.status_code}")

        results = meas_resp.json().get("results", [])
        print(f"[AQ] Measurements count: {len(results)}")
        print(f"[AQ] Sample measurement: {results[0] if results else None}")

        measurements = results

    except Exception as e:
        import traceback
        print(f"[AQ] Exception: {str(e)}")
        traceback.print_exc()
        set_cache(cache_key, FALLBACK, CACHE_TTL_AIRQUALITY)
        return FALLBACK

    # 3. Process PM2.5 — v3 sensor measurements format:
    #    { "value": 38.5, "period": { "datetimeTo": { "utc": "2024-..." }, ... } }
    pm25_values  = []
    monthly_pm25 = defaultdict(list)
    for m in measurements:
        value = m.get("value")
        if value is None or value <= 0:
            continue
        pm25_values.append(value)
        try:
            period   = m.get("period", {})
            date_str = (
                period.get("datetimeTo", {}).get("utc", "")
                or period.get("datetimeFrom", {}).get("utc", "")
                or m.get("date", {}).get("utc", "")
                or ""
            )
            month_idx = int(date_str[5:7]) - 1
            monthly_pm25[month_idx].append(value)
        except (ValueError, IndexError, TypeError):
            pass

    print(f"[AQ] PM2.5 readings found: {len(pm25_values)}")

    if not pm25_values:
        print(f"[AQ] No PM2.5 data — using fallback values with real station name")
        result = {**FALLBACK, "station_name": station_name, "distance_km": dist_km}
        set_cache(cache_key, result, CACHE_TTL_AIRQUALITY)
        return result

    avg_pm25 = round(sum(pm25_values) / len(pm25_values), 2)
    avg_aqi  = pm25_to_aqi(avg_pm25)
    print(f"[AQ] avg PM2.5={avg_pm25} µg/m³  avg AQI={avg_aqi}")

    worst_month, best_month = "December", "July"
    if monthly_pm25:
        monthly_avgs = {m: sum(v)/len(v) for m, v in monthly_pm25.items()}
        best_idx  = min(monthly_avgs, key=monthly_avgs.get)
        worst_idx = max(monthly_avgs, key=monthly_avgs.get)
        worst_month = MONTH_NAMES[worst_idx]
        best_month  = MONTH_NAMES[best_idx]

    data = {
        "aqi_current":      avg_aqi,
        "annual_avg_aqi":   avg_aqi,
        "annual_avg_pm25":  avg_pm25,
        "aqi_rating":       aqi_rating(avg_aqi),
        "rating":           aqi_rating(avg_aqi),
        "worst_month":      worst_month,
        "best_month":       best_month,
        "station_name":     station_name,
        "distance_km":      dist_km,
        "is_fallback":      False,
        "aqi_colour":       aqi_colour(avg_aqi),
    }

    print(f"[AQ] Done — AQI={avg_aqi} ({aqi_rating(avg_aqi)}), station={station_name}, dist={dist_km}km")
    set_cache(cache_key, data, CACHE_TTL_AIRQUALITY)
    return data


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
    return jsonify({"success": True, "data": data})
