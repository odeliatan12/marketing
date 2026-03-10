# AI Marketing Team Agent

An autonomous AI-powered marketing team that handles the full lifecycle of product marketing — from brand identity and research to content creation, social media management, and performance analysis.

---

## Overview

This system orchestrates multiple AI agents, each acting as a specialized marketing team member. Together, they handle end-to-end marketing workflows with minimal human intervention.

---

## Agent Roles

### 1. Market Intelligence Agent
Runs before branding begins — scrapes real market data from e-commerce platforms, search engines, and the web so the Branding Agent builds an identity grounded in actual market conditions, not assumptions.

**Responsibilities:**
- Search and scrape product listings from e-commerce platforms (Amazon, Shopee, Lazada, Tokopedia, eBay)
- Extract competitor product names, descriptions, pricing, customer reviews, and star ratings
- Identify top-selling products in the category and what makes them successful
- Analyze customer reviews for recurring pain points, desires, and language patterns
- Pull Google Search results for the product category to identify how brands position themselves
- Identify trending keywords and search queries related to the product
- Scrape competitor brand websites for messaging, value propositions, and visual style notes
- Compile all findings into a structured `market_intelligence_report.json`

**Data Collected Per Source:**

| Source | Data Extracted |
|--------|---------------|
| Amazon | Product titles, bullet points, pricing, review count, star rating, "customers also bought", brand names |
| Shopee | Listings, sold count, seller ratings, product tags, promotional text |
| Lazada | Product descriptions, pricing tiers, brand presence, sponsored vs organic listings |
| Google Search | Top-ranking pages, ad copy, featured snippets, People Also Ask questions |
| Competitor Sites | Taglines, hero copy, feature lists, tone of voice, color/font observations |
| Reddit / Forums | Unfiltered customer language, complaints, wishlist items |

**Tools/APIs:**
- Playwright or Selenium for JavaScript-rendered pages (Shopee, Lazada)
- BeautifulSoup for static HTML scraping (Amazon product pages)
- SerpAPI or Tavily for Google Search results
- Requests + lxml for lightweight scraping
- RapidAPI marketplace scrapers (Amazon Product Data, Shopee Unofficial API)

**Output:**
- `market_intelligence_report.json` — structured findings passed directly to the Branding Agent
  - Competitor names, taglines, price ranges
  - Top customer complaints and desires (from reviews)
  - Trending search keywords
  - Market gaps and whitespace opportunities
  - Common visual/tone patterns to differentiate from

---

### 2. Branding Agent
Consumes the `market_intelligence_report.json` from the Market Intelligence Agent and uses it to build a brand identity that is differentiated, market-aware, and grounded in real customer language — not generic assumptions.

**How it uses market research:**
- Reads competitor names and taglines → generates a name and tagline that stands apart
- Reads customer review language → mirrors real customer words in brand voice and messaging
- Reads competitor color/font patterns → chooses a visual identity that differentiates
- Reads top complaints → builds the brand value proposition around solving those exact pain points
- Reads market gaps → positions the brand to own the whitespace competitors are missing

**Responsibilities:**
- Define brand mission, vision, and core values (informed by market gaps)
- Develop brand personality and tone of voice based on what resonates with the target audience
- Create brand naming suggestions and taglines that are differentiated from competitors
- Build a visual identity system:
  - Color palette (primary, secondary, accent)
  - Typography (heading and body font pairings)
  - Logo concept descriptions and prompts for AI generation
  - Icon and illustration style guidelines
- Write a Brand Style Guide covering all of the above
- Define messaging hierarchy (elevator pitch, one-liner, detailed value proposition)
- Ensure brand consistency across all channels and agent outputs

**Tools/APIs:**
- Claude for copywriting, naming, and style guide generation
- DALL-E / Midjourney / Stable Diffusion for logo and visual concept generation
- Coolors API or custom palette tools for color generation
- Google Fonts for typography pairing suggestions
- Brandfetch API (to audit competitor branding)

**Output:**
- `brand_guide.md` — full written brand style guide
- `brand_config.json` — structured brand config consumed by all other agents (colors, fonts, voice, tagline)
- Logo image assets and visual concept prompts

---

### 3. Research Agent
Gathers intelligence before any campaign begins.

**Responsibilities:**
- Product/service research (features, USPs, pricing, competitors)
- Target audience analysis (demographics, psychographics, pain points)
- Competitor analysis (positioning, messaging, content strategy)
- Trend analysis (industry keywords, viral topics, seasonal patterns)
- SEO keyword research

