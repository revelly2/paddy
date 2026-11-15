"""
fix_toc_pages.py
================
Set the page numbers in the Table of Contents and the Lists of Tables, Figures
and Plates of a .docx from where each heading/caption actually lands in a
LibreOffice PDF render. Re-renders until no number changes.

Usage:  python thesis/fix_toc_pages.py <paper.docx>
Writes <paper>.pdf next to the docx.
"""

import os
import re
import shutil
import subprocess
import sys
import tempfile

import docx
import pymupdf

SOFFICE = r"C:\Program Files\LibreOffice\program\soffice.com"
ENTRY = re.compile(r"^(.+?)\t+\s*([ivxlc]+|\d+)\s*$")


def render(path: str, outdir: str) -> list[list[str]]:
    subprocess.run([SOFFICE, "--headless", "--convert-to", "pdf", "--outdir", outdir, path],
                   check=True, capture_output=True)
    pdf = os.path.join(outdir, os.path.splitext(os.path.basename(path))[0] + ".pdf")
    return [[l.strip() for l in pg.get_text().splitlines() if l.strip()] for pg in pymupdf.open(pdf)]


def candidates(title: str) -> list[str]:
    """'CHAPTER 1 – INTRODUCTION' is printed as 'INTRODUCTION'; 'APPENDIX A – X' as 'APPENDIX A'."""
    out = [title]
    if "–" in title:
        head, tail = (s.strip() for s in title.split("–", 1))
        out += [tail, head]
    return out


def matches(line: str, cand: str) -> bool:
    line, cand = line.lower(), cand.lower()
    if len(cand) < 30:
        return line == cand or line.startswith(cand + " (")  # 'Survey Tools Used (Face-to-Face ...)'
    return line.startswith(cand[:45])


def locate(pages, title: str, start: int):
    """First page index >= start that has the title (or a candidate) as a line -> (index, printed number)."""
    for i in range(start, len(pages)):
        if any(matches(l, c) for l in pages[i][1:] for c in candidates(title)):
            return i, pages[i][0]
    return None


def entries(doc):
    """TOC/list paragraphs: 'Title<TAB>page' lines before the body (first 'Chapter 1' line)."""
    out = []
    for p in doc.paragraphs:
        if p.text.strip().lower() == "chapter 1":
            break
        m = ENTRY.match(p.text.strip())
        if m:
            out.append((p, m.group(1).strip(), m.group(2)))
    return out


def fix_once(path: str, pages) -> list[str]:
    doc = docx.Document(path)
    body_start = next(i for i, pg in enumerate(pages) if pg and pg[0] == "1")
    changes, last = [], {}
    for p, title, old in entries(doc):
        front = title.isupper() and not title.startswith(("CHAPTER", "APPENDIX", "REFERENCES", "SURVEY"))
        # entries of one list appear in page order, so search on from the previous hit
        group = title.split()[0] if title.split()[0] in ("Table", "Figure", "Plate") else "toc"
        start = 1 if front else last.get(group, body_start)
        found = locate(pages, title, start)
        if not found:
            changes.append(f"NOT FOUND: {title}")
            continue
        if not front:
            last[group] = found[0]
        new = found[1]
        if new != old:
            run = p.runs[-1]
            if old not in run.text:
                raise RuntimeError(f"Page number not in the last run of {title!r}")
            run.text = run.text[::-1].replace(old[::-1], new[::-1], 1)[::-1]
            changes.append(f"{title[:60]}: {old} -> {new}")
    doc.save(path)
    return changes


def main(path: str) -> None:
    tmp = tempfile.mkdtemp()
    for round_ in range(1, 5):
        changes = fix_once(path, render(path, tmp))
        print(f"round {round_}: {len(changes)} change(s)")
        for c in changes:
            print("  ", c)
        if not [c for c in changes if not c.startswith("NOT FOUND")]:
            break
    pdf = os.path.splitext(path)[0] + ".pdf"
    shutil.copy(os.path.join(tmp, os.path.basename(pdf)), pdf)
    print("Wrote", pdf)


if __name__ == "__main__":
    main(sys.argv[1])
