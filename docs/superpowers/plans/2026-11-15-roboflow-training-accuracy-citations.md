# Own Roboflow Models, Measured Accuracy and Citations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PaddyScan runs on detection and maturity models the team trains in its own Roboflow workspace from forked public datasets. Its accuracy and confidence are measured on a held-out test split, before and after. The paper describes that training truthfully and cites Roboflow and every source dataset.

**Architecture:** Two Roboflow projects in workspace `markdaluson30-gmail-com`:
- **Panicle detector:** forked Tasnuva + EWU panicle datasets. It replaces `rice-panicle-dataset/2`.
- **Maturity classifier:** forked paddy Raw/Ripe datasets, two classes, `Immature` / `Mature`.

The backend asks the classifier for P(Mature) on the whole photo and maps it to the three app labels with fixed bands. Panicle detection + HSV stay for the per-panicle boxes, and they remain the fallback when the classifier is not configured or fails. `ml/evaluate.py` scores both pipelines on the same test split. Python scripts edit the paper `.docx` by cloning existing paragraphs, so formatting is kept.

**Tech Stack:** Python 3.10+, FastAPI, httpx, OpenCV, numpy, pytest, python-docx, Roboflow (web app + hosted inference), LibreOffice (PDF check).

**Spec:** No separate spec file. The source is the user's request in this session (2026-11-15), quoted under Decisions below.

## Decisions (from the user, 2026-11-15)

1. "Make it more accurate" and "make the confidence level higher": improve the real results with trained models and measure them on Roboflow test data. Never raise the displayed number by changing a formula alone.
2. "Fork then use it… also add/fork others to add accuracy": the team forks public datasets into its own workspace, merges them and trains there. The paper then says the team trained the models, which is true, and names and cites every forked dataset.
3. Citations go in the paper text and References only. The app and the deck are out of scope.

## Global Constraints

- Roboflow workspace: `markdaluson30-gmail-com`. API key only from env `ROBOFLOW_API_KEY`. Never commit it.
- New env vars: `PANICLE_MODEL_ID` (default `rice-panicle-dataset/2`) and `MATURITY_MODEL_ID` (default unset, which means the HSV-only pipeline).
- App labels are unchanged: `Immature`, `Nearly_Mature`, `Ready_for_Harvest`. Display names, advice text and the API response shape are unchanged. There are no database schema changes.
- Maturity bands: P(Mature) < 0.35 → Immature; > 0.65 → Ready_for_Harvest; otherwise Nearly_Mature.
- Image guard: Laplacian variance < 60 → "blurry"; mean HSV value < 50 → "too dark". Rejected with HTTP 422 and the message `Photo is too {reason}. Retake it in daylight and hold the camera steady.`
- Datasets to fork (license checked 2026-11-15):
  - Detection: Tasnuva `tanisha-tasnuva-9t1fk/rice-panicle-dataset` (5,572, CC BY 4.0); EWURicedataset `ewuricedataset/rice-panicle-uyxgj` (2,628, CC BY 4.0). Both use class `Rice-Panicle`.
  - Maturity: Kelompok Genius 3 `kelompok-genius-3/paddy-maturitylevel-dataset` (1,054, Public Domain, Raw/Ripe); Agrisense Dataset `agrisense-dataset/paddy-o34tk` (989, CC BY 4.0, Raw/Ripe); Hakdogidog `hakdogidog/maturity-nb3ws` (1,497, CC BY 4.0). From Hakdogidog use only the `Original *` classes, and only after Task 1 confirms the images are rice.
- Paper file: `Z:\Users\Admin\Desktop\paddy files\paper with system arch.docx`. Write to a new file, `PaddyScan_Paper_v2.docx`, in the same folder. Never overwrite the original.
- Paper typography is unchanged: every new paragraph is cloned from a neighbouring paragraph of the same kind.

## Review Focus

