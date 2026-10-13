"""Tests for the Week 05 tools.

Run from the project root:   python -m pytest week-05 -v

The tests never call the internet. For the tools that use requests.get,
monkeypatch replaces requests.get with a fake that returns a fixed response.
"""
from datetime import date, timedelta

import pytest

import tools


class FakeResponse:
    """Stands in for a requests response: a status code and a JSON body."""

    def __init__(self, data, status_code=200):
        self.data = data
        self.status_code = status_code

    def json(self):
        return self.data

    def raise_for_status(self):
        if self.status_code != 200:
            raise RuntimeError(f"HTTP {self.status_code}")


# Calculator ---------------------------------------------------------------

def test_calculator_four_operations():
    assert tools.calculator("add", 2, 3) == 5
    assert tools.calculator("subtract", 10, 4) == 6
    assert tools.calculator("multiply", 247, 38) == 9386
    assert tools.calculator("divide", 7, 2) == 3.5


def test_calculator_whole_float_becomes_int():
    assert tools.calculator("divide", 10, 2) == 5
    assert isinstance(tools.calculator("divide", 10, 2), int)


def test_calculator_errors():
    with pytest.raises(ValueError, match="division by zero"):
        tools.calculator("divide", 1, 0)
    with pytest.raises(ValueError, match="unknown operation"):
        tools.calculator("power", 2, 3)
    with pytest.raises(ValueError, match="must be numbers"):
        tools.calculator("add", "2", 3)


# Schedule reading ---------------------------------------------------------

def test_read_schedule_finds_events():
    events = tools.read_schedule("2026-10-14")
    assert [event["title"] for event in events] == ["Project meeting", "Badminton club"]


def test_read_schedule_no_events():
    assert tools.read_schedule("2026-10-15") == "no events on 2026-10-15"


def test_read_schedule_bad_date():
    with pytest.raises(ValueError, match="YYYY-MM-DD"):
        tools.read_schedule("October 14")


# Wikipedia search ---------------------------------------------------------

def test_search_wikipedia_cleans_excerpt(monkeypatch):
    page = {"title": "Seoul", "key": "Seoul", "excerpt": "<span>Seoul</span> is the capital &amp; largest city"}
    monkeypatch.setattr(tools.requests, "get", lambda *args, **kwargs: FakeResponse({"pages": [page]}))
    assert tools.search_wikipedia("Seoul") == [
        {"title": "Seoul", "url": "https://en.wikipedia.org/wiki/Seoul", "excerpt": "Seoul is the capital & largest city"}
    ]


def test_search_wikipedia_no_pages(monkeypatch):
    monkeypatch.setattr(tools.requests, "get", lambda *args, **kwargs: FakeResponse({"pages": []}))
    assert tools.search_wikipedia("zzzz") == "no Wikipedia pages found for zzzz"


# Note saving --------------------------------------------------------------

def test_save_note_writes_file(monkeypatch, tmp_path):
    monkeypatch.setattr(tools, "NOTES_DIR", tmp_path)
    assert tools.save_note("Gift Ideas", "Buy a gift for Minji.") == "saved notes/gift-ideas.md"
    assert (tmp_path / "gift-ideas.md").read_text(encoding="utf-8") == "Buy a gift for Minji.\n"


def test_save_note_never_replaces(monkeypatch, tmp_path):
    monkeypatch.setattr(tools, "NOTES_DIR", tmp_path)
    tools.save_note("todo", "first")
    assert tools.save_note("todo", "second") == "saved notes/todo-2.md"
    assert (tmp_path / "todo.md").read_text(encoding="utf-8") == "first\n"


def test_save_note_stays_inside_notes(monkeypatch, tmp_path):
    monkeypatch.setattr(tools, "NOTES_DIR", tmp_path)
    assert tools.save_note("../../secret", "x") == "saved notes/secret.md"


# Currency conversion (exercise) -------------------------------------------

def test_convert_currency(monkeypatch):
    rate = {"date": "2026-10-05", "base": "USD", "quote": "KRW", "rate": 1347.79}
    requested = []

    def fake_get(url, timeout):
        requested.append(url)
        return FakeResponse(rate)

    monkeypatch.setattr(tools.requests, "get", fake_get)
    result = tools.convert_currency(100, "usd", "krw")
    assert requested == ["https://api.frankfurter.dev/v2/rate/USD/KRW"]
    assert result["rate"] == 1347.79
    assert result["date"] == "2026-10-05"
    assert result["converted"] == 134779.0  # amount × rate


def test_convert_currency_service_error(monkeypatch):
    monkeypatch.setattr(
        tools.requests, "get", lambda *args, **kwargs: FakeResponse({"message": "not found"}, status_code=404)
    )
    with pytest.raises(ValueError, match="not found"):
        tools.convert_currency(100, "USD", "XXX")


def test_convert_currency_amount_must_be_number():
    with pytest.raises(ValueError, match="must be a number"):
        tools.convert_currency("100", "USD", "KRW")


# Days until a date (my own tool) ------------------------------------------

def test_days_until_future_and_past():
    today = date.today()
    assert tools.days_until((today + timedelta(days=73)).isoformat())["days"] == 73
    assert tools.days_until((today - timedelta(days=1)).isoformat())["days"] == -1
    assert tools.days_until(today.isoformat())["days"] == 0


def test_days_until_bad_date():
    with pytest.raises(ValueError, match="YYYY-MM-DD"):
        tools.days_until("2026/12/25")


# Tool definitions ---------------------------------------------------------

def test_every_definition_names_its_function():
    """A tool definition's "name" must match the function the program runs."""
    pairs = [
        (tools.CALCULATOR, tools.calculator),
        (tools.READ_SCHEDULE, tools.read_schedule),
        (tools.SEARCH_WIKIPEDIA, tools.search_wikipedia),
        (tools.SAVE_NOTE, tools.save_note),
        (tools.CONVERT_CURRENCY, tools.convert_currency),
        (tools.DAYS_UNTIL, tools.days_until),
    ]
    for definition, function in pairs:
        assert definition["function"]["name"] == function.__name__
