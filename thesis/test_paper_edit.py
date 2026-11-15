import docx

from paper_edit import bump_tables, insert_reference_sorted, replace_in_para


def _doc():
    d = docx.Document()
    d.add_paragraph("We used Roboflow for detection. See Table 6 and Tables 6 to 9, not Table 2.")
    d.add_paragraph("References")
    for name in ("Awais, M. (2025).", "Zhang, C. (2021)."):
        p = d.add_paragraph()
        p.add_run(name).bold = True
        p.add_run(" Title.")
    return d


def test_reference_lands_in_alphabetical_order_with_italic_title():
    d = _doc()
    insert_reference_sorted(d, [("Dwyer, B. (2026).", True, None), (" ", None, None), ("Roboflow", None, True)])
    texts = [p.text for p in d.paragraphs]
    assert texts[2:5] == ["Awais, M. (2025). Title.", "Dwyer, B. (2026). Roboflow", "Zhang, C. (2021). Title."]
    assert d.paragraphs[3].runs[2].italic is True


def test_bump_tables_only_moves_numbers_from_start():
    d = _doc()
    assert bump_tables(d, 6) == 1
    assert d.paragraphs[0].text.endswith("See Table 7 and Tables 7 to 10, not Table 2.")


def test_replace_across_runs_flattens_paragraph():
    d = docx.Document()
    p = d.add_paragraph()
    p.add_run("Roboflow is ")
    p.add_run("used.")
    replace_in_para(p, "is used", "(Dwyer et al., 2026) is used")
    assert p.text == "Roboflow (Dwyer et al., 2026) is used."
