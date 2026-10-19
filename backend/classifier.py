"""
classifier.py
=============
Rice Harvest Maturity Classification via Roboflow Panicle Detection + HSV Analysis.

Architecture
------------
1.  Send image to the Roboflow serverless inference API to detect rice panicles
    using a pre-trained object detection model (rice-panicle-dataset/2).
2.  Crop each detected panicle region from the image.
3.  Run HSV colour analysis on each panicle to classify maturity:
    - High green ratio → Immature
    - Mixed green/golden → Nearly Mature
    - High golden/brown ratio → Ready for Harvest
4.  Aggregate per-panicle results into an overall field-level classification.
5.  Draw annotated bounding boxes on the image.

This module exposes a singleton ``PaddyClassifier`` with the same public
interface the rest of the codebase expects so that ``main.py`` stays
largely unchanged.
"""

import io
import os
import time
import base64
import logging
from typing import Optional

import cv2
import httpx
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Class labels
# ---------------------------------------------------------------------------
CLASS_NAMES = [
    "Immature",          # Index 0
    "Nearly_Mature",     # Index 1
    "Ready_for_Harvest", # Index 2
]

CLASS_DISPLAY_NAMES = {
    "Immature":          "Immature",
    "Nearly_Mature":     "Nearly Mature",
    "Ready_for_Harvest": "Ready for Harvest",
}

# ---------------------------------------------------------------------------
# Harvest advice shown to the farmer alongside the classification label
# ---------------------------------------------------------------------------
HARVEST_ADVICE = {
    "Immature": (
        "The paddy is still immature. Wait approximately 2–3 more weeks before "
        "harvesting. Premature harvesting causes high grain breakage and lower "
        "milling recovery."
    ),
    "Nearly_Mature": (
        "The paddy is nearly mature. Expect to harvest within 7–10 days. Monitor "
        "daily for golden colouring and start preparing your harvesting equipment."
    ),
    "Ready_for_Harvest": (
        "The paddy is ready for harvest! Harvest as soon as possible (within 1–2 "
        "days) to minimise field losses. Grain moisture should be around 20–25%."
    ),
}

# Colours for bounding box annotations (BGR for OpenCV)
LABEL_COLORS_BGR = {
    "Immature":          (0, 180, 0),      # Green
    "Nearly_Mature":     (0, 180, 255),    # Orange
    "Ready_for_Harvest": (0, 0, 220),      # Red
}

# Panicle detection model hosted on Roboflow (Tanisha Tasnuva, 5.5k images, CC BY 4.0)
PANICLE_MODEL_ID = "rice-panicle-dataset/2"
ROBOFLOW_INFER_URL = "https://detect.roboflow.com"

# Fallback: existing classification workflow
WORKSPACE_NAME = "markdaluson30-gmail-com"
WORKFLOW_ID = "rice-classification-t1-vrice-classification-t1-1-vit-base-patch16-224-in21k-t1-logic"
ROBOFLOW_WORKFLOW_URL = f"https://serverless.roboflow.com/{WORKSPACE_NAME}/workflows/{WORKFLOW_ID}"

# HSV thresholds for maturity classification of a single panicle crop
# Green hue range in HSV: roughly 25-85
# Golden/brown hue range: roughly 10-25
# These are tuned for rice panicle close-ups
GREEN_HUE_LOW, GREEN_HUE_HIGH = 25, 85
GOLDEN_HUE_LOW, GOLDEN_HUE_HIGH = 10, 25
MIN_SATURATION = 30
MIN_VALUE = 40


def _detect_panicles(image_bytes: bytes, api_key: str, confidence: float = 0.25) -> list[dict]:
    """
    Call the Roboflow object detection API to find rice panicles.

    Returns a list of detections, each with keys:
        x, y, width, height, confidence, class
    where (x, y) is the centre of the bounding box.
    """
    b64_image = base64.b64encode(image_bytes).decode("ascii")

    url = f"{ROBOFLOW_INFER_URL}/{PANICLE_MODEL_ID}"
    params = {
        "api_key": api_key,
        "confidence": str(confidence),
        "overlap": "30",
    }

    with httpx.Client() as client:
        response = client.post(
            url,
            params=params,
            content=b64_image,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=30.0,
        )
        response.raise_for_status()
        data = response.json()

    return data.get("predictions", [])


