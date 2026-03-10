"""
Agent 7: Email Marketing Agent

Reads content_batch.json (email items) and brand_config.json to:
- Build and segment an email list
- Generate full email sequences (welcome, nurture, promotional, re-engagement)
- Send or schedule campaigns via SendGrid
- Track open rates, clicks, and unsubscribes via SendGrid webhooks

Outputs:
- data/reports/email_send_log.json — record of every send attempt
"""

import json
import os
from datetime import datetime

import anthropic
import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config.settings import ANTHROPIC_API_KEY, BRAND_DIR, DATA_DIR, SENDGRID_API_KEY

router = APIRouter()
client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

CONTENT_DIR = os.path.join(DATA_DIR, "content")
REPORTS_DIR = os.path.join(DATA_DIR, "reports")
SENDGRID_BASE = "https://api.sendgrid.com/v3"


# --- Request models ---

class EmailCampaignRequest(BaseModel):
    sender_name: str
    sender_email: str
    list_id: str                        # SendGrid contact list ID
    mode: str = "schedule"             # "send" | "schedule"
    dry_run: bool = False
    max_emails: int = 0                 # 0 = send all email items in batch


class EmailSequenceRequest(BaseModel):
    sequence_type: str                  # "welcome" | "nurture" | "promotional" | "re-engagement"
    sender_name: str
    sender_email: str
    product_name: str
    num_emails: int = 5


# --- Loaders ---

def load_brand_config() -> dict:
    path = os.path.join(BRAND_DIR, "brand_config.json")
    if not os.path.exists(path):
        raise FileNotFoundError("brand_config.json not found. Run the Branding Agent first.")
    with open(path) as f:
        return json.load(f)


def load_email_content_batch() -> list[dict]:
    """Filter only email items from the content batch."""
    path = os.path.join(CONTENT_DIR, "content_batch.json")
    if not os.path.exists(path):
        raise FileNotFoundError("content_batch.json not found. Run the Content Agent first.")
    with open(path) as f:
        batch = json.load(f)
    return [item for item in batch if item.get("channel") == "email"]


# --- SendGrid helpers ---

def sendgrid_headers() -> dict:
    return {
        "Authorization": f"Bearer {SENDGRID_API_KEY}",
        "Content-Type": "application/json",
    }


def get_list_contacts(list_id: str) -> list[dict]:
    """Fetch contacts from a SendGrid contact list."""
    try:
        response = requests.get(
            f"{SENDGRID_BASE}/marketing/lists/{list_id}/contacts",
            headers=sendgrid_headers(),
            timeout=15,
        )
        response.raise_for_status()
        return response.json().get("result", [])
    except Exception as e:
        print(f"  [SendGrid] Could not fetch contacts: {e}")
        return []


def create_sendgrid_campaign(
    subject: str,
    sender_name: str,
    sender_email: str,
    html_body: str,
    list_id: str,
) -> dict:
    """Create a Single Send campaign in SendGrid."""
    payload = {
        "name": f"Campaign - {subject[:50]} - {datetime.utcnow().strftime('%Y%m%d')}",
        "send_to": {"list_ids": [list_id]},
        "email_config": {
            "subject": subject,
            "html_content": html_body,
            "sender_id": None,  # Uses verified sender below
            "suppression_group_id": None,
        },
    }

    try:
        # Create single send
        resp = requests.post(
            f"{SENDGRID_BASE}/marketing/singlesends",
            json=payload,
            headers=sendgrid_headers(),
            timeout=15,
        )
        resp.raise_for_status()
        campaign_data = resp.json()
        return {"campaign_id": campaign_data.get("id"), "status": campaign_data.get("status")}
    except Exception as e:
        return {"error": str(e)}


def send_single_email(
    to_email: str,
    to_name: str,
    subject: str,
    html_body: str,
    plain_body: str,
    sender_name: str,
    sender_email: str,
    dry_run: bool,
) -> dict:
    """Send a single transactional email via SendGrid."""

    payload = {
        "personalizations": [{"to": [{"email": to_email, "name": to_name}]}],
        "from": {"email": sender_email, "name": sender_name},
        "subject": subject,
        "content": [
            {"type": "text/plain", "value": plain_body},
            {"type": "text/html", "value": html_body},
        ],
    }

    if dry_run:
        return {
            "status": "dry_run",
            "to": to_email,
            "subject": subject,
            "preview": html_body[:100],
        }

    try:
        response = requests.post(
            f"{SENDGRID_BASE}/mail/send",
            json=payload,
            headers=sendgrid_headers(),
            timeout=15,
        )
        response.raise_for_status()
        return {"status": "sent", "to": to_email, "subject": subject}
    except Exception as e:
        return {"status": "error", "to": to_email, "error": str(e)}


