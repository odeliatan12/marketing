"""
Agent 2: Branding Agent

Reads market_intelligence_report.json produced by the Market Intelligence Agent
and uses Claude to generate a full brand identity grounded in real market data.

Outputs:
- brand/brand_config.json  — structured config consumed by all downstream agents
- brand/brand_guide.md     — full written brand style guide
"""

import json
import os
from datetime import datetime

import anthropic
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel

from config.settings import ANTHROPIC_API_KEY, BRAND_DIR

router = APIRouter()
client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


# --- Request / Response models ---

class BrandingRequest(BaseModel):
    product_name: str
    description: str
    target_audience: str
    goals: str
    vibe: str = ""   # optional tone hint, e.g. "bold, clean, energetic"


class BrandConfig(BaseModel):
    brand_name: str
    tagline: str
    mission: str
    vision: str
    core_values: list[str]
    personality_archetype: str
    tone_adjectives: list[str]
    voice_dos: list[str]
    voice_donts: list[str]
    colors: dict
    fonts: dict
    logo_prompt: str
    illustration_style: str
    elevator_pitch: str
    one_liner: str
    value_proposition: str
    generated_at: str


# --- Core agent logic ---

def load_market_intelligence() -> dict:
    """Load the market intelligence report saved by Agent 1."""
    report_path = os.path.join(BRAND_DIR, "market_intelligence_report.json")
    if not os.path.exists(report_path):
        raise FileNotFoundError(
            "market_intelligence_report.json not found. "
            "Run the Market Intelligence Agent first."
        )
    with open(report_path) as f:
        return json.load(f)


def generate_brand_identity(request: BrandingRequest, market_data: dict) -> dict:
    """
    Ask Claude to produce the full brand identity based on:
    - The user's product brief
    - The AI summary from the market intelligence report
    """
    ai_summary = market_data.get("ai_summary", {})

    prompt = f"""
You are a world-class brand strategist and creative director.

Using the product brief and market intelligence data below, create a complete, differentiated brand identity.
Every decision must be informed by the research — do not make generic choices.

--- PRODUCT BRIEF ---
Product Name (working title): {request.product_name}
Description: {request.description}
Target Audience: {request.target_audience}
Goals: {request.goals}
Desired vibe (optional hint): {request.vibe or "not specified"}

--- MARKET INTELLIGENCE SUMMARY ---
Competitor Names: {json.dumps(ai_summary.get("competitor_names", []))}
Competitor Taglines: {json.dumps(ai_summary.get("competitor_taglines", []))}
Price Range: {json.dumps(ai_summary.get("price_range", {}))}
Top Customer Pain Points: {json.dumps(ai_summary.get("top_customer_pain_points", []))}
Top Customer Desires: {json.dumps(ai_summary.get("top_customer_desires", []))}
Trending Keywords: {json.dumps(ai_summary.get("trending_keywords", []))}
Market Gaps: {json.dumps(ai_summary.get("market_gaps", []))}
Common Visual/Tone Patterns (to differentiate FROM): {json.dumps(ai_summary.get("common_visual_tone_patterns", []))}
Differentiation Opportunities: {json.dumps(ai_summary.get("differentiation_opportunities", []))}

--- INSTRUCTIONS ---
- The brand name must be distinct from all competitor names listed above.
- The tagline must NOT echo existing competitor taglines.
- Colors and fonts must deliberately differ from common patterns found in this market.
- Voice and messaging must directly address the top customer pain points and desires.
- The brand must own one of the identified market gaps as its core positioning.

Return ONLY valid JSON with this exact structure:
{{
  "brand_name": "Final chosen brand name",
  "tagline": "Short punchy tagline (under 8 words)",
  "mission": "One sentence brand mission statement",
  "vision": "One sentence brand vision statement",
  "core_values": ["value 1", "value 2", "value 3"],
  "personality_archetype": "One of: The Hero, The Creator, The Sage, The Explorer, The Rebel, The Caregiver, The Jester, The Lover, The Ruler, The Innocent, The Magician, The Everyman",
  "tone_adjectives": ["adj1", "adj2", "adj3", "adj4"],
  "voice_dos": ["Do use active verbs", "Do speak directly to the customer", "..."],
  "voice_donts": ["Don't use jargon", "Don't be passive", "..."],
  "colors": {{
    "primary": "#hexcode",
    "secondary": "#hexcode",
    "accent": "#hexcode",
    "background": "#hexcode",
    "text": "#hexcode",
    "rationale": "Brief explanation of why these colors fit the brand and differentiate from competitors"
  }},
  "fonts": {{
    "heading": "Google Font name",
    "body": "Google Font name",
    "rationale": "Brief explanation of why these fonts fit the brand"
  }},
  "logo_prompt": "Detailed text-to-image prompt for generating the logo (describe style, icon, colors, mood, format)",
  "illustration_style": "Description of icon/illustration style (e.g. flat vector, 2-color, rounded corners)",
  "elevator_pitch": "2-3 sentence pitch covering who it's for, what it does, and why it's different",
  "one_liner": "Single sentence value proposition",
  "value_proposition": "Detailed value proposition (3-5 sentences) addressing the top customer pain points"
}}
"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()

    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"raw_response": raw, "parse_error": "Claude response was not valid JSON"}


def generate_brand_guide(brand: dict, request: BrandingRequest) -> str:
    """Ask Claude to write the full prose brand style guide as markdown."""

    prompt = f"""
