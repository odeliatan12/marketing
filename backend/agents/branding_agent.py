"""
Agent 2: Branding Agent

Reads market_intelligence_report.json produced by the Market Intelligence Agent
and uses Claude to generate brand identity options for the user to choose from.

Outputs:
- brand/brand_config.json  — structured config consumed by all downstream agents
- brand/brand_guide.md     — full written brand style guide
"""

import base64
import json
import os
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

import anthropic
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel

from config.settings import ANTHROPIC_API_KEY, BRAND_DIR, OPENAI_API_KEY

router = APIRouter()
client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

# OpenAI client for image generation (optional — gracefully skipped if key not set)
openai_client = None
if OPENAI_API_KEY:
    try:
        from openai import OpenAI
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
    except ImportError:
        pass

MOCKUPS_DIR = os.path.join(BRAND_DIR, "mockups")


# --- Request / Response models ---

class BrandingRequest(BaseModel):
    product_name: str
    description: str
    target_audience: str
    goals: str
    vibe: str = ""   # optional tone hint, e.g. "bold, clean, energetic"


class BrandConfirmRequest(BaseModel):
    product_name: str
    target_audience: str
    brand: dict   # the chosen BrandConfig object from /branding/options


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


# --- Core helpers ---

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


def generate_brand_options(request: BrandingRequest, market_data: dict) -> list[dict]:
    """
    Ask Claude to produce 3 distinct brand identity concepts in a single call.
    Each concept has a different personality archetype, visual direction, and positioning angle.
    """
    ai_summary = market_data.get("ai_summary", {})

    prompt = (
        "You are a world-class brand strategist. Based on the product brief and market research below, "
        "generate 3 DISTINCT brand identity concepts. Each must have a completely different personality, "
        "visual style, and positioning angle — so the client has genuinely different options to choose from.\n\n"
        "--- PRODUCT BRIEF ---\n"
        f"Product: {request.product_name}\n"
        f"Description: {request.description}\n"
        f"Target Audience: {request.target_audience}\n"
        f"Goals: {request.goals}\n"
        f"Desired vibe: {request.vibe or 'not specified'}\n\n"
        "--- MARKET INTELLIGENCE ---\n"
        f"Competitors: {json.dumps(ai_summary.get('competitor_names', []))}\n"
        f"Competitor Taglines: {json.dumps(ai_summary.get('competitor_taglines', []))}\n"
        f"Customer Pain Points: {json.dumps(ai_summary.get('top_customer_pain_points', []))}\n"
        f"Customer Desires: {json.dumps(ai_summary.get('top_customer_desires', []))}\n"
        f"Market Gaps: {json.dumps(ai_summary.get('market_gaps', []))}\n"
        f"Common Visual Patterns (differentiate FROM): {json.dumps(ai_summary.get('common_visual_tone_patterns', []))}\n"
        f"Differentiation Opportunities: {json.dumps(ai_summary.get('differentiation_opportunities', []))}\n\n"
        "--- RULES ---\n"
        "- Each brand name must be distinct from all competitor names.\n"
        "- Each concept must use a DIFFERENT personality archetype.\n"
        "- Colors and fonts must deliberately differ from the common market patterns.\n"
        "- The 3 options should feel like genuinely different creative directions.\n"
        "- BE CONCISE: use short, punchy language throughout. No long sentences.\n\n"
        "Return ONLY a valid JSON array with exactly 3 objects. Each object:\n"
        "[\n"
        "  {\n"
        '    "brand_name": "Name (1-2 words)",\n'
        '    "tagline": "Under 7 words",\n'
        '    "positioning_angle": "Max 15 words — the unique angle this concept owns",\n'
        '    "mission": "Max 15 words",\n'
        '    "vision": "Max 15 words",\n'
        '    "core_values": ["2-3 word value", "2-3 word value", "2-3 word value"],\n'
        '    "personality_archetype": "e.g. The Hero",\n'
        '    "tone_adjectives": ["adj", "adj", "adj", "adj"],\n'
        '    "voice_dos": ["Do X (max 10 words)", "Do Y", "Do Z"],\n'
        '    "voice_donts": ["Don\'t X (max 10 words)", "Don\'t Y", "Don\'t Z"],\n'
        '    "colors": {\n'
        '      "primary": "#hexcode",\n'
        '      "secondary": "#hexcode",\n'
        '      "accent": "#hexcode",\n'
        '      "background": "#hexcode",\n'
        '      "text": "#hexcode",\n'
        '      "rationale": "Max 20 words — why these colors"\n'
        '    },\n'
        '    "fonts": {\n'
        '      "heading": "Google Font name",\n'
        '      "body": "Google Font name",\n'
        '      "rationale": "Max 15 words — why these fonts"\n'
        '    },\n'
        '    "logo_prompt": "2-3 sentence logo generation prompt",\n'
        '    "illustration_style": "Max 15 words",\n'
        '    "elevator_pitch": "2 sentences max",\n'
        '    "one_liner": "Max 20 words",\n'
        '    "value_proposition": "2-3 sentences max",\n'
        '    "mockup_prompts": {\n'
        '      "mockup_1": "...",\n'
        '      "mockup_2": "...",\n'
        '      "mockup_3": "...",\n'
        '      "mockup_4": "...",\n'
        '      "mockup_5": "...",\n'
        '      "mockup_6": "..."\n'
        '    }\n'
        "  }\n"
        "]\n"
        "\n"
        f"For mockup_prompts: generate 6 photorealistic DALL-E image generation prompts for this EXACT product: '{request.product_name}' ({request.description}).\n"
        "\n"
        "CRITICAL RULE — PACKAGING FORMAT ACCURACY:\n"
        "You MUST first identify what this product actually IS and what its real-world packaging looks like in stores/online.\n"
        "Study how this exact product category is sold on Amazon, Lazada, Walmart, etc., and replicate that packaging format precisely.\n"
        "DO NOT default to generic boxes, luxury bottles, or cosmetic packaging unless the product is literally those things.\n"
        "\n"
        "Packaging format by product category (use the correct one):\n"
        f"  - Adult diapers / incontinence products (e.g. adult diapers, protective underwear, pull-ups) → RESEALABLE PLASTIC BAG or CARDBOARD CARTON, shows actual underwear/diaper product visible through window or lifestyle photo, large count number (e.g. '16 count'), absorbency level badge, size indicator (S/M/L/XL), brand name prominent on front panel\n"
        "  - Baby diapers / baby wipes → plastic bag or box with baby imagery, count shown prominently\n"
        "  - Protein powder / supplements → tall cylindrical tub/container with scoop, nutrition facts panel, flavor name\n"
        "  - Food / snacks → stand-up pouch, can, or box with appetite-appealing food photography\n"
        "  - Beverages → bottle, can, or carton with condensation/lifestyle photography\n"
        "  - Skincare / cosmetics → pump bottle, tube, or jar with clean clinical or luxury styling\n"
        "  - SaaS / app → phone/laptop screen mockup, UI screenshots, not physical packaging\n"
        "  - Apparel / fashion → clothing tags, shopping bags, folded garment with label visible\n"
        "  - Cleaning products → spray bottle, pouch refill pack, or bottle\n"
        "\n"
        "Each of the 6 prompts must:\n"
        "  1. Use the CORRECT packaging format for this product (see above — never use a luxury box if the product is sold in a bag)\n"
        "  2. Describe the packaging shape, material (plastic bag / resealable pouch / carton / bottle / etc.) explicitly\n"
        "  3. Apply the brand's primary color as the packaging's dominant color\n"
        "  4. Include the brand name text printed on the packaging\n"
        "  5. Show realistic product details: count/size/variant/usage info typical for this product category\n"
        "  6. Be a complete, detailed DALL-E prompt: specify photorealistic style, lighting (studio white background OR lifestyle shelf setting), camera angle\n"
        "  7. Use the JSON key as a snake_case descriptive label of the mockup type (e.g. 'resealable_bag_front', 'shelf_display', 'lifestyle_bedroom')\n"
        "\n"
        "The goal: each image must look like a real product you'd find on Amazon or a pharmacy shelf — accurate to how this product is actually sold."
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
        options = json.loads(raw)
        if isinstance(options, list):
            ts = datetime.utcnow().isoformat()
            for opt in options:
                opt["generated_at"] = ts
            return options
        return []
    except json.JSONDecodeError:
        return []


def generate_brand_guide(brand: dict, product_name: str, target_audience: str) -> str:
    """Ask Claude to write the full prose brand style guide as markdown."""

    prompt = f"""
You are a brand copywriter. Using the structured brand config below, write a complete Brand Style Guide in markdown.

Brand Config:
{json.dumps(brand, indent=2)}

Product: {product_name}
Target Audience: {target_audience}

Write a concise brand style guide with these sections:
1. Brand Overview (mission, vision, values — bullet points only)
2. Personality & Tone (archetype + do/don't list, 3 items each)
3. Sample Copy (one tweet, one headline, one email subject line)
4. Color Palette (hex codes + one-line usage note per color)
5. Typography (font names + one-line usage rule each)
6. Messaging (one-liner, elevator pitch, value proposition)

Keep each section tight — no long paragraphs. Use bullet points and short labels. Designer/copywriter ready.
"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}],
    )

    return message.content[0].text.strip()


# --- DALL-E mockup image generation ---

def _generate_single_image(key: str, prompt: str, brand_slug: str) -> tuple[str, str | None]:
    """Generate one DALL-E 3 image and save to disk. Returns (key, relative_url | None)."""
    if not openai_client:
        return key, None
    try:
        response = openai_client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size="1024x1024",
            quality="standard",
            response_format="b64_json",
            n=1,
        )
        b64 = response.data[0].b64_json
        img_bytes = base64.b64decode(b64)
        os.makedirs(os.path.join(MOCKUPS_DIR, brand_slug), exist_ok=True)
        safe_key = re.sub(r"[^a-z0-9_]", "_", key.lower())
        filename = f"{safe_key}.png"
        filepath = os.path.join(MOCKUPS_DIR, brand_slug, filename)
        with open(filepath, "wb") as f:
            f.write(img_bytes)
        # Return URL path relative to /brand-assets (served by FastAPI StaticFiles)
        return key, f"/brand-assets/mockups/{brand_slug}/{filename}"
    except Exception as e:
        print(f"  [Warning] Image generation failed for {key}: {e}")
        return key, None


def generate_mockup_images(mockup_prompts: dict, brand_name: str) -> dict:
    """
    Generate all mockup images in parallel using DALL-E 3.
    Returns { key: image_url } for successfully generated images.
    """
    if not openai_client or not mockup_prompts:
        return {}

    brand_slug = re.sub(r"[^a-z0-9]", "_", brand_name.lower())
    print(f"  -> Generating {len(mockup_prompts)} mockup images with DALL-E 3...")

    images = {}
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            executor.submit(_generate_single_image, key, prompt, brand_slug): key
            for key, prompt in mockup_prompts.items()
            if prompt
        }
        for future in as_completed(futures):
            key, url = future.result()
            if url:
                images[key] = url
                print(f"     ✓ {key}")

    return images


# --- FastAPI routes ---

@router.post("/branding/upload-market-intelligence")
async def upload_market_intelligence(file: UploadFile = File(...)):
    """
    Accept a market_intelligence_report.json upload and save it to BRAND_DIR.
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


@router.post("/branding/options")
def get_branding_options(request: BrandingRequest):
    """
    Generate 3 distinct brand identity concepts for the user to choose from.
    Returns an array of 3 brand configs — no brand guide generated yet.
    """
    try:
        print(f"\n[Branding Agent] Generating 3 options for: {request.product_name}")
        market_data = load_market_intelligence()
        options = generate_brand_options(request, market_data)
        if not options:
            raise HTTPException(status_code=500, detail="Failed to generate brand options.")
        return {"options": options}
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/branding/confirm")
def confirm_branding(request: BrandConfirmRequest):
    """
    Called after the user picks one of the 3 options.
    Generates the full brand style guide for the chosen brand and saves both files.
    """
    try:
        brand = request.brand
        print(f"\n[Branding Agent] Confirming brand: {brand.get('brand_name')}")

        print("  -> Generating brand style guide...")
        brand_guide_md = generate_brand_guide(brand, request.product_name, request.target_audience)

        # Generate mockup images in parallel with DALL-E 3
        mockup_prompts = brand.get("mockup_prompts", {})
        mockup_images = generate_mockup_images(mockup_prompts, brand.get("brand_name", "brand"))

        os.makedirs(BRAND_DIR, exist_ok=True)

        config_path = os.path.join(BRAND_DIR, "brand_config.json")
        with open(config_path, "w") as f:
            json.dump(brand, f, indent=2)

        guide_path = os.path.join(BRAND_DIR, "brand_guide.md")
        with open(guide_path, "w") as f:
            f.write(brand_guide_md)

        print(f"  -> Saved brand_config.json and brand_guide.md ({len(mockup_images)} images generated)")

        return {
            "brand_config": brand,
            "brand_guide_preview": brand_guide_md[:500] + "...",
            "mockup_images": mockup_images,   # { key: "/brand-assets/mockups/..." }
            "files_saved": [config_path, guide_path],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/branding")
def run_branding_endpoint(request: BrandingRequest):
    """
    Legacy single-shot endpoint — generates one brand identity directly.
    """
    try:
        print(f"\n[Branding Agent] Single-shot brand for: {request.product_name}")
        market_data = load_market_intelligence()
        options = generate_brand_options(request, market_data)
        if not options:
            raise HTTPException(status_code=500, detail="Failed to generate brand.")
        brand = options[0]
        brand_guide_md = generate_brand_guide(brand, request.product_name, request.target_audience)

        os.makedirs(BRAND_DIR, exist_ok=True)
        config_path = os.path.join(BRAND_DIR, "brand_config.json")
        with open(config_path, "w") as f:
            json.dump(brand, f, indent=2)
        guide_path = os.path.join(BRAND_DIR, "brand_guide.md")
        with open(guide_path, "w") as f:
            f.write(brand_guide_md)

        return {
            "brand_config": brand,
            "brand_guide_preview": brand_guide_md[:500] + "...",
            "files_saved": [config_path, guide_path],
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
