from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.models.trail import Base


class GroupRun(Base):
    __tablename__ = "group_runs"

    id = Column(UUID(as_uuid=True), primary_key=True)
    trail_id = Column(String, nullable=True)
    name = Column(String, nullable=False)
    time = Column(String, nullable=True)
    type = Column(String, nullable=True)
    color = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