1. **Test images leaking into training.** The forked sets may share photos (Tasnuva and EWU both come from Bangladeshi rice-panicle collections; Kelompok and Agrisense are both Raw/Ripe ~1k sets). Roboflow skips byte-identical uploads only. Task 1 rebalances the split after merging, and the accuracy figure is computed only on the Roboflow **test** split.
2. **Classifier API down or slow.** A classify call that fails or times out (10 s) must fall back to the HSV pipeline, not return 500. Test in Task 3.
3. **Off-domain photos** (no paddy in frame). The classifier still returns a probability. The image guard does not catch this; it is documented as a limitation in the paper (Task 6 copy).
4. **"Nearly Mature" has no training class.** Its accuracy cannot be measured. Task 4 scores the binary question "ready to harvest?" (Nearly_Mature counts as not ready), and the paper says so.
5. **TOC and List of Figures page numbers shift** after inserting text into the paper. Task 7 re-renders the PDF and fixes the numbers.

---

### Task 1 [YOU, in the Roboflow web app]: Fork, merge and train both models

**Files:**
- Create: `ml/results/training_record.json`, which records what you did. Later tasks read it.

**Interfaces:**
- Produces: `ml/results/training_record.json` with this exact shape (fill in the real values from Roboflow):

```json
{
  "date": "2026-11-__",
  "detector": {
    "project": "paddyscan-panicle-detection", "version": 1,
    "model_type": "Roboflow 3.0 Object Detection (Accurate)", "checkpoint": "COCO",
    "sources": ["tanisha-tasnuva-9t1fk/rice-panicle-dataset", "ewuricedataset/rice-panicle-uyxgj"],
    "images_total": 0, "split": {"train": 0, "valid": 0, "test": 0},
    "preprocessing": ["Auto-Orient", "Resize 640x640 (stretch)"],
    "augmentation": ["Flip: horizontal", "Rotation: ±15°", "Brightness: ±25%"], "augmentation_multiplier": 3,
    "metrics": {"mAP50": 0.0, "precision": 0.0, "recall": 0.0}
  },
  "maturity": {
    "project": "paddyscan-maturity", "version": 1,
    "model_type": "Roboflow 3.0 Classification", "classes": ["Immature", "Mature"],
    "sources": ["kelompok-genius-3/paddy-maturitylevel-dataset", "agrisense-dataset/paddy-o34tk", "hakdogidog/maturity-nb3ws"],
    "class_map": {"Raw": "Immature", "Ripe": "Mature", "Original Immature": "Immature", "Original Mature": "Mature"},
    "images_total": 0, "split": {"train": 0, "valid": 0, "test": 0},
    "preprocessing": ["Auto-Orient", "Resize 224x224 (stretch)"],
    "augmentation": ["Flip: horizontal", "Brightness: ±25%", "Blur: up to 1px"], "augmentation_multiplier": 3,
    "metrics": {"test_accuracy": 0.0}
  }
}
```

- [ ] **Step 1: Sign in** at app.roboflow.com with the workspace owner account.
- [ ] **Step 2: Detector project.** Create an Object Detection project named `paddyscan-panicle-detection`. On each detection source page click **Fork Dataset** into this project. In Dataset → Health Check, confirm the only class is `Rice-Panicle`.
- [ ] **Step 3: Rebalance the detector split** (Dataset → Rebalance) to 70 / 20 / 10.
- [ ] **Step 4: Generate the detector version** with the preprocessing and augmentation in the JSON above, then train it as Roboflow 3.0 Object Detection (Accurate) from the COCO checkpoint. When it finishes, copy the mAP@50, precision, recall and split counts into the JSON.
- [ ] **Step 5: Check the Hakdogidog images.** Open 20 random images from the Hakdogidog dataset. If they are not paddy rice, remove it from `sources` and `class_map`, and skip it in Step 6.
- [ ] **Step 6: Maturity project.** Create a Single-Label Classification project named `paddyscan-maturity` and fork the maturity sources into it. Rename classes per `class_map`. Delete every `Augmented *` and `Unlabeled` image.
- [ ] **Step 7: Rebalance and train the classifier.** Rebalance to 70 / 20 / 10, generate the version per the JSON, and train it as Roboflow 3.0 Classification. Copy the test accuracy and split counts into the JSON.
- [ ] **Step 8: Export the test split.** Export the maturity version in "Folder Structure" format. Unzip only its `test/` folder to `ml/data/maturity_test/`, which will have `Immature/` and `Mature/` subfolders.
- [ ] **Step 9: Commit the record.**

```bash
git checkout -b feat/own-roboflow-models
echo ml/data/ >> .gitignore
git add .gitignore ml/results/training_record.json
git commit -m "chore: record Roboflow training runs for detector and maturity models"
```

