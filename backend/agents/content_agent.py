"""
Agent 5: Content Creation Agent

Reads brand_config.json and content_calendar.json and generates the actual
content for every scheduled item — captions, copy, blog posts, video scripts,
ad copy, and image generation prompts.

Outputs:
- data/content/  — one JSON file per content item, plus a master content_batch.json
"""

import json
import os
from datetime import datetime

import anthropic
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config.settings import ANTHROPIC_API_KEY, BRAND_DIR, DATA_DIR

router = APIRouter()
client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

CONTENT_DIR = os.path.join(DATA_DIR, "content")


# --- Request model ---

class ContentRequest(BaseModel):
    generate_for_channels: list[str] = []   # empty = generate for all channels in calendar
    max_items: int = 0                       # 0 = generate for all items
    include_image_prompts: bool = True
    include_video_scripts: bool = True


# --- Loaders ---

def load_brand_config() -> dict:
    path = os.path.join(BRAND_DIR, "brand_config.json")
    if not os.path.exists(path):
        raise FileNotFoundError("brand_config.json not found. Run the Branding Agent first.")
    with open(path) as f:
        return json.load(f)


def load_content_calendar() -> list[dict]:
    path = os.path.join(DATA_DIR, "content_calendar", "content_calendar.json")
    if not os.path.exists(path):
        raise FileNotFoundError("content_calendar.json not found. Run the Strategy Agent first.")
    with open(path) as f:
        return json.load(f)


def load_campaign_brief() -> dict:
    path = os.path.join(DATA_DIR, "campaigns", "campaign_brief.json")
    if not os.path.exists(path):
        return {}
    with open(path) as f:
        return json.load(f)


# --- Per-format content generators ---

def generate_social_post(item: dict, brand: dict) -> dict:
    """Generate caption, hashtags, and image prompt for a social media post."""

    channel = item.get("channel", "instagram")
    char_limits = {
        "instagram": 2200,
        "twitter": 280,
        "linkedin": 3000,
        "tiktok": 2200,
        "facebook": 63206,
    }
    limit = char_limits.get(channel, 2200)

    prompt = f"""
You are a social media copywriter for the brand below. Write a {channel} post.

--- BRAND ---
Name: {brand.get("brand_name")}
Tagline: {brand.get("tagline")}
Tone: {", ".join(brand.get("tone_adjectives", []))}
Voice Do's: {json.dumps(brand.get("voice_dos", []))}
Voice Don'ts: {json.dumps(brand.get("voice_donts", []))}

--- POST BRIEF ---
Topic: {item.get("topic")}
Caption Brief: {item.get("caption_brief")}
Format: {item.get("format")}
CTA: {item.get("cta")}
Hashtags to include: {json.dumps(item.get("hashtags", []))}
Character limit: {limit}

Return ONLY valid JSON:
{{
  "caption": "The full post caption (within character limit)",
  "hashtags": ["#tag1", "#tag2"],
  "cta_text": "The CTA phrasing used in the caption",
  "image_prompt": "Detailed text-to-image prompt describing the visual for this post (style, colors matching brand palette {brand.get('colors', {}).get('primary','')}, mood, composition)",
  "alt_caption": "A shorter alternative version of the caption for A/B testing"
}}
"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}],
    )

    return _parse_json_response(message.content[0].text)


def generate_blog_post(item: dict, brand: dict) -> dict:
    """Generate a full blog article for a calendar blog item."""

    prompt = f"""
You are a content writer for {brand.get("brand_name")}. Write a complete blog post.

--- BRAND ---
Name: {brand.get("brand_name")}
Tone: {", ".join(brand.get("tone_adjectives", []))}
Value Proposition: {brand.get("value_proposition")}

--- ARTICLE BRIEF ---
Topic: {item.get("topic")}
Brief: {item.get("caption_brief")}
CTA: {item.get("cta")}

Write a blog post with:
- A compelling SEO title (H1)
- A meta description (under 160 characters)
- An introduction (2 paragraphs)
- 3-5 body sections with H2 subheadings
- A conclusion with a CTA
- Word count: 600-900 words

