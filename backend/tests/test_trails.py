"""
Integration tests for GET /api/trails and GET /api/trails/bounds.

策略：
  - mock_db.execute 返回假的 Trail ORM 对象
  - 验证 HTTP 状态码 + 响应体的字段映射是否正确（snake_case → camelCase）
  - 验证 bounds 端点的参数校验
"""

from unittest.mock import MagicMock, AsyncMock

from app.models.trail import Trail, Hazard


# ─── Helper：构造假 Trail ORM 对象 ────────────────────────────

def make_fake_trail(**kwargs) -> Trail:
    """
    返回一个带默认值的假 Trail 对象（不连接真实 DB）。
    用 MagicMock 替代真实 ORM，因为 Trail() 需要 DB session。
    """
    t = MagicMock(spec=Trail)
    t.id = kwargs.get("id", "trail-001")
    t.name = kwargs.get("name", "Mount Si Trail")
    t.rank = kwargs.get("rank", 1)
    t.difficulty = kwargs.get("difficulty", 7.5)
    t.calculated_difficulty = kwargs.get("calculated_difficulty", "Hard")
    t.rating = kwargs.get("rating", 4.8)
    t.num_votes = kwargs.get("num_votes", 320)
    t.distance = kwargs.get("distance", 16.0)
    t.elevation = kwargs.get("elevation", 1200.0)
    t.highest_point = kwargs.get("highest_point", 1400.0)
    t.trailhead_lat = kwargs.get("trailhead_lat", 47.49)
    t.trailhead_lng = kwargs.get("trailhead_lng", -121.72)
    t.surface = kwargs.get("surface", "dirt")
    t.route_type = kwargs.get("route_type", "out-and-back")
    t.water_source = kwargs.get("water_source", "stream")
    t.image_url = kwargs.get("image_url", None)
    t.parking_tags = kwargs.get("parking_tags", ["fee"])
    t.parking_status = kwargs.get("parking_status", None)
    t.restrooms = kwargs.get("restrooms", None)
    t.cell_coverage = kwargs.get("cell_coverage", None)
    t.crowd_level = kwargs.get("crowd_level", None)
    t.source_url = kwargs.get("source_url", None)
    t.osm_id = kwargs.get("osm_id", None)
    t.osm_name = kwargs.get("osm_name", None)
    t.match_confidence = kwargs.get("match_confidence", None)
    t.max_grade_p95 = kwargs.get("max_grade_p95", None)
    t.surface_primary = kwargs.get("surface_primary", None)
    t.surface_breakdown = kwargs.get("surface_breakdown", None)
    t.distance_mi = kwargs.get("distance_mi", None)
    t.grade_p95 = kwargs.get("grade_p95", None)
    t.surface_penalty = kwargs.get("surface_penalty", None)
    t.log_distance = kwargs.get("log_distance", None)
    t.wta_diff_level = kwargs.get("wta_diff_level", None)
    t.difficulty_score_0_10 = kwargs.get("difficulty_score_0_10", 7.5)
    t.hazards = kwargs.get("hazards", [])
    t.reviews = kwargs.get("reviews", [])
    return t


# ─── GET /api/trails ──────────────────────────────────────────