**Tools/APIs:**
- Web search (Tavily, SerpAPI, or Brave Search)
- Scrapers (BeautifulSoup, Playwright) for competitor sites
- Google Trends API
- SEMrush / Ahrefs API (optional)

---

### 4. Strategy Agent
Converts research into an actionable marketing plan.

**Responsibilities:**
- Define campaign goals (awareness, leads, conversions, retention)
- Identify channels (Instagram, Twitter/X, LinkedIn, TikTok, email, blog)
- Build content calendar with topics, formats, and posting schedule
- Define brand voice, tone, and messaging pillars
- Set KPIs for each channel

**Output:**
- Campaign brief (markdown or structured JSON)
- Content calendar (weekly/monthly schedule)
- Brand voice guidelines

---

### 5. Content Creation Agent
Produces platform-specific content at scale.

**Responsibilities:**
- Write social media posts (Twitter/X threads, LinkedIn posts, Instagram captions)
- Generate long-form content (blog posts, newsletters, product descriptions)
- Write ad copy (headlines, CTAs, A/B variants)
- Generate image prompts for AI image tools
- Create video scripts for short-form video (Reels, TikToks, YouTube Shorts)

**Tools/APIs:**
- Claude / GPT-4 for text generation
- DALL-E / Midjourney / Stable Diffusion for images
- ElevenLabs for voiceovers (optional)
- Canva API or HTML/CSS templates for graphics

---

### 6. Social Media Management Agent
Handles account setup, scheduling, and publishing.

**Responsibilities:**
- Create and configure social media profiles
- Publish or schedule content across platforms
- Engage with comments and DMs (auto-reply or draft responses)
- Cross-post and format content per platform requirements
- Manage hashtags and tagging strategies

**Tools/APIs:**
- Twitter/X API (v2)
- Instagram Graph API (via Meta for Developers)
- LinkedIn API
- TikTok for Business API
- Buffer / Hootsuite API for scheduling
- Facebook Business API

---

### 7. Email Marketing Agent
Runs outreach and nurturing campaigns.

**Responsibilities:**
- Build and segment email lists
- Write email sequences (welcome, nurture, promotional, re-engagement)
- A/B test subject lines and CTAs
- Schedule and send campaigns
- Track open rates, clicks, and unsubscribes

**Tools/APIs:**
- Mailchimp / SendGrid / Resend API
- Hunter.io or Apollo.io for lead emails (optional)

---

### 8. Analytics & Tracking Agent
Measures performance and generates reports.

**Responsibilities:**
- Pull metrics from each platform (impressions, reach, engagement, clicks, conversions)
- Track campaign-level ROI
- Identify top-performing content
- Flag underperforming areas and suggest improvements
- Generate weekly/monthly dashboards and summary reports

**Tools/APIs:**
- Google Analytics 4 API
- Meta Insights API
- Twitter/X Analytics API
- LinkedIn Analytics API
- TikTok Analytics API
- Custom SQLite or PostgreSQL database for storing metrics
- Matplotlib / Plotly for visualization

---

### 9. Optimization Agent
Continuously improves the strategy based on data.

**Responsibilities:**
- Analyze analytics reports to identify patterns
- Suggest content tweaks, posting time changes, or channel pivots
- Run A/B test cycles on posts and emails
- Feed learnings back to Strategy and Content agents
- Auto-update the content calendar based on what performs best

---

## System Architecture

```
User Input / Product Brief
        |
        v
[ Market Intelligence Agent ]  <-- scrapes Amazon, Shopee, Lazada, Google, competitor sites
        |
        v (market_intelligence_report.json)
    [ Branding Agent ]         <-- builds brand identity from real market data
        |
        v (brand_config.json + brand_guide.md)
    [ Research Agent ]         <-- campaign-level research (trends, audience, SEO)
        |
        v
    [ Strategy Agent ]         <-- campaign plan, content calendar, KPIs
        |
   _____|______
  |            |
  v            v
[Content     [Email
 Creation]    Marketing]       <-- all outputs styled using brand_config.json
  |            |
  v            v
[Social Media Management Agent]
        |
        v
[Analytics & Tracking Agent]
        |
        v
[Optimization Agent] -----> (feeds back to Strategy Agent)
```

---

## Tech Stack

