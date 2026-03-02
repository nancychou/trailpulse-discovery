"""Persistent memory tool — stores and recalls user info across sessions using SQLite, scoped per user."""

import sqlite3
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent.parent.parent.parent / "agent_memory.db"


def _conn() -> sqlite3.Connection:
    con = sqlite3.connect(DB_PATH)
    con.execute("""
        CREATE TABLE IF NOT EXISTS memories (
            user_id   TEXT NOT NULL,
            category  TEXT NOT NULL,
            key       TEXT NOT NULL,
            value     TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            PRIMARY KEY (user_id, category, key)
        )
    """)
    con.commit()
    return con


def remember(category: str, key: str, value: str, user_id: str = "default") -> dict:
    """Save a fact about the user for future sessions.

    Args:
        category: Group the memory belongs to.
                  Use 'profile' for personal info (name, fitness level, home city),
                  'preferences' for likes/dislikes,
                  'history' for past runs and plans,
                  'goals' for upcoming races or training targets.
        key:   Short label, e.g. 'fitness_level', 'home_city', 'goal_race'.
        value: The value to store, e.g. 'advanced', 'Seattle', 'UTMB 2026'.
        user_id: User identifier for scoping memory.

    Returns:
        Confirmation dict.
    """
    with _conn() as con:
        con.execute(
            "INSERT OR REPLACE INTO memories (user_id, category, key, value, updated_at) VALUES (?,?,?,?,?)",
            (user_id, category, key, str(value), datetime.now().isoformat()),
        )
    return {"saved": True, "category": category, "key": key, "value": value}


def recall(category: str = None, user_id: str = "default") -> dict:
    """Retrieve stored memories, optionally filtered by category.

    Args:
        category: One of 'profile', 'preferences', 'history', 'goals',
                  or omit to retrieve everything.
        user_id: User identifier for scoping memory.

    Returns:
        Dict with list of memory entries.
    """
    con = _conn()
    if category:
        rows = con.execute(
            "SELECT category, key, value, updated_at FROM memories WHERE user_id=? AND category=? ORDER BY updated_at DESC",
            (user_id, category),
        ).fetchall()
    else:
        rows = con.execute(
            "SELECT category, key, value, updated_at FROM memories WHERE user_id=? ORDER BY category, key",
            (user_id,),
        ).fetchall()

    memories = [
        {"category": r[0], "key": r[1], "value": r[2], "updated_at": r[3]}
        for r in rows
    ]
    return {
        "total": len(memories),
        "memories": memories,
        "message": "No memories stored yet." if not memories else f"{len(memories)} memories found.",
    }


def forget(category: str, key: str, user_id: str = "default") -> dict:
    """Delete a specific stored memory.

    Args:
        category: Category of the memory to delete.
        key:      Key of the memory to delete.
        user_id: User identifier for scoping memory.

    Returns:
        Confirmation dict.
    """
    with _conn() as con:
        con.execute("DELETE FROM memories WHERE user_id=? AND category=? AND key=?", (user_id, category, key))
    return {"deleted": True, "category": category, "key": key}
