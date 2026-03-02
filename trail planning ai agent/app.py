"""Trail Planning AI — Streamlit web interface."""

import math
import os

from dotenv import load_dotenv

load_dotenv(override=True)  # always re-read .env so key changes take effect without restart

import streamlit as st

# ── Page config (must be first Streamlit call) ────────────────────────────────
st.set_page_config(
    page_title="Trail Planning AI",
    page_icon="🏔️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── API key guard ─────────────────────────────────────────────────────────────
_api_key = os.getenv("ANTHROPIC_API_KEY", "")
if not _api_key or not _api_key.startswith("sk-"):
    st.error("**ANTHROPIC_API_KEY is missing or invalid.** Add your real key to the `.env` file.")
    st.code("# .env\nANTHROPIC_API_KEY=sk-ant-api03-...")
    st.info("Get your key at https://console.anthropic.com/settings/keys", icon="🔑")
    st.stop()

from agent import run_agent  # noqa: E402 — import after env check
from tools.geocoding import search_location  # noqa: E402
from tools.trails import TRAIL_DATABASE, search_trails  # noqa: E402


def _haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in miles between two lat/lon points."""
    R = 3958.8
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))

# ── Tool labels for the status widget ─────────────────────────────────────────
TOOL_LABELS = {
    "search_location": "📍 Locating on map…",
    "get_weather": "🌤️ Checking weather forecast…",
    "get_elevation": "⛰️ Reading terrain elevation…",
    "calculate_run_stats": "🔢 Calculating run statistics…",
    "search_trails": "🔍 Searching trail database…",
    "think": "🧠 Thinking…",
    "remember": "💾 Saving to memory…",
    "recall": "🧠 Recalling your profile…",
    "forget": "🗑️ Forgetting memory…",
}

QUICK_QUERIES = [
    ("🗺️", "Best trails in the European Alps under 30 km"),
    ("⛰️", "Plan a 25 km run in Chamonix this weekend"),
    ("🏃", "Build me a 12-week training plan for my first 50 km ultra"),
    ("🎒", "What gear do I need for a 6-hour mountain run in summer?"),
    ("💧", "How much water and food for a full-day trail run?"),
    ("🌡️", "Is it safe to run trails in 30°C heat and what precautions should I take?"),
]

# ── Session state ─────────────────────────────────────────────────────────────
if "messages" not in st.session_state:
    st.session_state.messages = []       # list[{role, content}] for display
if "conversation" not in st.session_state:
    st.session_state.conversation = []   # raw agent history (incl. tool results)

# ── Custom CSS ────────────────────────────────────────────────────────────────
st.markdown(
    """
    <style>
    /* Tighten sidebar top padding */
    section[data-testid="stSidebar"] > div { padding-top: 1rem; }
    </style>
    """,
    unsafe_allow_html=True,
)

# ═════════════════════════════════════════════════════════════════════════════
# SIDEBAR
# ═════════════════════════════════════════════════════════════════════════════
with st.sidebar:
    st.title("🏔️ Trail Planning AI")
    st.caption("Powered by Claude claude-sonnet-4-6")

    if st.button("🗑️ Clear conversation", use_container_width=True):
        st.session_state.messages.clear()
        st.session_state.conversation.clear()
        st.rerun()

    st.divider()

    # ── Trail browser ─────────────────────────────────────────────────────────
    st.subheader("🔍 Browse Trails")

    my_location = st.text_input(
        "My location",
        placeholder="e.g. Seattle, WA",
        help="Enter a city or place — trails will be filtered by distance from it.",
    )

    _RADIUS_OPTIONS = {
        "Within 25 miles": 25,
        "Within 50 miles": 50,
        "Within 100 miles": 100,
        "Within 200 miles": 200,
        "Any distance": None,
    }
    radius_label = st.selectbox("Radius", list(_RADIUS_OPTIONS.keys()), index=2)
    radius_miles = _RADIUS_OPTIONS[radius_label]

    difficulty_filter = st.selectbox(
        "Difficulty",
        ["Any", "Easy", "Moderate", "Hard", "Very Hard", "Extreme"],
    )

    if st.button("Search trails", use_container_width=True):
        trails_to_show = []

        if my_location.strip() and radius_miles is not None:
            # Geocode the user's location, then filter by radius
            with st.spinner("Finding your location…"):
                loc = search_location(my_location.strip())

            if "error" in loc:
                st.warning(f"📍 Couldn't find '{my_location}'. Try a city name.")
            else:
                user_lat, user_lon = loc["latitude"], loc["longitude"]
                st.caption(f"📍 Searching near {loc['name'].split(',')[0]}")

                for trail in TRAIL_DATABASE:
                    dist = _haversine_miles(user_lat, user_lon, trail["latitude"], trail["longitude"])
                    if dist <= radius_miles:
                        if difficulty_filter == "Any" or trail["difficulty"] == difficulty_filter:
                            trails_to_show.append({**trail, "_dist_mi": round(dist)})

                trails_to_show.sort(key=lambda t: t["_dist_mi"])

                if not trails_to_show:
                    st.info(f"No trails within {radius_miles} miles of {my_location.strip()}. Try a larger radius.")
        else:
            # Fall back to keyword / difficulty search
            kwargs = {}
            if difficulty_filter != "Any":
                kwargs["difficulty"] = difficulty_filter
            if my_location.strip() and radius_miles is None:
                kwargs["location"] = my_location.strip()
            results = search_trails(**kwargs, limit=6)
            trails_to_show = results["trails"]

        if trails_to_show:
            st.caption(f"{len(trails_to_show)} trail(s) found")
            for trail in trails_to_show[:6]:
                dist_badge = f"  ·  {trail['_dist_mi']} mi away" if "_dist_mi" in trail else ""
                with st.expander(f"**{trail['name']}**  ·  {trail['difficulty']}{dist_badge}"):
                    st.caption(f"📍 {trail['location']}")
                    mc1, mc2 = st.columns(2)
                    mc1.metric("Distance", f"{trail['distance_km']} km")
                    mc2.metric("Gain ↑", f"{trail['elevation_gain_m']} m")
                    st.caption(f"🏷️ {trail['terrain']}  ·  Best: {', '.join(trail['best_seasons'])}")
                    st.write(trail["description"])
                    if trail.get("permits_required"):
                        st.warning("⚠️ Permit required", icon="🎟️")
                    if st.button(
                        "Plan this run →",
                        key=f"plan_{trail['name']}",
                        use_container_width=True,
                    ):
                        st.session_state.pending_query = (
                            f"Help me plan a run on {trail['name']} in {trail['location']}."
                        )
                        st.rerun()

    st.divider()

    # ── Quick-start queries ───────────────────────────────────────────────────
    st.subheader("💡 Quick starts")
    for icon, query in QUICK_QUERIES:
        if st.button(f"{icon} {query}", use_container_width=True, key=query):
            st.session_state.pending_query = query
            st.rerun()

# ═════════════════════════════════════════════════════════════════════════════
# MAIN CHAT AREA
# ═════════════════════════════════════════════════════════════════════════════
st.title("🏔️ Trail Running Planner")
st.caption(
    "Ask me about trails worldwide, weather conditions, effort estimates, "
    "gear lists, nutrition, and training plans."
)

# Render existing conversation
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

# Empty-state prompt
if not st.session_state.messages:
    st.info(
        "👋 **Welcome!** Try asking:\n\n"
        "- *\"Plan a 30 km trail run in the Alps for this Saturday\"*\n"
        "- *\"What's a good first ultra-marathon trail?\"*\n"
        "- *\"How do I train for 3000 m of elevation gain?\"*",
        icon="🏃",
    )

# ── Resolve prompt ────────────────────────────────────────────────────────────
prompt = st.chat_input("Ask about trails, weather, training plans…")
if "pending_query" in st.session_state:
    prompt = st.session_state.pop("pending_query")

# ── Process prompt ────────────────────────────────────────────────────────────
if prompt:
    # Display user bubble
    with st.chat_message("user"):
        st.markdown(prompt)
    st.session_state.messages.append({"role": "user", "content": prompt})

    # Generate assistant response
    with st.chat_message("assistant"):

        def on_tool_call(name: str) -> None:
            label = TOOL_LABELS.get(name, f"🔧 Running {name}…")
            st.write(label)

        try:
            with st.status("🗺️ Planning your trail adventure…", expanded=True) as status:
                response = run_agent(
                    prompt,
                    st.session_state.conversation,
                    on_tool_call=on_tool_call,
                )
                status.update(label="✅ Done!", state="complete", expanded=False)
            st.markdown(response)
        except Exception as e:
            err = str(e)
            if "credit balance" in err or "billing" in err.lower():
                st.error("💳 **Out of credits.** Add funds at https://console.anthropic.com/settings/billing")
            elif "authentication" in err.lower() or "401" in err:
                st.error("🔑 **Invalid API key.** Check your `.env` file.")
            elif "rate" in err.lower():
                st.warning("⏱️ **Rate limited.** Wait a moment and try again.")
            else:
                st.error(f"**Error:** {err}")
            # Roll back the user message so the conversation stays clean
            if st.session_state.conversation and st.session_state.conversation[-1]["role"] == "user":
                st.session_state.conversation.pop()
            st.stop()

    st.session_state.messages.append({"role": "assistant", "content": response})
