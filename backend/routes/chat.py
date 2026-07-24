"""
routes/chat.py — AI property chat with full context.

POST /api/chat         — Send a message, get AI reply (auth optional for testing)
GET  /api/chat/history — Fetch session message history (requires auth)
"""

import uuid
from datetime import date

from flask import Blueprint, jsonify, request

from models import ChatMessage, ChatSession, SearchHistory, User, db
from routes.airquality import get_airquality_data
from routes.disaster import get_disaster_data
from routes.nearby import get_nearby_data
from routes.score import get_score_data
from routes.vibe import get_vibe_data
from utils.auth import require_auth
from utils.ai import chat_with_context

chat_bp = Blueprint("chat", __name__)


# ── Helpers ───────────────────────────────────────────────────────────────────
def _nearest(places: list, category: str) -> int:
    matches = [p["distance_metres"] for p in places if p["category"] == category]
    return min(matches) if matches else 9999


def _get_or_create_user(clerk_user_id: str, email: str = "", name: str = "") -> User:
    user = User.query.filter_by(clerk_user_id=clerk_user_id).first()
    if not user:
        user = User(
            id=str(uuid.uuid4()),
            clerk_user_id=clerk_user_id,
            email=email or f"{clerk_user_id}@habitatmatch.app",
            name=name or "User",
        )
        db.session.add(user)
        db.session.commit()
    return user


def _build_context(address, lat, lng, nearby, disaster, aqi, vibe, score) -> str:
    """Return structured raw data for this property — no pre-written sentences.
    Gemini's system instruction guides how it phrases things."""
    places = nearby.get("places", []) if nearby else []
    counts = nearby.get("counts", {}) if nearby else {}

    nearest_hospital = _nearest(places, "hospital")
    nearest_school   = _nearest(places, "school")
    nearest_transit  = min(
        [p["distance_metres"] for p in places if p["category"] in ("railway_station", "bus_stop")],
        default=9999
    )
    nearest_park     = _nearest(places, "park")

    vibe_tag    = vibe.get("vibe_tag",    "N/A") if vibe else "N/A"
    vibe_score  = vibe.get("vibe_score",  0)     if vibe else 0
    vibe_pros   = vibe.get("pros",        [])    if vibe else []
    vibe_cons   = vibe.get("cons",        [])    if vibe else []

    score_total = score.get("total",      0)     if score else 0
    score_grade = score.get("grade",      "N/A") if score else "N/A"
    dims        = score.get("dimensions", {})    if score else {}

    # Disaster raw figures only — no risk_summary sentence
    flood_risk       = (disaster.get("flood_risk") or "").lower()     if disaster else "unknown"
    elevation        = disaster.get("elevation_metres", "N/A")        if disaster else "N/A"
    coastal_dist     = disaster.get("coastal_distance_km", "N/A")    if disaster else "N/A"
    in_flood_zone    = disaster.get("in_flood_zone", False)           if disaster else False
    flood_zone_name  = disaster.get("flood_zone_name", "")            if disaster else ""

    # Air quality raw figures only — no category sentences
    aqi_val  = aqi.get("aqi_current",    "N/A")            if aqi else "N/A"
    aqi_rtg  = aqi.get("aqi_rating",     aqi.get("rating", "N/A")) if aqi else "N/A"
    pm25     = aqi.get("annual_avg_pm25", "N/A")            if aqi else "N/A"
    pollutants = aqi.get("pollutants", {})                   if aqi else {}

    return f"""property_address: {address}
coordinates: {round(lat, 5)}, {round(lng, 5)}

[nearby_places]
hospital_count: {counts.get('hospital', 0)}
hospital_nearest_metres: {nearest_hospital}
school_count: {counts.get('school', 0)}
school_nearest_metres: {nearest_school}
park_count: {counts.get('park', 0)}
park_nearest_metres: {nearest_park}
transit_count: {counts.get('railway_station', 0) + counts.get('bus_stop', 0)}
transit_nearest_metres: {nearest_transit}

[disaster_risk]
flood_risk: {flood_risk}
elevation_metres: {elevation}
coastal_distance_km: {coastal_dist}
in_named_flood_zone: {in_flood_zone}{f' ({flood_zone_name})' if in_flood_zone and flood_zone_name else ''}

[air_quality]
aqi_current: {aqi_val}
aqi_category: {aqi_rtg}
pm2_5_ug_m3: {pm25}
pm10_ug_m3: {pollutants.get('pm10', 'N/A')}
no2_ug_m3: {pollutants.get('no2', 'N/A')}
o3_ug_m3: {pollutants.get('o3', 'N/A')}

[neighbourhood_vibe]
vibe_tag: {vibe_tag}
vibe_score: {vibe_score}/10
pros: {', '.join(vibe_pros) if vibe_pros else 'N/A'}
cons: {', '.join(vibe_cons) if vibe_cons else 'N/A'}

[habitatscore]
total: {score_total}/100
grade: {score_grade}
safety_score: {dims.get('safety',       {}).get('score', 0)}/20
connectivity_score: {dims.get('connectivity', {}).get('score', 0)}/20
amenities_score: {dims.get('amenities',    {}).get('score', 0)}/20
air_quality_score: {dims.get('air_quality',  {}).get('score', 0)}/20
vibe_score: {dims.get('vibe',         {}).get('score', 0)}/10
green_cover_score: {dims.get('green_cover',  {}).get('score', 0)}/10"""


