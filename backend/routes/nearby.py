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


def _fetch_parallel_photon(lat: float, lng: float, radius: int) -> list:
    """
    High-speed parallel Photon OSM search fallback for 10 amenity categories.
    Completes in ~1.5s across all categories without rate-limiting.
    """
    print(f"[NEARBY] Parallel Photon search for lat={lat}, lng={lng}")
    categories = {
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

    def _fetch_single_category(item):
        cat, q = item
        places = []
        try:
            url = f"https://photon.komoot.io/api/?q={q}&lat={lat}&lon={lng}&limit=5"
            r = requests.get(url, headers={"User-Agent": "HabitatMatch/1.0"}, timeout=3)
            if r.status_code == 200:
                features = r.json().get("features", [])
                for f in features:
                    coords = f.get("geometry", {}).get("coordinates", [0, 0])
                    p_lng, p_lat = coords[0], coords[1]
                    props = f.get("properties", {})
                    name = props.get("name") or props.get("street") or q.capitalize()
                    dist = _haversine_m(lat, lng, p_lat, p_lng)
                    places.append({
                        "name": name,
                        "category": cat,
                        "lat": p_lat,
                        "lng": p_lng,
                        "distance_metres": int(dist),
                        "vicinity": f"{props.get('city', '')}, {props.get('state', '')}",
                        "rating": 0.0,
                    })
        except Exception as e:
            print(f"[NEARBY] Photon fetch failed for {cat}: {e}")
        return places

    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=10) as executor:
        results = list(executor.map(_fetch_single_category, categories.items()))

    all_places = [p for sub in results for p in sub]
    print(f"[NEARBY] Parallel Photon search complete: {len(all_places)} places found")
    return all_places


def _fetch_overpass(lat: float, lng: float, radius: int) -> list | None:
    """
    Query Overpass API with quick timeout, falling back to parallel Photon search.
    """
    query = _build_overpass_query(lat, lng, radius)

    for mirror_url, _ in OVERPASS_MIRRORS:
        try:
            print(f"[OVERPASS] Trying {mirror_url} (timeout=1.5s)")
            resp = requests.get(
                mirror_url,
                params={"data": query},
                timeout=1.5,
                headers={"User-Agent": "HabitatMatch/1.0 (property intelligence app)"},
            )
            if resp.status_code == 200:
                elements = resp.json().get("elements", [])
                if len(elements) > 0:
                    print(f"[OVERPASS] Success from {mirror_url}: {len(elements)} elements")
                    break  # success with real data
            print(f"[OVERPASS] 0 elements or non-200 from {mirror_url}, trying next")
            continue
        except Exception as e:
            print(f"[OVERPASS] Failed on {mirror_url}: {type(e).__name__}")
            continue
    else:
        return _fetch_parallel_photon(lat, lng, radius)

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
        all_places = []

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
    return jsonify({"success": True, "data": data})


@nearby_bp.route("/geocode/reverse", methods=["GET"])
def reverse_geocode():
    lat = request.args.get("lat", type=float)
    lng = request.args.get("lng", type=float)
    if lat is None or lng is None:
        return jsonify({"success": False, "error": "lat and lng required"}), 400

    cache_key = f"reverse_geo:{round(lat,4)}:{round(lng,4)}"
    cached = get_cache(cache_key)
    if cached:
        return jsonify({"success": True, "data": cached})

    address = None

    # 1. Try Photon (fast, rich OSM data, zero rate limiting)
    try:
        url = f"https://photon.komoot.io/reverse?lat={lat}&lon={lng}"
        resp = requests.get(url, headers={"User-Agent": "HabitatMatch/1.0"}, timeout=3)
        if resp.status_code == 200:
            features = resp.json().get("features", [])
            if features:
                props = features[0].get("properties", {})
                parts = [
                    props.get("name"),
                    props.get("street"),
                    props.get("district") or props.get("suburb"),
                    props.get("city") or props.get("town") or props.get("county"),
                    props.get("state"),
                    props.get("country")
                ]
                clean = ", ".join([p for p in parts if p])
                if clean:
                    address = clean
    except Exception as e:
        print(f"[REVERSE GEO] Photon failed: {e}")

    # 2. Try BigDataCloud fallback if Photon fails
    if not address:
        try:
            url = f"https://api.bigdatacloud.net/data/reverse-geocode-client?latitude={lat}&longitude={lng}&localityLanguage=en"
            resp = requests.get(url, timeout=3)
            if resp.status_code == 200:
                data = resp.json()
                parts = [
                    data.get("locality"),
                    data.get("city"),
                    data.get("principalSubdivision"),
                    data.get("countryName")
                ]
                clean = ", ".join([p for p in parts if p])
                if clean:
                    address = clean
        except Exception as e:
            print(f"[REVERSE GEO] BigDataCloud failed: {e}")

    if not address:
        address = f"Location ({lat:.4f}, {lng:.4f})"

    result = {"address": address, "lat": lat, "lng": lng}
    set_cache(cache_key, result, 86400)
    return jsonify({"success": True, "data": result})
