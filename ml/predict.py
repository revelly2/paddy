"""
predict.py
==========
CLI inference script for the Paddy Rice CNN.
Used by the FastAPI backend (via subprocess) or standalone for testing.

Usage
-----
    python predict.py <image_path>

    # Example:
    python predict.py ./sample_images/paddy_test.jpg

Output (JSON printed to stdout)
--------------------------------
    {
      "label":      "Ready for Harvest",
      "label_key":  "Ready_for_Harvest",
      "confidence": 0.9341,
      "probabilities": {
        "Immature":          0.0212,
        "Nearly_Mature":     0.0447,
        "Ready_for_Harvest": 0.9341
      },
      "advice": "The paddy is ready for harvest. Harvest within 1–2 days ...",
      "image_path": "/path/to/image.jpg"
    }

Notes
-----
- The model is loaded once and inference runs in ~100 ms on CPU.
- This script is deliberately kept thin so the backend classifier.py
  can import the core logic as a library function too.
"""

import sys
import json
import os
import numpy as np

# ---------------------------------------------------------------------------
# Suppress TensorFlow logging noise before importing
# ---------------------------------------------------------------------------
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
import tensorflow as tf

from PIL import Image
from model_config import (
    IMAGE_SIZE,
    CLASS_NAMES,
    CLASS_DISPLAY_NAMES,
    NUM_CLASSES,
    MODEL_SAVE_PATH,
)


# ---------------------------------------------------------------------------
# Harvest advice strings — shown to the farmer after classification
# ---------------------------------------------------------------------------
HARVEST_ADVICE = {
    "Immature": (
        "The paddy is still immature. "
        "Wait approximately 2–3 more weeks before harvesting. "
        "Premature harvesting results in high grain breakage and lower milling recovery."
    ),
    "Nearly_Mature": (
        "The paddy is nearly mature. "
        "Expect to harvest within 7–10 days. "
        "Monitor daily for golden coloring and begin preparing harvesting equipment."
    ),
    "Ready_for_Harvest": (
        "The paddy is ready for harvest! "
        "Harvest as soon as possible (ideally within 1–2 days) to minimise field losses. "
        "Grain moisture content should be around 20–25% at this stage."
    ),
}


def load_model(model_path: str = MODEL_SAVE_PATH) -> tf.keras.Model:
    """
    Load the trained Keras model from disk.

    Parameters
    ----------
    model_path : path to the .keras model file

    Returns
    -------
    Loaded Keras model
    """
    if not os.path.isfile(model_path):
        raise FileNotFoundError(
            f"Model not found at: {model_path}\n"
            "Please train the model first by running:  python train.py"
        )
    model = tf.keras.models.load_model(model_path)
    return model


def preprocess_image(image_path: str) -> np.ndarray:
    """
    Load and preprocess a single image for inference.

    Pipeline
    --------
    1. Open image with Pillow (handles JPEG, PNG, BMP, WEBP)
    2. Convert to RGB (drops alpha channels, handles grayscale)
    3. Resize to 224 × 224 (bilinear interpolation)
    4. Normalise pixels to [0, 1] (divide by 255)
    5. Add batch dimension → shape (1, 224, 224, 3)

    Parameters
    ----------
    image_path : absolute or relative path to the image file

    Returns
    -------
    np.ndarray of shape (1, 224, 224, 3)
    """
    img = Image.open(image_path).convert("RGB")
    img = img.resize(IMAGE_SIZE, Image.BILINEAR)
    arr = np.array(img, dtype=np.float32) / 255.0   # Normalise to [0, 1]
    arr = np.expand_dims(arr, axis=0)                # Add batch dim
    return arr


def predict(image_path: str, model: tf.keras.Model = None) -> dict:
    """
    Run inference on a single rice image.

    Parameters
    ----------
    image_path : path to the image file
    model      : pre-loaded Keras model (optional — loads from disk if None)

    Returns
    -------
    dict with keys: label, label_key, confidence, probabilities, advice, image_path
    """
    if model is None:
        model = load_model()

    # Preprocess
    img_array = preprocess_image(image_path)

    # Inference — returns (1, 3) softmax probabilities
    preds = model.predict(img_array, verbose=0)[0]   # shape: (3,)

    # Determine winning class
    class_idx  = int(np.argmax(preds))
    label_key  = CLASS_NAMES[class_idx]              # e.g. "Ready_for_Harvest"
    label      = CLASS_DISPLAY_NAMES[label_key]      # e.g. "Ready for Harvest"
    confidence = float(preds[class_idx])

    # Build probability map (all three classes)
    probabilities = {
        cls: float(preds[i])
        for i, cls in enumerate(CLASS_NAMES)
    }

    return {
        "label":         label,
        "label_key":     label_key,
        "confidence":    round(confidence, 4),
        "probabilities": {k: round(v, 4) for k, v in probabilities.items()},
        "advice":        HARVEST_ADVICE[label_key],
        "image_path":    os.path.abspath(image_path),
    }


# ---------------------------------------------------------------------------
# CLI entrypoint
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python predict.py <image_path>", file=sys.stderr)
        sys.exit(1)

    image_path = sys.argv[1]

    if not os.path.isfile(image_path):
        error = {"error": f"Image file not found: {image_path}"}
        print(json.dumps(error))
        sys.exit(1)

    try:
        result = predict(image_path)
        print(json.dumps(result, indent=2))
    except FileNotFoundError as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": f"Inference failed: {str(e)}"}))
        sys.exit(1)
