import cv2
import numpy as np
import pytest

from classifier import PoorImageError, band_label, check_image_quality, parse_maturity_response


def test_bands():
    assert band_label(0.10) == ("Immature", 0.9)
    assert band_label(0.90) == ("Ready_for_Harvest", 0.9)
    assert band_label(0.50) == ("Nearly_Mature", 1.0)
    assert band_label(0.35)[0] == "Nearly_Mature"
    assert band_label(0.65)[0] == "Nearly_Mature"


def test_parse_response():
    both = {"predictions": [{"class": "Mature", "confidence": 0.8}, {"class": "Immature", "confidence": 0.2}]}
    assert parse_maturity_response(both) == 0.8
    only_immature = {"predictions": [{"class": "Immature", "confidence": 0.7}]}
    assert parse_maturity_response(only_immature) == pytest.approx(0.3)
    with pytest.raises(ValueError):
        parse_maturity_response({"predictions": []})


def test_quality_guard():
    rng = np.random.default_rng(0)
    sharp = rng.integers(60, 255, (200, 200, 3), dtype=np.uint8)
    check_image_quality(sharp)  # no raise
    with pytest.raises(PoorImageError, match="dark"):
        check_image_quality(np.full((200, 200, 3), 10, np.uint8))
    with pytest.raises(PoorImageError, match="blurry"):
        check_image_quality(cv2.GaussianBlur(sharp, (51, 51), 0))


def test_quality_guard_ignores_resolution():
    # A full-size phone photo has a low per-pixel Laplacian even when it is sharp
    rng = np.random.default_rng(0)
    sharp = rng.integers(60, 255, (200, 150, 3), dtype=np.uint8)
    check_image_quality(cv2.resize(sharp, (1536, 2048), interpolation=cv2.INTER_LINEAR))
