"""
Agent 1: Market Intelligence Agent

Scrapes Amazon, Shopee, Lazada, Google Search, and competitor sites
to build a market_intelligence_report.json that informs the Branding Agent.
"""

import json
import os
from datetime import datetime

import anthropic
from fastapi import APIRouter
from pydantic import BaseModel

from config.settings import ANTHROPIC_API_KEY, BRAND_DIR
from tools.ecommerce_scraper import (
    scrape_amazon,
    scrape_amazon_reviews,
    scrape_lazada,
    scrape_shopee,
    scrape_competitor_site,
)
from tools.web_search import google_search

router = APIRouter()
client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


# --- Request / Response models ---

class ProductBrief(BaseModel):
    product_name: str
    description: str
    category: str
    target_audience: str
    competitor_urls: list[str] = []   # optional: known competitor sites to scrape


class MarketIntelligenceReport(BaseModel):
    product_name: str
    generated_at: str
    ecommerce_listings: dict
    customer_reviews: list[dict]
    google_search_insights: dict
    competitor_site_data: list[dict]
    ai_summary: dict


# --- Core agent logic ---

def run_market_intelligence(brief: ProductBrief) -> dict:
    """
    Runs the full market intelligence pipeline:
    1. Scrape Amazon, Shopee, Lazada for listings
    2. Pull Amazon reviews for top products
    3. Run Google Search for brand positioning data
    4. Scrape known competitor websites
    5. Ask Claude to synthesize findings into actionable brand insights
    """

    print(f"\n[Market Intelligence Agent] Starting research for: {brief.product_name}")

    # Step 1: E-commerce scraping
    print("  -> Scraping Amazon...")
    amazon_listings = scrape_amazon(f"{brief.category} {brief.product_name}", max_results=10)

    print("  -> Scraping Shopee...")
    shopee_listings = scrape_shopee(f"{brief.category} {brief.product_name}", max_results=10)

    print("  -> Scraping Lazada...")
    lazada_listings = scrape_lazada(f"{brief.category} {brief.product_name}", max_results=10)

    ecommerce_listings = {
        "amazon": amazon_listings,
        "shopee": shopee_listings,
        "lazada": lazada_listings,
    }

    # Step 2: Pull reviews for top Amazon products
    print("  -> Fetching Amazon reviews...")
    customer_reviews = []
    for product in amazon_listings[:3]:  # top 3 products only
        asin = product.get("asin")
        if asin:
            reviews = scrape_amazon_reviews(asin, max_reviews=10)
            for r in reviews:
                r["product_title"] = product.get("title", "")
            customer_reviews.extend(reviews)

    # Step 3: Google Search
    print("  -> Running Google Search...")
    google_brand_search = google_search(f"best {brief.category} brands", num_results=10)
    google_trend_search = google_search(f"{brief.product_name} {brief.category} trending", num_results=10)

    google_search_insights = {
        "brand_positioning": google_brand_search,
        "trending_queries": google_trend_search,
    }

    # Step 4: Competitor site scraping
    print("  -> Scraping competitor websites...")
    competitor_site_data = []
    for url in brief.competitor_urls:
        data = scrape_competitor_site(url)
        competitor_site_data.append(data)

    # Also scrape top organic Google results as implicit competitors
    for result in google_brand_search.get("organic_results", [])[:3]:
        link = result.get("link", "")
        if link and link not in brief.competitor_urls:
            data = scrape_competitor_site(link)
            competitor_site_data.append(data)

    # Step 5: Claude synthesizes all data into brand insights
    print("  -> Asking Claude to synthesize market insights...")
    ai_summary = synthesize_with_claude(brief, ecommerce_listings, customer_reviews, competitor_site_data, google_search_insights)

    # Build final report
    report = {
        "product_name": brief.product_name,
        "generated_at": datetime.utcnow().isoformat(),
        "ecommerce_listings": ecommerce_listings,
        "customer_reviews": customer_reviews,
        "google_search_insights": google_search_insights,
        "competitor_site_data": competitor_site_data,
        "ai_summary": ai_summary,
    }

    # Save to brand/ directory
    os.makedirs(BRAND_DIR, exist_ok=True)
    report_path = os.path.join(BRAND_DIR, "market_intelligence_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"  -> Report saved to {report_path}")
    return report


def synthesize_with_claude(
    brief: ProductBrief,
    ecommerce_listings: dict,
    customer_reviews: list[dict],
    competitor_site_data: list[dict],
    google_search_insights: dict,
) -> dict:
    """
    Sends all scraped data to Claude and asks it to extract:
    - Competitor names and taglines
    - Top customer pain points and desires
    - Trending keywords
    - Market gaps / whitespace
    - Common visual/tone patterns to differentiate from
    """

    prompt = f"""
You are a senior market research analyst. Based on the raw market data below, produce a structured brand intelligence summary for the following product:

Product: {brief.product_name}
Category: {brief.category}
Description: {brief.description}
Target Audience: {brief.target_audience}

--- E-COMMERCE LISTINGS (Amazon, Shopee, Lazada) ---
{json.dumps(ecommerce_listings, indent=2)[:4000]}

--- CUSTOMER REVIEWS ---
{json.dumps(customer_reviews, indent=2)[:3000]}

--- COMPETITOR WEBSITE DATA ---
{json.dumps(competitor_site_data, indent=2)[:2000]}

--- GOOGLE SEARCH INSIGHTS ---
{json.dumps(google_search_insights, indent=2)[:2000]}

Return ONLY valid JSON with this exact structure:
{{
  "competitor_names": ["list of brand/product names found in the market"],
  "competitor_taglines": ["list of taglines or hero copy found on competitor sites"],
  "price_range": {{
    "low": "lowest price found",
    "high": "highest price found",
    "average": "approximate average"
  }},
  "top_customer_pain_points": ["top 5 recurring complaints from reviews"],
  "top_customer_desires": ["top 5 things customers wish the product had"],
  "trending_keywords": ["top 10 search keywords related to the product/category"],
  "market_gaps": ["opportunities not being addressed by current competitors"],
  "common_visual_tone_patterns": ["what most brands in this space look/sound like, so we can differentiate"],
  "differentiation_opportunities": ["specific ways a new brand could stand out"]
}}
"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
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


# --- FastAPI route ---

@router.post("/market-intelligence", response_model=MarketIntelligenceReport)
def run_market_intelligence_endpoint(brief: ProductBrief):
    """
    Trigger the Market Intelligence Agent.
    Scrapes e-commerce platforms and Google, then returns a structured report.
    """
    report = run_market_intelligence(brief)
    return report
