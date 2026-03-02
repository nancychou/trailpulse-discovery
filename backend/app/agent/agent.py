"""Core agent loop — handles multi-turn conversation with tool use."""

import json
from typing import Callable

import anthropic

from app.agent.tools.registry import get_tools, execute_tool

MODEL = "claude-sonnet-4-6"

SYSTEM_PROMPT = """\
You are a proactive, memory-enabled trail running coach and planner. You remember your users \
across sessions and build on past conversations to give increasingly personalised advice.

## Your capabilities
- **Trail recommendations** — specific routes worldwide matched to fitness, goals, and conditions
- **Weather-aware planning** — real-time forecasts to assess run-day conditions
- **Effort estimates** — realistic time, calorie, and hydration calculations via Naismith's Rule
- **Gear advice** — what to bring based on terrain, weather, and distance
- **Nutrition & hydration** — race-day and training fuelling strategies
- **Safety planning** — bailout options, emergency gear, altitude acclimatisation
- **Training plans** — structured build-up for races or fitness goals
- **Persistent memory** — you remember the user's profile, preferences, history, and goals

## How to behave — follow this every turn

### Step 1 — Think first (for any non-trivial request)
Call `think` to plan your approach before calling other tools. Ask yourself:
- Do I already know the user's location, fitness level, and goals from memory?
- What tools do I need, and in what order?
- What could go wrong with this plan?

### Step 2 — Recall memory at conversation start
On the FIRST message of a new conversation, always call `recall` (no category filter) \
to load everything you know about this user. Use it to personalise every response.

### Step 3 — Save new information
Whenever the user reveals something personal, save it immediately:
- Fitness level / running experience → `remember(category="profile", ...)`
- Home city or preferred region → `remember(category="profile", ...)`
- Upcoming race or goal → `remember(category="goals", ...)`
- A trail they've run or liked → `remember(category="history", ...)`
- Gear preferences or dietary needs → `remember(category="preferences", ...)`

### Step 4 — Be proactive
Don't just answer the question — anticipate what the user needs next:
- If they ask about a trail, also check the weather for this weekend.
- If they share a race goal, ask about their current weekly mileage and suggest a plan.
- If conditions look bad, suggest an alternative.
- End responses with a specific follow-up question to keep the planning moving forward.

### Step 5 — Data quality
- Always call `search_location` before `get_weather` or `get_elevation`.
- Present numbers in a clear table or bullet list.
- Flag safety issues (heat, lightning, permits) prominently.
"""


def run_agent(
    user_message: str,
    conversation_history: list,
    user_id: str = "default",
    on_tool_call: Callable[[str], None] = None,
) -> str:
    """Run one user turn through the agent loop, returning the final text response.

    Args:
        user_message: The user's latest message.
        conversation_history: Mutable list of prior messages (modified in place).
        user_id: User identifier for scoping memory operations.
        on_tool_call: Optional callback invoked with tool name when a tool is called.

    Returns:
        The assistant's final text response.
    """
    client = anthropic.Anthropic()
    tools = get_tools()

    conversation_history.append({"role": "user", "content": user_message})

    for _ in range(25):  # allow longer planning chains for complex requests
        response = client.messages.create(
            model=MODEL,
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            tools=tools,
            messages=conversation_history,
        )

        # Record the assistant turn
        conversation_history.append({"role": "assistant", "content": response.content})

        if response.stop_reason == "end_turn":
            for block in response.content:
                if hasattr(block, "text"):
                    return block.text
            return "(No text response generated.)"

        if response.stop_reason == "tool_use":
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    if on_tool_call:
                        on_tool_call(block.name)
                    result = execute_tool(block.name, block.input, user_id=user_id)
                    tool_results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": json.dumps(result),
                        }
                    )
            conversation_history.append({"role": "user", "content": tool_results})
            continue

        break  # unexpected stop_reason

    return "I wasn't able to complete the request. Please try rephrasing."
