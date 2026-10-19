"""
download_hakdogidog_dataset.py
==============================
Download the Hakdogidog "Maturity" dataset from Roboflow Universe
and reorganise it into your project's class structure.

Their classes -> Your classes:
  - "Augmented Immature"  / "Original Immature"  -> Immature
  - "Augmented Mature"    / "Original Mature"     -> Ready_for_Harvest

Usage
-----
    cd paddy/ml
    python download_hakdogidog_dataset.py

The images will be saved to:
    ml/dataset_hakdogidog/
      Immature/
      Ready_for_Harvest/

You can then upload these to your Roboflow workspace project, or merge
them into ml/dataset/train/ for local training.
"""

import os
import shutil
import zipfile
import requests

API_KEY = os.getenv("ROBOFLOW_API_KEY", "")

# Roboflow Universe public dataset download URL
DATASET_URL = (
    "https://universe.roboflow.com/ds/PLACEHOLDER"
    "?key={api_key}"
)

# Where to save the reorganised images
_HERE = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(_HERE, "dataset_hakdogidog")
DOWNLOAD_DIR = os.path.join(_HERE, "_download_tmp")

# Class mapping: Hakdogidog class name -> your project class name
CLASS_MAP = {
    "Augmented Immature":  "Immature",
    "Original Immature":   "Immature",
    "Augmented Mature":    "Ready_for_Harvest",
    "Original Mature":     "Ready_for_Harvest",
    "Augmented_Immature":  "Immature",
    "Original_Immature":   "Immature",
    "Augmented_Mature":    "Ready_for_Harvest",
    "Original_Mature":     "Ready_for_Harvest",
    "Unlabeled":           None,  # skip
}


def remap_classes(downloaded_dir: str) -> int:
    """Walk downloaded folder structure and copy images to remapped class dirs."""
    for target_class in set(v for v in CLASS_MAP.values() if v):
        os.makedirs(os.path.join(OUTPUT_DIR, target_class), exist_ok=True)

    moved = 0
    for split in ["train", "valid", "test", ""]:
        split_dir = os.path.join(downloaded_dir, split) if split else downloaded_dir
        if not os.path.isdir(split_dir):
            continue

        for class_folder in os.listdir(split_dir):
            class_path = os.path.join(split_dir, class_folder)
            if not os.path.isdir(class_path):
                continue

            target_class = CLASS_MAP.get(class_folder)
            if target_class is None:
                lower = class_folder.lower().replace("_", " ")
                if "immature" in lower and "mature" not in lower.replace("immature", ""):
                    target_class = "Immature"
                elif "mature" in lower:
                    target_class = "Ready_for_Harvest"
                else:
                    print(f"  Skipping unknown class: {class_folder}")
                    continue

            target_dir = os.path.join(OUTPUT_DIR, target_class)
            for fname in os.listdir(class_path):
                src = os.path.join(class_path, fname)
                if not os.path.isfile(src):
                    continue
                ext = os.path.splitext(fname)[1].lower()
                if ext not in (".jpg", ".jpeg", ".png", ".bmp", ".webp"):
                    continue
                dst_name = f"hak_{class_folder.replace(' ', '_')}_{fname}"
                dst = os.path.join(target_dir, dst_name)
                shutil.copy2(src, dst)
                moved += 1

    return moved


def try_roboflow_sdk():
    """Try downloading via the roboflow SDK with Universe access."""
    try:
        from roboflow import Roboflow
    except ImportError:
        return None

    if not API_KEY:
        return None

    print("Trying Roboflow SDK download...")
    try:
        rf = Roboflow(api_key=API_KEY)
        # Universe datasets can be accessed via universe() method
        project = rf.universe("hakdogidog").project("maturity-wqmnm")
        dataset = project.version(1).download("folder", location=DOWNLOAD_DIR)
        return dataset.location
    except Exception as e:
        print(f"  SDK method failed: {e}")
        # Try alternative: direct download from universe
        try:
            project = rf.universe("hakdogidog").project("maturity-wqmnm")
            dataset = project.version(1).download("classification", location=DOWNLOAD_DIR)
            return dataset.location
        except Exception as e2:
            print(f"  SDK alternative also failed: {e2}")
            return None