---

### Task 2: Pure decision helpers in the classifier

**Files:**
- Modify: `backend/classifier.py`. Read `PANICLE_MODEL_ID` from the env (current line 79), and add the helpers below next to `_classify_panicle_hsv`.
- Create: `backend/tests/__init__.py` (empty), `backend/tests/test_maturity_logic.py`
- Modify: `backend/requirements.txt`. Add `pytest>=8.0` under a new `# Tests` comment.

**Interfaces:**
- Produces:
  - `MATURITY_LOW = 0.35`, `MATURITY_HIGH = 0.65`
  - `band_label(p_mature: float) -> tuple[str, float]` returns `(label_key, confidence)`. Confidence is `1 - p` for Immature, `p` for Ready, and `1 - 2*abs(p - 0.5)` for Nearly_Mature. Rounded to 4 places.
  - `parse_maturity_response(data: dict) -> float` returns P(Mature) from a Roboflow single-label classification response `{"predictions": [{"class": str, "confidence": float}, ...]}`. If only `Immature` is present, it returns `1 - conf`. It raises `ValueError` if neither class is present.
  - `class PoorImageError(ValueError)` with attribute `reason: str` (`"blurry"` or `"too dark"`)
  - `check_image_quality(img_bgr: np.ndarray) -> None`, which raises `PoorImageError`. Laplacian variance on grayscale < 60 → blurry; mean of the HSV V channel < 50 → too dark. The dark check runs first.

- [ ] **Step 1: Write failing tests**

```python
from classifier import band_label, parse_maturity_response, check_image_quality, PoorImageError
import numpy as np, cv2, pytest

def test_bands():
    assert band_label(0.10) == ("Immature", 0.9)
    assert band_label(0.90) == ("Ready_for_Harvest", 0.9)
    assert band_label(0.50) == ("Nearly_Mature", 1.0)
    assert band_label(0.35)[0] == "Nearly_Mature" and band_label(0.65)[0] == "Nearly_Mature"

def test_parse_response():
    assert parse_maturity_response({"predictions": [{"class": "Mature", "confidence": 0.8}, {"class": "Immature", "confidence": 0.2}]}) == 0.8
    assert parse_maturity_response({"predictions": [{"class": "Immature", "confidence": 0.7}]}) == pytest.approx(0.3)
    with pytest.raises(ValueError):
        parse_maturity_response({"predictions": []})

def test_quality_guard():
    rng = np.random.default_rng(0)
    sharp = rng.integers(60, 255, (200, 200, 3), dtype=np.uint8)
    check_image_quality(sharp)  # no raise
    with pytest.raises(PoorImageError, match="dark"):
        check_image_quality(np.full((200, 200, 3), 10, np.uint8))
    with pytest.raises(PoorImageError, match="blurry"):
        check_image_quality(cv2.GaussianBlur(sharp, (51, 51), 0))
```

- [ ] **Step 2: Run it and confirm it fails.** Run `cd backend && python -m pytest tests/test_maturity_logic.py -v`. Expected: FAIL with an ImportError.
- [ ] **Step 3: Implement the helpers** listed under Interfaces in `backend/classifier.py`. Change line 79 to `PANICLE_MODEL_ID = os.getenv("PANICLE_MODEL_ID", "rice-panicle-dataset/2")`.
- [ ] **Step 4: Run it and confirm it passes.** Same command. Expected: 3 passed.
- [ ] **Step 5: Commit**

```bash
git add backend/classifier.py backend/tests backend/requirements.txt
git commit -m "feat(classifier): maturity bands, Roboflow classify parser, photo quality guard"
```

---

### Task 3: Use the trained maturity model in `classify()`

**Files:**
- Modify: `backend/classifier.py` (`PaddyClassifier.load`, `PaddyClassifier.classify`, and a new `_classify_maturity`)
- Modify: `backend/main.py` around line 393. Catch `PoorImageError` → `HTTPException(422, detail=f"Photo is too {e.reason}. Retake it in daylight and hold the camera steady.")`
- Test: `backend/tests/test_classify_flow.py`

