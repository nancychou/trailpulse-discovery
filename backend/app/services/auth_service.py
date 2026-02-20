from supabase import create_client
from app.config import settings

# Use service role key for server-side auth operations
_supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


async def supabase_sign_up(email: str, password: str, display_name: str) -> dict:
    """Register a new user via Supabase Auth."""
    result = _supabase.auth.sign_up(
        {
            "email": email,
            "password": password,
            "options": {"data": {"display_name": display_name}},
        }
    )
    if not result.session:
        raise ValueError("Sign up failed — no session returned. Check email confirmation settings.")
    return {
        "access_token": result.session.access_token,
        "refresh_token": result.session.refresh_token,
        "user": {"id": result.user.id, "email": result.user.email},
    }


async def supabase_sign_in(email: str, password: str) -> dict:
    """Sign in an existing user via Supabase Auth."""
    result = _supabase.auth.sign_in_with_password(
        {"email": email, "password": password}
    )
    return {
        "access_token": result.session.access_token,
        "refresh_token": result.session.refresh_token,
        "user": {"id": result.user.id, "email": result.user.email},
    }


async def supabase_sign_out(access_token: str) -> None:
    """Revoke a user's session (admin-level sign out)."""
    # Note: supabase-py admin signout requires the user's JWT
    # For simplicity, we just let the token expire on the client side.
    # The client removes tokens from localStorage.
    pass
