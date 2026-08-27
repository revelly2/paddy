"""
classifier.py
=============
Singleton wrapper around the TensorFlow/Keras CNN model.

Why a singleton?
----------------
Loading a TensorFlow model from disk takes ~2-5 seconds.
By using a module-level singleton, the model is loaded once when the
FastAPI application starts, then reused for every prediction request —
avoiding per-request startup overhead.

This module is imported by main.py and exposes a single public function:
    classify_image(image_bytes: bytes) -> dict
"""

import io
import os
import logging
import numpy as np
from typing import Optional

import tensorflow as tf
from PIL import Image

# ---------------------------------------------------------------------------
# Re-use config from the ML component.
# The backend expects the ml/ directory to be on the Python path.
# Adjust sys.path in main.py if needed.
# ---------------------------------------------------------------------------
import sys
# Add the ml/ directory to path so we can import model_config
_ML_DIR = os.path.join(os.path.dirname(__file__), "..", "ml")
if os.path.isdir(_ML_DIR):
    sys.path.insert(0, os.path.abspath(_ML_DIR))

from model_config import (
    IMAGE_SIZE,
    CLASS_NAMES,
    CLASS_DISPLAY_NAMES,
    MODEL_SAVE_PATH,
)

logger = logging.getLogger(__name__)

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


class PaddyClassifier:
    """
    Singleton that holds the loaded Keras model and exposes classify().

    Attributes
    ----------
    model : tf.keras.Model  — loaded CNN
    _ready : bool           — True once model is successfully loaded
    """

    _instance: Optional["PaddyClassifier"] = None

    def __new__(cls) -> "PaddyClassifier":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._model = None
            cls._instance._ready = False
        return cls._instance

    def load(self, model_path: str = None) -> None:
        """
        Load the Keras model from disk.
        Called once at application startup (FastAPI lifespan event).

        Parameters
        ----------
        model_path : override default path from model_config.py
        """
        path = model_path or MODEL_SAVE_PATH

        if not os.path.isfile(path):
            logger.warning(
                "Model file not found at %s. "
                "The /classify endpoint will return 503 until the model is trained "
                "and placed at the expected path.",
                path,
            )
            self._ready = False
            return

        logger.info("Loading paddy CNN model from %s …", path)
        self._model = tf.keras.models.load_model(path)
        self._ready = True
        logger.info("Model loaded successfully. Ready for inference.")

    @property
    def ready(self) -> bool:
        return self._ready

    def _preprocess(self, image_bytes: bytes) -> np.ndarray:
        """
        Decode raw image bytes and preprocess for the CNN.

        Steps
        -----
        1. Decode bytes → PIL Image
        2. Convert to RGB (handles PNG alpha, grayscale)
        3. Resize to 224 × 224
        4. Normalise to [0, 1]
        5. Add batch dimension → (1, 224, 224, 3)

        Parameters
        ----------
        image_bytes : raw bytes of the uploaded image

        Returns
        -------
        np.ndarray of shape (1, 224, 224, 3), dtype float32
        """
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img = img.resize(IMAGE_SIZE, Image.BILINEAR)
        arr = np.array(img, dtype=np.float32) / 255.0
        return np.expand_dims(arr, axis=0)

    def classify(self, image_bytes: bytes) -> dict:
        """
        Run inference on raw image bytes.

        Parameters
        ----------
        image_bytes : raw uploaded image file bytes

        Returns
        -------
        dict with keys:
            label, label_key, confidence, probabilities, advice
        """
        if not self._ready:
            raise RuntimeError(
                "Model is not loaded. Train the model (python ml/train.py) and "
                "ensure MODEL_PATH in .env points to the saved .keras file."
            )

        img_array = self._preprocess(image_bytes)

        # Run inference — returns (1, 3) softmax probabilities
        preds = self._model.predict(img_array, verbose=0)[0]

        class_idx  = int(np.argmax(preds))
        label_key  = CLASS_NAMES[class_idx]
        label      = CLASS_DISPLAY_NAMES[label_key]
        confidence = float(preds[class_idx])

        probabilities = {
            cls: round(float(preds[i]), 4)
            for i, cls in enumerate(CLASS_NAMES)
        }

        return {
            "label":         label,
            "label_key":     label_key,
            "confidence":    round(confidence, 4),
            "probabilities": probabilities,
            "advice":        HARVEST_ADVICE[label_key],
        }


# ---------------------------------------------------------------------------
# Module-level singleton instance — import this in main.py
# ---------------------------------------------------------------------------
classifier = PaddyClassifier()
