from fastapi import Depends, HTTPException, Header
from jose import jwt, JWTError
from app.config import settings


async def get_current_user(authorization: str = Header(...)) -> dict:
    """Extract and verify JWT from Authorization: Bearer <token> header."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return {"user_id": payload["sub"], "email": payload.get("email")}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def get_current_user_optional(
    authorization: str | None = Header(None),
) -> dict | None:
    """Same as above but returns None if no token provided."""
    if not authorization:
        return None
    return await get_current_user(authorization)
