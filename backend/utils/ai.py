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
def clean_json_response(text: str) -> str:
    """Strip markdown code fences that the model sometimes adds."""
    text = re.sub(r"```json\s*", "", text)
    text = re.sub(r"```\s*", "", text)
    return text.strip()


# ── Public API ────────────────────────────────────────────────────────────────
def generate_json(prompt: str, retry: bool = True):
    """
    Generate structured JSON from *prompt*.
    Returns a parsed dict/list on success, or None on failure.
    """
    if not client:
        return None

    full_prompt = (
        prompt
        + "\n\nCRITICAL: Return ONLY raw valid JSON. No markdown. "
        "No backticks. No explanation. Just the JSON object."
    )

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": full_prompt}],
            temperature=0.1,
            max_tokens=600,
            stream=False,
        )
        text = response.choices[0].message.content
        cleaned = clean_json_response(text)
        return json.loads(cleaned)
    except json.JSONDecodeError:
        if not retry:
            return None
        time.sleep(2)
        try:
            retry_prompt = (
                prompt
                + "\n\nYour last response was not valid JSON. "
                "Return ONLY the raw JSON object. Nothing else at all."
            )
            response = client.chat.completions.create(
                model=MODEL,
                messages=[{"role": "user", "content": retry_prompt}],
                temperature=0.1,
                max_tokens=600,
                stream=False,
            )
            text = response.choices[0].message.content
            cleaned = clean_json_response(text)
            return json.loads(cleaned)
        except Exception as e:
            logger.warning("[AI] JSON retry failed: %s", e)
            return None
    except Exception as e:
        logger.warning("[AI] generate_json error: %s", e)
        if retry:
            time.sleep(3)
            return generate_json(prompt, retry=False)
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
) -> str:
    """
    Continue a property-aware conversational chat session using Groq.

    Uses the OpenAI-compatible message format with a proper "system" role
    for the system prompt, which is the correct approach for Groq/Llama.
    """
    if not client:
        return _natural_fallback(new_message, fallback_data)

    messages = [{"role": "system", "content": system_context}]

    # Append prior conversation turns
    for msg in history:
        role = msg.get("role", "user")
        if role == "model":
            role = "assistant"
        messages.append({"role": role, "content": msg.get("content", "")})

    messages.append({"role": "user", "content": new_message})

    # ── Attempt with one retry ───────────────────────────────────────────────
    for attempt in range(1, 3):
        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=messages,
                temperature=0.7,
                max_tokens=300,
                stream=False,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.warning(
                "[AI] chat error (attempt %d/2): %s", attempt, e
            )
            if attempt < 2:
                time.sleep(3)

    logger.error("[AI] chat failed after 2 attempts — serving fallback")
    return _natural_fallback(new_message, fallback_data)


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
