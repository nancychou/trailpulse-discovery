"""Trail Planning AI — interactive CLI entry point."""

import os
import sys

# Load .env before importing agent (which initialises Anthropic client)
from dotenv import load_dotenv

load_dotenv()

try:
    from rich.console import Console
    from rich.markdown import Markdown
    from rich.panel import Panel
    from rich.prompt import Prompt
    from rich.text import Text

    RICH = True
except ImportError:
    RICH = False

from agent import run_agent

console = Console() if RICH else None

WELCOME_TEXT = """\
[bold green]Trail Running Planner AI[/bold green]
[dim]Powered by Claude {model}[/dim]

Ask me anything about trail running:
  • Trail recommendations for any location or fitness level
  • Weather check for your planned run date
  • Effort estimates — time, calories, hydration
  • Gear lists for different conditions
  • Nutrition & pacing strategies
  • Training plans for upcoming races

[dim]Type [bold]quit[/bold] or [bold]exit[/bold] to stop · [bold]clear[/bold] to reset conversation[/dim]\
"""

TOOL_LABELS = {
    "search_location": "Locating…",
    "get_weather": "Checking weather…",
    "get_elevation": "Reading elevation…",
    "calculate_run_stats": "Crunching numbers…",
    "search_trails": "Searching trails…",
}


def _check_api_key() -> None:
    if not os.getenv("ANTHROPIC_API_KEY"):
        msg = (
            "ANTHROPIC_API_KEY is not set.\n"
            "Add it to a .env file (see .env.example) or export it in your shell:\n"
            "  export ANTHROPIC_API_KEY=sk-ant-..."
        )
        if RICH:
            console.print(Panel(msg, title="[red]Missing API Key[/red]", border_style="red"))
        else:
            print(f"Error: {msg}")
        sys.exit(1)


def _print_welcome() -> None:
    from agent import MODEL

    if RICH:
        console.print(
            Panel(
                WELCOME_TEXT.format(model=MODEL),
                title="🏔️  Trail AI",
                border_style="green",
                padding=(1, 2),
            )
        )
    else:
        print("=" * 60)
        print("Trail Running Planner AI")
        print("=" * 60)
        print("Ask about trails, weather, training plans, and more.")
        print("Type 'quit' to exit, 'clear' to reset conversation.\n")


def _print_response(text: str) -> None:
    if RICH:
        console.print(Panel(Markdown(text), title="[blue]Trail AI[/blue]", border_style="blue", padding=(1, 2)))
    else:
        print("\n[Trail AI]")
        print(text)
        print()


def _on_tool_call(tool_name: str) -> None:
    label = TOOL_LABELS.get(tool_name, f"Running {tool_name}…")
    if RICH:
        console.print(f"  [dim]⚙ {label}[/dim]")
    else:
        print(f"  [{label}]")


def main() -> None:
    _check_api_key()
    _print_welcome()

    conversation: list = []

    while True:
        try:
            if RICH:
                user_input = Prompt.ask("\n[bold green]You[/bold green]").strip()
            else:
                user_input = input("\nYou: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nHappy trails! 🏃")
            break

        if not user_input:
            continue

        if user_input.lower() in ("quit", "exit", "q"):
            if RICH:
                console.print("[dim]Happy trails! 🏃[/dim]")
            else:
                print("Happy trails!")
            break

        if user_input.lower() == "clear":
            conversation.clear()
            if RICH:
                console.print("[dim]Conversation cleared.[/dim]")
            else:
                print("Conversation cleared.")
            continue

        try:
            if RICH:
                with console.status("[dim]Planning your adventure…[/dim]", spinner="dots"):
                    response = run_agent(user_input, conversation, on_tool_call=_on_tool_call)
            else:
                print("Thinking…")
                response = run_agent(user_input, conversation, on_tool_call=_on_tool_call)

            _print_response(response)

        except Exception as e:
            err = f"Something went wrong: {e}"
            if RICH:
                console.print(f"[red]{err}[/red]")
            else:
                print(err)


if __name__ == "__main__":
    main()
