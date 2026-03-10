"""
Agent 4: Strategy Agent

Reads brand_config.json and research_report.json and produces:
- A full campaign brief
- A content calendar (per channel)

Outputs:
- data/campaigns/campaign_brief.json
- data/content_calendar/content_calendar.json
"""

import json
import os
from datetime import datetime, timedelta

import anthropic
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config.settings import ANTHROPIC_API_KEY, BRAND_DIR, DATA_DIR

router = APIRouter()
client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


# --- Request model ---

class StrategyRequest(BaseModel):
    campaign_name: str
    campaign_goal: str           # e.g. "brand awareness", "lead generation", "app downloads"
    duration_days: int = 14
    budget_tier: str = "low"     # low | medium | high
    channels: list[str] = ["instagram", "tiktok", "linkedin", "email"]


# --- Loaders ---

def load_brand_config() -> dict:
    path = os.path.join(BRAND_DIR, "brand_config.json")
    if not os.path.exists(path):
        raise FileNotFoundError("brand_config.json not found. Run the Branding Agent first.")
    with open(path) as f:
        return json.load(f)


def load_research_report() -> dict:
    path = os.path.join(DATA_DIR, "reports", "research_report.json")
    if not os.path.exists(path):
        raise FileNotFoundError("research_report.json not found. Run the Research Agent first.")
    with open(path) as f:
        return json.load(f)


# --- Combined strategy generation (single Claude call) ---

def generate_strategy(request: StrategyRequest, brand: dict, research: dict) -> tuple:
    """
    Produce the campaign brief AND content calendar in a single Claude call.
    Much faster than the previous 4-call approach (1 brief + 3 calendar chunks).
    """

    start_date = datetime.utcnow().date()
    dates = [str(start_date + timedelta(days=i)) for i in range(request.duration_days)]
    channels_str = ", ".join(request.channels)

    audience_str = json.dumps(research.get("audience_profile", {}), indent=2)[:600]
    channel_rec_str = json.dumps(research.get("channel_recommendations", {}), indent=2)[:500]
    angles_str = json.dumps(research.get("campaign_angles", []))
    keywords_str = json.dumps(research.get("seo_strategy", {}).get("primary_keywords", []))
    value_prop = (brand.get("value_proposition") or "")[:500]
    tone_str = json.dumps(brand.get("tone_adjectives", []))

    prompt = (
        "You are a senior marketing strategist. Based on the inputs below, return a complete campaign strategy.\n\n"
        "--- CAMPAIGN INPUTS ---\n"
        f"Campaign Name: {request.campaign_name}\n"
        f"Goal: {request.campaign_goal}\n"
        f"Duration: {request.duration_days} days\n"
        f"Budget Tier: {request.budget_tier}\n"
        f"Channels: {channels_str}\n\n"
        "--- BRAND CONFIG ---\n"
        f"Brand Name: {brand.get('brand_name')}\n"
        f"Tagline: {brand.get('tagline')}\n"
        f"Tone: {tone_str}\n"
        f"One-liner: {brand.get('one_liner')}\n"
        f"Value Proposition: {value_prop}\n\n"
        "--- RESEARCH INSIGHTS ---\n"
        f"Audience Profile: {audience_str}\n"
        f"Channel Recommendations: {channel_rec_str}\n"
        f"Campaign Angles: {angles_str}\n"
        f"SEO Keywords: {keywords_str}\n\n"
        "--- CALENDAR DATES ---\n"
        f"{json.dumps(dates)}\n\n"
        "Return ONLY valid JSON (no markdown, no extra text) with this exact structure:\n"
        '{\n'
        '  "brief": {\n'
        f'    "campaign_name": "{request.campaign_name}",\n'
        f'    "campaign_goal": "{request.campaign_goal}",\n'
        f'    "duration_days": {request.duration_days},\n'
        '    "target_audience_summary": "2-3 sentence summary",\n'
        '    "core_message": "Single most important message",\n'
        '    "campaign_angles": [\n'
        '      {"angle": "Name", "description": "Why it resonates", "channels": ["channel"]}\n'
        '    ],\n'
        '    "content_pillars": [\n'
        '      {"pillar": "Name", "description": "What content", "percentage": "X%"}\n'
        '    ],\n'
        '    "channel_strategy": {\n'
        '      "channel_name": {\n'
        '        "role": "Role in campaign",\n'
        '        "content_types": ["type"],\n'
        '        "posting_frequency": "Xx/week",\n'
        '        "primary_cta": "CTA",\n'
        '        "kpis": {"primary": "KPI", "targets": {"metric": "value"}}\n'
        '      }\n'
        '    },\n'
        '    "hashtag_strategy": {\n'
        '      "branded": ["#tag"], "campaign": ["#tag"], "community": ["#tag"]\n'
        '    },\n'
        '    "budget_allocation": {"channel": "%"},\n'
        '    "success_metrics": {"metric": "target"}\n'
        '  },\n'
        '  "calendar": [\n'
        '    {\n'
        '      "date": "YYYY-MM-DD",\n'
        f'      "channel": "one of: {channels_str}",\n'
        '      "content_pillar": "pillar name",\n'
        '      "format": "post | reel | thread | article | newsletter | story | video",\n'
        '      "angle": "angle name",\n'
        '      "topic": "Specific topic",\n'
        '      "caption_brief": "2-3 sentence brief",\n'
        '      "visual_brief": "Image/video description",\n'
        '      "hashtags": ["#tag"],\n'
        '      "cta": "Call to action"\n'
        '    }\n'
        '  ]\n'
        '}\n\n'
        f"For the calendar: schedule posts across all {request.duration_days} dates at realistic frequency "
        f"(social 3-4x/week, email/blog 1x/week). Keep topics varied — no duplicate topics on the same date."
    )

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=8000,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        result = json.loads(raw)
        return result.get("brief", {}), result.get("calendar", [])
    except json.JSONDecodeError:
        return {"raw_response": raw, "parse_error": "Claude response was not valid JSON"}, []


