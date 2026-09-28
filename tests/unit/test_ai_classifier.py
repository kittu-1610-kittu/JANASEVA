"""
JANASEVA OS — Unit Tests: AI Complaint Classification
"""
from __future__ import annotations

from ai.complaint_classifier.classifier import ComplaintClassifier


def test_pothole_classification():
    clf = ComplaintClassifier()
    res = clf.classify("Severe pothole on high speed ring road")
    assert res["category"] == "POTHOLE"
    assert res["department"] == "ROADS"
    assert res["confidence"] >= 0.5


def test_water_leak_classification():
    clf = ComplaintClassifier()
    res = clf.classify("Drinking water pipeline burst and flooding the lane")
    assert res["category"] == "WATER_LEAK"
    assert res["department"] == "WATER"


def test_emergency_trigger_sets_critical():
    clf = ComplaintClassifier()
    res = clf.classify("Electric transformer explosion with flames and fire")
    assert res["is_emergency"] is True
    assert res["urgency"] == "CRITICAL"


def test_fallback_with_unknown_text():
    clf = ComplaintClassifier()
    res = clf.classify("asdkfjhasdf random nonsense string 12345")
    assert res["category"] in clf.categories
    assert res["confidence"] <= 0.5
