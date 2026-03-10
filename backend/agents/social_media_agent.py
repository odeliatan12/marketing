"""
Agent 6: Social Media Management Agent

Reads content_batch.json and publishes or schedules each piece of content
to the appropriate social media platform via their APIs.

Supports:
- Twitter/X (v2 API)
- Instagram (Graph API via Meta)
- LinkedIn (UGC Posts API)
- TikTok (for Business API)
- Buffer (as a fallback scheduler for any platform)

Outputs:
- data/reports/social_publish_log.json — record of every publish/schedule attempt
"""

import json
import os
from datetime import datetime

import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config.settings import (
    DATA_DIR,
    TWITTER_API_KEY,
    TWITTER_API_SECRET,
    TWITTER_ACCESS_TOKEN,
    TWITTER_ACCESS_SECRET,
    INSTAGRAM_ACCESS_TOKEN,
    LINKEDIN_ACCESS_TOKEN,
    TIKTOK_ACCESS_TOKEN,
)

router = APIRouter()

CONTENT_DIR = os.path.join(DATA_DIR, "content")
REPORTS_DIR = os.path.join(DATA_DIR, "reports")


# --- Request model ---

class PublishRequest(BaseModel):
    mode: str = "schedule"          # "publish" (post now) | "schedule" (use scheduled date)
    channels: list[str] = []        # empty = all channels
    dry_run: bool = False           # if True, simulate without calling APIs
    max_items: int = 0              # 0 = process all


# --- Loaders ---

def load_content_batch() -> list[dict]:
    path = os.path.join(CONTENT_DIR, "content_batch.json")
    if not os.path.exists(path):
        raise FileNotFoundError("content_batch.json not found. Run the Content Agent first.")
    with open(path) as f:
        return json.load(f)


# --- Platform publishers ---

def publish_to_twitter(content_item: dict, dry_run: bool) -> dict:
    """
    Post a tweet using Twitter API v2.
    Uses OAuth 1.0a with user context for posting.
    """
    generated = content_item.get("generated_content", {})
    text = generated.get("caption", generated.get("hook", ""))

    # Twitter v2 tweet endpoint
    url = "https://api.twitter.com/2/tweets"
    payload = {"text": text[:280]}  # enforce character limit

    if dry_run:
        return {"status": "dry_run", "platform": "twitter", "payload": payload}

    try:
        from requests_oauthlib import OAuth1
        auth = OAuth1(
            TWITTER_API_KEY,
            TWITTER_API_SECRET,
            TWITTER_ACCESS_TOKEN,
            TWITTER_ACCESS_SECRET,
        )
        response = requests.post(url, json=payload, auth=auth, timeout=15)
        response.raise_for_status()
        data = response.json()
        return {
            "status": "published",
            "platform": "twitter",
            "post_id": data.get("data", {}).get("id"),
            "url": f"https://twitter.com/i/web/status/{data.get('data', {}).get('id')}",
        }
    except Exception as e:
        return {"status": "error", "platform": "twitter", "error": str(e)}


