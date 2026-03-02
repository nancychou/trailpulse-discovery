#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
UTMB World Series Events: Playwright scroll + capture ALL JSON responses + auto-pick the payload
that contains the most "event-shaped" objects, then parse to race-level CSV.

Race-level output fields (best-effort, depends on what UTMB returns):
- race_name
- location (city/region/country)
- start_date_raw / end_date_raw
- registration_status (open/closed/sold_out/waitlist/unknown)
- registration_open_date_raw / registration_close_date_raw (if present)
- distance_raw / elevation_gain_raw / running_stones_raw (if present)
- official_url (if present/derivable)

Usage:
  python utmb_world_series_events.py --output utmb_world_series_events.csv
  python utmb_world_series_events.py --output utmb.csv --headed --save-json utmb_debug.json
"""

import argparse
import json
import re
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
from playwright.sync_api import sync_playwright


DEFAULT_URL = "https://utmb.world/utmb-world-series-events"
BASE_URL = "https://utmb.world"


# -----------------------------
# Helpers
# -----------------------------
def _clean(s: Any) -> Optional[str]:
    if s is None:
        return None
    s = str(s)
    s = re.sub(r"\s+", " ", s).strip()
    return s or None


def _as_float(x: Any) -> Optional[float]:
    try:
        if x is None:
            return None
        if isinstance(x, (int, float)):
            return float(x)
        s = str(x).replace(",", "")
        m = re.search(r"(\d+(?:\.\d+)?)", s)
        return float(m.group(1)) if m else None
    except Exception:
        return None


def _normalize_reg_status(raw: Any) -> str:
    if raw is None:
        return "unknown"
    s = str(raw).strip().lower()
    if any(t in s for t in ["sold out", "sold_out", "full"]):
        return "sold_out"
    if "wait" in s:
        return "waitlist"
    if any(t in s for t in ["open", "opened", "available", "now open"]):
        return "open"
    if any(t in s for t in ["closed", "close", "ended", "not open"]):
        return "closed"
    return "unknown"


def _pick(obj: Dict[str, Any], paths: List[str]) -> Any:
    """
    Pick the first existing key from a list of dot-paths.
    Example: ["location.city", "city"]
    """
    for path in paths:
        cur: Any = obj
        ok = True
        for part in path.split("."):
            if isinstance(cur, dict) and part in cur:
                cur = cur[part]
            else:
                ok = False
                break
        if ok:
            return cur
    return None


# -----------------------------
# Event-shape detection
# -----------------------------
def _extract_event_dicts(obj: Any) -> List[Dict[str, Any]]:
    """
    Walk arbitrary JSON and collect dicts that look like "event/race" objects.

    Heuristic: must have
      - a name/title field, AND
      - a date/startDate field, AND
      - a location-ish field (country/city/location)
    """
    found: List[Dict[str, Any]] = []

    def walk(x: Any):
        if isinstance(x, dict):
            keys = set(x.keys())

            has_name = any(k in keys for k in ["name", "title", "raceName", "eventName"])
            has_date = any(k in keys for k in ["date", "startDate", "start_date", "start", "start_date_utc"])
            has_loc = any(k in keys for k in ["country", "location", "city", "place", "region", "state"])

            if has_name and has_date and has_loc:
                found.append(x)

            for v in x.values():
                walk(v)

        elif isinstance(x, list):
            for it in x:
                walk(it)

    walk(obj)
    return found


def _choose_best_payload(payloads: List[Dict[str, Any]]) -> Tuple[Optional[str], List[Dict[str, Any]]]:
    """
    Choose the JSON payload whose extracted event dict count is maximal.
    Returns (best_url, best_event_dicts)
    """
    best_url: Optional[str] = None
    best: List[Dict[str, Any]] = []

    for p in payloads:
        data = p.get("data")
        cands = _extract_event_dicts(data)
        if len(cands) > len(best):
            best = cands
            best_url = p.get("url")

    return best_url, best


# -----------------------------
# Playwright crawl + JSON capture
# -----------------------------
def crawl_utmb_world_series_events(
    url: str,
    headless: bool,
    max_scrolls: int,
    scroll_pause: float,
    save_html: Optional[str],
    save_json: Optional[str],
) -> pd.DataFrame:
    captured_json_payloads: List[Dict[str, Any]] = []

    def maybe_capture_json(response):
        # Capture ALL JSON responses (no URL filtering)
        try:
            ct = (response.headers.get("content-type") or "").lower()
            if "application/json" not in ct:
                return
            data = response.json()
            if isinstance(data, (dict, list)):
                captured_json_payloads.append({"url": response.url, "data": data})
        except Exception:
            pass

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        page = browser.new_page(
            viewport={"width": 1440, "height": 900},
            user_agent="Mozilla/5.0 (compatible; RaceAggregatorBot/1.0)"
        )

        page.on("response", maybe_capture_json)

        page.goto(url, wait_until="networkidle", timeout=60000)

        # best-effort cookie accept
        for txt in ["Accept", "I agree", "Agree", "Tout accepter", "Accepter"]:
            try:
                btn = page.get_by_role("button", name=re.compile(txt, re.I))
                if btn.count() > 0:
                    btn.first.click(timeout=2000)
                    break
            except Exception:
                pass

        # scroll to load all
        last_height = 0
        stable = 0
        for _ in range(max_scrolls):
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            time.sleep(scroll_pause)
            height = page.evaluate("document.body.scrollHeight")
            if height == last_height:
                stable += 1
                if stable >= 3:
                    break
            else:
                stable = 0
                last_height = height

        rendered_html = page.content()
        if save_html:
            Path(save_html).write_text(rendered_html, encoding="utf-8")

        browser.close()

    # Save captured JSON for debugging (optional)
    if save_json:
        Path(save_json).write_text(json.dumps(captured_json_payloads, indent=2), encoding="utf-8")

    best_url, candidates = _choose_best_payload(captured_json_payloads)
    if not candidates:
        raise RuntimeError(
            "No races parsed from captured JSON.\n"
            "We captured JSON responses, but none matched the expected event shape.\n"
            "Tips:\n"
            "  - Re-run with --headed and --save-json utmb_debug.json\n"
            "  - Open utmb_debug.json and search for keys: name, startDate, country, events\n"
        )

    print(f"Using events payload from: {best_url} (event-like objects: {len(candidates)})")

    # Parse race-level rows (best-effort: field names differ between payloads)
    rows: List[Dict[str, Any]] = []
    seen = set()

    for e in candidates:
        name = _pick(e, ["name", "title", "raceName", "eventName"])

        city = _pick(e, ["city", "location.city", "place.city"])
        region = _pick(e, ["region", "state", "location.region", "place.region", "location.state"])
        country = _pick(e, ["country", "location.country", "place.country"])

        location_parts = [p for p in [_clean(city), _clean(region), _clean(country)] if p]
        location = ", ".join(location_parts) if location_parts else None

        start_date = _pick(e, ["startDate", "start_date", "start", "date", "start_date_utc"])
        end_date = _pick(e, ["endDate", "end_date", "end"])

        # registration status & dates (names vary)
        reg_raw = _pick(e, [
            "registrationStatus",
            "registration.status",
            "registration.statusLabel",
            "registration",
            "statusRegistration",
            "registration_state",
        ])
        reg_status = _normalize_reg_status(reg_raw)

        reg_open = _pick(e, [
            "registrationOpenDate",
            "registration.openDate",
            "registration.open_date",
            "registration_open",
        ])
        reg_close = _pick(e, [
            "registrationCloseDate",
            "registration.closeDate",
            "registration.close_date",
            "registration_close",
        ])

        # url/slug (names vary)
        link = _pick(e, ["url", "link", "href", "raceUrl", "eventUrl"])
        slug = _pick(e, ["slug", "raceSlug", "eventSlug", "id", "raceId"])

        if isinstance(link, str) and link.startswith("/"):
            link = BASE_URL + link
        if not link and slug:
            # common-ish pattern; may not always work
            link = f"{BASE_URL}/races/{str(slug).lstrip('/')}"

        link = _clean(link)

        # optional metrics at race-level
        dist = _pick(e, ["distance", "distanceKm", "distance_km", "mainDistance", "raceDistance"])
        elev = _pick(e, ["elevationGain", "elevGain", "elevation_gain", "elevationGainM", "elevationGainMeters"])
        stones = _pick(e, ["runningStones", "stones"])

        key = (_clean(name), _clean(location), _clean(str(start_date)), _clean(link))
        if key in seen:
            continue
        seen.add(key)

        rows.append({
            "race_name": _clean(name),
            "location": location,
            "start_date_raw": _clean(start_date),
            "end_date_raw": _clean(end_date),
            "registration_status": reg_status,
            "registration_open_date_raw": _clean(reg_open),
            "registration_close_date_raw": _clean(reg_close),
            "distance_raw": _clean(dist),
            "elevation_gain_raw": _clean(elev),
            "running_stones_raw": _clean(stones),
            "distance_value": _as_float(dist),
            "elevation_gain_value": _as_float(elev),
            "running_stones": int(_as_float(stones)) if _as_float(stones) is not None else None,
            "official_url": link,
        })

    df = pd.DataFrame(rows)
    df = df[df["race_name"].notna()].drop_duplicates(
        subset=["race_name", "location", "official_url"],
        keep="first"
    ).reset_index(drop=True)

    if df.empty:
        raise RuntimeError(
            "Parsed candidates but output dataframe is empty after cleanup.\n"
            "Please inspect utmb_debug.json to confirm fields."
        )

    return df


# -----------------------------
# CLI
# -----------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default=DEFAULT_URL, help="UTMB World Series Events page URL")
    ap.add_argument("--output", required=True, help="Output CSV path")
    ap.add_argument("--headed", action="store_true", help="Run with visible browser (debug)")
    ap.add_argument("--max-scrolls", type=int, default=140, help="Max scroll iterations")
    ap.add_argument("--scroll-pause", type=float, default=1.0, help="Pause seconds between scrolls")
    ap.add_argument("--save-html", default="", help="Optional path to save rendered HTML")
    ap.add_argument("--save-json", default="", help="Optional path to save captured JSON payloads (debug)")
    args = ap.parse_args()

    df = crawl_utmb_world_series_events(
        url=args.url,
        headless=not args.headed,
        max_scrolls=args.max_scrolls,
        scroll_pause=args.scroll_pause,
        save_html=args.save_html or None,
        save_json=args.save_json or None,
    )

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out, index=False)
    print(f"Saved {len(df)} races -> {out}")


if __name__ == "__main__":
    main()