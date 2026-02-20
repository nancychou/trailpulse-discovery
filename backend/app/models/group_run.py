from sqlalchemy import Column, String, ForeignKey
from app.models.trail import Base


class GroupRun(Base):
    __tablename__ = "group_runs"

    id = Column(String, primary_key=True)
    trail_id = Column(String, ForeignKey("trails.id"), nullable=True)
    name = Column(String, nullable=False)
    time = Column(String, nullable=True)
    type = Column(String, nullable=True)
    color = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    created_at = Column(String, nullable=False)