def publish_to_instagram(content_item: dict, dry_run: bool) -> dict:
    """
    Publish an Instagram feed post using the Meta Graph API.
    Step 1: Create media container
    Step 2: Publish the container
    Note: Image must be a publicly accessible URL.
          For now we log the image_prompt for manual asset creation.
    """
    generated = content_item.get("generated_content", {})
    caption = generated.get("caption", "")
    hashtags = " ".join(generated.get("hashtags", []))
    full_caption = f"{caption}\n\n{hashtags}".strip()
    image_prompt = generated.get("image_prompt", "")

    # Instagram requires a hosted image URL — placeholder until image gen is integrated
    image_url = content_item.get("image_url", "")

    if dry_run:
        return {
            "status": "dry_run",
            "platform": "instagram",
            "caption_preview": full_caption[:100],
            "image_prompt": image_prompt,
            "note": "Image URL required for live publish. Run image generation first.",
        }

    if not image_url:
        return {
            "status": "skipped",
            "platform": "instagram",
            "reason": "No image_url provided. Generate image asset first.",
            "image_prompt": image_prompt,
        }

    try:
        ig_user_id = os.getenv("INSTAGRAM_USER_ID", "")
        base_url = f"https://graph.facebook.com/v19.0/{ig_user_id}"

        # Step 1: Create container
        container_resp = requests.post(
            f"{base_url}/media",
            params={
                "image_url": image_url,
                "caption": full_caption,
                "access_token": INSTAGRAM_ACCESS_TOKEN,
            },
            timeout=15,
        )
        container_resp.raise_for_status()
        container_id = container_resp.json().get("id")

        # Step 2: Publish
        publish_resp = requests.post(
            f"{base_url}/media_publish",
            params={
                "creation_id": container_id,
                "access_token": INSTAGRAM_ACCESS_TOKEN,
            },
            timeout=15,
        )
        publish_resp.raise_for_status()
        post_id = publish_resp.json().get("id")

        return {"status": "published", "platform": "instagram", "post_id": post_id}
    except Exception as e:
        return {"status": "error", "platform": "instagram", "error": str(e)}


def publish_to_linkedin(content_item: dict, dry_run: bool) -> dict:
    """
    Post to LinkedIn using the UGC Posts API.
    """
    generated = content_item.get("generated_content", {})
    caption = generated.get("caption", "")

    author_urn = os.getenv("LINKEDIN_AUTHOR_URN", "urn:li:person:PLACEHOLDER")
    url = "https://api.linkedin.com/v2/ugcPosts"
    headers = {
        "Authorization": f"Bearer {LINKEDIN_ACCESS_TOKEN}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
    }
    payload = {
        "author": author_urn,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": caption},
                "shareMediaCategory": "NONE",
            }
        },
        "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
    }

    if dry_run:
        return {"status": "dry_run", "platform": "linkedin", "caption_preview": caption[:100]}

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        response.raise_for_status()
        post_id = response.headers.get("x-restli-id", "")
        return {"status": "published", "platform": "linkedin", "post_id": post_id}
    except Exception as e:
        return {"status": "error", "platform": "linkedin", "error": str(e)}


def schedule_via_buffer(content_item: dict, dry_run: bool) -> dict:
    """
    Schedule a post via Buffer API as a fallback for TikTok or any
    platform where direct API posting isn't available.
    """
    buffer_token = os.getenv("BUFFER_ACCESS_TOKEN", "")
    buffer_profile_id = os.getenv(
        f"BUFFER_PROFILE_{content_item.get('channel', '').upper()}_ID", ""
    )

    generated = content_item.get("generated_content", {})
    text = generated.get("caption", generated.get("hook", ""))
    scheduled_date = content_item.get("date", "")

    payload = {
        "text": text,
        "profile_ids[]": buffer_profile_id,
        "scheduled_at": f"{scheduled_date}T09:00:00Z",
    }

    if dry_run:
        return {
            "status": "dry_run",
            "platform": f"buffer:{content_item.get('channel')}",
            "scheduled_at": payload["scheduled_at"],
            "text_preview": text[:100],
        }

    if not buffer_token or not buffer_profile_id:
        return {
            "status": "skipped",
            "platform": "buffer",
            "reason": "BUFFER_ACCESS_TOKEN or profile ID not configured.",
        }

    try:
        response = requests.post(
            "https://api.bufferapp.com/1/updates/create.json",
            data=payload,
            headers={"Authorization": f"Bearer {buffer_token}"},
            timeout=15,
        )
        response.raise_for_status()
        data = response.json()
        return {
            "status": "scheduled",
            "platform": f"buffer:{content_item.get('channel')}",
            "update_id": data.get("updates", [{}])[0].get("id"),
            "scheduled_at": payload["scheduled_at"],
        }
    except Exception as e:
        return {"status": "error", "platform": "buffer", "error": str(e)}


# --- Router ---

