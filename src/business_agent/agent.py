"""Agent loop built on the Anthropic SDK tool runner."""

import anthropic

from business_agent.tools import TOOLS

MODEL = "claude-opus-5"
SYSTEM_PROMPT = (
    "You are a helpful business assistant. Use the available tools when they "
    "help answer the user's question accurately."
)


def run(prompt: str, client: anthropic.Anthropic | None = None) -> str:
    """Run the agent on a single prompt and return its final text answer."""
    client = client or anthropic.Anthropic()
    runner = client.beta.messages.tool_runner(
        model=MODEL,
        max_tokens=16000,
        system=SYSTEM_PROMPT,
        thinking={"type": "adaptive"},
        # Re-run on a fallback model if the request is declined by a safety classifier.
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        tools=TOOLS,
        messages=[{"role": "user", "content": prompt}],
    )
    final = runner.until_done()

    if final.stop_reason == "refusal":
        return "The request was declined."
    return "".join(block.text for block in final.content if block.type == "text")
