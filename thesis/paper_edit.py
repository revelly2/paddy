"""
paper_edit.py
=============
Writes PaddyScan_Paper_v2.docx from "paper with system arch.docx": the Roboflow
training section, the before/after accuracy table, Roboflow and dataset
citations, and the matching updates to the abstract, results and conclusions.

All model numbers are read from ml/results/*.json, so the paper and the
evaluation can't drift apart.

Usage:  python thesis/paper_edit.py [source.docx] [output.docx]
"""

import copy
import json
import os
import re
import sys

import docx
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.shared import Inches
from docx.text.paragraph import Paragraph

HERE = os.path.dirname(os.path.abspath(__file__))
RESULTS = os.path.join(HERE, "..", "ml", "results")
PAPER_DIR = r"Z:\Users\Admin\Desktop\paddy files"
SRC = os.path.join(PAPER_DIR, "paper with system arch.docx")
OUT = os.path.join(PAPER_DIR, "PaddyScan_Paper_v2.docx")

RF = "Dwyer et al., 2026"


# ---------------------------------------------------------------- helpers

def find_para(doc, startswith: str) -> Paragraph:
    for p in doc.paragraphs:
        if p.text.strip().startswith(startswith):
            return p
    raise LookupError(f"No paragraph starts with {startswith!r}")


def clone_after(anchor, template: Paragraph, runs) -> Paragraph:
    """New paragraph after `anchor` (a Paragraph or table) with the template's
    paragraph format and first-run font. runs: [(text, bold, italic)]."""
    p = copy.deepcopy(template._p)
    rpr = template.runs[0]._r.rPr if template.runs else None
    for child in list(p):
        if child is not p.pPr:  # keep paragraph format only
            p.remove(child)
    anchor_el = anchor._p if isinstance(anchor, Paragraph) else anchor._tbl
    anchor_el.addnext(p)
    para = Paragraph(p, template._parent)
    for text, bold, italic in runs:
        r = para.add_run(text)
        if rpr is not None:
            r._r.insert(0, copy.deepcopy(rpr))
        if bold is not None:  # None keeps the template's formatting
            r.bold = bold
        if italic is not None:
            r.italic = italic
    return para


def replace_in_para(p: Paragraph, old: str, new: str) -> None:
    """Replace text inside one run when possible; otherwise flatten the
    paragraph into its first run (body paragraphs share one font)."""
    for r in p.runs:
        if old in r.text:
            r.text = r.text.replace(old, new)
            return
    if old not in p.text:
        raise LookupError(f"{old[:60]!r} not in paragraph {p.text[:60]!r}")
    text = p.text.replace(old, new)
    p.runs[0].text = text
    for r in p.runs[1:]:
        r._r.getparent().remove(r._r)


def set_text(p: Paragraph, text: str) -> None:
    replace_in_para(p, p.text, text)


def insert_reference_sorted(doc, parts) -> Paragraph:
    """parts: [(text, bold, italic)]; inserted alphabetically among the entries
    after the References heading, formatted like the first entry."""
    heading = find_para(doc, "References")
    entries = []
    el = heading._p.getnext()
    while el is not None and el.tag == heading._p.tag:
        para = Paragraph(el, heading._parent)
        if not para.text.strip():
            break
        entries.append(para)
        el = el.getnext()
    key = parts[0][0].lower()
    anchor = heading
    for e in entries:
        if e.text.lower() < key:
            anchor = e
    return clone_after(anchor, entries[0], parts)


def bump_tables(doc, start: int) -> int:
    """Table numbers >= start become +1 (captions, list of tables, text)."""
    pat = re.compile(r"\b(Tables? )(\d+)(?: to (\d+))?\b")

    def bump(num: str) -> str:
        return str(int(num) + 1) if int(num) >= start else num

    def inc(m):
        return m.group(1) + bump(m.group(2)) + (f" to {bump(m.group(3))}" if m.group(3) else "")

    n = 0
    for p in doc.paragraphs:
        if "Table" not in p.text:
            continue
        for r in p.runs:
            new = pat.sub(inc, r.text)
            if new != r.text:
                r.text, n = new, n + 1
    return n


def pct(x: float) -> str:
    return f"{x * 100:.1f}%"


