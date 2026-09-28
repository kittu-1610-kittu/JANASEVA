"""
JANASEVA OS — AI Complaint Classifier
Hybrid classifier: Keyword matching + Semantic heuristics + Department routing.
Can run standalone or integrate with LLM API.
"""
from __future__ import annotations

import re
from typing import Any

# Domain taxonomy
CATEGORIES = {
    "POTHOLE": {
        "keywords": ["pothole", "crater", "road cavity", "hole on road", "tar broken", "asphalt"],
        "department": "ROADS",
        "urgency": "MEDIUM",
        "weight": 1.2,
    },
    "ROAD_DAMAGE": {
        "keywords": ["broken road", "road cracked", "surface damaged", "divider broken", "speed breaker"],
        "department": "ROADS",
        "urgency": "MEDIUM",
        "weight": 1.0,
    },
    "WATER_LEAK": {
        "keywords": ["pipeline burst", "water leaking", "drinking water wasted", "main pipe broken", "water gushing"],
        "department": "WATER",
        "urgency": "HIGH",
        "weight": 1.3,
    },
    "WATER_SUPPLY": {
        "keywords": ["no water supply", "low pressure", "contaminated water", "dirty water", "murky water"],
        "department": "WATER",
        "urgency": "HIGH",
        "weight": 1.1,
    },
    "DRAINAGE": {
        "keywords": ["drain blockage", "sewage overflow", "gutter choked", "drain water flooding", "foul smell", "manhole", "sewer", "open manhole"],
        "department": "WATER",
        "urgency": "HIGH",
        "weight": 1.4,
    },
    "GARBAGE": {
        "keywords": ["garbage pile", "uncollected trash", "waste dump", "dustbin overflow", "rotten waste", "garbage", "heap of garbage", "garbage accumulating", "market waste"],
        "department": "WASTE",
        "urgency": "MEDIUM",
        "weight": 1.5,
    },
    "ILLEGAL_DUMP": {
        "keywords": ["dumping debris", "chemical waste", "plastic burning", "illegal waste disposal"],
        "department": "WASTE",
        "urgency": "HIGH",
        "weight": 1.2,
    },
    "STREETLIGHT": {
        "keywords": ["streetlight off", "dark street", "pole light not working", "bulb fused", "lamp post", "dark at night", "bulb broken"],
        "department": "ELEC",
        "urgency": "LOW",
        "weight": 1.2,
    },
    "TRANSFORMER": {
        "keywords": ["transformer sparking", "electric wire dangling", "short circuit", "voltage fluctuation", "power hazard", "transformer caught fire", "transformer"],
        "department": "ELEC",
        "urgency": "CRITICAL",
        "weight": 1.6,
    },
    "FLOOD": {
        "keywords": ["flood water", "inundation", "submerged houses", "monsoon overflow", "trapped by water", "flood"],
        "department": "FIRE",
        "urgency": "CRITICAL",
        "weight": 1.8,
    },
    "FIRE": {
        "keywords": ["building fire", "gas cylinder blast", "flames", "smoke rising", "blaze outbreak"],
        "department": "FIRE",
        "urgency": "CRITICAL",
        "weight": 2.0,
    },
    "MEDICAL": {
        "keywords": ["ambulance needed", "unconscious person", "outbreak of cholera", "epidemic", "food poisoning"],
        "department": "HEALTH",
        "urgency": "CRITICAL",
        "weight": 1.8,
    },
    "SAFETY": {
        "keywords": ["harassment", "robbery", "fight on street", "threat of violence", "suspicious activity"],
        "department": "POLICE",
        "urgency": "CRITICAL",
        "weight": 1.6,
    },
    "STRAY_ANIMAL": {
        "keywords": ["rabid dog", "dog biting", "aggressive cattle", "injured animal", "cow on highway"],
        "department": "ANIMAL",
        "urgency": "MEDIUM",
        "weight": 1.0,
    },
    "TREE_FALL": {
        "keywords": ["tree fallen", "branch hanging dangerously", "blocking road tree", "uprooted tree", "banyan tree", "uprooted", "tree"],
        "department": "ROADS",
        "urgency": "HIGH",
        "weight": 1.5,
    },
}

EMERGENCY_TRIGGERS = [
    "fire", "blast", "explosion", "drowning", "unconscious", "heart attack",
    "collapsed building", "electric wire touching water", "gas leak", "armed", "cylinder blast"
]


class ComplaintClassifier:
    """Offline deterministic and keyword-weighted classifier for complaints."""

    def __init__(self) -> None:
        self.categories = CATEGORIES
        self.emergency_triggers = set(EMERGENCY_TRIGGERS)

    def clean_text(self, text: str) -> str:
        text = text.lower()
        text = re.sub(r"[^\w\s]", " ", text)
        return " ".join(text.split())

    def classify(self, text: str, hint: str | None = None) -> dict[str, Any]:
        cleaned = self.clean_text(text)
        words = set(cleaned.split())

        scores: dict[str, float] = {}

        for cat_code, meta in self.categories.items():
            base_score = 0.0
            for kw in meta["keywords"]:
                if kw in cleaned:
                    base_score += len(kw.split()) * meta["weight"] * 2.0
                else:
                    for kw_word in kw.split():
                        if kw_word in words and len(kw_word) > 3:
                            base_score += 0.5 * meta["weight"]

            if hint and hint.upper() == cat_code:
                base_score += 3.0

            scores[cat_code] = base_score

        best_cat = max(scores, key=lambda k: scores[k])
        max_score = scores[best_cat]

        if max_score <= 0.0:
            best_cat = "ROAD_DAMAGE"
            confidence = 0.35
        else:
            confidence = min(0.92, 0.45 + (max_score / 15.0) * 0.45)

        meta = self.categories[best_cat]
        is_emergency = any(trigger in cleaned for trigger in self.emergency_triggers) or meta["urgency"] == "CRITICAL"

        urgency = "CRITICAL" if is_emergency else meta["urgency"]

        return {
            "category": best_cat,
            "department": meta["department"],
            "urgency": urgency,
            "confidence": round(confidence, 2),
            "is_emergency": is_emergency,
            "summary": f"Detected {best_cat.replace('_', ' ').lower()} issue routed to Department of {meta['department']}.",
        }


if __name__ == "__main__":
    clf = ComplaintClassifier()
    sample = "Big crater on the road near Market Circle, cars are getting stuck and damaged."
    res = clf.classify(sample)
    print("Sample:", sample)
    print("Result:", res)
