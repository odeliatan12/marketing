"""
Agent 9: Optimization Agent

The closing loop of the pipeline. Reads the analytics report and all prior
agent outputs, then produces:

1. A structured optimization plan — what to change and why
2. An updated content calendar — revised based on what's working
3. A/B test proposals — specific variants to test next cycle
4. A feed-back payload for the Strategy Agent to use on the next run

Outputs:
- data/reports/optimization_plan.json
- data/content_calendar/content_calendar_v{n}.json  (revised calendar)
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

REPORTS_DIR = os.path.join(DATA_DIR, "reports")
CALENDAR_DIR = os.path.join(DATA_DIR, "content_calendar")


# --- Request model ---

class OptimizationRequest(BaseModel):
    apply_to_calendar: bool = True   # if True, generate a revised content calendar
    cycle: int = 2                   # which optimization cycle this is (increments each run)


# --- Loaders ---

def load_json_file(path: str, label: str) -> dict | list:
    if not os.path.exists(path):
        raise FileNotFoundError(f"{label} not found at {path}. Run the required agent first.")
    with open(path) as f:
        return json.load(f)


def load_all_context() -> dict:
    """Load all relevant agent outputs for the optimization agent to reason over."""
    brand_config = load_json_file(os.path.join(BRAND_DIR, "brand_config.json"), "brand_config.json")
    analytics_report = load_json_file(os.path.join(REPORTS_DIR, "analytics_report.json"), "analytics_report.json")
    campaign_brief = load_json_file(os.path.join(DATA_DIR, "campaigns", "campaign_brief.json"), "campaign_brief.json")
    content_calendar = load_json_file(os.path.join(CALENDAR_DIR, "content_calendar.json"), "content_calendar.json")

    # Optional — load if exists
    research_report = {}
    rp = os.path.join(REPORTS_DIR, "research_report.json")
    if os.path.exists(rp):
        with open(rp) as f:
            research_report = json.load(f)

    return {
        "brand_config": brand_config,
        "analytics_report": analytics_report,
        "campaign_brief": campaign_brief,
        "content_calendar": content_calendar,
        "research_report": research_report,
    }


# --- Optimization plan generation ---

def generate_optimization_plan(context: dict, cycle: int) -> dict:
    """
    Ask Claude to produce a full optimization plan based on analytics data
    and the current strategy/calendar.
    """
    analytics = context["analytics_report"]
    brand = context["brand_config"]
    brief = context["campaign_brief"]
    insights = analytics.get("insights", {})

    prompt = f"""
You are a senior marketing optimization strategist. This is cycle {cycle} of the campaign.

Based on the analytics data and current campaign setup, produce a detailed optimization plan.
Every recommendation must be specific, actionable, and tied directly to data.

--- BRAND ---
Name: {brand.get("brand_name")}
Tagline: {brand.get("tagline")}
Tone: {json.dumps(brand.get("tone_adjectives", []))}

--- CAMPAIGN GOAL ---
{brief.get("campaign_goal", "Not set")}

--- ANALYTICS INSIGHTS ---
Overall Health: {insights.get("overall_health", "unknown")}
Summary: {insights.get("summary", "")}
Top Performing Posts: {json.dumps(insights.get("top_performing_posts", []), indent=2)}
Underperforming Posts: {json.dumps(insights.get("underperforming_posts", []), indent=2)}
Platform Insights: {json.dumps(insights.get("platform_insights", {}), indent=2)}
Email Insights: {json.dumps(insights.get("email_insights", {}), indent=2)}
Existing Recommendations: {json.dumps(insights.get("recommendations", []))}
KPI Summary: {json.dumps(insights.get("kpi_summary", {}), indent=2)}

--- CURRENT CONTENT PILLARS ---
{json.dumps(brief.get("content_pillars", []), indent=2)}

--- CURRENT CHANNEL STRATEGY ---
{json.dumps(brief.get("channel_strategy", {}), indent=2)[:1500]}

