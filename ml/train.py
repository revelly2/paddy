"""
train.py
========
Training script for the Paddy Rice Harvesting Time CNN.

Usage
-----
    cd paddy/ml
    python train.py

Prerequisites
-------------
1. Install dependencies:
       pip install -r requirements.txt

2. Place your dataset at ml/dataset/ with this structure:
       dataset/
         train/
           Immature/           ← RGB images of immature paddy
           Nearly_Mature/      ← RGB images of nearly mature paddy
           Ready_for_Harvest/  ← RGB images of harvest-ready paddy
         val/
           Immature/
           Nearly_Mature/
           Ready_for_Harvest/

3. Run this script. Training occurs in two phases:
   - Phase 1: Only the classification head is trained (base frozen).
   - Phase 2: Top layers of MobileNetV2 are fine-tuned at a low LR.

4. The trained model is saved to ml/saved_model/paddy_cnn.keras
   and a TFLite version is exported for edge deployment.

Architecture
------------
Base : MobileNetV2 (ImageNet pre-trained, lightweight, edge-compatible)
Head : GlobalAveragePooling2D → Dense(256, relu) → Dropout(0.4) → Dense(3, softmax)

MobileNetV2 was chosen because:
  - It runs efficiently on embedded hardware (Raspberry Pi, edge boards).
  - Its depthwise-separable convolutions keep parameter count low.
  - It achieves strong accuracy on domain-shifted image datasets when fine-tuned.
"""

import os
import sys
import json
import datetime
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import (
    ModelCheckpoint,
    EarlyStopping,
    ReduceLROnPlateau,
    TensorBoard,
)

# ---------------------------------------------------------------------------
# Import shared configuration
# ---------------------------------------------------------------------------
from model_config import (
    IMAGE_SIZE,
    INPUT_SHAPE,
    CLASS_NAMES,
    CLASS_DISPLAY_NAMES,
    NUM_CLASSES,
    TRAIN_DIR,
    VAL_DIR,
    MODEL_SAVE_PATH,
    TFLITE_SAVE_PATH,
    BATCH_SIZE,
    EPOCHS_PHASE1,
    EPOCHS_PHASE2,
    LEARNING_RATE_PHASE1,
    LEARNING_RATE_PHASE2,
    UNFREEZE_FROM_LAYER,
    AUGMENTATION,
    VAL_AUGMENTATION,
)


# ---------------------------------------------------------------------------
# Reproducibility seed (for consistent results across runs)
# ---------------------------------------------------------------------------
SEED = 42
tf.random.set_seed(SEED)
np.random.seed(SEED)


def validate_dataset_structure() -> None:
    """
    Verify that the dataset directories and class sub-folders exist.
    Exits with a helpful message if anything is missing.
    """
    missing = []
    for split_dir in [TRAIN_DIR, VAL_DIR]:
        if not os.path.isdir(split_dir):
            missing.append(split_dir)
            continue
        for cls in CLASS_NAMES:
            cls_path = os.path.join(split_dir, cls)
            if not os.path.isdir(cls_path):
                missing.append(cls_path)

    if missing:
        print("\n[ERROR] Dataset directories are missing:")
        for m in missing:
            print(f"  [X]  {m}")
        print(
            "\nExpected structure:\n"
            "  ml/dataset/\n"
            "    train/\n"
            "      Immature/\n"
            "      Nearly_Mature/\n"
            "      Ready_for_Harvest/\n"
            "    val/\n"
            "      Immature/\n"
            "      Nearly_Mature/\n"
            "      Ready_for_Harvest/\n"
        )
        sys.exit(1)

    # Count images per class and print a summary
    print("\n[Dataset Summary]")
    for split_name, split_dir in [("train", TRAIN_DIR), ("val", VAL_DIR)]:
        print(f"  {split_name}/")
        for cls in CLASS_NAMES:
            cls_path = os.path.join(split_dir, cls)
            img_count = len([
                f for f in os.listdir(cls_path)
                if f.lower().endswith((".jpg", ".jpeg", ".png", ".bmp", ".webp"))
            ])
            print(f"    {cls:20s}: {img_count} images")
    print()