def route_publish(content_item: dict, mode: str, dry_run: bool) -> dict:
    """Route each content item to the correct platform publisher."""
    channel = content_item.get("channel", "")

    if channel == "twitter":
        return publish_to_twitter(content_item, dry_run)
    elif channel == "instagram":
        return publish_to_instagram(content_item, dry_run)
    elif channel == "linkedin":
        return publish_to_linkedin(content_item, dry_run)
    elif channel in ["tiktok", "facebook"]:
        # TikTok direct API requires video uploads — route through Buffer for scheduling
        return schedule_via_buffer(content_item, dry_run)
    elif channel in ["blog", "email"]:
        # Blog and email are handled by their own agents — skip here
        return {"status": "skipped", "platform": channel, "reason": "Handled by dedicated agent"}
    else:
        return {"status": "skipped", "platform": channel, "reason": "Unsupported channel"}


# --- Core agent logic ---

def run_social_media_agent(request: PublishRequest) -> dict:
    """
    Full social media publishing pipeline:
    1. Load content batch
    2. Filter by channel and max_items
    3. Route each item to the correct publisher
    4. Log all results to social_publish_log.json
    """

    print(f"\n[Social Media Agent] Mode: {request.mode} | Dry run: {request.dry_run}")

    # Step 1: Load content
    batch = load_content_batch()

    # Step 2: Filter
    social_channels = ["twitter", "instagram", "linkedin", "tiktok", "facebook"]
    if request.channels:
        batch = [i for i in batch if i.get("channel") in request.channels]
    else:
        batch = [i for i in batch if i.get("channel") in social_channels]

    if request.max_items > 0:
        batch = batch[:request.max_items]

    print(f"  -> Processing {len(batch)} social media items...")

    # Step 3: Publish / schedule each item
    publish_log = []
    success_count = 0
    fail_count = 0
    skip_count = 0

    for idx, item in enumerate(batch):
        print(f"  -> [{idx + 1}/{len(batch)}] {item.get('channel')} | {item.get('date')} | {item.get('topic', '')[:40]}")
        result = route_publish(item, request.mode, request.dry_run)

        log_entry = {
            "item_index": idx,
            "date": item.get("date"),
            "channel": item.get("channel"),
            "format": item.get("format"),
            "topic": item.get("topic"),
            "publish_result": result,
            "processed_at": datetime.utcnow().isoformat(),
        }
        publish_log.append(log_entry)

        status = result.get("status", "")
        if status in ["published", "scheduled", "dry_run"]:
            success_count += 1
        elif status == "skipped":
            skip_count += 1
        else:
            fail_count += 1

    # Step 4: Save log
    os.makedirs(REPORTS_DIR, exist_ok=True)
    log_path = os.path.join(REPORTS_DIR, "social_publish_log.json")
    with open(log_path, "w") as f:
        json.dump(publish_log, f, indent=2)

    print(f"  -> Publish log saved: {success_count} success, {fail_count} failed, {skip_count} skipped")

    return {
        "total_processed": len(batch),
        "success": success_count,
        "failed": fail_count,
        "skipped": skip_count,
        "dry_run": request.dry_run,
        "log_file": log_path,
        "log_preview": publish_log[:5],
    }


# --- FastAPI routes ---

@router.post("/social/publish")
def run_social_publish_endpoint(request: PublishRequest):
    """
    Trigger the Social Media Management Agent.
    Publishes or schedules all social content from the content batch.
    Set dry_run=true to simulate without calling platform APIs.
    """
    try:
        return run_social_media_agent(request)
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/social/publish-log")
def get_publish_log():
    """Return the social media publish log."""
    path = os.path.join(REPORTS_DIR, "social_publish_log.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="No publish log found. Run the Social Media Agent first.")
    with open(path) as f:
        return json.load(f)


@router.get("/social/publish-log/{channel}")
def get_publish_log_by_channel(channel: str):
    """Return publish log filtered by channel."""
    path = os.path.join(REPORTS_DIR, "social_publish_log.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="No publish log found.")
    with open(path) as f:
        log = json.load(f)
    return [entry for entry in log if entry.get("channel") == channel]
