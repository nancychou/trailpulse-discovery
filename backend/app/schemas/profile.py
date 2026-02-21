from __future__ import annotations
from pydantic import BaseModel


class ProfileOut(BaseModel):
    id: str
    email: str
    displayName: str
    gender: str
    avatarUrl: str
    bio: str
    savedRaceIds: list[str]
    groupRunIds: list[str]
    createdAt: str


class ProfileUpdate(BaseModel):
    display_name: str | None = None
    gender: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    saved_race_ids: list[str] | None = None
    group_run_ids: list[str] | None = None