# --- Core agent logic ---

def run_strategy_agent(request: StrategyRequest) -> dict:
    """
    Full strategy pipeline:
    1. Load brand config and research report
    2. Generate campaign brief + content calendar in a single Claude call
    3. Save campaign_brief.json and content_calendar.json
    """

    print(f"\n[Strategy Agent] Building campaign strategy: {request.campaign_name}")

    # Step 1: Load dependencies
    print("  -> Loading brand config and research report...")
    brand = load_brand_config()
    research = load_research_report()

    # Step 2: Generate brief + calendar in one call
    print("  -> Generating strategy with Claude (single call)...")
    brief, calendar = generate_strategy(request, brand, research)
    brief["generated_at"] = datetime.utcnow().isoformat()

    # Step 3: Save outputs
    campaigns_dir = os.path.join(DATA_DIR, "campaigns")
    calendar_dir = os.path.join(DATA_DIR, "content_calendar")
    os.makedirs(campaigns_dir, exist_ok=True)
    os.makedirs(calendar_dir, exist_ok=True)

    brief_path = os.path.join(campaigns_dir, "campaign_brief.json")
    with open(brief_path, "w") as f:
        json.dump(brief, f, indent=2)
    print(f"  -> Campaign brief saved to {brief_path}")

    calendar_path = os.path.join(calendar_dir, "content_calendar.json")
    with open(calendar_path, "w") as f:
        json.dump(calendar, f, indent=2)
    print(f"  -> Content calendar saved to {calendar_path} ({len(calendar)} items)")

    return {
        "campaign_brief": brief,
        "content_calendar_items": len(calendar),
        "content_calendar_preview": calendar[:5],
        "files_saved": [brief_path, calendar_path],
    }


# --- FastAPI route ---

@router.post("/strategy")
def run_strategy_endpoint(request: StrategyRequest):
    """
    Trigger the Strategy Agent.
    Requires brand_config.json and research_report.json to exist.
    Produces a campaign brief and a day-by-day content calendar.
    """
    try:
        return run_strategy_agent(request)
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
