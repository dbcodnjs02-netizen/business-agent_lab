"""Tools the agent can call. Add new tools here and register them in TOOLS."""

from datetime import date

from anthropic import beta_tool


@beta_tool
def get_today() -> str:
    """Get today's date in ISO format (YYYY-MM-DD)."""
    return date.today().isoformat()


@beta_tool
def calculate_margin(revenue: float, cost: float) -> str:
    """Calculate gross profit and gross margin.

    Args:
        revenue: Total revenue.
        cost: Total cost of goods sold.
    """
    if revenue == 0:
        return "Error: revenue must be non-zero to compute a margin."
    profit = revenue - cost
    return f"profit={profit:.2f}, margin={profit / revenue:.2%}"


TOOLS = [get_today, calculate_margin]
