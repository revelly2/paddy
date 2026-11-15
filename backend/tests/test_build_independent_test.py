import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "ml"))
from build_independent_test import parse_list  # noqa: E402


def test_parse_list_skips_comments_and_blank_lines():
    text = "# header\nMature abc123\n\nImmature xyz789\n"
    assert parse_list(text) == [("Mature", "abc123"), ("Immature", "xyz789")]


def test_parse_list_rejects_unknown_label():
    import pytest
    with pytest.raises(ValueError):
        parse_list("Ripe abc123\n")


def test_committed_list_has_221_images():
    path = os.path.join(os.path.dirname(__file__), "..", "..", "ml", "agrisense_unseen.txt")
    items = parse_list(open(path, encoding="utf-8").read())
    assert len(items) == 221
    assert len({i for _, i in items}) == 221
    assert sum(1 for label, _ in items if label == "Immature") == 16
