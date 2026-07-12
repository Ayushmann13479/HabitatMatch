"""
utils/gemini.py — Google Gemini 1.5 Flash AI helpers for HabitatMatch.

Provides:
  generate_json       — structured JSON generation with retry
  generate_text       — plain text generation
  chat_with_context   — stateful conversational chat with property data context,
                        retry logic, natural fallback, and logging
"""

import json
import logging
import re
import time
from datetime import datetime

import google.generativeai as genai
from config import GEMINI_API_KEY

# ── Logging ───────────────────────────────────────────────────────────────────
logger = logging.getLogger("habitatmatch.gemini")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

# ── Initialise Gemini ─────────────────────────────────────────────────────────
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-2.0-flash")


# ── Internal helpers ──────────────────────────────────────────────────────────
def clean_json_response(text: str) -> str:
    """Strip markdown code fences that Gemini sometimes adds."""
    text = re.sub(r"```json\s*", "", text)
    text = re.sub(r"```\s*", "", text)
    return text.strip()


def _is_quota_error(e: Exception) -> bool:
    err = str(e)
    return "429" in err or "ResourceExhausted" in err or "quota" in err.lower()


# ── Public API ────────────────────────────────────────────────────────────────
def generate_json(prompt: str, retry: bool = True):
    """
    Generate structured JSON from *prompt*.
    Returns a parsed dict/list on success, or None on failure.
    Handles quota exhaustion (429) with a single 5s retry.
    """
    if not GEMINI_API_KEY:
        return None

    full_prompt = (
        prompt
        + "\n\nIMPORTANT: Return ONLY raw JSON. No markdown. "
        "No backticks. No explanation. Just valid JSON."
    )

    def _try_once(p: str):
        response = model.generate_content(p)
        cleaned = clean_json_response(response.text)
        return json.loads(cleaned)

    try:
        return _try_once(full_prompt)
    except json.JSONDecodeError:
        if not retry:
            return None
        try:
            strict = (
                prompt
                + "\n\nCRITICAL: Return ONLY the raw JSON object. Nothing else."
            )
            return _try_once(strict)
        except Exception:
            return None
    except Exception as e:
        if _is_quota_error(e) and retry:
            time.sleep(5)
            try:
                return _try_once(full_prompt)
            except Exception:
                return None
        return None


def generate_text(prompt: str, max_words: int = 150) -> str | None:
    """
    Generate a short plain-text response from *prompt*.
    Returns the response string, or None on failure.
    Handles quota exhaustion with a 5s retry.
    """
    if not GEMINI_API_KEY:
        return None
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        if _is_quota_error(e):
            time.sleep(5)
            try:
                response = model.generate_content(prompt)
                return response.text.strip()
            except Exception:
                return None
        return None


# ── System instruction ────────────────────────────────────────────────────────
_SYSTEM_INSTRUCTION = """You are HabitatMatch AI — a sharp, honest, conversational property
intelligence assistant for Navi Mumbai. You have been given raw data about a specific property.
Your job is to help the user make a genuinely informed decision about it.

CORE BEHAVIOUR:
- Read the user's question carefully and answer *that specific question* — do not default to
  a generic property overview on every turn. If they ask about flood risk, talk about flood
  risk. If they ask about schools, focus on schools.
- Vary your sentence structure and opening phrase with every response. Never begin two
  consecutive answers with the same phrase. Avoid templates.
- When a question is ambiguous (e.g. "is it good?" with no qualifier), ask one concise
  clarifying question back — "Good for what — commuting, family living, investment?" —
  rather than giving a generic answer covering everything.
- If earlier messages in this conversation are relevant to what the user just asked, reference
  them naturally ("As I mentioned, the flood risk here is medium..." / "Building on what we
  discussed about connectivity..."). Show real memory.
- Never repeat the same property summary paragraph twice in a row. Rotate which specific
  data points you highlight based on the actual question.
- Express genuine uncertainty naturally: "the elevation data suggests low-moderate risk,
  though I'd recommend checking the CIDCO flood maps before committing" — not a robotic
  disclaimer tacked onto the end.

SCOPE:
- Answer questions grounded in the property data whenever it is directly relevant.
- For general property questions not covered by the data (e.g. "what should I check when
  visiting a flat in person?", mortgage questions, legal queries), give genuinely useful
  general advice from your own knowledge. You do not need to force every answer back to
  this property's specific numbers.
- Do not make up data points that are not in the context. Say "I don't have data on that
  for this location" when genuinely missing.

RESPONSE LENGTH:
- Simple yes/no questions or clarifications: 40–80 words.
- Standard single-topic questions: 80–150 words.
- Complex multi-part or comparison questions: 150–250 words.
- Match depth to the question. Do not pad short answers or truncate complex ones.

TONE: Direct, honest, slightly informal. Like a knowledgeable friend who has done the
research — not a bot reading from a template."""


