"""Think tool — gives the agent an explicit reasoning step before taking action (ReAct pattern)."""


def think(reasoning: str) -> dict:
    """Use this tool to reason through a complex problem step-by-step BEFORE calling other tools.

    This is your private scratchpad — the user does not see this output.
    Use it to:
    - Break a multi-step plan into ordered sub-tasks
    - Decide which tools to call and in what order
    - Check whether you have enough info or need to ask the user
    - Spot potential issues before committing to a plan

    Args:
        reasoning: Your step-by-step thinking. Be explicit and structured.
                   e.g. "User wants a weekend plan. Steps needed:
                         1. Check if I know their location from memory → recall profile
                         2. Get weather for Saturday and Sunday
                         3. Filter trails by distance and difficulty
                         4. Calculate effort for top candidate
                         5. Compose a full plan with gear advice"

    Returns:
        A pass-through dict so you can continue to the next tool call.
    """
    return {"status": "reasoning_complete", "thought_length": len(reasoning)}
