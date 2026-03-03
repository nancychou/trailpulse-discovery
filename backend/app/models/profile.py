from sqlalchemy import Column, DateTime, String, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from app.models.trail import Base


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(UUID(as_uuid=True), primary_key=True)
    email = Column(String, nullable=True)
    display_name = Column(String, nullable=False, default="")
    gender = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    bio = Column(String, nullable=True)
    saved_race_ids = Column(ARRAY(String), nullable=True)
    group_run_ids = Column(ARRAY(String), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)