def chat_with_context(
    system_context: str,
    history: list,
    new_message: str,
    fallback_data: dict | None = None,
) -> str:
    """
    Continue a property-aware conversational chat session.

    Args:
        system_context:  Structured raw property data string.
        history:         List of {role, content} dicts from prior turns.
        new_message:     The user's latest message.
        fallback_data:   Optional dict with key figures for the natural
                         fallback message if all retries fail.

    Returns the model's reply string. Never returns None — always provides
    a natural fallback if Gemini is unavailable.
    """
    if not GEMINI_API_KEY:
        return _natural_fallback(new_message, fallback_data)

    # Build Gemini history: system instruction + property data primer + conversation
    gemini_history = [
        {
            "role": "user",
            "parts": [
                f"{_SYSTEM_INSTRUCTION}\n\n"
                f"--- PROPERTY DATA (raw, use to construct your own answers) ---\n"
                f"{system_context}\n"
                f"--- END PROPERTY DATA ---"
            ],
        },
        {
            "role": "model",
            "parts": [
                "Got it — I have the raw data for this property loaded. "
                "Ask me anything and I'll give you a straight answer."
            ],
        },
    ]

    # Append prior conversation turns
    for msg in history:
        role = msg.get("role", "user")
        # Gemini uses "model" not "assistant"
        if role == "assistant":
            role = "model"
        gemini_history.append({"role": role, "parts": [msg.get("content", "")]})

    # ── Attempt with exponential backoff (up to 2 retries) ───────────────────
    max_attempts = 3
    for attempt in range(1, max_attempts + 1):
        try:
            chat     = model.start_chat(history=gemini_history)
            response = chat.send_message(new_message)
            return response.text.strip()

        except Exception as e:
            if _is_quota_error(e):
                if attempt < max_attempts:
                    wait = 2 ** attempt  # 2s, 4s
                    logger.warning(
                        "[QUOTA] Gemini rate-limited on attempt %d/%d — "
                        "retrying in %ds  (%s)",
                        attempt, max_attempts, wait, datetime.utcnow().isoformat(),
                    )
                    time.sleep(wait)
                else:
                    logger.error(
                        "[QUOTA] Gemini quota exhausted after %d attempts at %s. "
                        "Serving natural fallback.",
                        max_attempts, datetime.utcnow().isoformat(),
                    )
                    return _natural_fallback(new_message, fallback_data)
            else:
                logger.error(
                    "[ERROR] Gemini chat failed (non-quota): %s at %s",
                    str(e), datetime.utcnow().isoformat(),
                )
                return _natural_fallback(new_message, fallback_data)

    return _natural_fallback(new_message, fallback_data)


def _natural_fallback(question: str, data: dict | None) -> str:
    """
    Build a conversational fallback when Gemini is unavailable.
    Uses whatever raw figures are available; sounds like a real assistant
    acknowledging the limitation rather than a system error string.
    """
    if not data:
        return (
            "I'm having trouble generating a detailed response right now. "
            "The property data has been loaded correctly — try refreshing or "
            "asking again in a moment and I should be back."
        )

    parts = ["I'm having trouble pulling a full AI response right now, but here's what the data shows:"]

    score = data.get("score_total")
    grade = data.get("score_grade")
    if score is not None:
        parts.append(f"• HabitatScore: {score}/100 (Grade {grade})")

    flood = data.get("flood_risk")
    elev  = data.get("elevation_metres")
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

    parts.append("Give me a moment and try your question again — I'll give you a proper answer.")
    return "\n".join(parts)
