"""
JANASEVA OS — AI Duplicate Detection Engine
Finds potential duplicate complaints based on:
1. Spatial proximity (Haversine formula within radius, e.g., 200m)
2. Semantic / lexical text similarity (Jaccard + Word N-grams)
3. Time proximity (within configurable hours, e.g., 72 hours)
"""
from __future__ import annotations

import math
import re
from datetime import datetime
from typing import Any


def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance in meters between two coordinates."""
    r = 6371000.0  # Earth's radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


def tokenize(text: str) -> set[str]:
    cleaned = re.sub(r"[^\w\s]", " ", text.lower())
    return {w for w in cleaned.split() if len(w) > 2}


def jaccard_similarity(text1: str, text2: str) -> float:
    tokens1 = tokenize(text1)
    tokens2 = tokenize(text2)
    if not tokens1 or not tokens2:
        return 0.0
    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    return len(intersection) / len(union)


class DuplicateDetector:
    def __init__(
        self,
        distance_threshold_meters: float = 250.0,
        text_similarity_threshold: float = 0.35,
        time_threshold_hours: float = 72.0,
    ) -> None:
        self.distance_threshold = distance_threshold_meters
        self.text_threshold = text_similarity_threshold
        self.time_threshold_hours = time_threshold_hours

    def find_duplicates(
        self,
        new_complaint: dict[str, Any],
        existing_complaints: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """
        Scans existing complaints to find duplicates of the new complaint.
        Returns sorted list of matches with duplicate score and reasoning.
        """
        matches = []
        new_lat = new_complaint.get("latitude")
        new_lon = new_complaint.get("longitude")
        new_text = f"{new_complaint.get('title', '')} {new_complaint.get('description', '')}"
        new_cat = new_complaint.get("category_code")
        new_time = new_complaint.get("created_at")
        if isinstance(new_time, str):
            try:
                new_time = datetime.fromisoformat(new_time.replace("Z", "+00:00"))
            except ValueError:
                new_time = None

        for existing in existing_complaints:
            # Skip if comparing same ID
            c1_id = new_complaint.get("id")
            c2_id = existing.get("id")
            if c1_id and c2_id and c1_id == c2_id:
                continue

            c1_cid = new_complaint.get("complaint_id")
            c2_cid = existing.get("complaint_id")
            if c1_cid and c2_cid and c1_cid == c2_cid:
                continue

            # Category check
            same_cat = bool(new_cat and existing.get("category_code") == new_cat)

            # Spatial check
            dist_meters = None
            spatial_match = False
            ex_lat = existing.get("latitude")
            ex_lon = existing.get("longitude")
            has_coords = (new_lat is not None and new_lon is not None and ex_lat is not None and ex_lon is not None)
            if has_coords:
                dist_meters = haversine_distance_meters(new_lat, new_lon, ex_lat, ex_lon)
                if dist_meters <= self.distance_threshold:
                    spatial_match = True
                else:
                    # Different physical locations cannot be duplicate civic issues
                    continue

            # Text check
            ex_text = f"{existing.get('title', '')} {existing.get('description', '')}"
            text_sim = jaccard_similarity(new_text, ex_text)

            # Time check
            time_match = True
            ex_time = existing.get("created_at")
            if isinstance(ex_time, str):
                try:
                    ex_time = datetime.fromisoformat(ex_time.replace("Z", "+00:00"))
                except ValueError:
                    ex_time = None

            if new_time and ex_time:
                diff_hours = abs((new_time - ex_time).total_seconds()) / 3600.0
                if diff_hours > self.time_threshold_hours:
                    time_match = False

            # Aggregate score
            score = 0.0
            reasons = []

            if spatial_match and dist_meters is not None:
                score += 0.45 * (1.0 - (dist_meters / self.distance_threshold))
                reasons.append(f"Located within {int(dist_meters)}m")

            if same_cat:
                score += 0.25
                reasons.append(f"Same category ({new_cat})")

            if text_sim >= self.text_threshold:
                score += 0.30 * (text_sim / 1.0)
                reasons.append(f"Text similarity {int(text_sim * 100)}%")

            if not time_match:
                score *= 0.5  # Decay if far apart in time

            if score >= 0.45:
                matches.append({
                    "existing_complaint_id": existing.get("complaint_id") or str(existing.get("id")),
                    "existing_title": existing.get("title"),
                    "duplicate_probability": round(min(score, 0.99), 2),
                    "distance_meters": round(dist_meters, 1) if dist_meters is not None else None,
                    "text_similarity": round(text_sim, 2),
                    "reasons": reasons,
                })

        matches.sort(key=lambda x: x["duplicate_probability"], reverse=True)
        return matches
