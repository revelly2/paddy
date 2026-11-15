import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "ml"))
from evaluate import metrics, to_binary  # noqa: E402


def test_to_binary():
    assert to_binary("Ready_for_Harvest") == "Mature"
    assert to_binary("Nearly_Mature") == "Immature"
    assert to_binary("Immature") == "Immature"


def test_metrics():
    m = metrics(
        ["Mature", "Mature", "Immature", "Immature"],
        ["Mature", "Immature", "Immature", "Immature"],
        [0.9, 0.6, 0.8, 0.7],
    )
    assert m["accuracy"] == 0.75
    assert m["precision_mature"] == 1.0
    assert m["recall_mature"] == 0.5
    assert m["mean_confidence"] == pytest.approx(0.75)
    assert m["n"] == 4
    assert m["confusion"] == {"Immature": {"Immature": 2, "Mature": 0}, "Mature": {"Immature": 1, "Mature": 1}}


def test_metrics_no_mature_predictions():
    m = metrics(["Mature"], ["Immature"], [0.8])
    assert m["precision_mature"] == 0.0
    assert m["accuracy"] == 0.0
