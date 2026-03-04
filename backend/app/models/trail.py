from sqlalchemy import Column, String, Integer, Float, Text, ARRAY, DateTime, ForeignKey
from sqlalchemy.orm import DeclarativeBase, relationship
from geoalchemy2 import Geography
from datetime import datetime


class Base(DeclarativeBase):
    pass


class Trail(Base):
    __tablename__ = "trails"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)

    # Ranking & difficulty
    rank = Column(Integer, nullable=True)
    difficulty = Column(Float, nullable=True)
    calculated_difficulty = Column(String, nullable=True)
    rating = Column(Float, nullable=True)
    num_votes = Column(Integer, nullable=True)

    # Core stats
    distance = Column(Float, nullable=True)
    elevation = Column(Float, nullable=True)
    highest_point = Column(Float, nullable=True)

    # GPS
    trailhead_lat = Column(Float, nullable=True)
    trailhead_lng = Column(Float, nullable=True)

    # PostGIS geography column (auto-synced via trigger from lat/lng)
    geom = Column(Geography(geometry_type="POINT", srid=4326), nullable=True)

    # Categorizations
    surface = Column(String, nullable=True)
    route_type = Column(String, nullable=True)
    water_source = Column(String, nullable=True)

    # Assets
    image_url = Column(String, nullable=True)

    # Logistics
    parking_tags = Column(ARRAY(String), nullable=True)
    parking_status = Column(String, nullable=True)
    restrooms = Column(String, nullable=True)
    cell_coverage = Column(String, nullable=True)
    crowd_level = Column(Float, nullable=True)

    # Source
    source_url = Column(String, nullable=True)

    # OSM enrichment
    osm_id = Column(Integer, nullable=True)
    osm_name = Column(String, nullable=True)
    match_confidence = Column(Float, nullable=True)

    # Scoring/analysis
    max_grade_p95 = Column(Float, nullable=True)
    surface_primary = Column(String, nullable=True)
    surface_breakdown = Column(Text, nullable=True)
    distance_mi = Column(Float, nullable=True)
    surface_penalty = Column(Float, nullable=True)
    wta_diff_level = Column(Float, nullable=True)
    difficulty_score_0_10 = Column(Float, nullable=True)

    created_at = Column(String, nullable=False)

    # Relationships
    hazards = relationship("Hazard", back_populates="trail", lazy="selectin")
    reviews = relationship("Review", back_populates="trail", lazy="selectin")


class Hazard(Base):
    __tablename__ = "hazards"

    id = Column(String, primary_key=True)
    trail_id = Column(String, ForeignKey("trails.id"), nullable=False)
    type = Column(String, nullable=False)
    message = Column(String, nullable=False)
    date = Column(String, nullable=True)
    created_at = Column(String, nullable=False)

    trail = relationship("Trail", back_populates="hazards")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(String, primary_key=True)
    trail_id = Column(String, ForeignKey("trails.id"), nullable=False)
    user_name = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    rating = Column(Float, nullable=True)
    date = Column(String, nullable=True)
    text = Column(Text, nullable=True)
    created_at = Column(String, nullable=False)

    trail = relationship("Trail", back_populates="reviews")
