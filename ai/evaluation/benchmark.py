"""
JANASEVA OS — AI Benchmark & Evaluation Suite
Runs automated accuracy, precision, and latency evaluation over synthetic test set.
"""
from __future__ import annotations

import os
import sys
import time
from typing import Any

# Ensure workspace root and apps/api are in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../apps/api")))

from ai.complaint_classifier.classifier import ComplaintClassifier
from ai.duplicate_detection.detector import DuplicateDetector

TEST_DATASET = [
    {
        "text": "Deep pothole right in front of government school on Main Road. Motorcyclists falling down.",
        "expected_category": "POTHOLE",
        "expected_dept": "ROADS",
    },
    {
        "text": "Drinking water main pipeline burst near Bus Stand. Thousands of liters flowing on street.",
        "expected_category": "WATER_LEAK",
        "expected_dept": "WATER",
    },
    {
        "text": "Streetlight bulb broken on 5th Cross Gandhi Nagar, total dark at night causing safety fear.",
        "expected_category": "STREETLIGHT",
        "expected_dept": "ELEC",
    },
    {
        "text": "Huge heap of rotten garbage accumulating near vegetable market, stray dogs and foul smell.",
        "expected_category": "GARBAGE",
        "expected_dept": "WASTE",
    },
    {
        "text": "Open manhole cover stolen near children park, serious danger of kids falling into sewer.",
        "expected_category": "DRAINAGE",
        "expected_dept": "WATER",
    },
    {
        "text": "Monsoon flood water entered ground floor houses in low-lying area Ward 14, families stranded.",
        "expected_category": "FLOOD",
        "expected_dept": "FIRE",
    },
    {
        "text": "Electric transformer caught fire with loud explosion and sparking wires.",
        "expected_category": "TRANSFORMER",
        "expected_dept": "ELEC",
    },
    {
        "text": "Old banyan tree uprooted by cyclone wind, completely blocking ambulance route.",
        "expected_category": "TREE_FALL",
        "expected_dept": "ROADS",
    },
]


def run_benchmark() -> dict[str, Any]:
    classifier = ComplaintClassifier()
    total = len(TEST_DATASET)
    correct_category = 0
    correct_dept = 0
    latencies = []

    for item in TEST_DATASET:
        t0 = time.perf_counter()
        result = classifier.classify(item["text"])
        latencies.append((time.perf_counter() - t0) * 1000)

        if result["category"] == item["expected_category"]:
            correct_category += 1
        if result["department"] == item["expected_dept"]:
            correct_dept += 1

    cat_accuracy = correct_category / total
    dept_accuracy = correct_dept / total
    avg_latency = sum(latencies) / len(latencies)

    # Test Duplicate Detector
    detector = DuplicateDetector(distance_threshold_meters=200.0)
    c1 = {"id": "1", "title": "Pothole on Main Rd", "description": "Big pothole", "latitude": 17.385, "longitude": 78.486, "category_code": "POTHOLE"}
    c2 = {"id": "2", "title": "Crater on Main Road", "description": "Large road hole", "latitude": 17.3851, "longitude": 78.4861, "category_code": "POTHOLE"}
    dups = detector.find_duplicates(c1, [c2])
    dup_pass = len(dups) > 0 and dups[0]["duplicate_probability"] >= 0.5

    report = {
        "dataset_size": total,
        "category_accuracy": round(cat_accuracy * 100, 1),
        "department_routing_accuracy": round(dept_accuracy * 100, 1),
        "avg_latency_ms": round(avg_latency, 2),
        "duplicate_detection_pass": dup_pass,
        "status": "PASS" if cat_accuracy >= 0.85 and dept_accuracy >= 0.85 and dup_pass else "FAIL",
    }
    return report


if __name__ == "__main__":
    report = run_benchmark()
    print("=== AI BENCHMARK REPORT ===")
    for k, v in report.items():
        print(f"{k}: {v}")
