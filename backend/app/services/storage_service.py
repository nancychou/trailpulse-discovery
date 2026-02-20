import time
from supabase import create_client
from app.config import settings

_supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

BUCKET = "profile-photos"


async def upload_avatar(user_id: str, file_bytes: bytes, filename: str) -> str:
    """Upload an avatar image to Supabase Storage and return the public URL."""
    ext = filename.rsplit(".", 1)[-1] if "." in filename else "jpg"
    file_path = f"{user_id}/avatar.{ext}"

    # Upload with upsert
    _supabase.storage.from_(BUCKET).upload(
        file_path,
        file_bytes,
        {"content-type": f"image/{ext}", "upsert": "true"},
    )

    # Build public URL with cache-bust
    public_url = _supabase.storage.from_(BUCKET).get_public_url(file_path)
    return f"{public_url}?t={int(time.time())}"