Return ONLY valid JSON:
{{
  "title": "SEO-optimised article title",
  "meta_description": "Under 160 characters",
  "slug": "url-friendly-slug",
  "body_markdown": "Full article in markdown format",
  "estimated_word_count": 750,
  "suggested_tags": ["tag1", "tag2", "tag3"],
  "featured_image_prompt": "Text-to-image prompt for the featured image"
}}
"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}],
    )

    return _parse_json_response(message.content[0].text)


def generate_email(item: dict, brand: dict) -> dict:
    """Generate a marketing email for a calendar email item."""

    prompt = f"""
You are an email copywriter for {brand.get("brand_name")}. Write a marketing email.

--- BRAND ---
Name: {brand.get("brand_name")}
Tagline: {brand.get("tagline")}
Tone: {", ".join(brand.get("tone_adjectives", []))}

--- EMAIL BRIEF ---
Topic: {item.get("topic")}
Brief: {item.get("caption_brief")}
CTA: {item.get("cta")}

Return ONLY valid JSON:
{{
  "subject_line": "Primary email subject line",
  "preview_text": "Preview text shown in inbox (under 90 characters)",
  "subject_line_b": "A/B test subject line variant",
  "body_html": "Full email body as plain HTML (no <html>/<body> wrappers, just content divs)",
  "body_plain": "Plain text version of the email",
  "cta_button_text": "Text for the CTA button",
  "cta_url_placeholder": "{{CTA_URL}}"
}}
"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )

    return _parse_json_response(message.content[0].text)


def generate_video_script(item: dict, brand: dict) -> dict:
    """Generate a short-form video script for TikTok/Reels/Shorts."""

    prompt = f"""
You are a short-form video scriptwriter for {brand.get("brand_name")}.
Write a {item.get("format", "reel")} script (45-60 seconds).

--- BRAND ---
Name: {brand.get("brand_name")}
Tone: {", ".join(brand.get("tone_adjectives", []))}

--- VIDEO BRIEF ---
Topic: {item.get("topic")}
Brief: {item.get("caption_brief")}
CTA: {item.get("cta")}
Visual Brief: {item.get("visual_brief")}

Return ONLY valid JSON:
{{
  "hook": "Opening line (first 3 seconds — must stop the scroll)",
  "script": [
    {{"timecode": "0:00-0:03", "voiceover": "...", "on_screen_text": "...", "visual": "..."}},
    {{"timecode": "0:03-0:15", "voiceover": "...", "on_screen_text": "...", "visual": "..."}},
    {{"timecode": "0:15-0:40", "voiceover": "...", "on_screen_text": "...", "visual": "..."}},
    {{"timecode": "0:40-0:55", "voiceover": "...", "on_screen_text": "...", "visual": "..."}}
  ],
  "cta_closing": "Final spoken CTA",
  "caption": "Caption for the video post",
  "hashtags": ["#tag1", "#tag2"],
  "music_mood": "Description of background music mood/genre"
}}
"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}],
    )

    return _parse_json_response(message.content[0].text)


