"""
model_config.py
===============
Centralised configuration for the Paddy Rice Harvesting Time CNN.

All hyperparameters, paths, and class definitions live here so that
train.py and predict.py stay in sync without hardcoding values.
"""

import os

# ---------------------------------------------------------------------------
# Image Preprocessing
# ---------------------------------------------------------------------------
IMAGE_SIZE = (224, 224)   # Width × Height fed into the CNN (MobileNetV2 native)
IMAGE_CHANNELS = 3        # RGB only — no extra bands needed
INPUT_SHAPE = (*IMAGE_SIZE, IMAGE_CHANNELS)  # (224, 224, 3)

# ---------------------------------------------------------------------------
# Class Definitions
# The dataset directory MUST contain sub-folders with EXACTLY these names.
# ---------------------------------------------------------------------------
CLASS_NAMES = [
    "Immature",          # Index 0 — grain still filling, green/pale yellow
    "Nearly_Mature",     # Index 1 — grain approaching golden colour
    "Ready_for_Harvest", # Index 2 — fully golden, moisture ~20-25%
]

# Human-readable display labels (used in API responses / frontend)
CLASS_DISPLAY_NAMES = {
    "Immature":          "Immature",
    "Nearly_Mature":     "Nearly Mature",
    "Ready_for_Harvest": "Ready for Harvest",
}

NUM_CLASSES = len(CLASS_NAMES)  # 3

# ---------------------------------------------------------------------------
# Dataset Paths
# Place your dataset at ml/dataset/ following this structure:
#
#   ml/dataset/
#     train/
#       Immature/          ← JPEG/PNG images of immature paddy
#       Nearly_Mature/     ← JPEG/PNG images of nearly mature paddy
#       Ready_for_Harvest/ ← JPEG/PNG images of harvest-ready paddy
#     val/
#       Immature/
#       Nearly_Mature/
#       Ready_for_Harvest/
# ---------------------------------------------------------------------------
_HERE = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR   = os.path.join(_HERE, "dataset")
TRAIN_DIR     = os.path.join(DATASET_DIR, "train")
VAL_DIR       = os.path.join(DATASET_DIR, "val")

# Where to save the trained model after training
MODEL_SAVE_PATH = os.path.join(_HERE, "saved_model", "paddy_cnn.keras")
# Also export TFLite for edge deployment
TFLITE_SAVE_PATH = os.path.join(_HERE, "saved_model", "paddy_cnn.tflite")

# ---------------------------------------------------------------------------
# Training Hyperparameters
# ---------------------------------------------------------------------------
BATCH_SIZE     = 32
EPOCHS_PHASE1  = 20    # Phase 1: train only the classification head (base frozen)
EPOCHS_PHASE2  = 30    # Phase 2: fine-tune top layers of the base model
LEARNING_RATE_PHASE1 = 1e-3
LEARNING_RATE_PHASE2 = 1e-5   # Much smaller LR for fine-tuning
UNFREEZE_FROM_LAYER  = 100    # Fine-tune layers from this index onward in MobileNetV2

# ---------------------------------------------------------------------------
# Data Augmentation Parameters (applied to training images only)
# These ranges are conservative to preserve colour cues (golden vs green)
# which are critical for maturity assessment.
# ---------------------------------------------------------------------------
AUGMENTATION = dict(
    rescale            = 1.0 / 255.0,   # Normalise pixel values to [0, 1]
    rotation_range     = 20,             # ±20° rotation (field camera tilt)
    width_shift_range  = 0.1,
    height_shift_range = 0.1,
    shear_range        = 0.05,
    zoom_range         = 0.15,
    horizontal_flip    = True,
    vertical_flip      = False,          # Upside-down paddy not realistic
    brightness_range   = [0.8, 1.2],    # Simulate outdoor lighting variation
    fill_mode          = "nearest",
)

# Validation generator — only rescale, no augmentation
VAL_AUGMENTATION = dict(rescale=1.0 / 255.0)
