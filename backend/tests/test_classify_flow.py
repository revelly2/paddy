import cv2
import httpx
import numpy as np
import pytest

import classifier as clf

BOX = {"x": 150, "y": 150, "width": 100, "height": 100, "confidence": 0.8, "class": "Rice-Panicle"}


def _jpeg(img: np.ndarray) -> bytes:
    ok, buf = cv2.imencode(".jpg", img)
    assert ok
    return buf.tobytes()


@pytest.fixture
def sharp_jpeg():
    rng = np.random.default_rng(1)
    return _jpeg(rng.integers(60, 255, (300, 300, 3), dtype=np.uint8))


@pytest.fixture
def paddy(monkeypatch):
    c = clf.PaddyClassifier()
    monkeypatch.setattr(c, "_ready", True)
    monkeypatch.setattr(c, "_api_key", "test-key")
    monkeypatch.setattr(c, "_maturity_model_id", "paddyscan-maturity/1")
    monkeypatch.setattr(clf, "_detect_panicles", lambda *a, **k: [dict(BOX)])
    monkeypatch.setattr(clf, "_call_workflow_api", lambda *a, **k: pytest.fail("workflow must not be called"))
    return c


def test_model_label_used(paddy, monkeypatch, sharp_jpeg):
    monkeypatch.setattr(clf, "_classify_maturity", lambda *a, **k: 0.9)
    result = paddy.classify(sharp_jpeg)
    assert result["label_key"] == "Ready_for_Harvest"
    assert result["confidence"] == 0.9
    assert result["panicle_count"] == 1


def test_model_failure_falls_back_to_hsv(paddy, monkeypatch, sharp_jpeg):
    def timeout(*a, **k):
        raise httpx.TimeoutException("slow")
    monkeypatch.setattr(clf, "_classify_maturity", timeout)
    result = paddy.classify(sharp_jpeg)
    img = cv2.imdecode(np.frombuffer(sharp_jpeg, np.uint8), cv2.IMREAD_COLOR)
    expected_label, *_ = clf._classify_panicle_hsv(img[100:200, 100:200])
    assert result["label_key"] == expected_label


def test_no_model_configured_is_old_behaviour(paddy, monkeypatch, sharp_jpeg):
    calls = []
    monkeypatch.setattr(clf, "_classify_maturity", lambda *a, **k: calls.append(a) or 0.9)
    monkeypatch.setattr(paddy, "_maturity_model_id", None)
    paddy.classify(sharp_jpeg)
    assert calls == []


def test_no_panicles_uses_model_result(paddy, monkeypatch, sharp_jpeg):
    monkeypatch.setattr(clf, "_detect_panicles", lambda *a, **k: [])
    monkeypatch.setattr(clf, "_classify_maturity", lambda *a, **k: 0.1)
    result = paddy.classify(sharp_jpeg)
    assert result["label_key"] == "Immature"
    assert result["panicle_count"] == 0
    assert result["panicle_details"] == []


def test_dark_photo_rejected(paddy):
    with pytest.raises(clf.PoorImageError):
        paddy.classify(_jpeg(np.zeros((300, 300, 3), np.uint8)))


def test_maturity_model_defaults_on_and_none_turns_it_off(monkeypatch):
    import classifier as c
    monkeypatch.setenv("ROBOFLOW_API_KEY", "test-key")
    monkeypatch.delenv("MATURITY_MODEL_ID", raising=False)
    c.classifier.load()
    assert c.classifier._maturity_model_id == c.MATURITY_MODEL_ID
    monkeypatch.setenv("MATURITY_MODEL_ID", "none")
    c.classifier.load()
    assert c.classifier._maturity_model_id is None
