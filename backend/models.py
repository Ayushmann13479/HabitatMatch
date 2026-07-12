"""
models.py — SQLAlchemy ORM models for HabitatMatch.
db instance is created here and initialised in app.py via db.init_app(app).
"""

import uuid
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


# ── User ──────────────────────────────────────────────────────────────────────
class User(db.Model):
    __tablename__ = "users"

    id = db.Column(
        db.String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    clerk_user_id = db.Column(
        db.String(255), unique=True, nullable=False, index=True
    )
    email = db.Column(db.String(255), unique=True, nullable=False)
    name = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ── Search History ─────────────────────────────────────────────────────────────
class SearchHistory(db.Model):
    __tablename__ = "search_history"

    id = db.Column(
        db.String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    user_id = db.Column(
        db.String(36), db.ForeignKey("users.id"), nullable=False
    )
    address = db.Column(db.String(500), nullable=False)
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)
    searched_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref="searches")


# ── Saved Property ─────────────────────────────────────────────────────────────
class SavedProperty(db.Model):
    __tablename__ = "saved_properties"

    id = db.Column(
        db.String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    user_id = db.Column(
        db.String(36), db.ForeignKey("users.id"), nullable=False
    )
    address = db.Column(db.String(500), nullable=False)
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)
    notes = db.Column(db.Text, nullable=True)
    score_snapshot = db.Column(db.JSON, nullable=True)   # HabitatScore at time of save
    saved_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref="saved_properties")


# ── Chat Session ───────────────────────────────────────────────────────────────
class ChatSession(db.Model):
    __tablename__ = "chat_sessions"

    id = db.Column(
        db.String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    user_id = db.Column(
        db.String(36), db.ForeignKey("users.id"), nullable=False
    )
    property_address = db.Column(db.String(500), nullable=False)
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref="chat_sessions")


# ── Chat Message ───────────────────────────────────────────────────────────────
class ChatMessage(db.Model):
    __tablename__ = "chat_messages"

    id = db.Column(
        db.String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    session_id = db.Column(
        db.String(36), db.ForeignKey("chat_sessions.id"), nullable=False
    )
    role = db.Column(db.String(10), nullable=False)   # "user" or "model"
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    session = db.relationship("ChatSession", backref="messages")