def _classify_panicle_hsv(crop_bgr: np.ndarray) -> tuple[str, float, float, float]:
    """
    Classify a single panicle crop by its HSV colour distribution.

    Returns (label_key, confidence, green_ratio, mature_ratio).
    """
    hsv = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2HSV)
    h, s, v = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]

    # Mask out dark/desaturated pixels (background, shadows)
    valid_mask = (s >= MIN_SATURATION) & (v >= MIN_VALUE)
    valid_count = np.count_nonzero(valid_mask)

    if valid_count < 50:
        return "Immature", 0.5, 1.0, 0.0

    h_valid = h[valid_mask]

    green_count = np.count_nonzero((h_valid >= GREEN_HUE_LOW) & (h_valid <= GREEN_HUE_HIGH))
    golden_count = np.count_nonzero((h_valid >= GOLDEN_HUE_LOW) & (h_valid < GREEN_HUE_LOW))

    green_ratio = green_count / valid_count
    mature_ratio = golden_count / valid_count

    if green_ratio >= 0.55:
        label_key = "Immature"
        confidence = 0.5 + (green_ratio - 0.55) * (0.5 / 0.45)
    elif mature_ratio >= 0.45:
        label_key = "Ready_for_Harvest"
        confidence = 0.5 + (mature_ratio - 0.45) * (0.5 / 0.55)
    else:
        label_key = "Nearly_Mature"
        confidence = 0.5 + abs(0.5 - green_ratio) * 0.5

    confidence = min(max(confidence, 0.3), 0.99)
    return label_key, round(confidence, 4), round(green_ratio, 4), round(mature_ratio, 4)


def _annotate_image(
    image_bytes: bytes,
    detections: list[dict],
    panicle_labels: list[str],
) -> bytes:
    """
    Draw bounding boxes and labels on the image for each detected panicle.
    Returns JPEG bytes of the annotated image.
    """
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        return image_bytes

    h_img, w_img = img.shape[:2]
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = max(0.4, min(h_img, w_img) / 1200)
    thickness = max(1, int(min(h_img, w_img) / 400))

    for det, label_key in zip(detections, panicle_labels):
        cx, cy = det["x"], det["y"]
        bw, bh = det["width"], det["height"]
        x1 = max(0, int(cx - bw / 2))
        y1 = max(0, int(cy - bh / 2))
        x2 = min(w_img, int(cx + bw / 2))
        y2 = min(h_img, int(cy + bh / 2))

        color = LABEL_COLORS_BGR.get(label_key, (200, 200, 200))
        cv2.rectangle(img, (x1, y1), (x2, y2), color, thickness + 1)

        display = CLASS_DISPLAY_NAMES.get(label_key, label_key)
        conf_pct = f"{det['confidence'] * 100:.0f}%"
        text = f"{display} ({conf_pct})"
        (tw, th), _ = cv2.getTextSize(text, font, font_scale, thickness)
        cv2.rectangle(img, (x1, y1 - th - 8), (x1 + tw + 4, y1), color, -1)
        cv2.putText(img, text, (x1 + 2, y1 - 4), font, font_scale, (255, 255, 255), thickness)

    _, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 90])
    return buf.tobytes()