# ── POST /api/chat ─────────────────────────────────────────────────────────────
@chat_bp.route("/chat", methods=["POST"])
def post_chat():
    body = request.get_json(silent=True) or {}

    # ── Validate ──────────────────────────────────────────────────────────────
    try:
        lat = float(body.get("lat", ""))
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "lat must be a valid number"}), 400
    try:
        lng = float(body.get("lng", ""))
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "lng must be a valid number"}), 400

    address = str(body.get("address", "")).strip()
    message = str(body.get("message", "")).strip()
    if not address:
        return jsonify({"success": False, "error": "address is required"}), 400
    if not message:
        return jsonify({"success": False, "error": "message is required"}), 400

    conversation_history = body.get("conversation_history", [])
    session_id           = body.get("session_id")

    # ── Auth (optional — extract if provided, skip if missing) ───────────────
    auth_header = request.headers.get("Authorization", "")
    auth_user = None
    if auth_header.startswith("Bearer "):
        from utils.auth import get_user_from_token
        token = auth_header.split(" ", 1)[1]
        auth_user = get_user_from_token(token)

    # ── User & Session (only if authenticated) ────────────────────────────────
    db_user = None
    db_session = None
    if auth_user:
        db_user = _get_or_create_user(
            auth_user["clerk_user_id"],
            auth_user.get("email", ""),
            auth_user.get("name", ""),
        )

        # Get or create chat session
        if session_id:
            db_session = ChatSession.query.get(session_id)
        if not db_session:
            db_session = ChatSession(
                id=str(uuid.uuid4()),
                user_id=db_user.id,
                property_address=address,
                lat=lat,
                lng=lng,
            )
            db.session.add(db_session)
            db.session.commit()
            session_id = db_session.id

        # Save user message
        user_msg = ChatMessage(
            id=str(uuid.uuid4()),
            session_id=db_session.id,
            role="user",
            content=message,
        )
        db.session.add(user_msg)
        db.session.commit()

    # ── Fetch all property data ───────────────────────────────────────────────
    nearby   = get_nearby_data(lat, lng)
    disaster = get_disaster_data(lat, lng)
    aqi      = get_airquality_data(lat, lng)
    vibe     = get_vibe_data(lat, lng, address)
    score    = get_score_data(lat, lng, address)

    # Past searches (if authenticated)
    past_searches_text = ""
    if db_user:
        past = (
            SearchHistory.query
            .filter_by(user_id=db_user.id)
            .order_by(SearchHistory.searched_at.desc())
            .limit(5)
            .all()
        )
        if past:
            lines = [f"- {s.address}" for s in past]
            past_searches_text = "\nUSER'S RECENT SEARCHES:\n" + "\n".join(lines)

    context = _build_context(address, lat, lng, nearby, disaster, aqi, vibe, score)
    if past_searches_text:
        context += past_searches_text

    # ── Call Gemini ───────────────────────────────────────────────────────────
    # Build a fallback_data dict so gemini.py can construct a natural message
    # if all retries are exhausted
    fallback_data = {
        "score_total":      score.get("total",            0)          if score   else None,
        "score_grade":      score.get("grade",            "N/A")      if score   else None,
        "flood_risk":       (disaster.get("flood_risk") or "").lower() if disaster else None,
        "elevation_metres": disaster.get("elevation_metres")           if disaster else None,
        "aqi_rating":       aqi.get("aqi_rating", aqi.get("rating"))   if aqi     else None,
        "pm25":             aqi.get("annual_avg_pm25")                  if aqi     else None,
        "vibe_tag":         vibe.get("vibe_tag")                       if vibe    else None,
    }

    reply = chat_with_context(
        system_context=context,
        history=conversation_history,
        new_message=message,
        fallback_data=fallback_data,
    )

    # ── Save AI reply & update search history (authenticated only) ────────────
    if db_user and db_session:
        ai_msg = ChatMessage(
            id=str(uuid.uuid4()),
            session_id=db_session.id,
            role="model",
            content=reply,
        )
        db.session.add(ai_msg)

        # Add to search history if not already searched today
        today = date.today()
        existing = SearchHistory.query.filter_by(
            user_id=db_user.id, address=address
        ).filter(
            db.func.date(SearchHistory.searched_at) == today
        ).first()
        if not existing:
            sh = SearchHistory(
                id=str(uuid.uuid4()),
                user_id=db_user.id,
                address=address,
                lat=lat,
                lng=lng,
            )
            db.session.add(sh)

        db.session.commit()

    # ── Update history ────────────────────────────────────────────────────────
    conversation_history = list(conversation_history)
    conversation_history.append({"role": "user",  "content": message})
    conversation_history.append({"role": "model", "content": reply})

    return jsonify({
        "success": True,
        "data": {
            "reply": reply,
            "conversation_history": conversation_history,
            "session_id": session_id,
        },
    })


# ── GET /api/chat/history ──────────────────────────────────────────────────────
@chat_bp.route("/chat/history", methods=["GET"])
@require_auth
def get_chat_history(auth_user):
    session_id = request.args.get("session_id")
    if not session_id:
        return jsonify({"success": False, "error": "session_id is required"}), 400

    session = ChatSession.query.get(session_id)
    if not session:
        return jsonify({"success": False, "error": "Session not found"}), 404

    # Verify ownership
    db_user = User.query.filter_by(clerk_user_id=auth_user["clerk_user_id"]).first()
    if not db_user or session.user_id != db_user.id:
        return jsonify({"success": False, "error": "Forbidden"}), 403

    messages = [
        {
            "role": msg.role,
            "content": msg.content,
            "created_at": msg.created_at.isoformat(),
        }
        for msg in sorted(session.messages, key=lambda m: m.created_at)
    ]

    return jsonify({"success": True, "data": {"messages": messages}})
