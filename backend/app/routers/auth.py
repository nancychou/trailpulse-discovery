from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user
from app.schemas.auth import SignUpRequest, SignInRequest, TokenResponse, UserInfo
from app.services.auth_service import supabase_sign_up, supabase_sign_in, supabase_sign_out

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse)
async def signup(req: SignUpRequest):
    """Register a new user."""
    try:
        result = await supabase_sign_up(req.email, req.password, req.display_name)
        return TokenResponse(
            access_token=result["access_token"],
            refresh_token=result["refresh_token"],
            user=UserInfo(**result["user"]),
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/signin", response_model=TokenResponse)
async def signin(req: SignInRequest):
    """Sign in an existing user."""
    try:
        result = await supabase_sign_in(req.email, req.password)
        return TokenResponse(
            access_token=result["access_token"],
            refresh_token=result["refresh_token"],
            user=UserInfo(**result["user"]),
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/signout")
async def signout(user: dict = Depends(get_current_user)):
    """Sign out the current user."""
    # Token is removed client-side; server-side revocation is optional
    await supabase_sign_out("")
    return {"ok": True}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    """Get current user info from JWT token."""
    return {"user": {"id": user["user_id"], "email": user["email"]}}
