"""
Agent 3: Research Agent

Runs after the Branding Agent. Performs campaign-level research:
- Audience deep-dive (demographics, psychographics, online behavior)
- SEO keyword research
- Trend analysis (Google Trends, viral topics)
- Competitor content strategy analysis

Outputs:
- data/research_report.json — consumed by the Strategy Agent
"""

import json
import os
from datetime import datetime

import anthropic
import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config.settings import ANTHROPIC_API_KEY, SERPAPI_KEY, DATA_DIR, BRAND_DIR
from tools.web_search import google_search

router = APIRouter()
client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


# --- Request / Response models ---

class ResearchRequest(BaseModel):
    product_name: str
    category: str
    target_audience: str
    channels: list[str] = ["instagram", "tiktok", "linkedin", "twitter", "blog"]
    campaign_goal: str  # e.g. "brand awareness", "lead generation", "app downloads"


# --- Tools ---

def fetch_google_trends(keyword: str) -> dict:
    """
    Query SerpAPI's Google Trends endpoint for interest over time
    and related queries for a given keyword.
    """
    params = {
        "engine": "google_trends",
        "q": keyword,
        "api_key": SERPAPI_KEY,
        "date": "today 3-m",
    }
    try:
        response = requests.get("https://serpapi.com/search", params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        return {
            "keyword": keyword,
            "interest_over_time": data.get("interest_over_time", {}).get("timeline_data", [])[:10],
            "related_queries": {
                "rising": [q.get("query") for q in data.get("related_queries", {}).get("rising", [])[:10]],
                "top": [q.get("query") for q in data.get("related_queries", {}).get("top", [])[:10]],
            },
        }
    except Exception as e:
        print(f"[Google Trends] Error: {e}")
        return {"keyword": keyword, "error": str(e)}


def fetch_seo_keywords(query: str) -> list[dict]:
    """
    Use SerpAPI to pull autocomplete and related keyword suggestions.
    """
    params = {
        "engine": "google_autocomplete",
        "q": query,
        "api_key": SERPAPI_KEY,
    }
    try:
        response = requests.get("https://serpapi.com/search", params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        suggestions = data.get("suggestions", [])
        return [
            {"keyword": s.get("value", ""), "type": s.get("type", "")}
            for s in suggestions[:20]
        ]
    except Exception as e:
        print(f"[SEO Keywords] Error: {e}")
        return []


def research_competitor_content(category: str, channel: str) -> list[dict]:
    """
    Search Google for top-performing content in the category on a given channel.
    Returns headlines and URLs of posts/articles that are getting traction.
    """
    query = f"best {category} content on {channel} 2024 2025"
    results = google_search(query, num_results=8)
    return results.get("organic_results", [])


def load_brand_config() -> dict:
    """Load brand_config.json saved by the Branding Agent."""
    path = os.path.join(BRAND_DIR, "brand_config.json")
    if not os.path.exists(path):
        return {}
    with open(path) as f:
        return json.load(f)


# --- Claude synthesis ---

def synthesize_research(request: ResearchRequest, raw_data: dict) -> dict:
    """
    Ask Claude to turn all gathered research into a structured campaign research report.
    """
    brand = load_brand_config()

    prompt = f"""
You are a senior marketing strategist. Based on the research data below, produce a structured campaign research report.

--- PRODUCT CONTEXT ---
Product: {request.product_name}
Category: {request.category}
Target Audience: {request.target_audience}
Campaign Goal: {request.campaign_goal}
Channels: {", ".join(request.channels)}
Brand Tagline: {brand.get("tagline", "N/A")}
Brand Voice: {json.dumps(brand.get("tone_adjectives", []))}

--- RAW RESEARCH DATA ---
Google Trends: {json.dumps(raw_data.get("trends", {}), indent=2)[:2000]}
SEO Keywords: {json.dumps(raw_data.get("seo_keywords", []), indent=2)[:1500]}
Competitor Content (per channel): {json.dumps(raw_data.get("competitor_content", {}), indent=2)[:2000]}
Audience Search Behavior: {json.dumps(raw_data.get("audience_searches", []), indent=2)[:1000]}

Return ONLY valid JSON with this exact structure:
{{
  "audience_profile": {{
    "demographics": "Age range, gender split, income level, location focus",
    "psychographics": "Values, lifestyle, motivations, pain points",
    "online_behavior": "Which platforms they use most, when they are active, what content they engage with",
    "language_patterns": ["phrases and words this audience actually uses"]
  }},
  "seo_strategy": {{
    "primary_keywords": ["top 5 keywords to target"],
    "long_tail_keywords": ["top 10 long-tail keyword phrases"],
    "content_topics": ["10 blog/article topic ideas based on keyword gaps"]
  }},
  "trend_insights": {{
    "rising_trends": ["trends gaining momentum in this category"],
    "seasonal_patterns": "Any seasonal spikes or dips to plan around",
    "viral_content_formats": ["content formats currently going viral in this category"]
  }},
  "competitor_content_analysis": {{
    "what_works": ["content styles and topics that perform well for competitors"],
    "gaps": ["topics or angles competitors are NOT covering that we can own"]
  }},
  "channel_recommendations": {{
    "priority_channels": ["channels ranked by potential for this goal and audience"],
    "posting_frequency": {{"channel_name": "X posts per week"}},
    "best_posting_times": {{"channel_name": "time and timezone"}}
  }},
  "campaign_angles": ["5 strong campaign angles or narrative hooks to build content around"]
}}
"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=3000,
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
        return {"raw_response": raw, "parse_error": "Claude response was not valid JSON"}


# --- Core agent logic ---

def run_research_agent(request: ResearchRequest) -> dict:
    """
    Full research pipeline:
    1. Google Trends for the product/category keyword
    2. SEO keyword suggestions
    3. Competitor content research per channel
    4. Audience search behavior
    5. Claude synthesizes into structured research report
    6. Saves data/research_report.json
    """

    print(f"\n[Research Agent] Starting campaign research for: {request.product_name}")

    # Step 1: Google Trends
    print("  -> Fetching Google Trends...")
    trends = fetch_google_trends(f"{request.product_name} {request.category}")

    # Step 2: SEO keywords
    print("  -> Fetching SEO keyword suggestions...")
    seo_keywords = fetch_seo_keywords(f"{request.category} {request.product_name}")

    # Step 3: Competitor content per channel
    print("  -> Researching competitor content per channel...")
    competitor_content = {}
    for channel in request.channels:
        competitor_content[channel] = research_competitor_content(request.category, channel)

    # Step 4: Audience search behavior
    print("  -> Researching audience search behavior...")
    audience_searches = fetch_seo_keywords(f"{request.target_audience} {request.category}")

    raw_data = {
        "trends": trends,
        "seo_keywords": seo_keywords,
        "competitor_content": competitor_content,
        "audience_searches": audience_searches,
    }

    # Step 5: Claude synthesizes
    print("  -> Synthesizing research with Claude...")
    research_report = synthesize_research(request, raw_data)
    research_report["product_name"] = request.product_name
    research_report["generated_at"] = datetime.utcnow().isoformat()

    # Step 6: Save report
    reports_dir = os.path.join(DATA_DIR, "reports")
    os.makedirs(reports_dir, exist_ok=True)
    report_path = os.path.join(reports_dir, "research_report.json")
    with open(report_path, "w") as f:
        json.dump(research_report, f, indent=2)

    print(f"  -> Research report saved to {report_path}")
    return research_report


# --- FastAPI route ---

@router.post("/research")
def run_research_endpoint(request: ResearchRequest):
    """
    Trigger the Research Agent.
    Performs audience, SEO, trend, and competitor content research.
    Requires brand_config.json to exist (run Branding Agent first).
    Saves data/reports/research_report.json for the Strategy Agent.
    """
    try:
        return run_research_agent(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