class TestGetTrails:

    def test_returns_200_with_trail_list(self, client, mock_db):
        fake_trail = make_fake_trail()

        # mock execute().scalars().all() 链
        result_mock = MagicMock()
        result_mock.scalars.return_value.all.return_value = [fake_trail]
        mock_db.execute = AsyncMock(return_value=result_mock)

        resp = client.get("/api/trails")

        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 1

    def test_trail_fields_mapped_to_camel_case(self, client, mock_db):
        """snake_case DB 列名要正确映射成前端用的 camelCase"""
        fake_trail = make_fake_trail(
            id="trail-xyz",
            name="Little Si",
            difficulty_score_0_10=5.2,
            trailhead_lat=47.50,
            trailhead_lng=-121.73,
        )
        result_mock = MagicMock()
        result_mock.scalars.return_value.all.return_value = [fake_trail]
        mock_db.execute = AsyncMock(return_value=result_mock)

        resp = client.get("/api/trails")
        trail = resp.json()[0]

        # 验证关键字段 camelCase 映射
        assert trail["id"] == "trail-xyz"
        assert trail["name"] == "Little Si"
        assert trail["difficultyScore010"] == 5.2
        assert trail["trailheadLat"] == 47.50
        assert trail["trailheadLng"] == -121.73

    def test_empty_db_returns_empty_list(self, client, mock_db):
        result_mock = MagicMock()
        result_mock.scalars.return_value.all.return_value = []
        mock_db.execute = AsyncMock(return_value=result_mock)

        resp = client.get("/api/trails")

        assert resp.status_code == 200
        assert resp.json() == []

    def test_trail_with_hazards_included(self, client, mock_db):
        """Hazard 数据要嵌套在 trail 里返回"""
        fake_hazard = MagicMock(spec=Hazard)
        fake_hazard.type = "flooding"
        fake_hazard.message = "Creek is flooded"
        fake_hazard.date = "2026-03-01"

        fake_trail = make_fake_trail(hazards=[fake_hazard])
        result_mock = MagicMock()
        result_mock.scalars.return_value.all.return_value = [fake_trail]
        mock_db.execute = AsyncMock(return_value=result_mock)

        resp = client.get("/api/trails")
        trail = resp.json()[0]

        assert len(trail["hazards"]) == 1
        assert trail["hazards"][0]["type"] == "flooding"
        assert trail["hazards"][0]["message"] == "Creek is flooded"

    def test_trail_parking_tags_default_to_empty_list(self, client, mock_db):
        """parking_tags 为 None 时应返回 [] 而不是 null"""
        fake_trail = make_fake_trail(parking_tags=None)
        result_mock = MagicMock()
        result_mock.scalars.return_value.all.return_value = [fake_trail]
        mock_db.execute = AsyncMock(return_value=result_mock)

        resp = client.get("/api/trails")
        assert resp.json()[0]["parkingTags"] == []


# ─── GET /api/trails/bounds ───────────────────────────────────

class TestGetTrailsInBounds:

    def _mock_bounds_result(self, mock_db, rows: list[dict]):
        """把 dict 列表包装成 mappings().all() 的返回格式"""
        result_mock = MagicMock()
        result_mock.mappings.return_value.all.return_value = rows
        mock_db.execute = AsyncMock(return_value=result_mock)

    def test_returns_trails_within_bounds(self, client, mock_db):
        row = {
            "id": "trail-b1", "name": "Rattlesnake Ledge",
            "rank": None, "difficulty": 4.0, "calculated_difficulty": "Moderate",
            "rating": 4.5, "num_votes": 500, "distance": 8.0, "elevation": 450.0,
            "highest_point": None, "trailhead_lat": 47.44, "trailhead_lng": -121.77,
            "surface": "dirt", "route_type": "out-and-back", "water_source": None,
            "image_url": None, "parking_tags": [], "parking_status": None,
            "restrooms": None, "cell_coverage": None, "crowd_level": None,
            "source_url": None, "osm_id": None, "osm_name": None,
            "match_confidence": None, "max_grade_p95": None, "surface_primary": None,
            "surface_breakdown": None, "distance_mi": None, "grade_p95": None,
            "surface_penalty": None, "log_distance": None, "wta_diff_level": None,
            "difficulty_score_0_10": 4.0,
        }
        self._mock_bounds_result(mock_db, [row])

        resp = client.get("/api/trails/bounds", params={
            "south": 47.0, "west": -122.0, "north": 48.0, "east": -121.0
        })

        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["id"] == "trail-b1"
        assert data[0]["name"] == "Rattlesnake Ledge"

    def test_empty_bounds_returns_empty_list(self, client, mock_db):
        self._mock_bounds_result(mock_db, [])

        resp = client.get("/api/trails/bounds", params={
            "south": 0, "west": 0, "north": 1, "east": 1
        })

        assert resp.status_code == 200
        assert resp.json() == []

    def test_missing_bounds_params_returns_422(self, client, mock_db):
        """bounds 参数是必填的，缺少时应返回 422 Unprocessable Entity"""
        resp = client.get("/api/trails/bounds")   # 没有传任何参数
        assert resp.status_code == 422

    def test_partial_bounds_params_returns_422(self, client, mock_db):
        """只传了部分 bounds 参数也应该 422"""
        resp = client.get("/api/trails/bounds", params={"south": 47.0, "west": -122.0})
        assert resp.status_code == 422
