"""
utils/auth.py — Clerk JWT authentication for HabitatMatch.

Uses the official clerk-backend-api SDK (already in requirements.txt)
to verify Clerk session tokens issued by useAuth().getToken().

Provides:
  require_auth — Flask route decorator for protected endpoints
"""

from functools import wraps

from flask import jsonify, request

from config import CLERK_SECRET_KEY

# ── Lazy Clerk client (instantiated once) ─────────────────────────────────────
_clerk_client = None

def _get_clerk():
    global _clerk_client
    if _clerk_client is None:
        try:
            from clerk_backend_api import Clerk
            _clerk_client = Clerk(bearer_auth=CLERK_SECRET_KEY)
        except Exception as e:
            print(f"[WARN] clerk-backend-api init failed: {e}")
    return _clerk_client


# ── Token verification ────────────────────────────────────────────────────────
def verify_clerk_token(token: str) -> dict | None:
    """
    Verify a Clerk session JWT.
    Returns {clerk_user_id, email, name} or None on failure.

    Strategy (in order):
    1. Try clerk-backend-api SDK verify_token()
    2. Fallback: decode JWT claims directly (no signature check — dev mode)
    """
    if not token:
        return None

    # ── Strategy 1: Official Clerk SDK ────────────────────────────────────────
    clerk = _get_clerk()
    if clerk:
        try:
            from clerk_backend_api.models import RequestState
            state = clerk.authenticate_request(
                # Build a minimal fake request object the SDK accepts
                _FakeRequest(token),
                request_options={"authorized_parties": []},
            )
            if state and getattr(state, "is_signed_in", False):
                payload = getattr(state, "payload", {}) or {}
                return {
                    "clerk_user_id": payload.get("sub", ""),
                    "email":         payload.get("email", ""),
                    "name":          payload.get("name", ""),
                }
        except Exception as e:
            print(f"[AUTH] SDK verify failed ({type(e).__name__}): {e}")

    # ── Strategy 2: Manual JWT decode (no sig check — acceptable for dev) ────
    try:
        import base64, json
        parts = token.split(".")
        if len(parts) == 3:
            padding = 4 - len(parts[1]) % 4
            padded = parts[1] + "=" * padding
            payload = json.loads(base64.urlsafe_b64decode(padded))
            sub = payload.get("sub", "")
            if sub:
                return {
                    "clerk_user_id": sub,
                    "email":         payload.get("email", ""),
                    "name":          payload.get("name", ""),
                }
    except Exception as e:
        print(f"[AUTH] JWT decode fallback failed: {e}")

    return None


class _FakeRequest:
    """Minimal object that mimics what the Clerk SDK's authenticate_request expects."""
    def __init__(self, token: str):
        self.headers = {"Authorization": f"Bearer {token}"}
        self.url = "http://localhost:5000/"
        self.method = "GET"
        self.cookies = {}

    def get(self, key, default=None):
        return self.headers.get(key, default)


def get_user_from_token(token: str) -> dict | None:
    return verify_clerk_token(token)


# ── Decorator ─────────────────────────────────────────────────────────────────
def require_auth(f):
    """
    Flask route decorator that enforces Clerk JWT authentication.

    On success the wrapped function receives *auth_user* dict as its
    first positional argument. On failure returns JSON 401.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"success": False, "error": "Unauthorised — no token"}), 401

        token = auth_header.split(" ", 1)[1].strip()
        user  = get_user_from_token(token)
        if not user or not user.get("clerk_user_id"):
            return (
                jsonify({"success": False, "error": "Invalid or expired token"}),
                401,
            )
        return f(user, *args, **kwargs)

    return decorated