def try_direct_download():
    """Download via the Roboflow Universe REST API."""
    if not API_KEY:
        print("ERROR: Set ROBOFLOW_API_KEY environment variable.")
        return None

    # The Roboflow API endpoint for downloading public datasets
    url = (
        f"https://universe.roboflow.com/api/hakdogidog/maturity-wqmnm/1/download/folder"
        f"?api_key={API_KEY}"
    )
    print(f"Downloading from Roboflow Universe API...")

    try:
        resp = requests.get(url, timeout=30)
        if resp.status_code == 200:
            data = resp.json()
            if "export" in data and "link" in data["export"]:
                download_link = data["export"]["link"]
                print(f"  Got download link, fetching ZIP...")
                return download_zip(download_link)
        # Try alternative URL format
        url2 = (
            f"https://api.roboflow.com/dataset/hakdogidog/maturity-wqmnm/1/folder"
            f"?api_key={API_KEY}"
        )
        resp2 = requests.get(url2, timeout=30)
        if resp2.status_code == 200:
            data = resp2.json()
            if "export" in data and "link" in data["export"]:
                return download_zip(data["export"]["link"])
    except Exception as e:
        print(f"  Direct download failed: {e}")

    return None


def download_zip(url: str) -> str:
    """Download and extract a ZIP file."""
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    zip_path = os.path.join(DOWNLOAD_DIR, "dataset.zip")

    print(f"  Downloading ZIP...")
    resp = requests.get(url, stream=True, timeout=300)
    resp.raise_for_status()

    total = int(resp.headers.get("content-length", 0))
    downloaded = 0
    with open(zip_path, "wb") as f:
        for chunk in resp.iter_content(chunk_size=8192):
            f.write(chunk)
            downloaded += len(chunk)
            if total:
                pct = downloaded * 100 // total
                print(f"\r  Progress: {pct}% ({downloaded // 1024 // 1024}MB)", end="", flush=True)

    print(f"\n  Extracting...")
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(DOWNLOAD_DIR)

    os.remove(zip_path)
    return DOWNLOAD_DIR


def main():
    if not API_KEY:
        print("ERROR: Set ROBOFLOW_API_KEY environment variable first.")
        print("  On Windows:  $env:ROBOFLOW_API_KEY = 'your_key'")
        raise SystemExit(1)

    # Try SDK first, then direct download
    downloaded_dir = try_roboflow_sdk()

    if not downloaded_dir:
        downloaded_dir = try_direct_download()

    if not downloaded_dir:
        print("\nAutomatic download failed. Please download manually:")
        print("  1. Go to: https://universe.roboflow.com/hakdogidog/maturity-wqmnm")
        print("  2. Click 'Download Dataset' -> Format: 'Folder Structure'")
        print("  3. Extract the ZIP to: ml/_download_tmp/")
        print("  4. Run this script again")

        if os.path.isdir(DOWNLOAD_DIR):
            print(f"\nFound existing download at {DOWNLOAD_DIR}, trying to remap...")
            downloaded_dir = DOWNLOAD_DIR
        else:
            raise SystemExit(1)

    # Remap classes
    print(f"\nRemapping classes...")
    moved = remap_classes(downloaded_dir)

    if moved == 0:
        # Maybe the folder structure is flat - list what we got
        print(f"  No images found with expected class folders. Contents of {downloaded_dir}:")
        for item in os.listdir(downloaded_dir):
            item_path = os.path.join(downloaded_dir, item)
            if os.path.isdir(item_path):
                count = len(os.listdir(item_path))
                print(f"    {item}/ ({count} items)")
            else:
                print(f"    {item}")
        print("\n  Trying recursive search for class folders...")
        for root, dirs, files in os.walk(downloaded_dir):
            for d in dirs:
                if any(keyword in d.lower() for keyword in ["immature", "mature"]):
                    print(f"    Found: {os.path.join(root, d)}")
        raise SystemExit(1)

    print(f"\nDone! Copied {moved} images to {OUTPUT_DIR}")
    for d in sorted(os.listdir(OUTPUT_DIR)):
        dp = os.path.join(OUTPUT_DIR, d)
        if os.path.isdir(dp):
            count = len([f for f in os.listdir(dp) if os.path.isfile(os.path.join(dp, f))])
            print(f"  {d}: {count} images")

    print(f"\nNext steps:")
    print(f"  1. Go to https://app.roboflow.com and open your workspace")
    print(f"  2. Open your rice classification project")
    print(f"  3. Upload images from {OUTPUT_DIR}/ to the matching classes")
    print(f"  4. Generate a new dataset version and train a model")


if __name__ == "__main__":
    main()