You are a brand copywriter. Using the structured brand config below, write a complete Brand Style Guide in markdown.

Brand Config:
{json.dumps(brand, indent=2)}

Product: {request.product_name}
Target Audience: {request.target_audience}

Write the guide with the following sections:
1. Brand Overview (mission, vision, values)
2. Brand Personality & Archetype
3. Voice & Tone (with do/don't examples and sample copy for: a tweet, a product page headline, an email subject line)
4. Color Palette (show hex codes, name each color, explain usage)
5. Typography (show font names, when to use heading vs body)
6. Logo Usage Guidelines
7. Illustration & Icon Style
8. Messaging Hierarchy (one-liner, elevator pitch, full value proposition)

Be specific. Use headers, bullet points, and examples. Write it ready to hand to a designer or copywriter.
"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}],
    )

    return message.content[0].text.strip()


def run_branding_agent(request: BrandingRequest) -> dict:
    """
    Full branding pipeline:
    1. Load market intelligence report
    2. Generate brand identity JSON with Claude
    3. Generate brand style guide markdown with Claude
    4. Save brand_config.json and brand_guide.md
    """

    print(f"\n[Branding Agent] Starting brand creation for: {request.product_name}")

    # Step 1: Load market research
    print("  -> Loading market intelligence report...")
    market_data = load_market_intelligence()

    # Step 2: Generate brand identity
    print("  -> Generating brand identity with Claude...")
    brand = generate_brand_identity(request, market_data)
    brand["generated_at"] = datetime.utcnow().isoformat()

    # Step 3: Generate brand style guide
    print("  -> Writing brand style guide...")
    brand_guide_md = generate_brand_guide(brand, request)

    # Step 4: Save outputs
    os.makedirs(BRAND_DIR, exist_ok=True)

    config_path = os.path.join(BRAND_DIR, "brand_config.json")
    with open(config_path, "w") as f:
        json.dump(brand, f, indent=2)
    print(f"  -> brand_config.json saved to {config_path}")

    guide_path = os.path.join(BRAND_DIR, "brand_guide.md")
    with open(guide_path, "w") as f:
        f.write(brand_guide_md)
    print(f"  -> brand_guide.md saved to {guide_path}")

    return {
        "brand_config": brand,
        "brand_guide_preview": brand_guide_md[:500] + "...",  # truncated in API response
        "files_saved": [config_path, guide_path],
    }


# --- FastAPI routes ---

@router.post("/branding/upload-market-intelligence")
async def upload_market_intelligence(file: UploadFile = File(...)):
    """
    Accept a market_intelligence_report.json upload and save it to BRAND_DIR
    so the Branding Agent can use it without running Market Intelligence first.
    """
    content = await file.read()
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Uploaded file is not valid JSON.")
    os.makedirs(BRAND_DIR, exist_ok=True)
    report_path = os.path.join(BRAND_DIR, "market_intelligence_report.json")
    with open(report_path, "w") as f:
        json.dump(data, f, indent=2)
    return {"status": "ok", "saved_to": report_path}


@router.post("/branding")
def run_branding_endpoint(request: BrandingRequest):
    """
    Trigger the Branding Agent.
    Requires the Market Intelligence Agent to have run first (brand/market_intelligence_report.json must exist).
    Returns the generated brand config and a preview of the brand style guide.
    """
    try:
        result = run_branding_agent(request)
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))
