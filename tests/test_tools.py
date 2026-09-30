from business_agent.tools import calculate_margin, get_today


def test_calculate_margin():
    assert calculate_margin(revenue=200, cost=150) == "profit=50.00, margin=25.00%"


def test_calculate_margin_zero_revenue():
    assert calculate_margin(revenue=0, cost=10).startswith("Error")


def test_get_today_is_iso_date():
    assert len(get_today()) == 10
