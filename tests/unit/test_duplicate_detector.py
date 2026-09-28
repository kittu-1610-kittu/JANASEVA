"""
JANASEVA OS — Unit Tests: Duplicate Detection Engine
"""
from __future__ import annotations

from ai.duplicate_detection.detector import DuplicateDetector, haversine_distance_meters


def test_haversine_same_point():
    d = haversine_distance_meters(17.385, 78.486, 17.385, 78.486)
    assert d < 0.01


def test_haversine_nearby_points():
    # 0.001 deg is approx 110 meters
    d = haversine_distance_meters(17.385, 78.486, 17.386, 78.486)
    assert 100 < d < 125


def test_duplicate_detected_within_radius():
    detector = DuplicateDetector(distance_threshold_meters=200.0)
    c1 = {
        "id": "c1",
        "title": "Large pothole on 4th street",
        "description": "Deep road hole dangerous for bikes",
        "latitude": 17.385,
        "longitude": 78.486,
        "category_code": "POTHOLE",
    }
    c2 = {
        "id": "c2",
        "title": "Road pothole 4th street",
        "description": "Big crater on road",
        "latitude": 17.3852,
        "longitude": 78.4861,
        "category_code": "POTHOLE",
    }

    matches = detector.find_duplicates(c1, [c2])
    assert len(matches) == 1
    assert matches[0]["duplicate_probability"] >= 0.5
    assert matches[0]["existing_complaint_id"] == "c2"


def test_distant_complaints_not_duplicate():
    detector = DuplicateDetector(distance_threshold_meters=200.0)
    c1 = {
        "id": "c1",
        "title": "Broken pipe",
        "latitude": 17.385,
        "longitude": 78.486,
        "category_code": "WATER_LEAK",
    }
    c2 = {
        "id": "c2",
        "title": "Broken pipe",
        "latitude": 17.485,  # ~11 km away
        "longitude": 78.486,
        "category_code": "WATER_LEAK",
    }

    matches = detector.find_duplicates(c1, [c2])
    assert len(matches) == 0
