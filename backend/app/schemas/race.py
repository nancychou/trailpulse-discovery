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
