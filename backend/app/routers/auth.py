from fastapi import APIRouter, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.dependencies import get_current_user
from app.logging import get_logger
from app.schemas.auth import SignUpRequest, SignInRequest, ForgotPasswordRequest, UpdatePasswordRequest, ExchangeCodeRequest, TokenResponse, UserInfo
from app.services.auth_service import supabase_sign_up, supabase_sign_in, supabase_sign_out, supabase_reset_password, supabase_update_password, supabase_exchange_code

router = APIRouter(prefix="/api/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)
logger = get_logger(__name__)


@router.post("/signup", response_model=TokenResponse)
@limiter.limit("5/minute")
async def signup(request: Request, req: SignUpRequest):
    """Register a new user. Rate limited to 5 attempts per minute per IP."""
    try:
        result = await supabase_sign_up(req.email, req.password, req.display_name)
        logger.info("User signed up", extra={"email": req.email})
        return TokenResponse(
            access_token=result["access_token"],
            refresh_token=result["refresh_token"],
            user=UserInfo(**result["user"]),
        )
    except Exception as e:
        logger.warning("Signup failed", extra={"email": req.email, "reason": str(e)})
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/signin", response_model=TokenResponse)
@limiter.limit("10/minute")
async def signin(request: Request, req: SignInRequest):
    """Sign in an existing user. Rate limited to 10 attempts per minute per IP."""
    try:
        result = await supabase_sign_in(req.email, req.password)
        logger.info("User signed in", extra={"email": req.email})
        return TokenResponse(
            access_token=result["access_token"],
            refresh_token=result["refresh_token"],
            user=UserInfo(**result["user"]),
        )
    except Exception as e:
        logger.warning("Signin failed", extra={"email": req.email, "reason": str(e)})
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/signout")
async def signout(user: dict = Depends(get_current_user)):
    """Sign out the current user."""
    # Token is removed client-side; server-side revocation is optional
    await supabase_sign_out("")
    logger.info("User signed out", extra={"user_id": user["user_id"]})
    return {"ok": True}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    """Get current user info from JWT token."""
    return {"user": {"id": user["user_id"], "email": user["email"]}}


@router.post("/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(request: Request, req: ForgotPasswordRequest):
    """Send a password reset email. Always returns success to prevent email enumeration."""
    try:
        await supabase_reset_password(req.email)
        logger.info("Password reset requested", extra={"email": req.email})
    except Exception as e:
        logger.warning("Password reset failed", extra={"email": req.email, "reason": str(e)})
    return {"ok": True, "message": "If an account with that email exists, a reset link has been sent."}


@router.post("/exchange-code")
async def exchange_code(request: Request, req: ExchangeCodeRequest):
    """Exchange a PKCE auth code for an access token (used for email recovery redirects)."""
    try:
        result = await supabase_exchange_code(req.code)
        logger.info("Code exchanged for session", extra={"user_id": result["user_id"]})
        return {"access_token": result["access_token"], "user_id": result["user_id"]}
    except Exception as e:
        logger.warning("Code exchange failed", extra={"reason": str(e)})
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/update-password")
async def update_password(request: Request, req: UpdatePasswordRequest, user: dict = Depends(get_current_user)):
    """Update password for the authenticated user (used after clicking reset link)."""
    try:
        await supabase_update_password(user["user_id"], req.password)
        logger.info("Password updated", extra={"user_id": user["user_id"]})
        return {"ok": True, "message": "Password updated successfully."}
    except Exception as e:
        logger.warning("Password update failed", extra={"user_id": user["user_id"], "reason": str(e)})
        raise HTTPException(status_code=400, detail=str(e))

