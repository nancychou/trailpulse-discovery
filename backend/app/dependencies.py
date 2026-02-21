from __future__ import annotations
import httpx
from functools import lru_cache
from fastapi import Depends, HTTPException, Header
from jose import jwt, JWTError, jwk
from app.config import settings
from app.logging import get_logger

logger = get_logger(__name__)


@lru_cache(maxsize=1)
def _get_jwks() -> tuple:
    """
    Fetch Supabase's public JWKS keys (cached in memory).
    Supabase uses ES256 (ECC P-256) for JWT signing.
    Returns a tuple (hashable) so lru_cache works.
    """
    url = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
    resp = httpx.get(url, timeout=10)
    resp.raise_for_status()
    # Return as tuple of frozen dicts so it's hashable for lru_cache
    keys = resp.json()["keys"]
    return tuple(tuple(sorted(k.items())) for k in keys)


def _verify_token(token: str) -> dict:
    """
    Verify a Supabase JWT signed with ES256 (ECC P-256).
    Fetches public keys from JWKS endpoint and verifies the signature.
    """
    raw_keys = _get_jwks()
    # Reconstruct list of dicts from cached tuples
    keys = [dict(pairs) for pairs in raw_keys]

    last_error: Exception = JWTError("No keys available")
    for key_data in keys:
        try:
            public_key = jwk.construct(key_data, algorithm="ES256")
            payload = jwt.decode(
                token,
                public_key,
                algorithms=["ES256"],
                audience="authenticated",
                options={"verify_aud": True},
            )
            return payload
        except Exception as e:
            last_error = e
            continue
    raise last_error


async def get_current_user(authorization: str = Header(...)) -> dict:
    """Extract and verify JWT from Authorization: Bearer <token> header."""
    if not authorization.startswith("Bearer "):
        logger.warning("Invalid authorization header format")
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = authorization.split(" ", 1)[1]
    try:
        payload = _verify_token(token)
        return {"user_id": payload["sub"], "email": payload.get("email")}
    except Exception as e:
        logger.warning("JWT verification failed", extra={"reason": str(e)})
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def get_current_user_optional(
    authorization: str | None = Header(None),
) -> dict | None:
    """Same as above but returns None if no token provided."""
    if not authorization:
        return None
    return await get_current_user(authorization)
