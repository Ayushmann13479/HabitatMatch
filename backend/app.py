"""
app.py — HabitatMatch Flask application entry point.
"""

import time
import logging

from flask import Flask, jsonify, request, g
from flask_cors import CORS
from flask_compress import Compress

import config
from models import db  # db instance defined in models.py

# ── App initialisation ────────────────────────────────────────────────────────
app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = config.DATABASE_URL or "sqlite:///dev.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Bind the db to this app
db.init_app(app)

# ── Response compression (gzip) ───────────────────────────────────────────────
Compress(app)

# ── CORS ──────────────────────────────────────────────────────────────────────
CORS(
    app,
    origins=[
        "http://localhost:3000",
        config.FRONTEND_URL,
        "https://habitatmatch.vercel.app",
    ],
    supports_credentials=True,
)

# ── Request timing middleware ─────────────────────────────────────────────────
@app.before_request
def start_timer():
    g.start = time.time()

@app.after_request
def log_request_time(response):
    duration = round((time.time() - g.start) * 1000)
    logging.info(
        f"[TIMING] {request.method} {request.path} "
        f"→ {response.status_code} in {duration}ms"
    )
    return response

# ── Blueprint imports (after app + db are ready) ───────────────────────────────
from routes.nearby import nearby_bp
from routes.disaster import disaster_bp
from routes.airquality import airquality_bp
from routes.vibe import vibe_bp
from routes.score import score_bp
from routes.chat import chat_bp
from routes.saved import saved_bp
from routes.cache import cache_bp

# ── Register blueprints ───────────────────────────────────────────────────────
app.register_blueprint(nearby_bp, url_prefix="/api")
app.register_blueprint(disaster_bp, url_prefix="/api")
app.register_blueprint(airquality_bp, url_prefix="/api")
app.register_blueprint(vibe_bp, url_prefix="/api")
app.register_blueprint(score_bp, url_prefix="/api")
app.register_blueprint(chat_bp, url_prefix="/api")
app.register_blueprint(saved_bp, url_prefix="/api")
app.register_blueprint(cache_bp, url_prefix="/api")


# ── Create DB tables on startup ───────────────────────────────────────────────
with app.app_context():
    try:
        db.create_all()
        print("[OK] Database tables ready")
    except Exception as e:
        print(f"[WARN] DB startup check skipped (will reconnect on request): {type(e).__name__}")

    # ── Safe column migration for score_snapshot ──────────────────────────────
    try:
        db.session.execute(db.text(
            "ALTER TABLE saved_properties ADD COLUMN IF NOT EXISTS score_snapshot JSONB"
        ))
        db.session.commit()
        print("[OK] score_snapshot column ready")
    except Exception as e:
        db.session.rollback()
        print(f"[WARN] score_snapshot migration skipped: {type(e).__name__}")


# ── Health endpoint ───────────────────────────────────────────────────────────
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify(
        {
            "success": True,
            "data": {
                "status": "ok",
                "service": "HabitatMatch API",
            },
        }
    )


# ── Run ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    debug = config.FLASK_ENV == "development"
    app.run(host="0.0.0.0", port=5000, debug=debug)
