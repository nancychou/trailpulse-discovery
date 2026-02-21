"""
Shared pytest fixtures.

核心设计原则：
  - 永远不碰真实数据库 — 所有 DB 调用用 AsyncMock 替换
  - 永远不调用真实外部 API（Supabase auth、Gemini）— mock 在 service 层
  - 测试在毫秒内完成，无网络 I/O

两种 client fixture：
  client        — DB 和 auth 都 mock（测正常业务流程）
  unauthed_client — DB mock 但不 override auth（测 401 场景）
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.database import get_db
from app.dependencies import get_current_user

# ─── 测试用假用户 ──────────────────────────────────────────────
FAKE_USER = {"user_id": "user-abc-123", "email": "tester@example.com"}
AUTH_HEADER = {"Authorization": "Bearer fake-valid-token"}


# ─── DB mock 工厂 ─────────────────────────────────────────────
def make_mock_db():
    """返回一个行为像 AsyncSession 的 mock 对象"""
    db = AsyncMock()
    db.execute = AsyncMock()
    db.add = MagicMock()       # add 是同步调用
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    return db


# ─── Fixtures ─────────────────────────────────────────────────

@pytest.fixture
def mock_db():
    """每个测试拿到一个独立的 mock DB session"""
    return make_mock_db()


@pytest.fixture
def client(mock_db):
    """
    完整 mock 的 TestClient：
    - DB → mock_db（无真实查询）
    - Auth → 直接返回 FAKE_USER（无 JWT 验证）
    """
    async def _override_db():
        yield mock_db

    async def _override_auth():
        return FAKE_USER

    app.dependency_overrides[get_db] = _override_db
    app.dependency_overrides[get_current_user] = _override_auth

    with TestClient(app, raise_server_exceptions=True) as c:
        yield c

    app.dependency_overrides.clear()


@pytest.fixture
def unauthed_client(mock_db):
    """
    只 mock DB，不 override auth。
    用来测试未携带 token 时应该返回 401。
    """
    async def _override_db():
        yield mock_db

    app.dependency_overrides[get_db] = _override_db

    # 不 override get_current_user，但 TestClient 不能真正验证 JWT，
    # 所以我们把 raise_server_exceptions=False 让 401 正常返回而非抛异常
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c

    app.dependency_overrides.clear()
