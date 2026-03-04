from pydantic import BaseModel
from typing import Optional


class RaceOut(BaseModel):
    id: str
    name: str
    location: str
    country: str
    date: str
    type: str
    distance: str
    distanceKm: float
    elevation: str
    rating: float
    difficultyRank: int
    reviewCount: str
    imageUrl: str
    qualifiers: list[str]


class RaceStatsOut(BaseModel):
    """Race statistics aggregated by country."""
    country: str
    raceCount: int
    avgDistanceKm: float
    minDistanceKm: float
    maxDistanceKm: float
    avgRating: float
    avgDifficulty: float
    qualifiers: list[str]
