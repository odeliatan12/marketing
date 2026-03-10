# Frontend Pages Plan

All pages connect to the FastAPI backend at `/api/agents/*`.
Each page maps to one or more agent routes.

---

## Page List

### 1. Dashboard (Home)
**Route:** `/`

The command center — a high-level overview of the entire campaign state.

**Sections:**
- Campaign health badge (green / yellow / red) from the latest analytics report
- Agent pipeline status — which agents have been run, which are pending (checklist with timestamps)
- Quick stats row: total impressions, avg engagement rate, email open rate, top platform
- Recent activity feed — last 5 publish events, last analytics run, last optimization cycle
- Quick action buttons — "Run Next Agent", "View Content Calendar", "View Analytics"

**API calls:**
- `GET /api/agents/analytics/report` — health + KPI summary
- `GET /api/agents/social/publish-log` — recent activity
- `GET /api/agents/optimization/plan` — latest cycle status

---

### 2. Market Intelligence
**Route:** `/market-intelligence`

Run and view the Market Intelligence Agent output.

**Sections:**
- Product brief form:
  - Product name, description, category, target audience
  - Competitor URLs (multi-input)
  - "Run Market Intelligence" button
- Results panel (shown after run or if report exists):
  - Tabs: Amazon | Shopee | Lazada | Google | Competitor Sites
  - Each tab shows a table of scraped listings/results
  - AI Summary card:
    - Competitor names + taglines
    - Price range
    - Top customer pain points (bulleted list)
    - Top customer desires (bulleted list)
    - Market gaps (highlighted cards)
    - Trending keywords (tag cloud or chip list)
    - Differentiation opportunities

**API calls:**
- `POST /api/agents/market-intelligence` — run agent
- Report data is returned inline from the POST response

---

### 3. Branding
**Route:** `/branding`

Run the Branding Agent and view/edit the brand identity.

**Sections:**
- Input form:
  - Product name, description, target audience, goals, vibe (optional)
  - "Generate Brand Identity" button
  - Note: requires Market Intelligence to be run first
- Brand Config card (shown after run):
  - Brand name + tagline (large, styled)
  - Mission + vision statements
  - Core values (badge list)
  - Personality archetype
  - Color palette swatches (shows hex codes + names)
  - Typography preview (heading + body font rendered)
  - Voice do's and don'ts (two columns)
  - Elevator pitch, one-liner, value proposition
  - Logo prompt (copyable text box)
- Brand Guide panel:
  - Full markdown rendered brand_guide.md
  - "Download Brand Guide" button (downloads .md file)

**API calls:**
- `POST /api/agents/branding` — run agent

---

### 4. Research
**Route:** `/research`

Run the Research Agent and view campaign-level insights.

**Sections:**
- Input form:
  - Product name, category, target audience
  - Campaign goal
  - Channels (multi-select checkboxes)
  - "Run Research" button
- Results panel:
  - Audience Profile card (demographics, psychographics, online behavior, language patterns)
  - SEO Strategy card (primary keywords, long-tail keywords, content topic ideas)
  - Trend Insights card (rising trends, seasonal patterns, viral formats)
  - Competitor Content Analysis (what works, gaps)
  - Channel Recommendations table (priority ranking, posting frequency, best times)
  - Campaign Angles (numbered card list)

**API calls:**
- `POST /api/agents/research` — run agent

---

### 5. Strategy
**Route:** `/strategy`

Build the campaign plan and content calendar.

**Sections:**
- Input form:
  - Campaign name, campaign goal
  - Duration (days slider: 7 / 14 / 30 / 60)
  - Budget tier (Low / Medium / High toggle)
  - Channels (multi-select)
  - "Generate Strategy" button
- Campaign Brief card:
  - Core message (highlighted)
  - Campaign angles (accordion list)
  - Content pillars (donut chart of % split + descriptions)
  - Channel strategy (per-channel tabs with role, content types, frequency, CTA, KPIs)
  - Hashtag strategy (branded / campaign / community chips)
  - Key dates (timeline view)
  - Budget allocation (horizontal bar chart)
- Content Calendar panel:
  - Month/week toggle view
  - Color-coded by channel (Instagram = pink, LinkedIn = blue, TikTok = black, etc.)
  - Each calendar cell shows: channel icon, format badge, topic title
  - Click a cell → open side drawer with full caption brief, visual brief, hashtags, CTA
  - Filter bar: by channel, by content pillar, by format

**API calls:**
- `POST /api/agents/strategy` — run agent

---

### 6. Content
**Route:** `/content`

Generate and review all content for the calendar.

**Sections:**
- Generation controls:
  - Channel filter (multi-select)
  - Max items input
  - Include image prompts toggle
  - Include video scripts toggle
  - "Generate Content" button
- Content feed (card grid):
  - Filter bar: All | Instagram | TikTok | LinkedIn | Twitter | Blog | Email
  - Each card shows:
    - Date badge + channel icon
    - Format badge (post / reel / blog / email / ad)
    - Topic title
    - Caption preview (truncated)
    - "View Full" button → opens modal/drawer
- Content detail drawer:
  - Full caption (with copy button)
  - Alt caption / A/B variant
  - Hashtags (chip list)
  - CTA
  - Image prompt (copyable, styled box)
  - Video script (timecoded table, if applicable)
  - Email subject lines + preview text (if email)
  - Blog body (markdown rendered, if blog)

**API calls:**
- `POST /api/agents/content/generate` — generate content
- `GET /api/agents/content/batch` — load all content
- `GET /api/agents/content/by-channel/{channel}` — filter by channel

---

### 7. Social Media
**Route:** `/social`

Publish, schedule, and monitor social media posts.