def generate_ad_copy(item: dict, brand: dict) -> dict:
    """Generate ad copy variants for a paid ad item."""

    prompt = f"""
You are a direct-response copywriter for {brand.get("brand_name")}.
Write ad copy for a paid social ad.

--- BRAND ---
Name: {brand.get("brand_name")}
Tagline: {brand.get("tagline")}
Tone: {", ".join(brand.get("tone_adjectives", []))}
Value Proposition: {brand.get("value_proposition")}

--- AD BRIEF ---
Topic: {item.get("topic")}
CTA: {item.get("cta")}

Return ONLY valid JSON:
{{
  "headline_a": "Primary headline (under 40 characters)",
  "headline_b": "A/B test headline variant",
  "headline_c": "A/B test headline variant 2",
  "primary_text": "Main ad body copy (under 125 characters for feed ads)",
  "primary_text_long": "Longer version for stories/article ads (under 300 characters)",
  "description": "Ad description line (under 30 characters)",
  "cta_button": "SHOP_NOW | LEARN_MORE | SIGN_UP | GET_OFFER | DOWNLOAD",
  "image_prompt": "Text-to-image prompt for the ad creative"
}}
"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}],
    )

    return _parse_json_response(message.content[0].text)


# --- Router ---

def route_content_generation(item: dict, brand: dict, include_video_scripts: bool) -> dict:
    """Route each calendar item to the appropriate content generator based on channel + format."""

    channel = item.get("channel", "")
    fmt = item.get("format", "post")

    if channel == "blog":
        generated = generate_blog_post(item, brand)
        content_type = "blog_post"
    elif channel == "email":
        generated = generate_email(item, brand)
        content_type = "email"
    elif fmt in ["reel", "video", "tiktok"] and include_video_scripts:
        generated = generate_video_script(item, brand)
        content_type = "video_script"
    elif fmt == "ad":
        generated = generate_ad_copy(item, brand)
        content_type = "ad_copy"
    else:
        generated = generate_social_post(item, brand)
        content_type = "social_post"

    return {
        "content_type": content_type,
        "generated": generated,
    }


# --- Core agent logic ---

def run_content_agent(request: ContentRequest) -> dict:
    """
    Full content generation pipeline:
    1. Load brand config and content calendar
    2. Filter calendar items by channel (if specified) and max_items
    3. Route each item to the right content generator
    4. Save individual content files + master batch file
    """

    print(f"\n[Content Agent] Starting content generation...")

    # Step 1: Load dependencies
    brand = load_brand_config()
    calendar = load_content_calendar()

    # Step 2: Filter
    if request.generate_for_channels:
        calendar = [i for i in calendar if i.get("channel") in request.generate_for_channels]

    if request.max_items > 0:
        calendar = calendar[:request.max_items]

    print(f"  -> Generating content for {len(calendar)} calendar items...")

    # Step 3: Generate content for each item
    os.makedirs(CONTENT_DIR, exist_ok=True)
    batch = []

    for idx, item in enumerate(calendar):
        print(f"  -> [{idx + 1}/{len(calendar)}] {item.get('channel')} | {item.get('format')} | {item.get('topic', '')[:50]}")

        try:
            result = route_content_generation(item, brand, request.include_video_scripts)
            content_item = {
                **item,
                "content_type": result["content_type"],
                "generated_content": result["generated"],
                "generated_at": datetime.utcnow().isoformat(),
            }
            batch.append(content_item)

            # Save individual file
            filename = f"{item.get('date', 'nodate')}_{item.get('channel', 'unknown')}_{idx}.json"
            with open(os.path.join(CONTENT_DIR, filename), "w") as f:
                json.dump(content_item, f, indent=2)

        except Exception as e:
            print(f"  [Warning] Failed to generate item {idx}: {e}")
            batch.append({**item, "error": str(e)})

    # Step 4: Save master batch
    batch_path = os.path.join(DATA_DIR, "content", "content_batch.json")
    with open(batch_path, "w") as f:
        json.dump(batch, f, indent=2)

    print(f"  -> Content batch saved to {batch_path} ({len(batch)} items)")

    return {
        "total_items_generated": len([b for b in batch if "error" not in b]),
        "total_items_failed": len([b for b in batch if "error" in b]),
        "batch_file": batch_path,
        "preview": batch[:3],
    }


# --- Helpers ---

def _parse_json_response(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"raw_response": text, "parse_error": "Could not parse JSON"}


# --- FastAPI routes ---

@router.post("/content/generate")
def run_content_endpoint(request: ContentRequest):
    """
    Trigger the Content Creation Agent.
    Generates captions, blog posts, emails, video scripts, and ad copy
    for every item in the content calendar.
    Requires brand_config.json and content_calendar.json to exist.
    """
    try:
        return run_content_agent(request)
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/content/batch")
def get_content_batch():
    """Return the full generated content batch."""
    path = os.path.join(DATA_DIR, "content", "content_batch.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="No content batch found. Run content generation first.")
    with open(path) as f:
        return json.load(f)


@router.get("/content/by-channel/{channel}")
def get_content_by_channel(channel: str):
    """Return all generated content for a specific channel."""
    path = os.path.join(DATA_DIR, "content", "content_batch.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="No content batch found.")
    with open(path) as f:
        batch = json.load(f)
    return [item for item in batch if item.get("channel") == channel]