def build_data_generators():
    """
    Create Keras ImageDataGenerators for training and validation.

    Training:  Full augmentation pipeline (flips, rotations, zoom, brightness)
    Validation: Rescale only — no augmentation to get unbiased validation metrics.

    Returns
    -------
    train_gen, val_gen  — DirectoryIterator objects
    steps_per_epoch     — number of batches per training epoch
    validation_steps    — number of batches per validation epoch
    """
    # Training generator with augmentation
    train_datagen = ImageDataGenerator(**AUGMENTATION)

    # Validation generator — normalise only
    val_datagen = ImageDataGenerator(**VAL_AUGMENTATION)

    train_gen = train_datagen.flow_from_directory(
        TRAIN_DIR,
        target_size=IMAGE_SIZE,         # Resize all images to 224×224
        batch_size=BATCH_SIZE,
        class_mode="categorical",       # One-hot encoded labels for softmax
        classes=CLASS_NAMES,            # Enforce fixed class order (index = class)
        shuffle=True,
        seed=SEED,
    )

    val_gen = val_datagen.flow_from_directory(
        VAL_DIR,
        target_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        class_mode="categorical",
        classes=CLASS_NAMES,
        shuffle=False,                  # No shuffle for reproducible val metrics
    )

    steps_per_epoch  = max(1, train_gen.samples // BATCH_SIZE)
    validation_steps = max(1, val_gen.samples // BATCH_SIZE)

    print(f"[DataGen] Training samples  : {train_gen.samples}")
    print(f"[DataGen] Validation samples: {val_gen.samples}")
    print(f"[DataGen] Class index map   : {train_gen.class_indices}\n")

    return train_gen, val_gen, steps_per_epoch, validation_steps


def build_model() -> keras.Model:
    """
    Construct the CNN using MobileNetV2 as a feature extractor backbone.

    Architecture
    ------------
    Input (224, 224, 3)
      └─ MobileNetV2 (pre-trained on ImageNet, initially frozen)
           └─ GlobalAveragePooling2D
                └─ Dense(256, ReLU) + BatchNorm + Dropout(0.4)
                     └─ Dense(3, Softmax)   ← 3 maturity classes

    The custom head is trained first; later the top portion of MobileNetV2
    is unfrozen for fine-tuning.

    Returns
    -------
    model : compiled Keras Model (Phase 1 — head only)
    """
    # Load MobileNetV2 backbone without its ImageNet top classifier
    base_model = MobileNetV2(
        input_shape=INPUT_SHAPE,
        include_top=False,         # Remove the 1000-class head
        weights="imagenet",        # Pre-trained weights for transfer learning
    )

    # Freeze the entire base — only the custom head trains in Phase 1
    base_model.trainable = False

    # Build the classification head
    inputs = keras.Input(shape=INPUT_SHAPE, name="image_input")
    x = base_model(inputs, training=False)           # frozen inference mode

    # Global average pooling converts feature maps to a vector
    x = layers.GlobalAveragePooling2D(name="gap")(x)

    # Dense block with regularisation
    x = layers.Dense(256, name="fc_256")(x)
    x = layers.BatchNormalization(name="bn_fc")(x)
    x = layers.Activation("relu", name="relu_fc")(x)
    x = layers.Dropout(0.4, name="dropout")(x)

    # 3-class softmax output
    outputs = layers.Dense(NUM_CLASSES, activation="softmax", name="predictions")(x)

    model = keras.Model(inputs, outputs, name="PaddyCNN")

    # Compile with Adam optimiser and categorical cross-entropy
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=LEARNING_RATE_PHASE1),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    model.summary()
    return model, base_model


def get_callbacks(phase: int, log_dir: str) -> list:
    """
    Return training callbacks for early stopping, LR reduction,
    checkpointing, and TensorBoard logging.

    Parameters
    ----------
    phase   : 1 or 2 (used to name checkpoint files)
    log_dir : root directory for TensorBoard logs
    """
    os.makedirs(os.path.dirname(MODEL_SAVE_PATH), exist_ok=True)
    checkpoint_path = MODEL_SAVE_PATH.replace(".keras", f"_phase{phase}_best.keras")

    callbacks = [
        # Save the best model weights (by val_accuracy) during each phase
        ModelCheckpoint(
            filepath=checkpoint_path,
            monitor="val_accuracy",
            save_best_only=True,
            mode="max",
            verbose=1,
        ),
        # Stop early if validation accuracy plateaus for N epochs
        EarlyStopping(
            monitor="val_accuracy",
            patience=8,
            restore_best_weights=True,
            verbose=1,
        ),
        # Reduce LR when val_loss stagnates (helps escape local minima)
        ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=4,
            min_lr=1e-7,
            verbose=1,
        ),
        # TensorBoard — run: tensorboard --logdir ml/logs
        TensorBoard(
            log_dir=os.path.join(log_dir, f"phase{phase}"),
            histogram_freq=1,
        ),
    ]
    return callbacks


