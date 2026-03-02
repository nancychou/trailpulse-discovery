"""Persistent memory tool — stores and recalls user info across sessions using SQLite."""

import json
import sqlite3
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "agent_memory.db"


def _conn() -> sqlite3.Connection:
    con = sqlite3.connect(DB_PATH)
    con.execute("""
        CREATE TABLE IF NOT EXISTS memories (
            category  TEXT NOT NULL,
            key       TEXT NOT NULL,
            value     TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            PRIMARY KEY (category, key)
        )
    """)
    con.commit()
    return con


def remember(category: str, key: str, value: str) -> dict:
    """Save a fact about the user for future sessions.

    Args:
        category: Group the memory belongs to.
                  Use 'profile' for personal info (name, fitness level, home city),
                  'preferences' for likes/dislikes,
                  'history' for past runs and plans,
                  'goals' for upcoming races or training targets.
        key:   Short label, e.g. 'fitness_level', 'home_city', 'goal_race'.
        value: The value to store, e.g. 'advanced', 'Seattle', 'UTMB 2026'.

    Returns:
        Confirmation dict.
    """
    with _conn() as con:
        con.execute(
            "INSERT OR REPLACE INTO memories (category, key, value, updated_at) VALUES (?,?,?,?)",
            (category, key, str(value), datetime.now().isoformat()),
        )
    return {"saved": True, "category": category, "key": key, "value": value}


def recall(category: str = None) -> dict:
    """Retrieve stored memories, optionally filtered by category.

    Args:
        category: One of 'profile', 'preferences', 'history', 'goals',
                  or omit to retrieve everything.

    Returns:
        Dict with list of memory entries.
    """
    con = _conn()
    if category:
        rows = con.execute(
            "SELECT category, key, value, updated_at FROM memories WHERE category=? ORDER BY updated_at DESC",
            (category,),
        ).fetchall()
    else:
        rows = con.execute(
            "SELECT category, key, value, updated_at FROM memories ORDER BY category, key"
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


def forget(category: str, key: str) -> dict:
    """Delete a specific stored memory.

    Args:
        category: Category of the memory to delete.
        key:      Key of the memory to delete.

    Returns:
        Confirmation dict.
    """
    with _conn() as con:
        con.execute("DELETE FROM memories WHERE category=? AND key=?", (category, key))
    return {"deleted": True, "category": category, "key": key}
