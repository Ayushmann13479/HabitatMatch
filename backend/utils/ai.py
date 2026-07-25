"""
utils/ai.py — Groq (Llama 3.1 70B) AI helpers for HabitatMatch.

Provides:
  generate_json       — structured JSON generation with retry
  generate_text       — plain text generation
  chat_with_context   — stateful conversational chat with property data context,
                        retry logic, and logging
"""

import json
import logging
import re
import time

from groq import Groq
from config import GROQ_API_KEY

# ── Logging ───────────────────────────────────────────────────────────────────
logger = logging.getLogger("habitatmatch.ai")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

# ── Initialise Groq ──────────────────────────────────────────────────────────
client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
MODEL = "llama-3.3-70b-versatile"


# ── Internal helpers ──────────────────────────────────────────────────────────
def _sanitize_json_text(raw: str) -> str:
    """Strip markdown fences AND control characters that break json.loads().

    Groq's LLM occasionally emits literal newlines/tabs inside JSON string
    values (e.g. in a 'pros' list).  These are invalid per RFC 8259 §7 and
    cause json.JSONDecodeError.  We replace all C0 control chars (U+0000 –
    U+001F) with a space before parsing.
    """
    text = re.sub(r"```json\s*", "", raw)
    text = re.sub(r"```\s*", "", text)
    text = re.sub(r'[\x00-\x1f]+', ' ', text)
    return text.strip()


def _classify_error(exc: Exception) -> str:
    """Map a Groq SDK / network exception to a human-friendly error code."""
    name = type(exc).__name__
    msg = str(exc).lower()
    if 'timeout' in name.lower() or 'timeout' in msg:
        return 'TIMEOUT'
    if 'ratelimit' in name.lower() or '429' in msg or 'rate' in msg:
        return 'RATE_LIMITED'
    if 'authentication' in name.lower() or '401' in msg:
        return 'AUTH_FAILURE'
    return 'API_ERROR'


# ── Public API ────────────────────────────────────────────────────────────────
def generate_json(prompt: str, retry: bool = True):
    """
    Generate structured JSON from *prompt* using Groq's JSON mode.
    Returns a parsed dict/list on success, or None on failure.
    """
    if not client:
        logger.warning("[AI] generate_json skipped — no Groq client")
        return None

    full_prompt = (
        prompt
        + "\n\nCRITICAL: Return ONLY raw valid JSON. No markdown. "
        "No backticks. No explanation. Just the JSON object."
    )

    for attempt in range(1, 3 if retry else 2):
        try:
            logger.info("[AI] generate_json attempt %d — calling Groq (JSON mode)", attempt)
            response = client.chat.completions.create(
                model=MODEL,
                messages=[{"role": "user", "content": full_prompt}],
                response_format={"type": "json_object"},
                temperature=0.1,
                max_tokens=600,
                stream=False,
                timeout=15,
            )
            raw_text = response.choices[0].message.content
            cleaned = _sanitize_json_text(raw_text)
            try:
                return json.loads(cleaned)
            except json.JSONDecodeError as je:
                logger.error(
                    "[AI] generate_json parse failure (attempt %d): %s\n"
                    "[AI] RAW RESPONSE >>>\n%s\n<<< END RAW",
                    attempt, je, raw_text[:1000]
                )
                if attempt < (3 if retry else 2):
                    time.sleep(2)
                continue

        except Exception as e:
            err_code = _classify_error(e)
            logger.warning(
                "[AI] generate_json API error (attempt %d): [%s] %s",
                attempt, err_code, e
            )
            if attempt < (3 if retry else 2):
                time.sleep(3)

    logger.error("[AI] generate_json failed after all attempts")
    return None


def generate_text(prompt: str, max_words: int = 150) -> str | None:
    """
    Generate a short plain-text response from *prompt*.
    Returns the response string, or None on failure.
    """
    if not client:
        return None
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            max_tokens=200,
            stream=False,
            timeout=15,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.warning("[AI] generate_text error: %s", e)
        return None


def chat_with_context(
    system_context: str,
    history: list,
    new_message: str,
    fallback_data: dict | None = None,
) -> tuple[str, str | None]:
    """
    Continue a property-aware conversational chat session using Groq.

    Returns (reply_text, error_code).  error_code is None on success,
    or one of TIMEOUT / RATE_LIMITED / AUTH_FAILURE / API_ERROR on failure.
    """
    if not client:
        logger.warning("[AI] chat skipped — no Groq client")
        return _natural_fallback(new_message, fallback_data), "NO_CLIENT"

    messages = [{"role": "system", "content": system_context}]

    # Append prior conversation turns
    for msg in history:
        role = msg.get("role", "user")
        if role == "model":
            role = "assistant"
        messages.append({"role": role, "content": msg.get("content", "")})

    messages.append({"role": "user", "content": new_message})

    # ── Attempt with one retry ───────────────────────────────────────────────
    last_error_code = None
    for attempt in range(1, 3):
        try:
            logger.info("[AI] chat attempt %d/2 — calling Groq", attempt)
            response = client.chat.completions.create(
                model=MODEL,
                messages=messages,
                temperature=0.7,
                max_tokens=300,
                stream=False,
                timeout=15,
            )
            reply = response.choices[0].message.content.strip()
            logger.info("[AI] chat attempt %d/2 — success (%d chars)", attempt, len(reply))
            return reply, None
        except Exception as e:
            last_error_code = _classify_error(e)
            logger.warning(
                "[AI] chat error (attempt %d/2): [%s] %s",
                attempt, last_error_code, e
            )
            if attempt < 2:
                time.sleep(3)

    logger.error("[AI] chat failed after 2 attempts [%s] — serving fallback", last_error_code)
    return _natural_fallback(new_message, fallback_data), last_error_code


def _natural_fallback(question: str, data: dict | None) -> str:
    """
    Build a conversational fallback when the AI is unavailable.
    Sounds like a real assistant acknowledging the limitation.
    """
    if not data:
        return (
            "I'm having trouble generating a detailed response right now. "
            "The property data has been loaded correctly — try refreshing or "
            "asking again in a moment and I should be back."
        )

    parts = ["I'm having trouble pulling a full AI response right now, "
             "but here's what the data shows:"]

    score = data.get("score_total")
    grade = data.get("score_grade")
    if score is not None:
        parts.append(f"• HabitatScore: {score}/100 (Grade {grade})")

    flood = data.get("flood_risk")
    elev = data.get("elevation_metres")
    if flood:
        elev_str = f", elevation {elev}m" if elev is not None else ""
        parts.append(f"• Flood risk: {flood}{elev_str}")

    aqi = data.get("aqi_rating")
    pm25 = data.get("pm25")
    if aqi:
        pm_str = f" (PM2.5 ≈ {pm25} µg/m³)" if pm25 else ""
        parts.append(f"• Air quality: {aqi}{pm_str}")

    vibe = data.get("vibe_tag")
    if vibe:
        parts.append(f"• Neighbourhood vibe: {vibe}")

    parts.append("Give me a moment and try your question again — "
                 "I'll give you a proper answer.")
    return "\n".join(parts)
