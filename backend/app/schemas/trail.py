from __future__ import annotations
from pydantic import BaseModel, Field, field_validator
from typing import Literal


class HazardOut(BaseModel):
    type: str
    message: str
    date: str


class ReviewOut(BaseModel):
    user: str
    avatar: str
    rating: float
    date: str
    text: str


class TrailListOut(BaseModel):
    """Lightweight trail schema for list/card views — no hazards/reviews."""
    id: str
    name: str
    difficulty: float | None = None
    calculatedDifficulty: str | None = None
    rating: float | None = None
    numVotes: int | None = None
    distance: float | None = None
    elevation: float | None = None
    highestPoint: float | None = None
    trailheadLat: float | None = None
    trailheadLng: float | None = None
    surface: str | None = None
    routeType: str | None = None
    waterSource: str | None = None
    imageUrl: str | None = None
    difficultyScore010: float | None = None


class TrailOut(BaseModel):
    id: str
    name: str
    rank: int | None = None
    difficulty: float | None = None
    calculatedDifficulty: str | None = None
    rating: float | None = None
    numVotes: int | None = None
    distance: float | None = None
    elevation: float | None = None
    highestPoint: float | None = None
    trailheadLat: float | None = None
    trailheadLng: float | None = None
    surface: str | None = None
    routeType: str | None = None
    waterSource: str | None = None
    imageUrl: str | None = None
    parkingTags: list[str] = []
    parkingStatus: str | None = None
    restrooms: str | None = None
    cellCoverage: str | None = None
    crowdLevel: float | None = None
    sourceUrl: str | None = None
    osmId: int | None = None
    osmName: str | None = None
    matchConfidence: float | None = None
    maxGradeP95: float | None = None
    surfacePrimary: str | None = None
    surfaceBreakdown: str | None = None
    distanceMi: float | None = None
    gradeP95: float | None = None
    surfacePenalty: float | None = None
    logDistance: float | None = None
    wtaDiffLevel: float | None = None
    difficultyScore010: float | None = None
    hazards: list[HazardOut] = []
    reviews: list[ReviewOut] = []


HAZARD_TYPES = Literal[
    "downed_tree",
    "trail_damage",
    "wildlife",
    "flooding",
    "snow_ice",
    "bridge_out",
    "fire_closure",
    "other",
]


class HazardCreate(BaseModel):
    trail_id: str = Field(..., min_length=1, max_length=100)
    type: HAZARD_TYPES
    message: str = Field(..., min_length=5, max_length=500)

    @field_validator("message")
    @classmethod
    def strip_message(cls, v: str) -> str:
        return v.strip()
