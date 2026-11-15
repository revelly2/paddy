"""
build_independent_test.py
=========================
Build a maturity test set the trained model has never seen.

The maturity model is trained on a fork of Kelompok Genius 3's
Paddy-MaturityLevel-Dataset. That dataset holds augmented copies of the same
photos in its train and test splits, so its own test split overstates
accuracy. Instead we test on:

  * the 221 Agrisense Dataset paddy images whose photo is NOT in Kelompok,
    listed with their labels in ml/agrisense_unseen.txt, and
  * the team's own labelled field photos in ml/dataset/{train,val}/.

Usage
-----
    python ml/build_independent_test.py

Writes ml/data/maturity_test/{Immature,Mature}/ (both sources, file names
prefixed agri_ / local_) and ml/data/local_test/ (local photos only).
"""

import os
import shutil
import socket
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
LIST_FILE = os.path.join(HERE, "agrisense_unseen.txt")
SOURCE_URL = "https://source.roboflow.com/DXiLcvduAjZRdymL4xZxqQp7QrK2/{id}/original.jpg"
LABELS = ("Immature", "Mature")
LOCAL_MAP = {"Immature": "Immature", "Ready_for_Harvest": "Mature"}  # Nearly_Mature has no binary label
socket.setdefaulttimeout(30)  # a stalled connection otherwise hangs the run forever


def download(url: str, dest: str, tries: int = 3) -> None:
    """Fetch url to dest via a .part file, so an interrupted run never leaves a half image."""
    for attempt in range(tries):
        try:
            urllib.request.urlretrieve(url, dest + ".part")
            os.replace(dest + ".part", dest)
            return
        except Exception:
            if attempt == tries - 1:
                raise


def parse_list(text: str) -> list[tuple[str, str]]:
    """'<label> <image id>' lines -> [(label, id)], skipping comments and blanks."""
    items = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        label, image_id = line.split()
        if label not in LABELS:
            raise ValueError(f"Unknown label {label!r} in line: {line}")
        items.append((label, image_id))
    return items


def main() -> None:
    out_all, out_local = os.path.join(DATA, "maturity_test"), os.path.join(DATA, "local_test")
    shutil.rmtree(out_local, ignore_errors=True)
    for cls in LABELS:
        os.makedirs(os.path.join(out_local, cls))
        os.makedirs(os.path.join(out_all, cls), exist_ok=True)
        for f in os.listdir(os.path.join(out_all, cls)):  # keep finished agri_ downloads, so reruns resume
            if not (f.startswith("agri_") and f.endswith(".jpg")):
                os.remove(os.path.join(out_all, cls, f))

    failed = []
    items = parse_list(open(LIST_FILE, encoding="utf-8").read())
    for n, (label, image_id) in enumerate(items, 1):
        dest = os.path.join(out_all, label, f"agri_{image_id}.jpg")
        if os.path.exists(dest):
            continue
        try:
            download(SOURCE_URL.format(id=image_id), dest)
        except Exception as e:  # report and continue; the summary shows the count
            failed.append(f"{image_id}: {e}")
        if n % 25 == 0:
            print(f"downloaded {n}/{len(items)}", flush=True)

    local = 0
    for split in ("train", "val"):
        for src, label in LOCAL_MAP.items():
            folder = os.path.join(HERE, "dataset", split, src)
            for f in sorted(os.listdir(folder)) if os.path.isdir(folder) else []:
                if f.startswith("dummy_"):  # synthetic placeholders from create_dummy_data.py
                    continue
                for d in (out_all, out_local):
                    shutil.copy(os.path.join(folder, f), os.path.join(d, label, "local_" + f))
                local += 1

    counts = {cls: len(os.listdir(os.path.join(out_all, cls))) for cls in LABELS}
    print(f"Agrisense: {len(items) - len(failed)}/{len(items)}  local photos: {local}  maturity_test: {counts}")
    if failed:
        sys.exit("Failed downloads:\n" + "\n".join(failed))


if __name__ == "__main__":
    main()