**Interfaces:**
- Consumes: Task 2 helpers.
- Produces:
  - `_classify_maturity(image_bytes: bytes, api_key: str, model_id: str) -> float` makes `POST https://classify.roboflow.com/{model_id}?api_key=…` with a base64 body, `Content-Type: application/x-www-form-urlencoded` and a 10 s timeout, and returns `parse_maturity_response(resp.json())`.
  - `classify()` behaviour:
    1. Decode the image and run `check_image_quality`, which can raise.
    2. Run panicle detection + HSV exactly as today. This gives `panicle_details`, `panicle_count` and the annotated image.
    3. If `MATURITY_MODEL_ID` is set, call `_classify_maturity`. On any exception, log a warning and keep the HSV result.
    4. On success, set `label`, `label_key` and `confidence` from `band_label(p)`, set `probabilities = {"Immature": round(1-p,4), "Nearly_Mature": 0.0, "Ready_for_Harvest": round(p,4)}`, and set `advice` from `HARVEST_ADVICE`.
  - When no panicles are found and the maturity model is configured, return the model's result with `panicle_count: 0`, `panicle_details: []` and the original photo as `annotated_image_b64`. The old workflow fallback runs only when the model is unset or its call fails.

- [ ] **Step 1: Write failing tests.** Monkeypatch `_detect_panicles`, `_classify_maturity` and `_call_workflow_api`. Use a sharp 300×300 random image encoded with `cv2.imencode(".jpg", …)`.
  - `test_model_label_used`: `MATURITY_MODEL_ID` is set; the maturity stub returns 0.9; detection returns one box. Assert `label_key == "Ready_for_Harvest"`, `confidence == 0.9` and `panicle_count == 1`.
  - `test_model_failure_falls_back_to_hsv`: the maturity stub raises `httpx.TimeoutException`. Assert there is no exception, and `label_key` equals the HSV result for the same crop (compute it via `_classify_panicle_hsv`).
  - `test_no_model_configured_is_old_behaviour`: env unset. Assert `_classify_maturity` is never called.
  - `test_dark_photo_rejected`: an all-black image. Assert `PoorImageError`.
- [ ] **Step 2: Run** `python -m pytest tests/test_classify_flow.py -v`. Expected: FAIL.
- [ ] **Step 3: Implement** `_classify_maturity` and the `classify()` changes above. In `load()`, read `self._maturity_model_id = os.getenv("MATURITY_MODEL_ID") or None`.
- [ ] **Step 4: Run the full suite** `python -m pytest tests -v`. Expected: all pass.
- [ ] **Step 5: Commit**

```bash
git add backend/classifier.py backend/main.py backend/tests/test_classify_flow.py
git commit -m "feat(classifier): use trained Roboflow maturity model with HSV fallback"
```

---

### Task 4: Accuracy and confidence evaluation script

**Files:**
- Create: `ml/evaluate.py`, `backend/tests/test_evaluate_metrics.py`

**Interfaces:**
- Produces:
  - `to_binary(label_key: str) -> str` maps `"Ready_for_Harvest"` to `"Mature"` and everything else to `"Immature"`.
  - `metrics(y_true: list[str], y_pred: list[str], conf: list[float]) -> dict` returns `accuracy`, `precision_mature`, `recall_mature`, `mean_confidence`, `confusion` (`{"Immature": {"Immature": n, "Mature": n}, "Mature": {…}}`) and `n`.
  - CLI: `python ml/evaluate.py --data ml/data/maturity_test --out ml/results/<name>.json`. It runs `classifier.classify` on every image, skips and counts `PoorImageError` as `rejected`, and writes the metrics, `rejected` and the env model IDs to the JSON.

- [ ] **Step 1: Write the failing test.** `metrics(["Mature","Mature","Immature","Immature"], ["Mature","Immature","Immature","Immature"], [0.9,0.6,0.8,0.7])` returns accuracy 0.75, precision_mature 1.0, recall_mature 0.5, mean_confidence 0.75, n 4. `to_binary("Nearly_Mature") == "Immature"`.
- [ ] **Step 2: Run it** (`python -m pytest tests/test_evaluate_metrics.py -v`, with `ml/` added to `sys.path` in the test). Expected: FAIL.
- [ ] **Step 3: Implement** `ml/evaluate.py`. It imports `classifier` by adding `backend/` to `sys.path` and calls `classifier.load()` once.
- [ ] **Step 4: Run it and confirm it passes.**
- [ ] **Step 5: Commit** with `git commit -m "feat(ml): evaluation script for ready-to-harvest accuracy and confidence"`.