def _call_workflow_api(
    image_bytes: bytes, api_key: str, max_retries: int = 3, backoff_factor: float = 1.0
) -> dict:
    """
    Fallback: call the original Roboflow workflow for whole-image classification.
    """
    b64_image = base64.b64encode(image_bytes).decode("ascii")
    payload = {
        "inputs": {
            "image": {"type": "base64", "value": b64_image}
        }
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }

    last_error = None
    with httpx.Client() as client:
        for attempt in range(max_retries):
            try:
                response = client.post(
                    ROBOFLOW_WORKFLOW_URL, json=payload, headers=headers, timeout=30.0
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                last_error = e
                if e.response.status_code < 500 and e.response.status_code != 429:
                    raise RuntimeError(
                        f"Workflow API returned {e.response.status_code}: {e.response.text}"
                    )
            except httpx.RequestError as e:
                last_error = e
            time.sleep(backoff_factor * (2 ** attempt))

    raise RuntimeError(f"Workflow API call failed after {max_retries} attempts. Last error: {last_error}")


class PaddyClassifier:
    """
    Singleton that holds the Roboflow config and exposes classify().
    """

    _instance: Optional["PaddyClassifier"] = None

    def __new__(cls) -> "PaddyClassifier":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._api_key = None
            cls._instance._ready = False
        return cls._instance

    def load(self, model_path: str = None) -> None:
        api_key = (os.getenv("ROBOFLOW_API_KEY") or "").strip()
        if not api_key or api_key == "your_roboflow_api_key_here":
            logger.warning(
                "ROBOFLOW_API_KEY is not configured. "
                "Set it in .env to enable the classification workflow."
            )
            self._ready = False
            return

        self._api_key = api_key
        self._ready = True
        logger.info(
            "Roboflow client configured — panicle model: %s, workflow fallback: %s",
            PANICLE_MODEL_ID, WORKFLOW_ID,
        )

    @property
    def ready(self) -> bool:
        return self._ready

    def classify(self, image_bytes: bytes) -> dict:
        """
        Detect panicles → classify each by HSV → aggregate → annotate.

        Falls back to the whole-image workflow if panicle detection finds nothing.
        """
        if not self._ready:
            raise RuntimeError(
                "Roboflow client is not initialised. "
                "Set ROBOFLOW_API_KEY in .env and restart the server."
            )

        # --- Step 1: detect panicles ---
        try:
            detections = _detect_panicles(image_bytes, self._api_key)
        except Exception as e:
            logger.warning("Panicle detection failed, falling back to workflow: %s", e)
            detections = []

        if not detections:
            logger.info("No panicles detected — falling back to whole-image workflow.")
            return self._classify_via_workflow(image_bytes)

        logger.info("Detected %d panicle(s), running HSV analysis on each.", len(detections))

        # --- Step 2: decode image for cropping ---
        arr = np.frombuffer(image_bytes, dtype=np.uint8)
        img_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img_bgr is None:
            raise RuntimeError("Failed to decode uploaded image.")
        h_img, w_img = img_bgr.shape[:2]

        # --- Step 3: classify each panicle ---
        panicle_details = []
        label_votes = {c: 0.0 for c in CLASS_NAMES}
        panicle_labels = []

        for i, det in enumerate(detections):
            cx, cy = det["x"], det["y"]
            bw, bh = det["width"], det["height"]
            x1 = max(0, int(cx - bw / 2))
            y1 = max(0, int(cy - bh / 2))
            x2 = min(w_img, int(cx + bw / 2))
            y2 = min(h_img, int(cy + bh / 2))

            crop = img_bgr[y1:y2, x1:x2]
            if crop.size == 0:
                continue

            label_key, conf, green_ratio, mature_ratio = _classify_panicle_hsv(crop)
            panicle_labels.append(label_key)

            det_conf = float(det.get("confidence", 0.5))
            label_votes[label_key] += det_conf

            panicle_details.append({
                "id": i + 1,
                "bbox": [x1, y1, x2, y2],
                "detection_conf": round(det_conf, 4),
                "green_ratio": green_ratio,
                "mature_ratio": mature_ratio,
                "label": CLASS_DISPLAY_NAMES[label_key],
                "label_key": label_key,
                "confidence": conf,
            })

        if not panicle_details:
            return self._classify_via_workflow(image_bytes)

        # --- Step 4: aggregate ---
        top_class = max(label_votes, key=label_votes.get)
        total_weight = sum(label_votes.values()) or 1.0
        probabilities = {k: round(v / total_weight, 4) for k, v in label_votes.items()}
        overall_confidence = probabilities[top_class]

        # --- Step 5: annotate image ---
        annotated_bytes = _annotate_image(image_bytes, detections, panicle_labels)

        return {
            "label":               CLASS_DISPLAY_NAMES.get(top_class, top_class),
            "label_key":           top_class,
            "confidence":          round(overall_confidence, 4),
            "probabilities":       probabilities,
            "advice":              HARVEST_ADVICE.get(top_class, ""),
            "panicle_count":       len(panicle_details),
            "panicle_details":     panicle_details,
            "annotated_image_b64": base64.b64encode(annotated_bytes).decode("ascii"),
        }

    def _classify_via_workflow(self, image_bytes: bytes) -> dict:
        """Fallback: use the original whole-image classification workflow."""
        try:
            result = _call_workflow_api(image_bytes, self._api_key)
        except Exception as e:
            logger.error("Roboflow workflow error: %s", e)
            raise RuntimeError(f"Classification failed: {e}")

        outputs = result.get("outputs", [])
        if not outputs:
            raise RuntimeError("Workflow API returned an empty output list.")

        predictions_data = outputs[0].get("predictions", {})
        top_class = predictions_data.get("top")
        confidence = float(predictions_data.get("confidence", 0.0))

        probabilities = {c: 0.0 for c in CLASS_NAMES}
        preds_array = predictions_data.get("predictions", [])
        for p in preds_array:
            class_name = p.get("class")
            if class_name == "Nearly Mature":
                class_name = "Nearly_Mature"
            elif class_name == "Ready for Harvest":
                class_name = "Ready_for_Harvest"
            if class_name in probabilities:
                probabilities[class_name] = float(p.get("confidence", 0.0))

        if top_class == "Nearly Mature":
            top_class = "Nearly_Mature"
        elif top_class == "Ready for Harvest":
            top_class = "Ready_for_Harvest"
        if top_class not in probabilities:
            top_class = "Immature"
        if probabilities[top_class] == 0.0:
            probabilities[top_class] = confidence

        total_prob = sum(probabilities.values())
        if total_prob > 0:
            probabilities = {k: round(v / total_prob, 4) for k, v in probabilities.items()}

        return {
            "label":               CLASS_DISPLAY_NAMES.get(top_class, top_class),
            "label_key":           top_class,
            "confidence":          round(confidence, 4),
            "probabilities":       probabilities,
            "advice":              HARVEST_ADVICE.get(top_class, ""),
            "panicle_count":       0,
            "panicle_details":     [],
            "annotated_image_b64": base64.b64encode(image_bytes).decode("ascii"),
        }


# ---------------------------------------------------------------------------
# Module-level singleton instance
# ---------------------------------------------------------------------------
classifier = PaddyClassifier()
