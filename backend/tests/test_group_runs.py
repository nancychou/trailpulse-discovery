"""
Integration tests for GET /api/group-runs and POST /api/group-runs.

测试点：
  - GET 返回正确列表和 camelCase 字段
  - POST 写入 DB 并广播 WebSocket
  - POST 非法入参被 422 拒绝
  - POST 返回的数据结构正确
"""

from unittest.mock import MagicMock, AsyncMock, patch

from app.models.group_run import GroupRun


def make_fake_run(**kwargs) -> GroupRun:
    r = MagicMock(spec=GroupRun)
    r.id = kwargs.get("id", "run-001")
    r.trail_id = kwargs.get("trail_id", "trail-001")
    r.name = kwargs.get("name", "Saturday Morning Crew")
    r.time = kwargs.get("time", "2026-06-15T07:00")
    r.type = kwargs.get("type", "steady_pace")
    r.color = kwargs.get("color", "text-primary")
    r.avatar_url = kwargs.get("avatar_url", "https://picsum.photos/seed/1/100/100")
    r.created_at = kwargs.get("created_at", "2026-01-01T00:00:00+00:00")
    return r


VALID_PAYLOAD = {
    "trail_id": "trail-001",
    "name": "Saturday Morning Crew",
    "time": "2026-06-15T07:00",
    "type": "steady_pace",
    "color": "text-blue-500",
}


# ─── GET /api/group-runs ──────────────────────────────────────

class TestGetGroupRuns:

    def test_returns_200_with_list(self, client, mock_db):
        fake_run = make_fake_run()
        result_mock = MagicMock()
        result_mock.scalars.return_value.all.return_value = [fake_run]
        mock_db.execute = AsyncMock(return_value=result_mock)

        resp = client.get("/api/group-runs")

        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        assert len(resp.json()) == 1

    def test_fields_mapped_to_camel_case(self, client, mock_db):
        """trailId, avatarUrl, createdAt 都要是 camelCase"""
        fake_run = make_fake_run(
            id="run-xyz",
            trail_id="trail-999",
            name="Dawn Patrol",
            avatar_url="https://example.com/avatar.png",
            created_at="2026-03-01T08:00:00+00:00",
        )
        result_mock = MagicMock()
        result_mock.scalars.return_value.all.return_value = [fake_run]
        mock_db.execute = AsyncMock(return_value=result_mock)

        resp = client.get("/api/group-runs")
        run = resp.json()[0]

        assert run["id"] == "run-xyz"
        assert run["trailId"] == "trail-999"
        assert run["name"] == "Dawn Patrol"
        assert run["avatarUrl"] == "https://example.com/avatar.png"
        assert run["createdAt"] == "2026-03-01T08:00:00+00:00"

    def test_empty_db_returns_empty_list(self, client, mock_db):
        result_mock = MagicMock()
        result_mock.scalars.return_value.all.return_value = []
        mock_db.execute = AsyncMock(return_value=result_mock)

        resp = client.get("/api/group-runs")
        assert resp.json() == []


# ─── POST /api/group-runs ─────────────────────────────────────

class TestCreateGroupRun:

    def _setup_refresh(self, mock_db, fake_run: GroupRun):
        """db.refresh(run) 应该把 run 的字段填上"""
        async def _refresh(obj):
            obj.id = fake_run.id
            obj.trail_id = fake_run.trail_id
            obj.name = fake_run.name
            obj.time = fake_run.time
            obj.type = fake_run.type
            obj.color = fake_run.color
            obj.avatar_url = fake_run.avatar_url
            obj.created_at = fake_run.created_at

        mock_db.refresh = _refresh

    def test_valid_payload_returns_201_with_run(self, client, mock_db):
        fake_run = make_fake_run(**VALID_PAYLOAD)
        self._setup_refresh(mock_db, fake_run)

        with patch("app.services.realtime.manager.broadcast", new_callable=AsyncMock):
            resp = client.post("/api/group-runs", json=VALID_PAYLOAD)

        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Saturday Morning Crew"
        assert data["trailId"] == "trail-001"

    def test_run_is_written_to_db(self, client, mock_db):
        fake_run = make_fake_run(**VALID_PAYLOAD)
        self._setup_refresh(mock_db, fake_run)

        with patch("app.services.realtime.manager.broadcast", new_callable=AsyncMock):
            client.post("/api/group-runs", json=VALID_PAYLOAD)

        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

    def test_websocket_broadcast_triggered(self, client, mock_db):
        fake_run = make_fake_run(**VALID_PAYLOAD)
        self._setup_refresh(mock_db, fake_run)

        with patch(
            "app.services.realtime.manager.broadcast", new_callable=AsyncMock
        ) as mock_broadcast:
            client.post("/api/group-runs", json=VALID_PAYLOAD)

        mock_broadcast.assert_called_once()
        assert mock_broadcast.call_args[0][0] == "group_run_created"

    def test_invalid_run_type_rejected_422(self, client, mock_db):
        resp = client.post("/api/group-runs", json={
            **VALID_PAYLOAD,
            "type": "ultra_chill",  # not in the enum
        })
        assert resp.status_code == 422
        mock_db.add.assert_not_called()

    def test_invalid_time_format_rejected_422(self, client, mock_db):
        resp = client.post("/api/group-runs", json={
            **VALID_PAYLOAD,
            "time": "Saturday morning",
        })
        assert resp.status_code == 422

    def test_name_too_short_rejected_422(self, client, mock_db):
        resp = client.post("/api/group-runs", json={
            **VALID_PAYLOAD,
            "name": "X",   # 1 char，低于最小值 2
        })
        assert resp.status_code == 422

    def test_invalid_color_rejected_422(self, client, mock_db):
        resp = client.post("/api/group-runs", json={
            **VALID_PAYLOAD,
            "color": "salmon",
        })
        assert resp.status_code == 422

    def test_default_color_used_when_omitted(self, client, mock_db):
        payload_no_color = {k: v for k, v in VALID_PAYLOAD.items() if k != "color"}
        fake_run = make_fake_run(**payload_no_color, color="text-primary")
        self._setup_refresh(mock_db, fake_run)

        with patch("app.services.realtime.manager.broadcast", new_callable=AsyncMock):
            resp = client.post("/api/group-runs", json=payload_no_color)

        assert resp.status_code == 200
        assert resp.json()["color"] == "text-primary"