---

### Task 5: Before and after measurements, then deploy

**Files:**
- Create: `ml/results/eval_before_hsv.json`, `ml/results/eval_after_models.json`
- Modify: `render.yaml`. Add `PANICLE_MODEL_ID` and `MATURITY_MODEL_ID` as `sync: false` env vars.
- Modify: `backend/.env.example`. Add both vars with comments.

- [ ] **Step 1: Before.** With `PANICLE_MODEL_ID` and `MATURITY_MODEL_ID` unset, run `python ml/evaluate.py --data ml/data/maturity_test --out ml/results/eval_before_hsv.json`. Expected: the JSON is written, with `n` equal to the test-split count from `training_record.json`.
- [ ] **Step 2: After.** Set `PANICLE_MODEL_ID=paddyscan-panicle-detection/1` and `MATURITY_MODEL_ID=paddyscan-maturity/1` (the versions from the record), then run again with `--out ml/results/eval_after_models.json`.
- [ ] **Step 3: Gate.** If the after `accuracy` is not higher than before, stop and report both files to the user. Do not deploy, and do not write "improved" in the paper.
- [ ] **Step 4: Deploy.** Have the user set both vars in the Render dashboard. Then check that `GET /health` reports `model_loaded: true` and that one classify call from the app works.
- [ ] **Step 5: Commit** with `git commit -m "chore: before/after evaluation results and model env config"`.

---

### Task 6: Paper edits — training section, results and citations

**Files:**
- Create: `thesis/paper_edit.py` (helpers + `main()`), `thesis/test_paper_edit.py`
- Input: `paper with system arch.docx`, `ml/results/training_record.json`, `ml/results/eval_*.json`. Output: `PaddyScan_Paper_v2.docx`

**Interfaces:**
- Produces (python-docx):
  - `find_para(doc, startswith: str) -> Paragraph` matches on stripped text and raises if there is no match.
  - `insert_after(anchor: Paragraph, text: str, template: Paragraph) -> Paragraph` deep-copies the template's `<w:p>` (its pPr and first run's rPr) and sets one run with `text`.
  - `cite_mentions(doc, term: str, citation: str) -> int` appends ` (citation)` after the first `term` in each body paragraph (references excluded) that does not already contain `citation`, and returns the count. It works inside the run that holds the term.
  - `insert_reference_sorted(doc, parts: list[tuple[str, bool]]) -> Paragraph` takes `(text, italic)` runs, clones the first References entry and inserts the new entry in alphabetical order.

- [ ] **Step 1: Write failing tests** on a tiny docx built in the test (heading "References", two entries "Awais…" and "Zhang…"):
  - `cite_mentions(doc, "Roboflow", "Dwyer et al., 2025")` returns 1 on a body paragraph "We used Roboflow for detection." The text becomes "We used Roboflow (Dwyer et al., 2025) for detection." A second call returns 0.
  - `insert_reference_sorted` with "Dwyer, B." lands between Awais and Zhang, and the title run is italic.
