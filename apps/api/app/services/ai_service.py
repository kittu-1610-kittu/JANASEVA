"""
JANASEVA OS — AI Classification & RAG Service
Uses Google Gemini. Falls back to deterministic rules if API key is missing.
"""
from __future__ import annotations

import json
import time
from typing import Any

from app.core.config import get_settings
from app.core.exceptions import AIServiceException
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "POTHOLE": ["pothole", "hole", "crater", "road damage", "dug up"],
    "WATER_LEAK": ["leak", "burst", "pipe", "water", "flooding road"],
    "GARBAGE": ["garbage", "waste", "trash", "rubbish", "dump", "sanitation"],
    "STREETLIGHT": ["light", "lamp", "dark", "streetlight", "illumination"],
    "DRAINAGE": ["drain", "sewage", "blocked", "overflow", "waterlogging"],
    "MANHOLE": ["manhole", "open hole", "cover missing"],
    "FLOOD": ["flood", "inundation", "submerged", "waterlogged"],
    "FIRE": ["fire", "smoke", "burning", "blaze"],
    "MEDICAL": ["medical", "hospital", "ambulance", "injury", "sick"],
    "SAFETY": ["violence", "threat", "danger", "crime", "assault"],
    "STRAY_ANIMAL": ["dog", "stray", "animal", "cattle"],
    "ILLEGAL_CONST": ["construction", "encroachment", "illegal building"],
    "TREE_FALL": ["tree", "fallen", "branch", "timber"],
    "ROAD_DAMAGE": ["road crack", "broken road", "damaged road"],
}

CATEGORY_TO_DEPT: dict[str, str] = {
    "POTHOLE": "ROADS", "ROAD_DAMAGE": "ROADS", "TREE_FALL": "ROADS",
    "WATER_LEAK": "WATER", "WATER_SUPPLY": "WATER", "DRAINAGE": "WATER", "MANHOLE": "WATER",
    "GARBAGE": "WASTE", "ILLEGAL_DUMP": "WASTE",
    "STREETLIGHT": "ELEC", "TRANSFORMER": "ELEC",
    "MEDICAL": "HEALTH", "EPIDEMIC": "HEALTH",
    "SAFETY": "POLICE",
    "STRAY_ANIMAL": "ANIMAL",
    "FIRE": "FIRE", "FLOOD": "FIRE",
    "ILLEGAL_CONST": "PLANNING",
}


def _deterministic_classify(text: str) -> dict[str, Any]:
    """
    Rule-based fallback classifier when Gemini is unavailable.
    Returns same schema as Gemini response.
    """
    text_lower = text.lower()
    best_category = "ROAD_DAMAGE"
    best_score = 0

    for category, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > best_score:
            best_score = score
            best_category = category

    confidence = min(0.5 + best_score * 0.1, 0.85) if best_score > 0 else 0.3
    dept = CATEGORY_TO_DEPT.get(best_category, "ROADS")

    return {
        "category": best_category,
        "subcategory": None,
        "department": dept,
        "summary": f"Issue appears to be related to {best_category.replace('_', ' ').lower()}.",
        "urgency_suggestion": "HIGH" if best_category in ("FLOOD", "FIRE", "MEDICAL", "SAFETY") else "MEDIUM",
        "confidence": confidence,
        "_source": "deterministic_fallback",
    }


def _parse_gemini_response(raw: str) -> dict[str, Any]:
    """Extract JSON from Gemini response, handle markdown code fences."""
    raw = raw.strip()
    if "```json" in raw:
        raw = raw.split("```json")[1].split("```")[0].strip()
    elif "```" in raw:
        raw = raw.split("```")[1].split("```")[0].strip()
    return json.loads(raw)


class AIClassificationService:
    """
    Classifies complaint text using Gemini.
    Falls back to deterministic rules if API key is absent or call fails.
    All AI output is validated before use — no arbitrary DB mutations.
    """

    SYSTEM_PROMPT = """You are a complaint classification assistant for a district government platform.
Classify the complaint and return ONLY valid JSON in this exact schema:
{
  "category": "<ONE_OF: POTHOLE|ROAD_DAMAGE|WATER_LEAK|WATER_SUPPLY|DRAINAGE|GARBAGE|ILLEGAL_DUMP|STREETLIGHT|TRANSFORMER|MEDICAL|EPIDEMIC|SAFETY|STRAY_ANIMAL|FIRE|FLOOD|ILLEGAL_CONST|TREE_FALL|MANHOLE>",
  "subcategory": "<string or null>",
  "department": "<ONE_OF: ROADS|WATER|WASTE|ELEC|HEALTH|POLICE|ANIMAL|FIRE|PLANNING>",
  "summary": "<one sentence summary of the issue>",
  "urgency_suggestion": "<ONE_OF: CRITICAL|HIGH|MEDIUM|LOW>",
  "confidence": <float 0.0-1.0>
}
Return ONLY the JSON object. No explanation, no markdown.
"""

    async def classify(
        self,
        text: str,
        category_hint: str | None = None,
        image_url: str | None = None,
    ) -> dict[str, Any]:
        if not settings.gemini_api_key:
            logger.warning("ai.classify.no_api_key — using deterministic fallback")
            return _deterministic_classify(text)

        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.gemini_api_key)
            model = genai.GenerativeModel(settings.gemini_model)

            prompt = self.SYSTEM_PROMPT
            user_msg = f"Complaint text:\n{text}"
            if category_hint:
                user_msg += f"\n\nCitizen's category hint: {category_hint}"

            t0 = time.perf_counter()
            response = model.generate_content(
                [prompt, user_msg],
                generation_config=genai.GenerationConfig(
                    temperature=settings.ai_temperature,
                    max_output_tokens=256,
                ),
            )
            latency_ms = int((time.perf_counter() - t0) * 1000)

            raw_text = response.text
            result = _parse_gemini_response(raw_text)

            # Validate required fields
            required = {"category", "department", "summary", "confidence", "urgency_suggestion"}
            if not required.issubset(result.keys()):
                raise ValueError(f"Missing required fields: {required - result.keys()}")

            # Clamp confidence
            result["confidence"] = max(0.0, min(1.0, float(result["confidence"])))
            result["_source"] = "gemini"
            result["_latency_ms"] = latency_ms

            logger.info(
                "ai.classify.success",
                category=result["category"],
                confidence=result["confidence"],
                latency_ms=latency_ms,
            )
            return result

        except Exception as exc:
            logger.warning("ai.classify.failed", error=str(exc), fallback=True)
            return _deterministic_classify(text)

    async def get_embedding(self, text: str) -> list[float] | None:
        """Generate text embedding for duplicate detection / RAG."""
        if not settings.gemini_api_key:
            return None
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.gemini_api_key)
            result = genai.embed_content(
                model=f"models/{settings.gemini_embedding_model}",
                content=text,
                task_type="retrieval_document",
            )
            return result["embedding"]
        except Exception as exc:
            logger.warning("ai.embedding.failed", error=str(exc))
            return None