| Layer              | Technology                                      |
|--------------------|-------------------------------------------------|
| Language           | Python 3.11+                                    |
| Agent Framework    | Claude Agent SDK / LangChain / CrewAI           |
| LLM Backend        | Anthropic Claude (claude-sonnet-4-6 default)    |
| Web Search         | Tavily API / SerpAPI                            |
| E-commerce Scraping| Playwright, BeautifulSoup, RapidAPI scrapers    |
| Image Generation   | DALL-E 3 / Stable Diffusion / Midjourney        |
| Branding / Design  | Brandfetch API, Coolors, Google Fonts API       |
| Social Scheduling  | Buffer API / Hootsuite                          |
| Email              | SendGrid / Mailchimp                            |
| Database           | SQLite (dev) / PostgreSQL (prod)                |
| Analytics Storage  | Google BigQuery or local DB                     |
| Visualization      | Plotly / Matplotlib                             |
| Task Queue         | Celery + Redis (for async jobs)                 |
| Environment Config | Python dotenv (.env)                            |

---

## Project Structure

```
marketing/
├── agents/
│   ├── market_intelligence_agent.py
│   ├── branding_agent.py
│   ├── research_agent.py
│   ├── strategy_agent.py
│   ├── content_agent.py
│   ├── social_media_agent.py
│   ├── email_agent.py
│   ├── analytics_agent.py
│   └── optimization_agent.py
├── tools/
│   ├── web_search.py
│   ├── ecommerce_scraper.py  # Amazon, Shopee, Lazada scrapers
│   ├── social_api.py
│   ├── email_api.py
│   ├── analytics_api.py
│   └── image_gen.py
├── brand/
│   ├── market_intelligence_report.json  # Raw research from e-commerce + Google scraping
│   ├── brand_guide.md                   # AI-generated brand style guide
│   ├── brand_config.json                # Structured brand config (colors, fonts, voice, tagline)
│   └── assets/                          # Logo concepts, color swatches, icon prompts
├── data/
│   ├── campaigns/
│   ├── content_calendar/
│   └── reports/
├── config/
│   └── settings.py
├── main.py
├── requirements.txt
├── .env.example
└── README.md
```

---

## Environment Variables

```env
# LLM
ANTHROPIC_API_KEY=

# Branding
BRANDFETCH_API_KEY=

# E-commerce Scraping (RapidAPI)
RAPIDAPI_KEY=                  # Used for Amazon, Shopee, Lazada scraper APIs

# Web Search
TAVILY_API_KEY=
SERPAPI_KEY=

# Social Media
TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_SECRET=
INSTAGRAM_ACCESS_TOKEN=
LINKEDIN_ACCESS_TOKEN=
TIKTOK_ACCESS_TOKEN=

# Email
SENDGRID_API_KEY=
MAILCHIMP_API_KEY=

# Image Generation
OPENAI_API_KEY=

# Analytics
GOOGLE_ANALYTICS_PROPERTY_ID=
GA_SERVICE_ACCOUNT_JSON=

# Database
DATABASE_URL=sqlite:///marketing.db
```

---

## Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/yourname/ai-marketing-team.git
cd ai-marketing-team

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set up environment variables
cp .env.example .env
# Fill in your API keys

# 5. Run the marketing team
python main.py --product "Your product description here"
```

---

## Example Workflow

1. User provides a product brief (name, description, target audience, goals)
2. Market Intelligence Agent scrapes Amazon, Shopee, Lazada, and Google — collecting competitor listings, customer reviews, pricing, trending keywords, and brand positioning data
3. Branding Agent reads the market intelligence report and builds a differentiated brand identity — name, tagline, colors, fonts, tone of voice, and a full brand style guide
4. Research Agent digs deeper into campaign-level trends, SEO keywords, and audience behavior
5. Strategy Agent produces a campaign plan and content calendar aligned with the brand
6. Content Agent generates on-brand posts, blogs, and emails for the next 30 days
7. Social Media Agent schedules and publishes to all connected platforms using brand visuals and copy
8. Email Agent sends nurture sequences styled to match the brand guide
9. Analytics Agent tracks all metrics daily
10. Optimization Agent surfaces insights and adjusts the strategy weekly

---

## Roadmap

- [ ] Multi-product support with separate brand configs per product
- [ ] Interactive brand questionnaire CLI for faster onboarding
- [ ] Auto-generate a shareable brand kit (PDF or HTML)
- [ ] Paid ads management (Google Ads, Meta Ads)
- [ ] Influencer outreach agent
- [ ] Automated landing page generation
- [ ] CRM integration (HubSpot, Salesforce)
- [ ] Slack/Discord bot interface for human-in-the-loop review
- [ ] Multi-language content support

---

## License

MIT