def exact(ev: dict) -> dict:
    """Accuracy/precision/recall from the confusion counts, so the paper's
    one-decimal figures aren't rounded twice (the JSON keeps 4 decimals)."""
    c = ev["confusion"]
    tp, fn = c["Mature"]["Mature"], c["Mature"]["Immature"]
    fp, tn = c["Immature"]["Mature"], c["Immature"]["Immature"]
    return {**ev, "accuracy": (tp + tn) / (tp + tn + fp + fn),
            "precision_mature": tp / (tp + fp) if tp + fp else 0.0, "recall_mature": tp / (tp + fn)}


# ---------------------------------------------------------------- content

def main(src=SRC, out=OUT) -> None:
    rec = json.load(open(os.path.join(RESULTS, "training_record.json"), encoding="utf-8"))
    before = exact(json.load(open(os.path.join(RESULTS, "eval_before_hsv.json"), encoding="utf-8")))
    after = exact(json.load(open(os.path.join(RESULTS, "eval_after_models.json"), encoding="utf-8")))
    det, mat = rec["detector"], rec["maturity"]
    dv, dt = det["metrics"]["valid"], det["metrics"]["test"]
    n = after["n"]
    n_imm = sum(after["confusion"]["Immature"].values())
    n_mat = sum(after["confusion"]["Mature"].values())
    missed_before = before["confusion"]["Mature"]["Immature"]
    missed_after = after["confusion"]["Mature"]["Immature"]
    assert after["errors"] == [] and before["errors"] == []

    doc = docx.Document(src)
    body = find_para(doc, "The system is developed using image classification")
    sub = find_para(doc, "On the Image Classification Architecture")

    # Abstract
    abstract = find_para(doc, "This capstone project designed")
    replace_in_para(abstract,
        "a Roboflow convolutional neural network detection model trained on 5,572 annotated rice panicle "
        "images locates each panicle, and OpenCV HSV colour analysis labels each panicle as Immature, Nearly "
        "Mature, or Ready for Harvest, after which the system returns an annotated image, a field-level result, "
        "and harvest advice.",
        f"a YOLO26 object detection model that the researchers trained on Roboflow with "
        f"{det['images_total']:,} annotated rice panicle images locates each panicle, a Vision Transformer "
        f"classification model trained on {mat['images_total']:,} paddy images labels the field as Immature, "
        f"Nearly Mature, or Ready for Harvest, and OpenCV HSV colour analysis colours each detected panicle, "
        f"after which the system returns an annotated image, a field-level result, and harvest advice. On {n} "
        f"test images not used in training, the trained model identified ready-to-harvest paddy with "
        f"{pct(after['accuracy'])} accuracy, compared with {pct(before['accuracy'])} for colour analysis alone.")
    replace_in_para(find_para(doc, "Keywords:"), "web-based system", "web-based system, Roboflow")

    # Chapter 2: tools paragraph + new training subsection
    replace_in_para(body,
        "Roboflow is utilized for training and hosting the Convolutional Neural Network (CNN) model that "
        "detects each rice panicle in an image, while OpenCV analyzes the colour of each detected panicle",
        f"Roboflow ({RF}) is utilized for training and hosting the two deep-learning models of the system, an "
        f"object detection model that locates each rice panicle in an image and an image classification model "
        f"that estimates the maturity of the paddy, while OpenCV analyzes the colour of each detected panicle")

    s = det["split"]; m = mat["split"]
    ch2 = [
        ("Model Training on Roboflow", True),
        (f"To train the two models of the system, the researchers created two projects in their own Roboflow "
         f"workspace and forked publicly available datasets from Roboflow Universe into them. For panicle "
         f"detection, the Rice Panicle Dataset of Tasnuva (2024), with 5,572 annotated images, was forked and the "
         f"2,628 annotated images of the Rice-Panicle dataset of EWURicedataset (2023) were added to it, giving "
         f"{det['images_total']:,} images with a bounding box around each rice panicle. For maturity "
         f"classification, the Paddy-MaturityLevel-Dataset of Kelompok Genius 3 (2023), with "
         f"{mat['images_total']:,} paddy images, was forked and its classes Raw and Ripe were renamed Immature "
         f"({mat['classes_count']['Immature']} images) and Mature ({mat['classes_count']['Mature']} images).", False),
        (f"The detection dataset kept the training, validation, and test splits of its source datasets "
         f"({s['train']:,}, {s['valid']:,}, and {s['test']} images), so that the test images of each source stayed "
         f"unseen during training, while the maturity dataset was split into {m['train']} training, "
         f"{m['valid']} validation, and {m['test']} test images. Both datasets were auto-oriented and resized, to "
         f"640×640 pixels for detection and 224×224 pixels for classification. To increase variability, Roboflow "
         f"applied random augmentations to the training images in every training epoch. Detection images were "
         f"flipped, brightened or darkened by up to 20%, blurred, combined into mosaics, shifted in hue and "
         f"saturation, converted to grayscale, and zoomed and shifted. Maturity images were only flipped, rotated "
         f"by up to 15°, brightened or darkened by up to 15%, and lightly blurred; their hue and saturation were "
         f"deliberately left unchanged because colour is the main visible sign of maturity.", False),
        (f"Both models were trained with Roboflow’s hosted training service ({RF}). The detection model was "
         f"trained as a YOLO26 Nano object detector, starting from weights pre-trained on the COCO dataset, for "
         f"{det['finished_epochs']} epochs. The maturity model was trained as a Vision Transformer (ViT-Base, "
         f"16×16 patches, 224×224 input), starting from weights pre-trained on ImageNet-21k, with the two classes "
         f"Immature and Mature; Roboflow’s early stopping ended its training after {mat['finished_epochs']} of the "
         f"{mat['epochs']} planned epochs, when the validation results stopped improving.", False),
        ("The web system sends each uploaded photo to both models through Roboflow’s hosted inference API. The "
         "maturity model returns the probability that the photo shows mature paddy: a probability below 0.35 is "
         "reported as Immature, above 0.65 as Ready for Harvest, and values in between as Nearly Mature, because "
         "no available public dataset labels the transition stage. The bounding boxes from the detection model "
         "are coloured by the HSV colour analysis of each panicle. If the maturity model cannot be reached, the "
         "system falls back to classifying the field by HSV colour analysis alone, and photos that are too dark or "
         "too blurry are rejected with a request to retake them.", False),
        (f"Roboflow’s own test split was not used to measure the maturity model’s accuracy, because the forked "
         f"dataset contains augmented copies of the same photos in more than one split. Instead, the researchers "
         f"built an independent test set of images that were not used in training: 221 images from the paddy "
         f"dataset of Agrisense Dataset (2024) whose photos do not appear in the training data, and 13 labelled "
         f"field photos taken by the researchers. One image was rejected by the photo-quality check, leaving {n} "
         f"scored images ({n_imm} Immature and {n_mat} Mature).", False),
    ]
    anchor = find_para(doc, "Engineered Product")
    for text, is_heading in ch2:
        anchor = clone_after(anchor, sub if is_heading else body, [(text, is_heading, None)])

    # Chapter 3, Problem 2
    arch = find_para(doc, "The classification system employs a two-stage")
    replace_in_para(arch, "a pre-trained object detection model hosted on the Roboflow serverless inference API",
                    f"an object detection model trained by the researchers and hosted on the Roboflow inference "
                    f"API ({RF})")
    replace_in_para(arch, "trained on the Tanisha Tasnuva Rice Panicle Dataset comprising 5,572 annotated images "
                    "of rice panicles (licensed under CC BY 4.0),",
                    f"trained on {det['images_total']:,} annotated rice panicle images from the datasets of "
                    f"Tasnuva (2024) and EWURicedataset (2023), both licensed under CC BY 4.0,")

    clone_after(find_para(doc, "The HSV thresholds were calibrated"), body, [(
        "In addition to the per-panicle colour analysis, the whole photo is classified by the trained maturity "
        "model described in Chapter 2, which returns the probability that the paddy is mature. This probability "
        "sets the field-level result and the confidence shown to the farmer (Immature below 0.35, Ready for "
        "Harvest above 0.65, and Nearly Mature in between), while the HSV labels colour the individual bounding "
        "boxes. When the maturity model is unavailable, the field-level result is computed from the HSV labels of "
        "the panicles, as in the earlier prototype.", None, None)])

    training = find_para(doc, "The panicle detection model was trained using the Roboflow")
    set_text(training,
        f"The panicle detection model was trained by the researchers using Roboflow’s cloud training service "
        f"({RF}) on {det['images_total']:,} annotated images merged from the rice panicle datasets of Tasnuva "
        f"(2024) and EWURicedataset (2023), as described in Chapter 2. The model was trained for object detection, "
        f"meaning its task was to locate panicle regions in the image rather than to assign maturity labels. On its "
        f"validation set of {dv['images']:,} images ({dv['boxes']:,} panicles), it reached a mean average precision "
        f"at 0.50 intersection over union (mAP@50) of {pct(dv['mAP50'])}, with {pct(dv['precision'])} precision "
        f"and {pct(dv['recall'])} recall; on its held-out test set of {dt['images']} images ({dt['boxes']:,} "
        f"panicles), it reached {pct(dt['mAP50'])} mAP@50, {pct(dt['precision'])} precision, and "
        f"{pct(dt['recall'])} recall. Maturity was classified separately by the Vision Transformer model trained on "
        f"the paddy maturity dataset of Kelompok Genius 3 (2023).")

    # Before/after table goes in as Table 6; the evaluation tables become 7-10
    tables_bumped = bump_tables(doc, 6)
    cap_tpl = [p for p in doc.paragraphs  # the caption, not its List of Tables entry
               if p.text.startswith("Table 7. Users’ Evaluation of PaddyScan in terms of Functional")][-1]
    legend_tpl = find_para(doc, "Legend: 4.20")
    intro = clone_after(training, body, [(
        f"Table 6 compares the ready-to-harvest accuracy of the system before and after model training on the "
        f"independent test set of {n} images described in Chapter 2. “Before” is the earlier prototype, in which "
        f"the field-level result came from HSV colour analysis alone; “after” is the system with the trained "
        f"maturity model. A photo was counted as correct when the system’s answer to “Is it ready to harvest?” "
        f"(Ready for Harvest, versus Immature or Nearly Mature) matched the photo’s label.", None, None)])
    caption = clone_after(intro, cap_tpl, [(
        "Table 6. Ready-to-Harvest Accuracy Before and After Model Training", None, None)])

    tbl = copy.deepcopy(doc.tables[5]._tbl)  # Functional Suitability table: 3 columns
    caption._p.addnext(tbl)
    table = docx.table.Table(tbl, caption._parent)
    rows = [("Measure", "HSV only (before)", "Trained model (after)"),
            ("Accuracy", pct(before["accuracy"]), pct(after["accuracy"])),
            ("Precision (Mature)", pct(before["precision_mature"]), pct(after["precision_mature"])),
            ("Recall (Mature)", pct(before["recall_mature"]), pct(after["recall_mature"])),
            ("Mean confidence", pct(before["mean_confidence"]), pct(after["mean_confidence"]))]
    for extra in table.rows[len(rows):]:
        tbl.remove(extra._tr)
    widths = [Inches(3.0), Inches(1.5), Inches(1.5)]
    for col, w in zip(tbl.tblGrid.findall(qn("w:gridCol")), widths):
        col.set(qn("w:w"), str(int(w.twips)))
    for row, values in zip(table.rows, rows):
        for cell, w in zip(row.cells, widths):
            cell.width = w
        for cell, value in zip(row.cells, values):
            set_text(cell.paragraphs[0], value)
            for p in cell.paragraphs[1:]:
                p._p.getparent().remove(p._p)

    legend = clone_after(table, legend_tpl, [(
        f"n = {n} independent test images ({n_imm} Immature, {n_mat} Mature). Precision and recall are for the "
        f"Mature (ready to harvest) class; mean confidence is the average confidence the system reported.",
        None, True)])
    clone_after(legend, body, [(
        f"As shown in Table 6, training the maturity model raised the accuracy from {pct(before['accuracy'])} to "
        f"{pct(after['accuracy'])} and the mean confidence from {pct(before['mean_confidence'])} to "
        f"{pct(after['mean_confidence'])}. The largest gain was in recall: colour analysis alone labelled "
        f"{missed_before} of the {n_mat} mature photos as not yet ready, while the trained model missed "
        f"{missed_after}. The trained model labelled all {n_imm} immature photos correctly, so it never advised "
        f"harvesting a field that was not ready, although with only {n_imm} immature photos in the test set this "
        f"result rests on a small sample.", None, None)])

    # List of Tables entry
    lot5 = find_para(doc, "Table 5. Farmers’ Assessment of the Perceived")
    lot = clone_after(lot5, lot5, [("Table 6. Ready-to-Harvest Accuracy Before and After Model Training", False, None),
                                   ("\t0", False, None)])

    # Problem 3 architecture and classifier page
    replace_in_para(find_para(doc, "As shown in Figure 4, PaddyScan"),
                    "the Roboflow serverless inference API, which performs the panicle detection",
                    f"the Roboflow inference API ({RF}), which hosts the trained panicle detection and maturity "
                    f"classification models")
    replace_in_para(find_para(doc, "Once an image is uploaded, the system sends"),
                    "The backend calls the Roboflow detection API to identify panicles, performs HSV analysis on "
                    "each detected panicle, aggregates the results into an overall field-level classification,",
                    "The backend calls the trained Roboflow detection model to identify panicles and the trained "
                    "maturity model to classify the field, performs HSV analysis on each detected panicle,")

    # Chapter 4
    summ = find_para(doc, "A two-stage image classification pipeline was successfully developed")
    replace_in_para(summ, "(trained on the 5,572-image Tanisha Tasnuva Rice Panicle Dataset via the Roboflow cloud "
                    "inference API) for per-panicle detection with HSV colour analysis for maturity classification",
                    f"(a YOLO26 model the researchers trained on Roboflow with {det['images_total']:,} annotated rice "
                    f"panicle images) for per-panicle detection with a Vision Transformer maturity classifier, also "
                    f"trained on Roboflow, and HSV colour analysis of each panicle")
    set_text(summ, summ.text.rstrip() + f" On {n} independent test images, the trained maturity model identified "
             f"ready-to-harvest paddy with {pct(after['accuracy'])} accuracy, up from {pct(before['accuracy'])} with "
             f"colour analysis alone.")
    concl = find_para(doc, "2. The two-stage image classification pipeline")
    set_text(concl, concl.text.rstrip() + f" Training dedicated detection and maturity models on Roboflow raised "
             f"the ready-to-harvest accuracy from {pct(before['accuracy'])} to {pct(after['accuracy'])} on images "
             f"not used in training.")
    rec3 = find_para(doc, "3. Future researchers should expand the training dataset")
    set_text(rec3, rec3.text.rstrip() + " In particular, labelled Nearly Mature photos and local field photos from "
             "Abra should be collected, because the current maturity model infers Nearly Mature from its "
             "probability rather than learning it from labelled examples, and photos without paddy in frame are "
             "not yet rejected.")

    # References (APA 7; house style: author-year bold, title italic)
    refs = [
        [("Agrisense Dataset. (2024).", True, None), (" ", None, None), ("Paddy dataset", None, True),
         (" [Data set]. Roboflow Universe. https://universe.roboflow.com/agrisense-dataset/paddy-o34tk", None, None)],
        [("Dwyer, B., Nelson, J., Hansen, T., et al. (2026).", True, None), (" ", None, None), ("Roboflow", None, True),
         (" (Version 1.0) [Computer software]. https://roboflow.com", None, None)],
        [("EWURicedataset. (2023).", True, None), (" ", None, None), ("Rice-Panicle dataset", None, True),
         (" [Data set]. Roboflow Universe. https://universe.roboflow.com/ewuricedataset/rice-panicle-uyxgj", None, None)],
        [("Kelompok Genius 3. (2023).", True, None), (" ", None, None), ("Paddy-MaturityLevel-Dataset", None, True),
         (" [Data set]. Roboflow Universe. https://universe.roboflow.com/kelompok-genius-3/paddy-maturitylevel-dataset",
          None, None)],
        [("Tasnuva, T. (2024).", True, None), (" ", None, None), ("Rice panicle dataset", None, True),
         (" [Data set]. Roboflow Universe. https://universe.roboflow.com/tanisha-tasnuva-9t1fk/rice-panicle-dataset",
          None, None)],
    ]
    for parts in refs:
        insert_reference_sorted(doc, parts).alignment = WD_ALIGN_PARAGRAPH.LEFT  # long URLs stretch justified lines

    doc.save(out)
    print(f"Wrote {out}  (tables renumbered in {tables_bumped} runs, {len(refs)} references, "
          f"{len(ch2)} Ch2 paragraphs)")


if __name__ == "__main__":
    main(*sys.argv[1:3])
