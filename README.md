# business-agent_lab

A basic Python agent built on the [Anthropic Python SDK](https://github.com/anthropics/anthropic-sdk-python) tool runner.

## Layout

```
src/business_agent/
  agent.py   # agent loop (tool runner, model, system prompt)
  tools.py   # tools the agent can call — add new ones here
  main.py    # CLI entry point
tests/       # pytest tests
```

## Setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
export ANTHROPIC_API_KEY=...   # or: ant auth login
```

## Usage

```bash
business-agent "What's our margin on $12,000 revenue with $8,500 cost?"
pytest
```