Return ONLY valid JSON with this exact structure:
{{
  "cycle": {cycle},
  "generated_at": "{datetime.utcnow().isoformat()}",
  "health_status": "green | yellow | red",
  "executive_summary": "3-4 sentence summary of what is working, what is not, and the priority action",
  "channel_optimizations": [
    {{
      "channel": "platform name",
      "current_performance": "brief description",
      "changes": [
        {{
          "change": "Specific change to make",
          "reason": "Data point that justifies this change",
          "expected_impact": "What improvement this should produce"
        }}
      ]
    }}
  ],
  "content_pillar_adjustments": [
    {{
      "pillar": "existing or new pillar name",
      "action": "increase | decrease | replace | add",
      "new_percentage": "X% of content mix",
      "reason": "Data justification"
    }}
  ],
  "posting_schedule_changes": [
    {{
      "channel": "platform name",
      "old_frequency": "X times per week",
      "new_frequency": "X times per week",
      "best_times": ["day HH:MM timezone"],
      "reason": "Engagement data justification"
    }}
  ],
  "ab_tests_to_run": [
    {{
      "test_name": "Short test name",
      "channel": "platform",
      "variable": "What is being tested (subject line, caption style, CTA, posting time, format)",
      "variant_a": "Current / control version",
      "variant_b": "New / test version",
      "success_metric": "How to measure the winner",
      "run_for_days": 7
    }}
  ],
  "topics_to_retire": ["topics or angles that are underperforming and should be dropped"],
  "topics_to_double_down": ["topics or angles that are overperforming and should get more content"],
  "email_optimizations": {{
    "subject_line_direction": "What type of subject lines are working and what to try next",
    "send_time_change": "Recommended new send time if applicable",
    "sequence_adjustments": "Any changes to email sequences"
  }},
  "strategy_feedback": {{
    "update_campaign_goal": "Suggest refining the goal if data suggests a pivot",
    "channel_priority_ranking": ["channels ranked by ROI for next cycle"],
    "budget_reallocation": {{"channel": "suggested % shift"}}
  }},
  "next_cycle_priorities": [
    "Priority 1 for the next 2 weeks",
    "Priority 2 for the next 2 weeks",
    "Priority 3 for the next 2 weeks"
  ]
}}
"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"raw_response": raw, "parse_error": "Could not parse JSON"}


# --- Revised calendar generation ---

