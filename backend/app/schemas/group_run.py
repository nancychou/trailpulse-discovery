from pydantic import BaseModel


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
    trail_id: str
    name: str
    time: str
    type: str
    color: str = "text-primary"