**Sections:**
- Publish controls:
  - Mode toggle: Publish Now | Schedule
  - Channel filter (multi-select)
  - Dry Run toggle (with label: "Simulate without posting")
  - Max items input
  - "Run Publisher" button
- Publish log table:
  - Columns: Date | Channel | Topic | Status | Platform Post ID | Processed At
  - Status badge: published (green) | scheduled (blue) | skipped (grey) | error (red)
  - Filter: by channel, by status
- Platform connection status panel:
  - Shows which API credentials are configured (green tick / red X)
  - Twitter / Instagram / LinkedIn / TikTok / Buffer

**API calls:**
- `POST /api/agents/social/publish` — run publisher
- `GET /api/agents/social/publish-log` — load full log
- `GET /api/agents/social/publish-log/{channel}` — filter by channel

---

### 8. Email
**Route:** `/email`

Manage email campaigns and sequences.

**Sub-pages / Tabs:**

#### 8a. Campaigns Tab
- Sender name + email inputs
- SendGrid list ID input
- Mode toggle: Schedule | Send Now
- Dry Run toggle
- Max emails input
- "Run Email Campaign" button
- Send log table (date, subject, status, result detail)

#### 8b. Sequences Tab
- Sequence type selector: Welcome | Nurture | Promotional | Re-engagement
- Sender name, sender email, product name inputs
- Number of emails (2-8 slider)
- "Generate Sequence" button
- Sequence viewer:
  - List of emails with: Email # | Send delay | Subject line | Preview text
  - Click to expand → full HTML body preview + plain text + CTA

**API calls:**
- `POST /api/agents/email/campaign` — run campaign
- `POST /api/agents/email/sequence` — generate sequence
- `GET /api/agents/email/send-log` — load send log
- `GET /api/agents/email/sequence/{type}` — load saved sequence

---

### 9. Analytics
**Route:** `/analytics`

View performance metrics and AI-generated insights.

**Sections:**
- Run controls:
  - Days back slider (7 / 14 / 30)
  - Dry Run toggle
  - "Pull Metrics" button
- KPI summary row (top cards):
  - Total impressions | Total engagements | Avg engagement rate | Email open rate | Email click rate
- Platform metrics tabs: Twitter | Instagram | LinkedIn | Email
  - Each tab shows a table of post metrics + a line chart of impressions over time
- AI Insights panel:
  - Overall health badge (green/yellow/red)
  - Summary text
  - Top performing posts (card list with "why" explanation)
  - Underperforming posts (card list with recommendation)
  - Per-platform insights (accordion)
  - Email insights card
  - Recommendations list (numbered, actionable)

**API calls:**
- `POST /api/agents/analytics/run` — pull and analyse metrics
- `GET /api/agents/analytics/report` — load latest report
- `GET /api/agents/analytics/metrics/{platform}` — platform metrics table
- `GET /api/agents/analytics/metrics/email/all` — email metrics table

---

### 10. Optimization
**Route:** `/optimization`

Run the optimization loop and review the updated strategy.

**Sections:**
- Run controls:
  - Cycle number input (auto-increments each run)
  - Apply to calendar toggle
  - "Run Optimization" button
- Executive summary card (highlighted, colour-coded by health)
- Channel optimizations (accordion per channel, shows changes + reasons)
- Content pillar adjustments table (pillar | action | new % | reason)
- Posting schedule changes table
- A/B Tests panel:
  - Card per test: test name, channel, variable, variant A vs B, success metric, run duration
- Topics to retire (red badge list)
- Topics to double down (green badge list)
- Email optimizations card
- Strategy feedback card (goal update, channel priority ranking, budget reallocation)
- Next cycle priorities (numbered checklist)
- Revised calendar preview:
  - Shows first 7 days of the new content_calendar_v{n}.json
  - Link to Strategy page to view full calendar

**API calls:**
- `POST /api/agents/optimization/run` — run optimization
- `GET /api/agents/optimization/plan` — load latest plan
- `GET /api/agents/optimization/calendar/{cycle}` — load versioned calendar

---

### 11. Settings
**Route:** `/settings`

Configure API keys and platform connections.

**Sections:**
- LLM section: Anthropic API key input
- E-commerce scraping: RapidAPI key
- Search: SerpAPI key, Tavily key
- Social Media: Twitter, Instagram, LinkedIn, TikTok, Buffer credentials (masked inputs)
- Email: SendGrid API key, Mailchimp key, test recipient email
- Image generation: OpenAI API key
- Branding: Brandfetch API key
- Database: DATABASE_URL
- Save button — writes to .env file via a secure backend endpoint

**API calls:**
- `POST /api/settings/save` — save env config (to be built)

---

## Page Count Summary

| # | Page | Primary Agent |
|---|------|--------------|
| 1 | Dashboard | All agents (read-only) |
| 2 | Market Intelligence | Agent 1 |
| 3 | Branding | Agent 2 |
| 4 | Research | Agent 3 |
| 5 | Strategy | Agent 4 |
| 6 | Content | Agent 5 |
| 7 | Social Media | Agent 6 |
| 8 | Email | Agent 7 |
| 9 | Analytics | Agent 8 |
| 10 | Optimization | Agent 9 |
| 11 | Settings | Config only |

**Total: 11 pages**

---

## Shared Components Needed

- `Sidebar` — navigation with agent pipeline progress indicators
- `AgentStatusBadge` — shows run state per agent (idle / running / done / error)
- `ContentCalendarGrid` — reused on Strategy and Optimization pages
- `MetricsCard` — reused on Dashboard and Analytics
- `JsonViewer` — for viewing raw report data
- `MarkdownRenderer` — for brand guide and blog post previews
- `DryRunBanner` — shown when dry run mode is active
- `CopyButton` — inline copy to clipboard for prompts and captions
