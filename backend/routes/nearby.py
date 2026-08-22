"""
routes/nearby.py — Nearby amenities for HabitatMatch.

Uses OpenStreetMap Overpass API (free, no key required).
Single efficient query using nwr (node/way/relation) union.

GET /api/nearby?lat=&lng=&radius=
"""

import time

import requests
from flask import Blueprint, jsonify, request

from utils.cache import CACHE_TTL_NEARBY, get_cache, set_cache

nearby_bp = Blueprint("nearby", __name__)

# ── Overpass mirror list (tried in order — fastest first) ────────────────────
OVERPASS_MIRRORS = [
    ("https://overpass-api.de/api/interpreter", 3),
    ("https://lz4.overpass-api.de/api/interpreter", 3),
]

ALL_CATEGORY_NAMES = [
    "hospital", "school", "park", "gas_station", "railway_station",
    "pharmacy", "college", "mall", "atm", "bank"
]


def _build_overpass_query(lat: float, lng: float, radius: int) -> str:
    """
    Build a compact Overpass QL query fetching all amenity types at once.
    Uses nwr (node/way/relation) shorthand for broad coverage.
    """
    around = f"around:{radius},{lat},{lng}"
    return f"""[out:json][timeout:10];
(
  nwr["amenity"~"^(hospital|school|college|university|fuel|pharmacy|atm|bank)$"]({around});
  nwr["leisure"="park"]({around});
  nwr["railway"="station"]({around});
  nwr["shop"="mall"]({around});
);
out body center qt 100;
"""


def _tag_to_category(tags: dict) -> str:
    """Map OSM element tags to our category label."""
    amenity = tags.get("amenity", "")
    leisure = tags.get("leisure", "")
    railway = tags.get("railway", "")
    shop    = tags.get("shop", "")

    if amenity == "hospital":                               return "hospital"
    if amenity in ("school", "university"):                 return "school"
    if amenity == "college":                                return "college"
    if leisure == "park":                                   return "park"
    if amenity == "fuel":                                   return "gas_station"
    if railway == "station":                                return "railway_station"
    if amenity == "pharmacy":                               return "pharmacy"
    if shop == "mall":                                      return "mall"
    if amenity == "atm":                                    return "atm"
    if amenity == "bank":                                   return "bank"
    return "other"


