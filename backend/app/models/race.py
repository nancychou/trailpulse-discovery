from sqlalchemy import Column, String, Float, Integer, ARRAY

from app.database import Base


class Race(Base):
    __tablename__ = "races"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    location = Column(String, nullable=True)
    country = Column(String, nullable=True)
    date = Column(String, nullable=True)
    type = Column(String, nullable=True)
    distance = Column(String, nullable=True)
    distance_km = Column(Float, nullable=True)
    elevation = Column(String, nullable=True)
    rating = Column(Float, nullable=True)
    difficulty_rank = Column(Integer, nullable=True)
    review_count = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    qualifiers = Column(ARRAY(String), nullable=True)
