"""
Agent 8: Analytics & Tracking Agent

Pulls metrics from all active platforms and email, stores them in a local
SQLite database, generates summary reports, and flags underperforming content.

Sources:
- Twitter/X Analytics API
- Instagram Graph API (insights)
- LinkedIn Analytics API
- TikTok Analytics API
- SendGrid (email stats)
- Publish log (as a fallback for post IDs)

Outputs:
- data/reports/analytics_report.json   — latest full report
- data/analytics.db                    — SQLite store of all historical metrics
"""

import json
import os
import sqlite3
from datetime import datetime, timedelta

import anthropic
import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config.settings import (
    ANTHROPIC_API_KEY,
    DATA_DIR,
    TWITTER_ACCESS_TOKEN,
    TWITTER_ACCESS_SECRET,
    TWITTER_API_KEY,
    TWITTER_API_SECRET,
    INSTAGRAM_ACCESS_TOKEN,
    LINKEDIN_ACCESS_TOKEN,
    SENDGRID_API_KEY,
)

router = APIRouter()
client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

REPORTS_DIR = os.path.join(DATA_DIR, "reports")
DB_PATH = os.path.join(DATA_DIR, "analytics.db")


# --- Request model ---

class AnalyticsRequest(BaseModel):
    days_back: int = 7          # how many days of data to pull
    dry_run: bool = False       # if True, use mock data instead of live API calls


# --- Database setup ---

def init_db():
    """Create analytics tables if they don't exist."""
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS post_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            platform TEXT,
            post_id TEXT,
            date TEXT,
            topic TEXT,
            impressions INTEGER DEFAULT 0,
            reach INTEGER DEFAULT 0,
            likes INTEGER DEFAULT 0,
            comments INTEGER DEFAULT 0,
            shares INTEGER DEFAULT 0,
            clicks INTEGER DEFAULT 0,
            saves INTEGER DEFAULT 0,
            engagement_rate REAL DEFAULT 0.0,
            recorded_at TEXT
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS email_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id TEXT,
            subject TEXT,
            date TEXT,
            sends INTEGER DEFAULT 0,
            opens INTEGER DEFAULT 0,
            clicks INTEGER DEFAULT 0,
            unsubscribes INTEGER DEFAULT 0,
            bounces INTEGER DEFAULT 0,
            open_rate REAL DEFAULT 0.0,
            click_rate REAL DEFAULT 0.0,
            recorded_at TEXT
        )
    """)
    conn.commit()
    conn.close()


def save_post_metrics(metrics: list[dict]):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    for m in metrics:
        c.execute("""
            INSERT INTO post_metrics
            (platform, post_id, date, topic, impressions, reach, likes, comments,
             shares, clicks, saves, engagement_rate, recorded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            m.get("platform"), m.get("post_id"), m.get("date"), m.get("topic"),
            m.get("impressions", 0), m.get("reach", 0), m.get("likes", 0),
            m.get("comments", 0), m.get("shares", 0), m.get("clicks", 0),
            m.get("saves", 0), m.get("engagement_rate", 0.0),
            datetime.utcnow().isoformat(),
        ))
    conn.commit()
    conn.close()