def train() -> None:
    """
    Main training routine.

    Phase 1 — Train classification head with MobileNetV2 base frozen.
    Phase 2 — Unfreeze top layers of base; fine-tune at a very low LR.
    """
    print("=" * 60)
    print(" Paddy Rice Harvest Time CNN — Training Script")
    print("=" * 60)
    print(f"  TensorFlow version : {tf.__version__}")
    print(f"  GPU available      : {tf.config.list_physical_devices('GPU')}")
    print(f"  Training dir       : {TRAIN_DIR}")
    print(f"  Validation dir     : {VAL_DIR}")
    print(f"  Model save path    : {MODEL_SAVE_PATH}")
    print()

    # 1. Verify dataset is in place
    validate_dataset_structure()

    # 2. Build data generators
    train_gen, val_gen, steps_per_epoch, validation_steps = build_data_generators()

    # 3. Build model (Phase 1 — frozen base)
    model, base_model = build_model()

    # TensorBoard log directory
    log_dir = os.path.join(os.path.dirname(__file__), "logs",
                           datetime.datetime.now().strftime("%Y%m%d-%H%M%S"))

    # -----------------------------------------------------------------------
    # PHASE 1: Train the classification head only
    # -----------------------------------------------------------------------
    print("\n" + "-" * 40)
    print(f" Phase 1: Training head ({EPOCHS_PHASE1} epochs, LR={LEARNING_RATE_PHASE1})")
    print("-" * 40)

    history_phase1 = model.fit(
        train_gen,
        steps_per_epoch=steps_per_epoch,
        epochs=EPOCHS_PHASE1,
        validation_data=val_gen,
        validation_steps=validation_steps,
        callbacks=get_callbacks(1, log_dir),
        verbose=1,
    )

    # -----------------------------------------------------------------------
    # PHASE 2: Fine-tune top layers of MobileNetV2
    # -----------------------------------------------------------------------
    print("\n" + "-" * 40)
    print(f" Phase 2: Fine-tuning (layers {UNFREEZE_FROM_LAYER}+, LR={LEARNING_RATE_PHASE2})")
    print("-" * 40)

    # Unfreeze the base model
    base_model.trainable = True

    # Freeze all layers BEFORE UNFREEZE_FROM_LAYER index (protect early features)
    for layer in base_model.layers[:UNFREEZE_FROM_LAYER]:
        layer.trainable = False

    trainable_count = sum(1 for l in base_model.layers if l.trainable)
    print(f"  Unfrozen base layers: {trainable_count} / {len(base_model.layers)}")

    # Re-compile with a much lower learning rate to avoid catastrophic forgetting
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=LEARNING_RATE_PHASE2),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    history_phase2 = model.fit(
        train_gen,
        steps_per_epoch=steps_per_epoch,
        epochs=EPOCHS_PHASE2,
        validation_data=val_gen,
        validation_steps=validation_steps,
        callbacks=get_callbacks(2, log_dir),
        verbose=1,
    )

    # -----------------------------------------------------------------------
    # Save final model and training history
    # -----------------------------------------------------------------------
    os.makedirs(os.path.dirname(MODEL_SAVE_PATH), exist_ok=True)

    print(f"\n[Saving] Final model -> {MODEL_SAVE_PATH}")
    model.save(MODEL_SAVE_PATH)

    # Save combined training history for later analysis / plotting
    combined_history = {}
    for key in history_phase1.history:
        combined_history[f"phase1_{key}"] = [float(v) for v in history_phase1.history[key]]
    for key in history_phase2.history:
        combined_history[f"phase2_{key}"] = [float(v) for v in history_phase2.history[key]]

    history_path = MODEL_SAVE_PATH.replace(".keras", "_history.json")
    with open(history_path, "w") as f:
        json.dump(combined_history, f, indent=2)
    print(f"[Saving] Training history -> {history_path}")

    # -----------------------------------------------------------------------
    # Export TFLite model (for edge / embedded deployment)
    # -----------------------------------------------------------------------
    print(f"\n[Export] Converting to TFLite -> {TFLITE_SAVE_PATH}")
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    # Use dynamic range quantisation to halve model size with minimal accuracy loss
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    tflite_model = converter.convert()

    os.makedirs(os.path.dirname(TFLITE_SAVE_PATH), exist_ok=True)
    with open(TFLITE_SAVE_PATH, "wb") as f:
        f.write(tflite_model)
    print(f"[Export] TFLite model saved ({len(tflite_model) / 1024:.1f} KB)")

    print("\n[OK] Training complete!")
    print(f"  Main model  : {MODEL_SAVE_PATH}")
    print(f"  TFLite model: {TFLITE_SAVE_PATH}")
    print(f"  History     : {history_path}")
    print(f"  TensorBoard : tensorboard --logdir {log_dir}")
    print()
    print("  Next step: start the FastAPI backend — it will auto-load the saved model.")


if __name__ == "__main__":
    train()
