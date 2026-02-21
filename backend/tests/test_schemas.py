"""
Unit tests for Pydantic schema validation.

纯 Python，无 HTTP、无 DB。
测的是"用户提交了坏数据会不会被拒绝"，是最快也最基础的一层。
"""

import pytest
from pydantic import ValidationError

from app.schemas.trail import HazardCreate
from app.schemas.group_run import GroupRunCreate


# ═══════════════════════════════════════════════
# HazardCreate
# ═══════════════════════════════════════════════

class TestHazardCreate:

    def test_valid_hazard_accepted(self):
        h = HazardCreate(
            trail_id="trail-001",
            type="flooding",
            message="The creek crossing is knee-deep"
        )
        assert h.trail_id == "trail-001"
        assert h.type == "flooding"

    def test_all_allowed_types_pass(self):
        allowed = [
            "downed_tree", "trail_damage", "wildlife",
            "flooding", "snow_ice", "bridge_out", "fire_closure", "other",
        ]
        for t in allowed:
            h = HazardCreate(trail_id="x", type=t, message="Something happened here")
            assert h.type == t

    def test_unknown_type_rejected(self):
        with pytest.raises(ValidationError) as exc:
            HazardCreate(trail_id="x", type="shark_attack", message="Something happened here")
        assert "type" in str(exc.value)

    def test_message_minimum_5_chars(self):
        # 4 chars → fail
        with pytest.raises(ValidationError):
            HazardCreate(trail_id="x", type="other", message="Oops")
        # 5 chars → pass
        HazardCreate(trail_id="x", type="other", message="Flood")

    def test_message_maximum_500_chars(self):
        # 500 chars → pass
        HazardCreate(trail_id="x", type="other", message="A" * 500)
        # 501 chars → fail
        with pytest.raises(ValidationError):
            HazardCreate(trail_id="x", type="other", message="A" * 501)

    def test_message_whitespace_is_stripped(self):
        h = HazardCreate(trail_id="x", type="other", message="  Tree down  ")
        assert h.message == "Tree down"

    def test_empty_trail_id_rejected(self):
        with pytest.raises(ValidationError):
            HazardCreate(trail_id="", type="other", message="Something here")

    def test_trail_id_over_100_chars_rejected(self):
        with pytest.raises(ValidationError):
            HazardCreate(trail_id="x" * 101, type="other", message="Something here")

    def test_missing_fields_rejected(self):
        with pytest.raises(ValidationError):
            HazardCreate(trail_id="x")  # type 和 message 都缺


# ═══════════════════════════════════════════════
# GroupRunCreate
# ═══════════════════════════════════════════════

class TestGroupRunCreate:

    def test_valid_group_run_accepted(self):
        g = GroupRunCreate(
            trail_id="trail-1",
            name="Saturday Crew",
            time="2026-06-15T07:00",
            type="moderate",
        )
        assert g.name == "Saturday Crew"
        assert g.color == "text-primary"   # default

    # ── time format ──────────────────────────────

    def test_valid_iso_times_accepted(self):
        for t in ["2026-01-01T00:00", "2026-12-31T23:59", "2026-06-15T07:30"]:
            g = GroupRunCreate(trail_id="x", name="Run", time=t, type="easy")
            assert g.time == t

    def test_invalid_time_formats_rejected(self):
        bad = [
            "June 15 7am",       # 自然语言
            "2026/06/15 07:00",  # 斜杠分隔
            "07:00",             # 只有时间
            "2026-06-15",        # 只有日期
            "2026-06-15T07:00:00",  # 带秒（不在我们的格式里）
            "",
        ]
        for t in bad:
            with pytest.raises(ValidationError, match="time"):
                GroupRunCreate(trail_id="x", name="Run", time=t, type="easy")

    # ── type ─────────────────────────────────────

    def test_all_valid_run_types_accepted(self):
        for t in ["easy", "moderate", "hard", "race_pace", "social"]:
            g = GroupRunCreate(trail_id="x", name="Run", time="2026-06-15T07:00", type=t)
            assert g.type == t

    def test_invalid_run_type_rejected(self):
        with pytest.raises(ValidationError):
            GroupRunCreate(trail_id="x", name="Run", time="2026-06-15T07:00", type="chill_vibes")

    # ── color ────────────────────────────────────

    def test_all_valid_colors_accepted(self):
        valid_colors = [
            "text-primary", "text-green-500", "text-blue-500",
            "text-orange-500", "text-red-500", "text-purple-500",
        ]
        for c in valid_colors:
            g = GroupRunCreate(
                trail_id="x", name="Run", time="2026-06-15T07:00",
                type="easy", color=c
            )
            assert g.color == c

    def test_invalid_color_rejected(self):
        with pytest.raises(ValidationError):
            GroupRunCreate(
                trail_id="x", name="Run", time="2026-06-15T07:00",
                type="easy", color="hotpink"
            )

    def test_default_color_is_text_primary(self):
        g = GroupRunCreate(trail_id="x", name="Run", time="2026-06-15T07:00", type="easy")
        assert g.color == "text-primary"

    # ── name ─────────────────────────────────────

    def test_name_minimum_2_chars(self):
        with pytest.raises(ValidationError):
            GroupRunCreate(trail_id="x", name="A", time="2026-06-15T07:00", type="easy")
        # 2 chars → pass
        GroupRunCreate(trail_id="x", name="AB", time="2026-06-15T07:00", type="easy")

    def test_name_maximum_100_chars(self):
        GroupRunCreate(trail_id="x", name="A" * 100, time="2026-06-15T07:00", type="easy")
        with pytest.raises(ValidationError):
            GroupRunCreate(trail_id="x", name="A" * 101, time="2026-06-15T07:00", type="easy")

    def test_name_whitespace_stripped(self):
        g = GroupRunCreate(trail_id="x", name="  Trail Runners  ", time="2026-06-15T07:00", type="easy")
        assert g.name == "Trail Runners"