def generate_revised_calendar(context: dict, optimization_plan: dict, cycle: int) -> list[dict]:
    """
    Ask Claude to produce a revised 14-day content calendar incorporating
    all optimization plan changes.
    """
    brand = context["brand_config"]
    brief = context["campaign_brief"]

    start_date = datetime.utcnow().date()
    dates = [str(start_date + timedelta(days=i)) for i in range(14)]

    prompt = f"""
You are a content strategist updating a content calendar based on optimization insights.

--- BRAND ---
Name: {brand.get("brand_name")}
Tone: {", ".join(brand.get("tone_adjectives", []))}

--- OPTIMIZATION PLAN SUMMARY ---
Executive Summary: {optimization_plan.get("executive_summary", "")}
Topics to retire: {json.dumps(optimization_plan.get("topics_to_retire", []))}
Topics to double down: {json.dumps(optimization_plan.get("topics_to_double_down", []))}
Channel changes: {json.dumps(optimization_plan.get("channel_optimizations", []), indent=2)[:1500]}
Pillar adjustments: {json.dumps(optimization_plan.get("content_pillar_adjustments", []))}
Schedule changes: {json.dumps(optimization_plan.get("posting_schedule_changes", []))}
A/B tests to run: {json.dumps(optimization_plan.get("ab_tests_to_run", []))}

--- CURRENT CAMPAIGN BRIEF ---
Core Message: {brief.get("core_message", "")}
Channel Strategy: {json.dumps(brief.get("channel_strategy", {}), indent=2)[:1000]}
Hashtag Strategy: {json.dumps(brief.get("hashtag_strategy", {}))}

Dates for this revised calendar: {json.dumps(dates)}

Generate a revised 14-day content calendar. Apply all optimization changes:
- Use updated posting frequencies
- Include A/B test variants where specified (mark them with "ab_test": true)
- Drop retired topics, increase doubled-down topics
- Reflect pillar percentage adjustments in volume

Return ONLY a valid JSON array. Each item:
{{
  "date": "YYYY-MM-DD",
  "channel": "instagram | tiktok | linkedin | twitter | blog | email",
  "content_pillar": "pillar name",
  "format": "post | reel | thread | article | newsletter | story",
  "angle": "campaign angle",
  "topic": "Specific topic title",
  "caption_brief": "2-3 sentence brief of what the copy should say",
  "visual_brief": "Description of the visual",
  "hashtags": ["#tag"],
  "cta": "Call to action",
  "ab_test": false,
  "ab_test_variable": "what is being tested (if ab_test is true)",
  "optimization_cycle": {cycle}
}}
"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        print("  [Warning] Could not parse revised calendar JSON")
        return []


# --- Core agent logic ---

def run_optimization_agent(request: OptimizationRequest) -> dict:
    """
    Full optimization pipeline:
    1. Load all context (analytics, brand, brief, calendar)
    2. Generate optimization plan with Claude
    3. Optionally generate a revised content calendar
    4. Save optimization_plan.json and content_calendar_v{n}.json
    """

    print(f"\n[Optimization Agent] Running cycle {request.cycle}...")

    # Step 1: Load context
    print("  -> Loading all agent outputs...")
    context = load_all_context()

    # Step 2: Optimization plan
    print("  -> Generating optimization plan with Claude...")
    plan = generate_optimization_plan(context, request.cycle)

    # Step 3: Revised calendar
    revised_calendar = []
    if request.apply_to_calendar:
        print("  -> Generating revised content calendar...")
        revised_calendar = generate_revised_calendar(context, plan, request.cycle)

    # Step 4: Save outputs
    os.makedirs(REPORTS_DIR, exist_ok=True)
    os.makedirs(CALENDAR_DIR, exist_ok=True)

    plan_path = os.path.join(REPORTS_DIR, "optimization_plan.json")
    with open(plan_path, "w") as f:
        json.dump(plan, f, indent=2)
    print(f"  -> Optimization plan saved to {plan_path}")

    calendar_path = None
    if revised_calendar:
        calendar_path = os.path.join(CALENDAR_DIR, f"content_calendar_v{request.cycle}.json")
        with open(calendar_path, "w") as f:
            json.dump(revised_calendar, f, indent=2)
        print(f"  -> Revised calendar saved to {calendar_path} ({len(revised_calendar)} items)")

        # Also overwrite the main calendar so Content Agent picks it up next run
        main_calendar_path = os.path.join(CALENDAR_DIR, "content_calendar.json")
        with open(main_calendar_path, "w") as f:
            json.dump(revised_calendar, f, indent=2)

    return {
        "cycle": request.cycle,
        "optimization_plan": plan,
        "revised_calendar_items": len(revised_calendar),
        "revised_calendar_preview": revised_calendar[:3],
        "files_saved": list(filter(None, [plan_path, calendar_path])),
        "next_steps": plan.get("next_cycle_priorities", []),
    }


# --- FastAPI routes ---

@router.post("/optimization/run")
def run_optimization_endpoint(request: OptimizationRequest):
    """
    Trigger the Optimization Agent.
    Reads analytics + all prior outputs, produces an optimization plan,
    and optionally rewrites the content calendar for the next cycle.
    Requires the Analytics Agent to have run first.
    """
    try:
        return run_optimization_agent(request)
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/optimization/plan")
def get_optimization_plan():
    """Return the latest optimization plan."""
    path = os.path.join(REPORTS_DIR, "optimization_plan.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="No optimization plan found. Run the Optimization Agent first.")
    with open(path) as f:
        return json.load(f)


@router.get("/optimization/calendar/{cycle}")
def get_revised_calendar(cycle: int):
    """Return a specific versioned content calendar."""
    path = os.path.join(CALENDAR_DIR, f"content_calendar_v{cycle}.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"No calendar found for cycle {cycle}.")
    with open(path) as f:
        return json.load(f)
