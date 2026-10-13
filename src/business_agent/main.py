"""Command-line entry point: `business-agent "your question"`."""

import sys

from business_agent.agent import run


def main() -> None:
    if len(sys.argv) < 2:
        print('Usage: business-agent "your question"', file=sys.stderr)
        sys.exit(1)
    print(run(" ".join(sys.argv[1:])))


if __name__ == "__main__":
    main()
