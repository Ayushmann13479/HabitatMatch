"""
routes/saved.py — Saved properties CRUD for authenticated users.

POST   /api/saved       — Save (or update) a property with score snapshot
GET    /api/saved       — List all saved properties
DELETE /api/saved/<id>  — Remove a saved property
"""

import uuid
from datetime import datetime

from flask import Blueprint, jsonify, request

from models import SavedProperty, User, db
from utils.auth import require_auth

saved_bp = Blueprint("saved", __name__)


def _get_or_create_db_user(clerk_user_id: str) -> User:
    """
    Return the DB user for this Clerk ID, creating it on first access.
    This allows saving properties without having chatted first.
    """
    user = User.query.filter_by(clerk_user_id=clerk_user_id).first()
    if not user:
        user = User(
            id             = str(uuid.uuid4()),
            clerk_user_id  = clerk_user_id,
            email          = "",
            name           = "",
            created_at     = datetime.utcnow(),
        )
        db.session.add(user)
        db.session.commit()
    return user


def _serialize(p: SavedProperty) -> dict:
    return {
        "id":             p.id,
        "address":        p.address,
        "lat":            p.lat,
        "lng":            p.lng,
        "notes":          p.notes,
        "score_snapshot": p.score_snapshot,
        "saved_at":       p.saved_at.isoformat(),
    }


# ── POST /api/saved ───────────────────────────────────────────────────────────
@saved_bp.route("/saved", methods=["POST"])
@require_auth
def save_property(auth_user):
    body = request.get_json(silent=True) or {}

    # ── Validate required fields ──────────────────────────────────────────────
    address = str(body.get("address", "")).strip()
    if not address:
        return jsonify({"success": False, "error": "address is required"}), 400
    try:
        lat = float(body["lat"])
        lng = float(body["lng"])
    except (KeyError, TypeError, ValueError):
        return jsonify({"success": False, "error": "lat and lng are required floats"}), 400

    notes          = str(body.get("notes", "")).strip() or None
    score_snapshot = body.get("score_snapshot")   # May be None — that's OK

    # ── Resolve DB user (auto-create if first visit) ─────────────────────────
    db_user = _get_or_create_db_user(auth_user["clerk_user_id"])

    # ── Upsert: check for existing save at same coordinates (4 dp) ────────────
    lat_r = round(lat, 4)
    lng_r = round(lng, 4)
    existing = (
        SavedProperty.query
        .filter_by(user_id=db_user.id)
        .filter(
            db.func.round(db.cast(SavedProperty.lat, db.Numeric), 4) == lat_r,
            db.func.round(db.cast(SavedProperty.lng, db.Numeric), 4) == lng_r,
        )
        .first()
    )

    if existing:
        # Update existing record
        existing.address        = address
        existing.notes          = notes
        existing.score_snapshot = score_snapshot
        existing.saved_at       = datetime.utcnow()
        db.session.commit()
        return jsonify({"success": True, "data": _serialize(existing)})

    # ── Create new record ─────────────────────────────────────────────────────
    prop = SavedProperty(
        id             = str(uuid.uuid4()),
        user_id        = db_user.id,
        address        = address,
        lat            = lat,
        lng            = lng,
        notes          = notes,
        score_snapshot = score_snapshot,
    )
    db.session.add(prop)
    db.session.commit()

    return jsonify({"success": True, "data": _serialize(prop)}), 201


# ── GET /api/saved ────────────────────────────────────────────────────────────
@saved_bp.route("/saved", methods=["GET"])
@require_auth
def list_saved(auth_user):
    db_user = _get_or_create_db_user(auth_user["clerk_user_id"])

    props = (
        SavedProperty.query
        .filter_by(user_id=db_user.id)
        .order_by(SavedProperty.saved_at.desc())
        .all()
    )

    return jsonify({
        "success": True,
        "data": {
            "properties": [_serialize(p) for p in props]
        },
    })


# ── DELETE /api/saved/<id> ────────────────────────────────────────────────────
@saved_bp.route("/saved/<string:prop_id>", methods=["DELETE"])
@require_auth
def delete_saved(auth_user, prop_id):
    db_user = _get_or_create_db_user(auth_user["clerk_user_id"])

    prop = SavedProperty.query.get(prop_id)
    if not prop:
        return jsonify({"success": False, "error": "Property not found"}), 404
    if prop.user_id != db_user.id:
        return jsonify({"success": False, "error": "Forbidden"}), 403

    db.session.delete(prop)
    db.session.commit()
    return jsonify({"success": True, "data": {"deleted": prop_id}})
