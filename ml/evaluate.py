"""
evaluate.py
===========
Score the live PaddyScan classifier on a labelled test folder.

The question scored is binary — "is this paddy ready to harvest?" — because
the public maturity datasets only label Immature vs Mature. Nearly Mature
counts as not ready.

Usage
-----
    python ml/evaluate.py --data ml/data/maturity_test --out ml/results/eval_before_hsv.json

``--data`` holds ``Immature/`` and ``Mature/`` sub-folders (Roboflow
"Folder Structure" export of the test split). Which pipeline is scored
depends on the PANICLE_MODEL_ID / MATURITY_MODEL_ID env vars, exactly as
in the backend.
"""

import argparse
import json
import logging
import os
import sys
from datetime import datetime, timezone

CLASSES = ["Immature", "Mature"]
IMAGE_EXTS = (".jpg", ".jpeg", ".png", ".webp")


def to_binary(label_key: str) -> str:
    """Map an app label to the binary ready-to-harvest class."""
    return "Mature" if label_key == "Ready_for_Harvest" else "Immature"


def metrics(y_true: list[str], y_pred: list[str], conf: list[float]) -> dict:
    """Accuracy, precision/recall for Mature, mean confidence and confusion (rows = truth)."""
    n = len(y_true)
    confusion = {t: {p: 0 for p in CLASSES} for t in CLASSES}
    for t, p in zip(y_true, y_pred):
        confusion[t][p] += 1
    tp = confusion["Mature"]["Mature"]
    predicted_mature = tp + confusion["Immature"]["Mature"]
    actual_mature = tp + confusion["Mature"]["Immature"]
    correct = tp + confusion["Immature"]["Immature"]
    return {
        "n": n,
        "accuracy": round(correct / n, 4) if n else 0.0,
        "precision_mature": round(tp / predicted_mature, 4) if predicted_mature else 0.0,
        "recall_mature": round(tp / actual_mature, 4) if actual_mature else 0.0,
        "mean_confidence": round(sum(conf) / n, 4) if n else 0.0,
        "confusion": confusion,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data", required=True, help="folder with Immature/ and Mature/ sub-folders")
    parser.add_argument("--out", required=True, help="JSON file to write")
    args = parser.parse_args()

    backend = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend")
    sys.path.insert(0, backend)
    from dotenv import load_dotenv
    load_dotenv(os.path.join(backend, ".env"))
    from classifier import PoorImageError, classifier

    logging.basicConfig(level=logging.WARNING)
    classifier.load()
    if not classifier.ready:
        sys.exit("ROBOFLOW_API_KEY is not set (backend/.env); cannot evaluate.")

    y_true, y_pred, conf = [], [], []
    rejected, errors = 0, []
    for truth in CLASSES:
        folder = os.path.join(args.data, truth)
        if not os.path.isdir(folder):
            sys.exit(f"Missing class folder: {folder}")
        for name in sorted(os.listdir(folder)):
            if not name.lower().endswith(IMAGE_EXTS):
                continue
            with open(os.path.join(folder, name), "rb") as f:
                image_bytes = f.read()
            try:
                result = classifier.classify(image_bytes)
            except PoorImageError:
                rejected += 1
                continue
            except Exception as e:  # keep scoring the rest; report failures in the JSON
                errors.append(f"{truth}/{name}: {e}")
                continue
            y_true.append(truth)
            y_pred.append(to_binary(result["label_key"]))
            conf.append(float(result["confidence"]))
            print(f"{truth:9s} -> {result['label_key']:18s} {result['confidence']:.2f}  {name}")

    report = {
        **metrics(y_true, y_pred, conf),
        "rejected": rejected,
        "errors": errors,
        "panicle_model": os.getenv("PANICLE_MODEL_ID") or "rice-panicle-dataset-fiemm/1",
        "maturity_model": os.getenv("MATURITY_MODEL_ID") or None,
        "data": os.path.abspath(args.data),
        "date": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(json.dumps({k: report[k] for k in ("n", "accuracy", "mean_confidence", "rejected")}, indent=2))
    print(f"Wrote {args.out}")


if __name__ == "__main__":
    main()
