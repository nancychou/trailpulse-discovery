"""
Integration tests for auth endpoints and auth guard behaviour.

分两组：
  1. GET /api/auth/me — 测 auth guard 本身（有 token vs 没 token）
  2. 受保护端点的 401 行为 — 确认没有 token 会被挡住
"""

from unittest.mock import patch, AsyncMock


# ─── GET /api/auth/me ─────────────────────────────────────────

class TestAuthMe:

    def test_me_with_valid_token_returns_user(self, client):
        """
        client fixture 已经 override get_current_user → FAKE_USER，
        所以 /me 应该直接返回那个假用户。
        """
        resp = client.get("/api/auth/me")

        assert resp.status_code == 200
        data = resp.json()
        assert data["user"]["id"] == "user-abc-123"
        assert data["user"]["email"] == "tester@example.com"

    def test_me_without_token_returns_4xx(self, unauthed_client):
        """
        不传 Authorization header → FastAPI 返回 422（missing required header）
        或 401（依赖注入层拒绝）。两者都代表"未授权"，都可接受。
        """
        resp = unauthed_client.get("/api/auth/me")
        assert resp.status_code in (401, 422)

    def test_me_with_malformed_token_returns_401(self, unauthed_client):
        """格式错误的 token（不是 Bearer 开头）应该 401"""
        resp = unauthed_client.get(
            "/api/auth/me",
            headers={"Authorization": "Token not-a-jwt"},
        )
        assert resp.status_code == 401


# ─── POST /api/auth/signup ────────────────────────────────────

class TestSignup:

    VALID_PAYLOAD = {
        "email": "newuser@example.com",
        "password": "SecurePass123!",
        "display_name": "New User",
    }

    def test_successful_signup_returns_tokens(self, client):
        fake_result = {
            "access_token": "eyJ.fake.access",
            "refresh_token": "eyJ.fake.refresh",
            "user": {"id": "new-user-id", "email": "newuser@example.com"},
        }
        with patch(
            "app.routers.auth.supabase_sign_up",
            new_callable=AsyncMock,
            return_value=fake_result,
        ):
            resp = client.post("/api/auth/signup", json=self.VALID_PAYLOAD)

        assert resp.status_code == 200
        data = resp.json()
        assert data["access_token"] == "eyJ.fake.access"
        assert data["user"]["email"] == "newuser@example.com"

    def test_signup_failure_returns_400(self, client):
        """Supabase 注册失败（如邮箱已存在）应该返回 400"""
        with patch(
            "app.routers.auth.supabase_sign_up",
            new_callable=AsyncMock,
            side_effect=Exception("User already registered"),
        ):
            resp = client.post("/api/auth/signup", json=self.VALID_PAYLOAD)

        assert resp.status_code == 400
        assert "already" in resp.json()["detail"]

    def test_signup_missing_email_returns_422(self, client):
        resp = client.post("/api/auth/signup", json={
            "password": "SecurePass123!",
            "display_name": "No Email User",
        })
        assert resp.status_code == 422


# ─── POST /api/auth/signin ────────────────────────────────────

class TestSignin:

    VALID_PAYLOAD = {
        "email": "existing@example.com",
        "password": "MyPassword123!",
    }

    def test_successful_signin_returns_tokens(self, client):
        fake_result = {
            "access_token": "eyJ.access.token",
            "refresh_token": "eyJ.refresh.token",
            "user": {"id": "user-existing", "email": "existing@example.com"},
        }
        with patch(
            "app.routers.auth.supabase_sign_in",
            new_callable=AsyncMock,
            return_value=fake_result,
        ):
            resp = client.post("/api/auth/signin", json=self.VALID_PAYLOAD)

        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_wrong_password_returns_401(self, client):
        with patch(
            "app.routers.auth.supabase_sign_in",
            new_callable=AsyncMock,
            side_effect=Exception("Invalid login credentials"),
        ):
            resp = client.post("/api/auth/signin", json=self.VALID_PAYLOAD)

        assert resp.status_code == 401

    def test_signin_missing_password_returns_422(self, client):
        resp = client.post("/api/auth/signin", json={"email": "x@x.com"})
        assert resp.status_code == 422


# ─── Protected endpoints — auth guard ─────────────────────────

class TestAuthGuard:
    """
    验证受保护端点在没有 token 时一律返回 401，
    而不是意外返回 200 或 500。
    """

    PROTECTED_ROUTES = [
        ("GET", "/api/auth/me"),
        ("GET", "/api/profiles/me"),
        ("PATCH", "/api/profiles/me"),
    ]

    def test_all_protected_routes_reject_without_token(self, unauthed_client):
        """
        受保护的路由在没有 token 时必须返回 401 或 422，
        绝对不能返回 200（不能意外放行）。
        """
        for method, path in self.PROTECTED_ROUTES:
            resp = unauthed_client.request(method, path)
            assert resp.status_code in (401, 422), (
                f"{method} {path} 应该拒绝未认证请求，但返回了 {resp.status_code}"
            )
