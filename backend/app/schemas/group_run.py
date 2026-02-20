import re
from pydantic import BaseModel, Field, field_validator
from typing import Literal

GROUP_RUN_TYPES = Literal["easy", "moderate", "hard", "race_pace", "social"]
ALLOWED_COLORS = Literal[
    "text-primary",
    "text-green-500",
    "text-blue-500",
    "text-orange-500",
    "text-red-500",
    "text-purple-500",
]

# ISO 8601 datetime pattern (e.g., "2026-03-15T07:00")
_TIME_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$")


class GroupRunOut(BaseModel):
    id: str
    trailId: str | None = None
    name: str
    time: str
    type: str
    color: str
    avatarUrl: str
    createdAt: str


class GroupRunCreate(BaseModel):
    trail_id: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=2, max_length=100, strip_whitespace=True)
    time: str = Field(..., description="ISO 8601 datetime string, e.g. '2026-03-15T07:00'")
    type: GROUP_RUN_TYPES
    color: ALLOWED_COLORS = "text-primary"

    @field_validator("time")
    @classmethod
    def validate_time_format(cls, v: str) -> str:
        if not _TIME_PATTERN.match(v):
            raise ValueError("time must be in 'YYYY-MM-DDTHH:MM' format")
        return v
