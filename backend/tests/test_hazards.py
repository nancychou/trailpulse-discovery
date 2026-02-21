"""
Integration tests for POST /api/hazards.

测试点：
  1. 合法请求 → 201/200，写入 DB，广播 WebSocket
  2. 非法 type → 422（schema 层拒绝）
  3. message 太短 → 422
  4. 写 DB 失败 → 500（DB 层异常能不能往上冒泡）
"""

from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient


class TestCreateHazard:

    VALID_PAYLOAD = {
        "trail_id": "trail-001",
        "type": "flooding",
        "message": "The main creek crossing is flooded waist-deep",
    }

    def test_valid_hazard_returns_ok(self, client, mock_db):
        with patch("app.services.realtime.manager.broadcast", new_callable=AsyncMock):
            resp = client.post("/api/hazards", json=self.VALID_PAYLOAD)

        assert resp.status_code == 200
        assert resp.json() == {"ok": True}

    def test_hazard_is_written_to_db(self, client, mock_db):
        """验证 db.add() 被调用了一次（即记录写入了 DB）"""
        with patch("app.services.realtime.manager.broadcast", new_callable=AsyncMock):
            client.post("/api/hazards", json=self.VALID_PAYLOAD)

        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

    def test_websocket_broadcast_is_triggered(self, client, mock_db):
        """验证创建成功后会广播 WebSocket 事件"""
        with patch(
            "app.services.realtime.manager.broadcast", new_callable=AsyncMock
        ) as mock_broadcast:
            client.post("/api/hazards", json=self.VALID_PAYLOAD)

        mock_broadcast.assert_called_once()
        event_type = mock_broadcast.call_args[0][0]
        assert event_type == "hazard_created"

    def test_broadcast_payload_contains_type_and_message(self, client, mock_db):
        """广播的数据要包含 type 和 message"""
        with patch(
            "app.services.realtime.manager.broadcast", new_callable=AsyncMock
        ) as mock_broadcast:
            client.post("/api/hazards", json=self.VALID_PAYLOAD)

        broadcast_data = mock_broadcast.call_args[0][1]
        assert broadcast_data["type"] == "flooding"
        assert broadcast_data["message"] == self.VALID_PAYLOAD["message"]

    def test_invalid_hazard_type_returns_422(self, client, mock_db):
        """非法 type 在 schema 层被拒绝，不应该碰 DB"""
        resp = client.post("/api/hazards", json={
            **self.VALID_PAYLOAD,
            "type": "dragon_attack",
        })
        assert resp.status_code == 422
        mock_db.add.assert_not_called()

    def test_message_too_short_returns_422(self, client, mock_db):
        resp = client.post("/api/hazards", json={
            **self.VALID_PAYLOAD,
            "message": "Hi",   # 2 chars，少于最小值 5
        })
        assert resp.status_code == 422

    def test_message_too_long_returns_422(self, client, mock_db):
        resp = client.post("/api/hazards", json={
            **self.VALID_PAYLOAD,
            "message": "A" * 501,
        })
        assert resp.status_code == 422

    def test_missing_trail_id_returns_422(self, client, mock_db):
        resp = client.post("/api/hazards", json={
            "type": "flooding",
            "message": "Something happened on the trail",
        })
        assert resp.status_code == 422

    def test_db_error_returns_500(self, mock_db):
        """DB commit 失败时应该返回 500，而不是静默成功"""
        from app.main import app
        from app.database import get_db

        mock_db.commit = AsyncMock(side_effect=Exception("DB connection lost"))

        async def _override_db():
            yield mock_db

        app.dependency_overrides[get_db] = _override_db
        # 不 override auth，也不需要——hazards 端点不要求认证

        # raise_server_exceptions=False 让 500 作为 HTTP 响应返回而不是抛出
        with TestClient(app, raise_server_exceptions=False) as c:
            with patch("app.services.realtime.manager.broadcast", new_callable=AsyncMock):
                resp = c.post("/api/hazards", json=self.VALID_PAYLOAD)

        app.dependency_overrides.clear()
        assert resp.status_code == 500