def _haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Return distance in metres between two lat/lng points."""
    import math
    R = 6_371_000
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1))
         * math.cos(math.radians(lat2))
         * math.sin(dlon / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(max(0, a)))


def _fetch_nominatim_fallback(lat: float, lng: float, radius: int) -> list:
    """
    Fallback method querying Nominatim search endpoint for nearby features.
    """
    print("[OVERPASS] Fallback: querying Nominatim with viewbox...")
    fallback_places = []
    
    deg_limit = max(0.02, radius / 111000.0 * 2.0)
    viewbox = f"{lng - deg_limit},{lat + deg_limit},{lng + deg_limit},{lat - deg_limit}"

    categories_to_query = {
        "hospital": "hospital",
        "school": "school",
        "college": "college",
        "park": "park",
        "gas_station": "fuel",
        "railway_station": "station",
        "pharmacy": "pharmacy",
        "mall": "mall",
        "atm": "atm",
        "bank": "bank"
    }

    headers = {"User-Agent": "HabitatMatch/1.0 (property intelligence app)"}

    for category, q in categories_to_query.items():
        try:
            url = f"https://nominatim.openstreetmap.org/search?q={q}&format=json&viewbox={viewbox}&bounded=1&limit=5"
            resp = requests.get(url, headers=headers, timeout=4)
            if resp.status_code == 200:
                results = resp.json()
                for item in results:
                    try:
                        p_lat = float(item["lat"])
                        p_lng = float(item["lon"])
                        dist = _haversine_m(lat, lng, p_lat, p_lng)
                        fallback_places.append({
                            "name": item.get("display_name", "").split(",")[0] or category.capitalize(),
                            "category": category,
                            "lat": p_lat,
                            "lng": p_lng,
                            "distance_metres": int(dist),
                            "vicinity": item.get("display_name", ""),
                            "rating": 0.0,
                        })
                    except (ValueError, KeyError):
                        continue
        except Exception as e:
            print(f"[OVERPASS] Fallback failed for category {category}: {e}")
            continue

    print(f"[OVERPASS] Fallback complete. Found {len(fallback_places)} places.")
    return fallback_places


def _fetch_overpass(lat: float, lng: float, radius: int) -> list | None:
    """
    Query Overpass API with mirror fallback.
    Returns list of places, or None on complete failure.
    """
    query = _build_overpass_query(lat, lng, radius)

    for mirror_url, mirror_timeout in OVERPASS_MIRRORS:
        try:
            print(f"[OVERPASS] Trying {mirror_url} (timeout={mirror_timeout}s)")
            resp = requests.get(
                mirror_url,
                params={"data": query},
                timeout=mirror_timeout,
                headers={"User-Agent": "HabitatMatch/1.0 (property intelligence app)"},
            )
            if resp.status_code == 429:
                print(f"[OVERPASS] 429 rate-limited on {mirror_url}, trying next")
                time.sleep(1)
                continue
            if resp.status_code != 200:
                print(f"[OVERPASS] {resp.status_code} from {mirror_url}, trying next")
                continue
            elements = resp.json().get("elements", [])
            if len(elements) > 0:
                print(f"[OVERPASS] Success from {mirror_url}: {len(elements)} elements")
                break  # success with real data
            print(f"[OVERPASS] 0 elements from {mirror_url}, trying next")
            continue
        except Exception as e:
            print(f"[OVERPASS] Failed on {mirror_url}: {type(e).__name__}")
            continue
    else:
        return _fetch_nominatim_fallback(lat, lng, radius)

    places = []
    for el in elements:
        tags = el.get("tags", {})
        if not tags:
            continue

        name = (tags.get("name")
                or tags.get("name:en")
                or tags.get("amenity")
                or tags.get("leisure")
                or tags.get("railway")
                or "Unnamed")

        # Coordinates: nodes have lat/lon; ways/relations have center
        if el["type"] == "node":
            place_lat = el.get("lat", 0)
            place_lng = el.get("lon", 0)
        else:
            centre = el.get("center", {})
            place_lat = centre.get("lat", 0)
            place_lng = centre.get("lon", 0)

        if not place_lat or not place_lng:
            continue

        category = _tag_to_category(tags)
        if category == "other":
            continue

        distance = _haversine_m(lat, lng, place_lat, place_lng)
        vicinity = (tags.get("addr:full")
                    or tags.get("addr:street", "")
                    or tags.get("addr:place", ""))

        places.append({
            "name": name,
            "lat": place_lat,
            "lng": place_lng,
            "category": category,
            "vicinity": vicinity,
            "distance_metres": round(distance),
            "rating": 0.0,
        })

    return places


# ── Pure data function (reusable internally) ──────────────────────────────────
def get_nearby_data(lat: float, lng: float, radius: int = 1500, wait_for_cache: bool = False) -> dict | None:
    """
    Core nearby logic — returns the data dict or None on failure.
    Can be called directly by other routes without HTTP overhead.
    """
    cache_key = f"nearby:{round(lat,4)}:{round(lng,4)}"
    
    if wait_for_cache:
        import time
        for _ in range(15):
            cached = get_cache(cache_key)
            if cached:
                return cached
            time.sleep(1)
        # If cache wait fails, return an empty structure so we don't crash
        return {"places": [], "counts": {c: 0 for c in ALL_CATEGORY_NAMES}, "total": 0, "centre": {"lat": lat, "lng": lng}}

    cached = get_cache(cache_key)
    if cached:
        return cached

    import time
    print(f"[TIMING] Starting Overpass fetch for lat={lat}, lng={lng}")
    start_time = time.time()
    all_places = _fetch_overpass(lat, lng, radius)
    end_time = time.time()
    print(f"[TIMING] Overpass fetch completed in {end_time - start_time:.2f} seconds")

    if all_places is None:
        return None

    seen: set = set()
    unique: list = []
    for p in all_places:
        key = (p["name"], round(p["lat"], 5), round(p["lng"], 5))
        if key not in seen:
            seen.add(key)
            unique.append(p)
    unique.sort(key=lambda x: x["distance_metres"])

    counts = {cat: 0 for cat in ALL_CATEGORY_NAMES}
    for p in unique:
        if p["category"] in counts:
            counts[p["category"]] += 1

    data = {
        "places": unique,
        "counts": counts,
        "total": len(unique),
        "centre": {"lat": lat, "lng": lng},
    }
    set_cache(cache_key, data, CACHE_TTL_NEARBY)
    return data


# ── Flask route ───────────────────────────────────────────────────────────────
@nearby_bp.route("/nearby", methods=["GET"])
def get_nearby():
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
    try:
        radius = int(request.args.get("radius", 1500))
    except (ValueError, TypeError):
        radius = 1500

    data = get_nearby_data(lat, lng, radius)
    if data is None:
        return jsonify({"success": False, "error": "Failed to fetch nearby places from OSM"}), 500
    return jsonify({"success": True, "data": data})