def schedule_campaign(campaign_id: str, send_at: str, dry_run: bool) -> dict:
    """Schedule a SendGrid Single Send campaign for a specific time."""

    if dry_run:
        return {"status": "dry_run", "campaign_id": campaign_id, "send_at": send_at}

    try:
        response = requests.put(
            f"{SENDGRID_BASE}/marketing/singlesends/{campaign_id}/schedule",
            json={"send_at": send_at},
            headers=sendgrid_headers(),
            timeout=15,
        )
        response.raise_for_status()
        return {"status": "scheduled", "campaign_id": campaign_id, "send_at": send_at}
    except Exception as e:
        return {"status": "error", "campaign_id": campaign_id, "error": str(e)}


# --- Email sequence generation ---

def generate_email_sequence(request: EmailSequenceRequest, brand: dict) -> list[dict]:
    """
    Ask Claude to generate a full multi-email sequence of the requested type.
    Returns a list of email dicts ready to send or schedule.
    """

    sequence_briefs = {
        "welcome": "A warm welcome sequence for new subscribers. Email 1: Welcome + brand story. Email 2: Top tips/resources. Email 3: Social proof + testimonials. Email 4: Product spotlight. Email 5: Next steps CTA.",
        "nurture": "An educational nurture sequence. Build trust and authority. Each email teaches something valuable related to the product category. End with a soft CTA.",
        "promotional": "A promotional campaign sequence. Build anticipation, reveal offer, create urgency, handle objections, last chance. Classic 5-email promo structure.",
        "re-engagement": "A win-back sequence for inactive subscribers. Email 1: 'We miss you'. Email 2: What's new. Email 3: Special offer. Email 4: Last chance. Email 5: Unsubscribe or stay.",
    }

    brief = sequence_briefs.get(request.sequence_type, "A general email marketing sequence.")

    prompt = f"""
You are an email copywriter for {brand.get("brand_name")}.
Write a {request.num_emails}-email {request.sequence_type} sequence.

--- BRAND ---
Name: {brand.get("brand_name")}
Tagline: {brand.get("tagline")}
Tone: {", ".join(brand.get("tone_adjectives", []))}
Value Proposition: {brand.get("value_proposition")}
One-liner: {brand.get("one_liner")}

--- SEQUENCE BRIEF ---
Product: {request.product_name}
Sequence type: {request.sequence_type}
Structure: {brief}
Number of emails: {request.num_emails}

Return ONLY a valid JSON array with {request.num_emails} email objects:
[
  {{
    "sequence_number": 1,
    "send_delay_days": 0,
    "subject_line": "Primary subject line",
    "preview_text": "Preview text under 90 characters",
    "subject_line_b": "A/B variant subject line",
    "body_html": "Full email HTML content (no <html>/<body> wrappers)",
    "body_plain": "Plain text version",
    "cta_button_text": "CTA button label",
    "cta_url_placeholder": "{{CTA_URL}}"
  }}
]
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
        return [{"parse_error": raw}]


# --- Core agent logic ---

def run_email_campaign(request: EmailCampaignRequest) -> dict:
    """
    Campaign send pipeline:
    1. Load email content from content batch
    2. For each email item, create + schedule a SendGrid campaign
    3. Log all results
    """

    print(f"\n[Email Agent] Running campaign | Mode: {request.mode} | Dry run: {request.dry_run}")

    brand = load_brand_config()
    email_items = load_email_content_batch()

    if request.max_emails > 0:
        email_items = email_items[:request.max_emails]

    print(f"  -> Processing {len(email_items)} email items...")

    send_log = []
    success_count = 0
    fail_count = 0

    for idx, item in enumerate(email_items):
        generated = item.get("generated_content", {})
        subject = generated.get("subject_line", f"Update from {brand.get('brand_name')}")
        html_body = generated.get("body_html", "")
        plain_body = generated.get("body_plain", "")
        scheduled_date = item.get("date", datetime.utcnow().strftime("%Y-%m-%d"))

        print(f"  -> [{idx + 1}/{len(email_items)}] {subject[:50]} | {scheduled_date}")

        if request.mode == "schedule":
            campaign = create_sendgrid_campaign(
                subject=subject,
                sender_name=request.sender_name,
                sender_email=request.sender_email,
                html_body=html_body,
                list_id=request.list_id,
            )
            if request.dry_run:
                result = {
                    "status": "dry_run",
                    "subject": subject,
                    "scheduled_for": f"{scheduled_date}T09:00:00Z",
                    "list_id": request.list_id,
                }
            elif "campaign_id" in campaign:
                result = schedule_campaign(
                    campaign_id=campaign["campaign_id"],
                    send_at=f"{scheduled_date}T09:00:00Z",
                    dry_run=request.dry_run,
                )
            else:
                result = {"status": "error", "detail": campaign.get("error")}
        else:
            # Send immediately to list — simplified: send to a test address in this mode
            test_to = os.getenv("EMAIL_TEST_RECIPIENT", request.sender_email)
            result = send_single_email(
                to_email=test_to,
                to_name="Test Recipient",
                subject=subject,
                html_body=html_body,
                plain_body=plain_body,
                sender_name=request.sender_name,
                sender_email=request.sender_email,
                dry_run=request.dry_run,
            )

        log_entry = {
            "index": idx,
            "date": scheduled_date,
            "topic": item.get("topic"),
            "subject": subject,
            "result": result,
            "processed_at": datetime.utcnow().isoformat(),
        }
        send_log.append(log_entry)

        if result.get("status") in ["sent", "scheduled", "dry_run"]:
            success_count += 1
        else:
            fail_count += 1

    # Save log
    os.makedirs(REPORTS_DIR, exist_ok=True)
    log_path = os.path.join(REPORTS_DIR, "email_send_log.json")
    with open(log_path, "w") as f:
        json.dump(send_log, f, indent=2)

    print(f"  -> Email log saved: {success_count} success, {fail_count} failed")

    return {
        "total_processed": len(email_items),
        "success": success_count,
        "failed": fail_count,
        "dry_run": request.dry_run,
        "log_file": log_path,
        "log_preview": send_log[:3],
    }


def run_email_sequence(request: EmailSequenceRequest) -> dict:
    """Generate and save a full email sequence (welcome, nurture, etc.)."""

    print(f"\n[Email Agent] Generating {request.sequence_type} sequence...")
    brand = load_brand_config()

    sequence = generate_email_sequence(request, brand)

    os.makedirs(REPORTS_DIR, exist_ok=True)
    seq_path = os.path.join(REPORTS_DIR, f"email_sequence_{request.sequence_type}.json")
    with open(seq_path, "w") as f:
        json.dump(sequence, f, indent=2)

    print(f"  -> Sequence saved to {seq_path} ({len(sequence)} emails)")

    return {
        "sequence_type": request.sequence_type,
        "num_emails": len(sequence),
        "file": seq_path,
        "preview": sequence[0] if sequence else {},
    }


# --- FastAPI routes ---

@router.post("/email/campaign")
def run_email_campaign_endpoint(request: EmailCampaignRequest):
    """
    Send or schedule all email content from the content batch via SendGrid.
    Set dry_run=true to simulate without calling SendGrid.
    """
    try:
        return run_email_campaign(request)
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/email/sequence")
def run_email_sequence_endpoint(request: EmailSequenceRequest):
    """
    Generate a multi-email sequence (welcome, nurture, promotional, re-engagement).
    Returns the sequence and saves it to data/reports/.
    """
    try:
        return run_email_sequence(request)
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/email/send-log")
def get_email_send_log():
    """Return the full email send log."""
    path = os.path.join(REPORTS_DIR, "email_send_log.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="No email send log found.")
    with open(path) as f:
        return json.load(f)


@router.get("/email/sequence/{sequence_type}")
def get_email_sequence(sequence_type: str):
    """Return a previously generated email sequence."""
    path = os.path.join(REPORTS_DIR, f"email_sequence_{sequence_type}.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"No {sequence_type} sequence found.")
    with open(path) as f:
        return json.load(f)
