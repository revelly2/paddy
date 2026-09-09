"""
classifier.py
=============
Rice Harvest Maturity Classification via Roboflow Workflow API.

Architecture
------------
1.  Send image to the Roboflow serverless REST API using the new
    Rice Classification T1 logic workflow.
2.  Parse the returned classification (Immature / Nearly_Mature / Ready_for_Harvest).

This module exposes a singleton ``PaddyClassifier`` with the same public
interface the rest of the codebase expects so that ``main.py`` stays
largely unchanged.
"""

import os
import time
import base64
import logging
from typing import Optional

import httpx
import numpy as np

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

# Roboflow serverless API endpoint for the workflow
WORKSPACE_NAME = "markdaluson30-gmail-com"
WORKFLOW_ID = "rice-classification-t1-vrice-classification-t1-1-vit-base-patch16-224-in21k-t1-logic"
ROBOFLOW_API_URL = f"https://serverless.roboflow.com/{WORKSPACE_NAME}/workflows/{WORKFLOW_ID}"


def _call_workflow_api(
    image_bytes: bytes, api_key: str, max_retries: int = 3, backoff_factor: float = 1.0
) -> dict:
    """
    Call the Roboflow serverless REST API for workflow inference.
    Includes timeouts and exponential backoff for retries.
    """
    b64_image = base64.b64encode(image_bytes).decode("ascii")

    payload = {
        "inputs": {
            "image": {
                "type": "base64",
                "value": b64_image
            }
        }
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }

    last_error = None
    with httpx.Client() as client:
        for attempt in range(max_retries):
            try:
                response = client.post(
                    ROBOFLOW_API_URL,
                    json=payload,
                    headers=headers,
                    timeout=30.0
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                # E.g., 4xx or 5xx errors from the server
                last_error = e
                if e.response.status_code < 500 and e.response.status_code != 429:
                    # Don't retry client errors (unless it's rate-limiting)
                    raise RuntimeError(f"Workflow API returned {e.response.status_code}: {e.response.text}")
            except httpx.RequestError as e:
                # E.g., connection errors, timeouts
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
        """
        Read Roboflow credentials from environment.
        """
        api_key = os.getenv("ROBOFLOW_API_KEY", "")

        if not api_key or api_key == "your_roboflow_api_key_here":
            logger.warning(
                "ROBOFLOW_API_KEY is not configured. "
                "Set it in .env to enable the classification workflow."
            )
            self._ready = False
            return

        self._api_key = api_key
        self._ready = True
        logger.info("Roboflow client configured for workflow: %s", WORKFLOW_ID)

    @property
    def ready(self) -> bool:
        return self._ready

    # -----------------------------------------------------------------
    # Core inference
    # -----------------------------------------------------------------
    def classify(self, image_bytes: bytes) -> dict:
        """
        Run the rice classification workflow.

        Parameters
        ----------
        image_bytes : raw uploaded image file bytes

        Returns
        -------
        dict with keys:
            label, label_key, confidence, probabilities, advice,
            panicle_count, panicle_details, annotated_image_b64
        """
        if not self._ready:
            raise RuntimeError(
                "Roboflow client is not initialised. "
                "Set ROBOFLOW_API_KEY in .env and restart the server."
            )

        try:
            result = _call_workflow_api(image_bytes, self._api_key)
        except Exception as e:
            logger.error("Roboflow inference error: %s", e)
            raise RuntimeError(f"Classification failed: {e}")

        # The workflow response returns outputs in a list corresponding to the inputs.
        outputs = result.get("outputs", [])
        if not outputs:
            raise RuntimeError("Workflow API returned an empty output list.")
        
        predictions_data = outputs[0].get("predictions", {})
        
        top_class = predictions_data.get("top")
        confidence = float(predictions_data.get("confidence", 0.0))
        
        # Build probability map based on the output. Since it only returns the top predictions,
        # we will extract what we can and default others to 0.0
        probabilities = {c: 0.0 for c in CLASS_NAMES}
        
        preds_array = predictions_data.get("predictions", [])
        for p in preds_array:
            class_name = p.get("class")
            # The model might output space-separated or underscore-separated, ensure it matches CLASS_NAMES
            if class_name == "Nearly Mature":
                class_name = "Nearly_Mature"
            elif class_name == "Ready for Harvest":
                class_name = "Ready_for_Harvest"

            if class_name in probabilities:
                probabilities[class_name] = float(p.get("confidence", 0.0))
        
        # If the top class wasn't in the predictions array for some reason, enforce it
        if top_class == "Nearly Mature":
            top_class = "Nearly_Mature"
        elif top_class == "Ready for Harvest":
            top_class = "Ready_for_Harvest"

        if top_class not in probabilities:
            # Fallback if workflow format slightly mismatches
            top_class = "Immature"

        if probabilities[top_class] == 0.0:
            probabilities[top_class] = confidence
            
        # Normalise the probabilities so they sum to 1.0, or at least match expected behaviour
        total_prob = sum(probabilities.values())
        if total_prob > 0:
            probabilities = {k: round(v / total_prob, 4) for k, v in probabilities.items()}

        return {
            "label":              CLASS_DISPLAY_NAMES.get(top_class, top_class),
            "label_key":          top_class,
            "confidence":         round(confidence, 4),
            "probabilities":      probabilities,
            "advice":             HARVEST_ADVICE.get(top_class, ""),
            "panicle_count":      0,
            "panicle_details":    [],
            # The workflow purely classifies and doesn't annotate bounding boxes.
            "annotated_image_b64": base64.b64encode(image_bytes).decode('ascii'),
        }

# ---------------------------------------------------------------------------
# Module-level singleton instance — import this in main.py
# ---------------------------------------------------------------------------
classifier = PaddyClassifier()