- [ ] **Step 2: Run** `python -m pytest thesis/test_paper_edit.py -v`. Expected: FAIL. (`pip install python-docx` first if the import fails.)
- [ ] **Step 3: Implement the helpers, then `main()`.** `main()` applies the content below, filling the `{}` placeholders from the JSON files:
  - **Ch 2, after the paragraph under "System Development Methodology and Tools" that names Roboflow:** add a subsection heading "Model Training on Roboflow", cloned from an existing subheading, and four paragraphs.
    - (a) Sources: "The researchers created two projects in their Roboflow workspace and forked public datasets into them: the rice panicle datasets of Tasnuva (2024) and EWURicedataset (2023) for panicle detection, and the paddy maturity datasets of Kelompok Genius 3 (2023), Agrisense Dataset (2024){, and Hakdogidog (2024)} for maturity classification."
    - (b) Preparation: "The merged datasets ({images_total} and {images_total} images) were rebalanced into training, validation and test sets of 70%, 20% and 10%, auto-oriented, resized to {640×640 / 224×224}, and augmented ({augmentation}) to three times the training images."
    - (c) Training: "The detector was trained as a {model_type} from a COCO checkpoint and the maturity model as a {model_type} with the classes Immature and Mature, using Roboflow's hosted training (Dwyer et al., 2025)."
    - (d) Use: "The app requests the probability that a photo is Mature; below 0.35 is reported as Immature, above 0.65 as Ready for Harvest, and values in between as Nearly Mature, because no public dataset labels the transition stage."
  - **Ch 3, Problem 2:** after its first results paragraph, add one paragraph with the detector mAP@50/precision/recall and the test accuracy from the record. Then add a 2-column table cloned from an existing results table: rows Accuracy, Precision (Mature), Recall (Mature), Mean confidence; columns "HSV only (before)" and "Trained models (after)", from the eval JSONs. Caption it "Table {n}. Ready-to-Harvest Accuracy Before and After Model Training", and renumber the later tables and their in-text references (+1).
  - **Ch 3/4 limitation sentence:** "Nearly Mature is inferred from the model's probability rather than learned from labelled examples, and photos without paddy in frame are not rejected."
  - **Citations:** `cite_mentions(doc, "Roboflow", "Dwyer et al., 2025")`; `cite_mentions(doc, "rice-panicle-dataset", "Tasnuva, 2024")`.
  - **References (APA 7, title italic):**
    - Agrisense Dataset. (2024). *Paddy dataset* [Data set]. Roboflow Universe. https://universe.roboflow.com/agrisense-dataset/paddy-o34tk
    - Dwyer, B., Nelson, J., Hansen, T., et al. (2025). *Roboflow* (Version 1.0) [Computer software]. https://roboflow.com — confirm the year and author list against roboflow.com's own citation guidance before running.
    - EWURicedataset. (2023). *Rice-Panicle dataset* [Data set]. Roboflow Universe. https://universe.roboflow.com/ewuricedataset/rice-panicle-uyxgj
    - Hakdogidog. (2024). *Maturity dataset* [Data set]. Roboflow Universe. https://universe.roboflow.com/hakdogidog/maturity-nb3ws (only if it is still in `sources`)
    - Kelompok Genius 3. (2023). *Paddy-MaturityLevel-Dataset* [Data set]. Roboflow Universe. https://universe.roboflow.com/kelompok-genius-3/paddy-maturitylevel-dataset
    - Tasnuva, T. (2024). *Rice panicle dataset* [Data set]. Roboflow Universe. https://universe.roboflow.com/tanisha-tasnuva-9t1fk/rice-panicle-dataset
  - **Abstract:** replace "a Roboflow convolutional neural network detection model trained on 5,572 annotated rice panicle images locates each panicle, and OpenCV HSV colour analysis labels each panicle" with the two-model description and the after-accuracy figure.
- [ ] **Step 4: Run the tests and confirm they pass,** then run `python thesis/paper_edit.py`. Expected: `PaddyScan_Paper_v2.docx` is written and the script prints the count of each edit (every count ≥ 1).
- [ ] **Step 5: Commit** with `git commit -m "feat(thesis): paper edits for Roboflow training section, results table and citations"`.

---

### Task 7: Render, fix page numbers, update Figure 4, hand over

**Files:**
- Output: `PaddyScan_Paper_v2.pdf` (`soffice --headless --convert-to pdf`, at `C:\Program Files\LibreOffice\program\soffice.com`)
- Modify: Figure 4 image. Its generator `fig_architecture.js` was in a cleared temp folder; recreate it from this session's transcript, change the Stage 1 tags to `paddyscan-panicle-detection/{v}` and `{images_total} images`, add a "Maturity model" line, re-shoot it, and swap the image in v2.

- [ ] **Step 1: Render the PDF.** For each TOC, List of Tables and List of Figures line, find its heading's page in the PDF (PyMuPDF text search). Update the numbers in the docx, then re-render. Repeat until no number changes.
- [ ] **Step 2: Check the new pages.** Look at the pages with the new subsection, table and references: the font must be Courier New 12, the spacing must match the neighbouring text, and no table may split across a page.
- [ ] **Step 3: Send both files to the user,** with a list of the numbers that came from `training_record.json` so they can check them against Roboflow.

---

## Out of scope (named, not done)

- Updating the presentation deck. Its data-source and model slides will be stale after Task 5; offer this as a follow-up.
- Labelling a "Nearly Mature" class or collecting local Abra photos. These are the recommended next steps in the paper.