def save_email_metrics(metrics: list[dict]):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    for m in metrics:
        c.execute("""
            INSERT INTO email_metrics
            (campaign_id, subject, date, sends, opens, clicks,
             unsubscribes, bounces, open_rate, click_rate, recorded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            m.get("campaign_id"), m.get("subject"), m.get("date"),
            m.get("sends", 0), m.get("opens", 0), m.get("clicks", 0),
            m.get("unsubscribes", 0), m.get("bounces", 0),
            m.get("open_rate", 0.0), m.get("click_rate", 0.0),
            datetime.utcnow().isoformat(),
        ))
    conn.commit()
    conn.close()


# --- Platform metric fetchers ---

def fetch_twitter_metrics(days_back: int, dry_run: bool) -> list[dict]:
    """Fetch tweet metrics from the publish log + Twitter v2 API."""
    if dry_run:
        return [
            {"platform": "twitter", "post_id": "mock_001", "date": str((datetime.utcnow() - timedelta(days=i)).date()),
             "topic": f"Mock tweet {i}", "impressions": 1200 + i * 80, "reach": 900,
             "likes": 45 + i * 3, "comments": 8, "shares": 12, "clicks": 30,
             "saves": 5, "engagement_rate": round((45 + i * 3 + 8 + 12) / (1200 + i * 80) * 100, 2)}
            for i in range(days_back)
        ]

    log_path = os.path.join(REPORTS_DIR, "social_publish_log.json")
    if not os.path.exists(log_path):
        return []

    with open(log_path) as f:
        log = json.load(f)

    twitter_posts = [e for e in log if e.get("channel") == "twitter"
                     and e.get("publish_result", {}).get("post_id")]

    metrics = []
    for entry in twitter_posts[:10]:
        post_id = entry["publish_result"]["post_id"]
        try:
            from requests_oauthlib import OAuth1
            auth = OAuth1(TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET)
            resp = requests.get(
                f"https://api.twitter.com/2/tweets/{post_id}",
                params={"tweet.fields": "public_metrics,created_at,text"},
                auth=auth, timeout=15,
            )
            resp.raise_for_status()
            data = resp.json().get("data", {})
            pm = data.get("public_metrics", {})
            impressions = pm.get("impression_count", 0)
            engagements = pm.get("like_count", 0) + pm.get("reply_count", 0) + pm.get("retweet_count", 0)
            metrics.append({
                "platform": "twitter",
                "post_id": post_id,
                "date": entry.get("date"),
                "topic": entry.get("topic"),
                "impressions": impressions,
                "reach": impressions,
                "likes": pm.get("like_count", 0),
                "comments": pm.get("reply_count", 0),
                "shares": pm.get("retweet_count", 0),
                "clicks": pm.get("url_link_clicks", 0),
                "saves": pm.get("bookmark_count", 0),
                "engagement_rate": round(engagements / max(impressions, 1) * 100, 2),
            })
        except Exception as e:
            print(f"  [Twitter Analytics] Error for post {post_id}: {e}")
    return metrics


def fetch_instagram_metrics(days_back: int, dry_run: bool) -> list[dict]:
    """Fetch Instagram post insights via the Graph API."""
    if dry_run:
        return [
            {"platform": "instagram", "post_id": f"ig_mock_{i}", "date": str((datetime.utcnow() - timedelta(days=i)).date()),
             "topic": f"Mock IG post {i}", "impressions": 3500 + i * 200, "reach": 2800,
             "likes": 180 + i * 10, "comments": 22, "shares": 15, "clicks": 60,
             "saves": 45, "engagement_rate": round((180 + i * 10 + 22 + 15 + 45) / (3500 + i * 200) * 100, 2)}
            for i in range(days_back)
        ]

    ig_user_id = os.getenv("INSTAGRAM_USER_ID", "")
    if not ig_user_id:
        return []

    try:
        # Get recent media
        media_resp = requests.get(
            f"https://graph.facebook.com/v19.0/{ig_user_id}/media",
            params={"fields": "id,caption,timestamp", "access_token": INSTAGRAM_ACCESS_TOKEN},
            timeout=15,
        )
        media_resp.raise_for_status()
        media_items = media_resp.json().get("data", [])[:days_back]
    except Exception as e:
        print(f"  [Instagram Analytics] Media fetch error: {e}")
        return []

    metrics = []
    for item in media_items:
        media_id = item.get("id")
        try:
            ins_resp = requests.get(
                f"https://graph.facebook.com/v19.0/{media_id}/insights",
                params={
                    "metric": "impressions,reach,likes,comments,shares,saved,clicks",
                    "access_token": INSTAGRAM_ACCESS_TOKEN,
                },
                timeout=15,
            )
            ins_resp.raise_for_status()
            ins_data = {d["name"]: d["values"][0]["value"] for d in ins_resp.json().get("data", [])}
            impressions = ins_data.get("impressions", 0)
            engagements = ins_data.get("likes", 0) + ins_data.get("comments", 0) + ins_data.get("shares", 0) + ins_data.get("saved", 0)
            metrics.append({
                "platform": "instagram",
                "post_id": media_id,
                "date": item.get("timestamp", "")[:10],
                "topic": (item.get("caption") or "")[:60],
                "impressions": impressions,
                "reach": ins_data.get("reach", 0),
                "likes": ins_data.get("likes", 0),
                "comments": ins_data.get("comments", 0),
                "shares": ins_data.get("shares", 0),
                "clicks": ins_data.get("clicks", 0),
                "saves": ins_data.get("saved", 0),
                "engagement_rate": round(engagements / max(impressions, 1) * 100, 2),
            })
        except Exception as e:
            print(f"  [Instagram Analytics] Insights error for {media_id}: {e}")
    return metrics


def fetch_linkedin_metrics(days_back: int, dry_run: bool) -> list[dict]:
    """Fetch LinkedIn post analytics via the Organization Analytics API."""
    if dry_run:
        return [
            {"platform": "linkedin", "post_id": f"li_mock_{i}", "date": str((datetime.utcnow() - timedelta(days=i)).date()),
             "topic": f"Mock LinkedIn post {i}", "impressions": 800 + i * 50, "reach": 600,
             "likes": 35 + i * 2, "comments": 6, "shares": 4, "clicks": 25,
             "saves": 0, "engagement_rate": round((35 + i * 2 + 6 + 4) / (800 + i * 50) * 100, 2)}
            for i in range(days_back)
        ]

    log_path = os.path.join(REPORTS_DIR, "social_publish_log.json")
    if not os.path.exists(log_path):
        return []

    with open(log_path) as f:
        log = json.load(f)

    linkedin_posts = [e for e in log if e.get("channel") == "linkedin"
                      and e.get("publish_result", {}).get("post_id")]

    metrics = []
    for entry in linkedin_posts[:10]:
        post_id = entry["publish_result"]["post_id"]
        try:
            resp = requests.get(
                f"https://api.linkedin.com/v2/organizationalEntityShareStatistics"
                f"?q=organizationalEntity&shares=urn:li:share:{post_id}",
                headers={
                    "Authorization": f"Bearer {LINKEDIN_ACCESS_TOKEN}",
                    "X-Restli-Protocol-Version": "2.0.0",
                },
                timeout=15,
            )
            resp.raise_for_status()
            stats = resp.json().get("elements", [{}])[0].get("totalShareStatistics", {})
            impressions = stats.get("impressionCount", 0)
            engagements = stats.get("likeCount", 0) + stats.get("commentCount", 0) + stats.get("shareCount", 0)
            metrics.append({
                "platform": "linkedin",
                "post_id": post_id,
                "date": entry.get("date"),
                "topic": entry.get("topic"),
                "impressions": impressions,
                "reach": stats.get("uniqueImpressionsCount", 0),
                "likes": stats.get("likeCount", 0),
                "comments": stats.get("commentCount", 0),
                "shares": stats.get("shareCount", 0),
                "clicks": stats.get("clickCount", 0),
                "saves": 0,
                "engagement_rate": round(engagements / max(impressions, 1) * 100, 2),
            })
        except Exception as e:
            print(f"  [LinkedIn Analytics] Error for post {post_id}: {e}")
    return metrics


def fetch_email_metrics(days_back: int, dry_run: bool) -> list[dict]:
    """Fetch email campaign stats from SendGrid."""
    if dry_run:
        return [
            {"campaign_id": f"sg_mock_{i}", "subject": f"Mock email {i}",
             "date": str((datetime.utcnow() - timedelta(days=i * 3)).date()),
             "sends": 500, "opens": 180 + i * 10, "clicks": 45 + i * 3,
             "unsubscribes": 2, "bounces": 5,
             "open_rate": round((180 + i * 10) / 500 * 100, 1),
             "click_rate": round((45 + i * 3) / 500 * 100, 1)}
            for i in range(min(days_back // 3, 5))
        ]

    start_date = (datetime.utcnow() - timedelta(days=days_back)).strftime("%Y-%m-%d")
    try:
        resp = requests.get(
            "https://api.sendgrid.com/v3/marketing/singlesends",
            headers={"Authorization": f"Bearer {SENDGRID_API_KEY}"},
            timeout=15,
        )
        resp.raise_for_status()
        campaigns = resp.json().get("result", [])
    except Exception as e:
        print(f"  [SendGrid Analytics] Error: {e}")
        return []

    metrics = []
    for camp in campaigns[:10]:
        camp_id = camp.get("id")
        try:
            stats_resp = requests.get(
                f"https://api.sendgrid.com/v3/marketing/stats/singlesends/{camp_id}",
                headers={"Authorization": f"Bearer {SENDGRID_API_KEY}"},
                timeout=15,
            )
            stats_resp.raise_for_status()
            s = stats_resp.json().get("results", {}).get("stats", {})
            sends = s.get("requests", 1)
            metrics.append({
                "campaign_id": camp_id,
                "subject": camp.get("email_config", {}).get("subject", ""),
                "date": camp.get("send_at", "")[:10],
                "sends": sends,
                "opens": s.get("opens", 0),
                "clicks": s.get("clicks", 0),
                "unsubscribes": s.get("unsubscribes", 0),
                "bounces": s.get("bounces", 0),
                "open_rate": round(s.get("opens", 0) / max(sends, 1) * 100, 1),
                "click_rate": round(s.get("clicks", 0) / max(sends, 1) * 100, 1),
            })
        except Exception as e:
            print(f"  [SendGrid Analytics] Error for campaign {camp_id}: {e}")
    return metrics


# --- Claude report synthesis ---

def synthesize_analytics_report(
    post_metrics: list[dict],
    email_metrics: list[dict],
) -> dict:
    """Ask Claude to interpret the metrics and surface key insights."""

    prompt = f"""
You are a marketing analytics expert. Review the following performance data and produce a structured insights report.

--- POST METRICS (social media) ---
{json.dumps(post_metrics, indent=2)[:3000]}

--- EMAIL METRICS ---
{json.dumps(email_metrics, indent=2)[:1500]}

Return ONLY valid JSON:
{{
  "overall_health": "green | yellow | red",
  "summary": "2-3 sentence overall campaign performance summary",
  "top_performing_posts": [
    {{"platform": "...", "topic": "...", "why": "reason it performed well"}}
  ],
  "underperforming_posts": [
    {{"platform": "...", "topic": "...", "why": "reason it underperformed", "recommendation": "what to change"}}
  ],
  "platform_insights": {{
    "platform_name": {{
      "avg_engagement_rate": "X%",
      "best_performing_format": "...",
      "insight": "Key finding for this platform"
    }}
  }},
  "email_insights": {{
    "avg_open_rate": "X%",
    "avg_click_rate": "X%",
    "best_subject_line": "...",
    "insight": "Key finding from email performance"
  }},
  "recommendations": [
    "Actionable recommendation 1",
    "Actionable recommendation 2",
    "Actionable recommendation 3"
  ],
  "kpi_summary": {{
    "total_impressions": 0,
    "total_engagements": 0,
    "avg_engagement_rate": "X%",
    "total_email_sends": 0,
    "avg_open_rate": "X%"
  }}
}}
"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
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


# --- Core agent logic ---

def run_analytics_agent(request: AnalyticsRequest) -> dict:
    """
    Full analytics pipeline:
    1. Init SQLite DB
    2. Fetch metrics from all platforms
    3. Store in DB
    4. Ask Claude to synthesize insights
    5. Save analytics_report.json
    """

    print(f"\n[Analytics Agent] Pulling metrics for last {request.days_back} days | Dry run: {request.dry_run}")
    init_db()

    # Step 2: Fetch metrics
    print("  -> Fetching Twitter metrics...")
    twitter_metrics = fetch_twitter_metrics(request.days_back, request.dry_run)

    print("  -> Fetching Instagram metrics...")
    instagram_metrics = fetch_instagram_metrics(request.days_back, request.dry_run)

    print("  -> Fetching LinkedIn metrics...")
    linkedin_metrics = fetch_linkedin_metrics(request.days_back, request.dry_run)

    print("  -> Fetching email metrics...")
    email_metrics = fetch_email_metrics(request.days_back, request.dry_run)

    all_post_metrics = twitter_metrics + instagram_metrics + linkedin_metrics

    # Step 3: Store in DB
    if all_post_metrics:
        save_post_metrics(all_post_metrics)
    if email_metrics:
        save_email_metrics(email_metrics)

    print(f"  -> Stored {len(all_post_metrics)} post metrics and {len(email_metrics)} email metrics")

    # Step 4: Claude synthesis
    print("  -> Generating insights with Claude...")
    insights = synthesize_analytics_report(all_post_metrics, email_metrics)

    # Step 5: Save report
    report = {
        "generated_at": datetime.utcnow().isoformat(),
        "period_days": request.days_back,
        "dry_run": request.dry_run,
        "raw_metrics": {
            "twitter": twitter_metrics,
            "instagram": instagram_metrics,
            "linkedin": linkedin_metrics,
            "email": email_metrics,
        },
        "insights": insights,
    }

    os.makedirs(REPORTS_DIR, exist_ok=True)
    report_path = os.path.join(REPORTS_DIR, "analytics_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"  -> Analytics report saved to {report_path}")
    return report


# --- FastAPI routes ---

@router.post("/analytics/run")
def run_analytics_endpoint(request: AnalyticsRequest):
    """
    Trigger the Analytics Agent.
    Pulls metrics from all platforms, stores in SQLite, and returns an AI-generated insights report.
    Set dry_run=true to use mock data for testing.
    """
    try:
        return run_analytics_agent(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/report")
def get_analytics_report():
    """Return the latest analytics report."""
    path = os.path.join(REPORTS_DIR, "analytics_report.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="No analytics report found. Run the Analytics Agent first.")
    with open(path) as f:
        return json.load(f)


@router.get("/analytics/metrics/{platform}")
def get_platform_metrics(platform: str):
    """Query stored metrics for a specific platform from the SQLite database."""
    init_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM post_metrics WHERE platform = ? ORDER BY date DESC LIMIT 50", (platform,))
    rows = [dict(row) for row in c.fetchall()]
    conn.close()
    return rows


@router.get("/analytics/metrics/email/all")
def get_email_metrics_stored():
    """Return all stored email metrics from SQLite."""
    init_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM email_metrics ORDER BY date DESC LIMIT 50")
    rows = [dict(row) for row in c.fetchall()]
    conn.close()
    return rows
