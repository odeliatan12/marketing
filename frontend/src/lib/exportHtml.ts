// Shared HTML export utility — generates styled brand-guidelines-quality documents

function baseStyles() {
  return `
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #3b82f6;
      --primary-dark: #1d4ed8;
      --accent: #60a5fa;
      --bg: #f8fafc;
      --bg-card: #ffffff;
      --text: #0f172a;
      --text-mid: #475569;
      --text-light: #94a3b8;
      --border: #e2e8f0;
      --green: #16a34a;
      --red: #dc2626;
      --orange: #ea580c;
    }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'DM Sans',system-ui,sans-serif; background:var(--bg); color:var(--text); line-height:1.6; -webkit-font-smoothing:antialiased; }
    .page { max-width:960px; margin:0 auto; padding:48px 40px; }
    .header { border-bottom:3px solid var(--primary); padding-bottom:32px; margin-bottom:40px; display:grid; grid-template-columns:1fr auto; gap:24px; align-items:end; }
    .header h1 { font-family:'DM Serif Display',serif; font-size:48px; line-height:1; color:var(--text); }
    .header .meta { text-align:right; font-size:12px; color:var(--text-light); line-height:1.8; }
    .header .meta strong { color:var(--primary); display:block; font-size:14px; }
    .section { margin-bottom:40px; }
    .section-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:var(--primary); margin-bottom:16px; padding-bottom:8px; border-bottom:1px solid var(--border); }
    h2.section-title { font-size:11px; }
    .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:24px; }
    .grid-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; }
    .grid-4 { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
    .card { background:var(--bg-card); border-radius:12px; padding:20px; border:1px solid var(--border); box-shadow:0 1px 4px rgba(0,0,0,.04); }
    .card-dark { background:#0f172a; color:#f8fafc; border-color:#1e293b; border-radius:12px; padding:24px; }
    .chip { display:inline-block; background:#f1f5f9; border-radius:9999px; padding:3px 12px; font-size:12px; color:var(--text-mid); margin:3px; border:1px solid var(--border); }
    .chip.blue { background:#eff6ff; color:#1d4ed8; border-color:#bfdbfe; }
    .chip.green { background:#f0fdf4; color:#15803d; border-color:#bbf7d0; }
    .chip.yellow { background:#fefce8; color:#a16207; border-color:#fde68a; }
    .chip.purple { background:#faf5ff; color:#7c3aed; border-color:#ddd6fe; }
    p, li { font-size:14px; line-height:1.7; color:var(--text-mid); }
    ul { padding-left:18px; }
    li { margin-bottom:4px; }
    .bullet { display:flex; gap:8px; align-items:flex-start; margin-bottom:6px; font-size:13px; color:var(--text-mid); }
    .bullet .icon { color:var(--primary); flex-shrink:0; margin-top:2px; }
    .bullet .icon.green { color:var(--green); }
    .bullet .icon.red { color:var(--red); }
    table { width:100%; border-collapse:collapse; font-size:13px; margin-top:8px; }
    th { text-align:left; padding:8px 10px; background:#f8fafc; border-bottom:2px solid var(--border); color:var(--text-light); font-size:11px; text-transform:uppercase; letter-spacing:.05em; font-weight:600; }
    td { padding:8px 10px; border-bottom:1px solid var(--border); color:var(--text-mid); }
    tr:last-child td { border-bottom:none; }
    .price-row { display:flex; gap:0; border:1px solid var(--border); border-radius:10px; overflow:hidden; margin-bottom:16px; }
    .price-box { flex:1; text-align:center; padding:16px; }
    .price-box:not(:last-child) { border-right:1px solid var(--border); }
    .price-box .val { font-size:24px; font-weight:700; color:var(--text); display:block; }
    .price-box .lbl { font-size:11px; color:var(--text-light); text-transform:uppercase; letter-spacing:.05em; }
    .swatch-row { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:16px; }
    .swatch { border-radius:10px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,.07); min-width:100px; flex:1; }
    .swatch-block { height:72px; }
    .swatch-info { background:#fff; padding:8px 10px; font-size:11px; }
    .swatch-info .hex { font-weight:700; font-size:12px; color:var(--text); display:block; }
    .swatch-info .name { color:var(--text-light); }
    .font-hero { font-family:'DM Serif Display',serif; font-size:36px; color:var(--text); margin-bottom:4px; }
    .gap-box { background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:10px 14px; margin:6px 0; font-size:13px; color:#166534; }
    .opp-box { background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:10px 14px; margin:6px 0; font-size:13px; color:#1e40af; }
    .footer { margin-top:48px; padding-top:16px; border-top:1px solid var(--border); font-size:11px; color:var(--text-light); display:flex; justify-content:space-between; }
    @media print { body { background:#fff; } .page { padding:24px; } }
    @media(max-width:700px) { .grid-2,.grid-3,.grid-4 { grid-template-columns:1fr; } .header { grid-template-columns:1fr; } .header h1 { font-size:32px; } }
  </style>`;
}

function footer(title: string) {
  return `<div class="footer"><span>${title}</span><span>Generated ${new Date().toLocaleString()} · AI Marketing Team</span></div>`;
}

function triggerDownload(html: string, filename: string) {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Brand Guidelines ──────────────────────────────────────────────────────────

export function downloadBrandGuide(brand: any, guideMarkdown: string, productName: string) {
  const colors = brand.colors ?? {};
  const swatches = ["primary", "secondary", "accent", "background", "text"]
    .filter((k) => colors[k])
    .map((k) => `
      <div class="swatch">
        <div class="swatch-block" style="background:${colors[k]};"></div>
        <div class="swatch-info"><span class="hex">${colors[k]}</span><span class="name">${k}</span></div>
      </div>`).join("");

  const values = (brand.core_values ?? []).map((v: string) => `<span class="chip purple">${v}</span>`).join("");
  const toneAdj = (brand.tone_adjectives ?? []).map((v: string) => `<span class="chip blue">${v}</span>`).join("");
  const dos = (brand.voice_dos ?? []).map((d: string) => `<div class="bullet"><span class="icon green">✓</span>${d}</div>`).join("");
  const donts = (brand.voice_donts ?? []).map((d: string) => `<div class="bullet"><span class="icon red">✗</span>${d}</div>`).join("");

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
  <title>Brand Guidelines — ${brand.brand_name}</title>${baseStyles()}</head><body>
  <div class="page">
    <div class="header">
      <div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--primary);margin-bottom:8px;">Brand Guidelines</div>
        <h1>${brand.brand_name}</h1>
        <p style="margin-top:10px;font-size:14px;color:var(--text-mid);max-width:480px;">${brand.tagline ? `"${brand.tagline}"` : ""}</p>
      </div>
      <div class="meta">
        <strong>${productName}</strong>
        ${brand.personality_archetype ?? ""}<br>
        ${new Date().toLocaleDateString()}
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Mission, Vision & Values</h2>
      <div class="grid-3">
        <div class="card"><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-light);margin-bottom:6px;">Mission</div><p>${brand.mission ?? ""}</p></div>
        <div class="card"><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-light);margin-bottom:6px;">Vision</div><p>${brand.vision ?? ""}</p></div>
        <div class="card"><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-light);margin-bottom:6px;">Core Values</div>${values}</div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Messaging</h2>
      <div class="card-dark" style="margin-bottom:12px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#60a5fa;margin-bottom:6px;">One-liner</div>
        <p style="color:#f8fafc;font-size:16px;font-weight:500;">${brand.one_liner ?? ""}</p>
      </div>
      <div class="grid-2">
        <div class="card"><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-light);margin-bottom:6px;">Elevator Pitch</div><p>${brand.elevator_pitch ?? ""}</p></div>
        <div class="card"><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-light);margin-bottom:6px;">Value Proposition</div><p>${brand.value_proposition ?? ""}</p></div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Color Palette</h2>
      <div class="swatch-row">${swatches}</div>
      ${colors.rationale ? `<p style="font-style:italic;font-size:13px;">${colors.rationale}</p>` : ""}
    </div>

    <div class="section">
      <h2 class="section-title">Typography</h2>
      <div class="grid-2">
        <div class="card">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-light);margin-bottom:8px;">Heading — ${brand.fonts?.heading ?? ""}</div>
          <div style="font-family:'DM Serif Display',serif;font-size:42px;color:var(--text);line-height:1;">Aa</div>
          <div style="font-size:12px;color:var(--text-light);margin-top:8px;letter-spacing:1px;">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz 0-9</div>
        </div>
        <div class="card">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-light);margin-bottom:8px;">Body — ${brand.fonts?.body ?? ""}</div>
          <div style="font-size:42px;color:var(--text);line-height:1;font-weight:400;">Aa</div>
          <div style="font-size:12px;color:var(--text-light);margin-top:8px;letter-spacing:1px;">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz 0-9</div>
        </div>
      </div>
      ${brand.fonts?.rationale ? `<p style="font-style:italic;font-size:13px;margin-top:12px;">${brand.fonts.rationale}</p>` : ""}
    </div>

    <div class="section">
      <h2 class="section-title">Voice & Tone</h2>
      <div style="margin-bottom:12px;">${toneAdj}</div>
      <div class="grid-2">
        <div class="card"><div style="font-size:11px;font-weight:700;color:var(--green);text-transform:uppercase;margin-bottom:10px;">Do</div>${dos}</div>
        <div class="card"><div style="font-size:11px;font-weight:700;color:var(--red);text-transform:uppercase;margin-bottom:10px;">Don't</div>${donts}</div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Logo Generation Prompt</h2>
      <div class="card" style="background:#f8fafc;">
        <p style="font-family:monospace;font-size:13px;color:var(--text);line-height:1.8;">${brand.logo_prompt ?? ""}</p>
      </div>
      <p style="font-size:12px;margin-top:8px;">Paste into DALL-E, Midjourney, or Stable Diffusion to generate logo concepts.</p>
    </div>

    ${guideMarkdown ? `<div class="section"><h2 class="section-title">Full Brand Style Guide</h2><div class="card"><pre style="white-space:pre-wrap;font-family:inherit;font-size:13px;color:var(--text-mid);">${guideMarkdown}</pre></div></div>` : ""}

    ${footer(`Brand Guidelines — ${brand.brand_name}`)}
  </div></body></html>`;

  triggerDownload(html, `brand-guidelines-${brand.brand_name?.replace(/\s+/g, "-").toLowerCase()}.html`);
}

// ─── Research Report ───────────────────────────────────────────────────────────

export function downloadResearchReport(report: any) {
  const r = report;
  const chips = (arr: string[], cls = "") => (arr ?? []).map((i: string) => `<span class="chip ${cls}">${i}</span>`).join("");

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
  <title>Research Report — ${r.product_name}</title>${baseStyles()}</head><body>
  <div class="page">
    <div class="header">
      <div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--primary);margin-bottom:8px;">Research Report</div>
        <h1>${r.product_name}</h1>
      </div>
      <div class="meta"><strong>Generated</strong>${new Date(r.generated_at).toLocaleString()}</div>
    </div>

    <div class="section">
      <h2 class="section-title">Audience Profile</h2>
      <div class="grid-2">
        <div class="card"><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-light);margin-bottom:6px;">Demographics</div><p>${r.audience_profile?.demographics ?? ""}</p></div>
        <div class="card"><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-light);margin-bottom:6px;">Psychographics</div><p>${r.audience_profile?.psychographics ?? ""}</p></div>
        <div class="card"><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-light);margin-bottom:6px;">Online Behaviour</div><p>${r.audience_profile?.online_behavior ?? ""}</p></div>
        <div class="card"><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-light);margin-bottom:6px;">Language Patterns</div>${chips(r.audience_profile?.language_patterns ?? [], "blue")}</div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">SEO Strategy</h2>
      <div class="grid-2">
        <div class="card"><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-light);margin-bottom:8px;">Primary Keywords</div>${chips(r.seo_strategy?.primary_keywords ?? [])}</div>
        <div class="card"><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-light);margin-bottom:8px;">Long-tail Keywords</div>${chips(r.seo_strategy?.long_tail_keywords ?? [], "blue")}</div>
      </div>
      <div class="card" style="margin-top:12px;"><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-light);margin-bottom:8px;">Content Topics</div>${chips(r.seo_strategy?.content_topics ?? [], "green")}</div>
    </div>

    <div class="section">
      <h2 class="section-title">Trend Insights</h2>
      <div class="grid-2">
        <div class="card"><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-light);margin-bottom:8px;">Rising Trends</div>${chips(r.trend_insights?.rising_trends ?? [], "yellow")}</div>
        <div class="card"><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-light);margin-bottom:8px;">Viral Content Formats</div>${chips(r.trend_insights?.viral_content_formats ?? [])}</div>
      </div>
      ${r.trend_insights?.seasonal_patterns ? `<div class="card" style="margin-top:12px;"><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-light);margin-bottom:6px;">Seasonal Patterns</div><p>${r.trend_insights.seasonal_patterns}</p></div>` : ""}
    </div>

    <div class="section">
      <h2 class="section-title">Competitor Content Analysis</h2>
      <div class="grid-2">
        <div class="card"><div style="font-size:11px;font-weight:700;color:var(--green);text-transform:uppercase;margin-bottom:8px;">What Works</div><ul>${(r.competitor_content_analysis?.what_works ?? []).map((w: string) => `<li>${w}</li>`).join("")}</ul></div>
        <div class="card"><div style="font-size:11px;font-weight:700;color:var(--primary);text-transform:uppercase;margin-bottom:8px;">Gaps to Fill</div><ul>${(r.competitor_content_analysis?.gaps ?? []).map((g: string) => `<li>${g}</li>`).join("")}</ul></div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Channel Recommendations</h2>
      <table>
        <tr><th>Priority</th><th>Channel</th><th>Frequency</th><th>Best Time</th></tr>
        ${(r.channel_recommendations?.priority_channels ?? []).map((ch: string, i: number) => `
          <tr><td>${i + 1}</td><td><strong>${ch}</strong></td><td>${r.channel_recommendations?.posting_frequency?.[ch] ?? "—"}</td><td>${r.channel_recommendations?.best_posting_times?.[ch] ?? "—"}</td></tr>`).join("")}
      </table>
    </div>

    <div class="section">
      <h2 class="section-title">Campaign Angles</h2>
      ${(r.campaign_angles ?? []).map((a: string, i: number) => `
        <div class="opp-box"><strong>${i + 1}.</strong> ${a}</div>`).join("")}
    </div>

    ${footer(`Research Report — ${r.product_name}`)}
  </div></body></html>`;

  triggerDownload(html, `research-report-${r.product_name?.replace(/\s+/g, "-").toLowerCase()}.html`);
}

// ─── Strategy / Campaign Brief ─────────────────────────────────────────────────

export function downloadStrategyBrief(brief: any, calendarItems: any[]) {
  const channels = Object.keys(brief.channel_strategy ?? {});
  const budgetRows = Object.entries(brief.budget_allocation ?? {})
    .map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("");
  const pillars = (brief.content_pillars ?? [])
    .map((p: any) => `<tr><td><strong>${p.pillar}</strong></td><td>${p.percentage ?? ""}</td><td>${p.description ?? ""}</td></tr>`).join("");
  const calRows = calendarItems.slice(0, 30)
    .map((item: any) => `<tr><td>${item.date}</td><td>${item.channel}</td><td>${item.format}</td><td>${item.topic}</td><td>${(item.hashtags ?? []).slice(0, 3).join(" ")}</td></tr>`).join("");

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
  <title>Campaign Brief — ${brief.campaign_name}</title>${baseStyles()}</head><body>
  <div class="page">
    <div class="header">
      <div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--primary);margin-bottom:8px;">Campaign Brief</div>
        <h1>${brief.campaign_name}</h1>
        <p style="margin-top:8px;font-size:14px;color:var(--text-mid);">${brief.campaign_goal ?? ""}</p>
      </div>
      <div class="meta"><strong>Target Audience</strong>${brief.target_audience_summary ?? ""}</div>
    </div>

    <div class="section">
      <h2 class="section-title">Core Message</h2>
      <div class="card-dark"><p style="color:#f8fafc;font-size:16px;font-weight:500;">${brief.core_message ?? ""}</p></div>
    </div>

    <div class="section">
      <h2 class="section-title">Content Pillars</h2>
      <table><tr><th>Pillar</th><th>Allocation</th><th>Description</th></tr>${pillars}</table>
    </div>

    <div class="section">
      <h2 class="section-title">Campaign Angles</h2>
      ${(brief.campaign_angles ?? []).map((a: any) => `
        <div class="card" style="margin-bottom:10px;">
          <strong style="font-size:14px;">${a.angle}</strong>
          <p style="margin-top:4px;">${a.description}</p>
          <div style="margin-top:6px;">${(a.channels ?? []).map((c: string) => `<span class="chip blue">${c}</span>`).join("")}</div>
        </div>`).join("")}
    </div>

    <div class="section">
      <h2 class="section-title">Channel Strategy</h2>
      ${channels.map((ch) => {
        const s = brief.channel_strategy[ch];
        return `<div class="card" style="margin-bottom:10px;">
          <strong style="text-transform:capitalize;font-size:14px;">${ch}</strong>
          <p style="margin-top:4px;">${s.role ?? ""}</p>
          <div style="margin-top:6px;font-size:13px;color:var(--text-light);">
            ${s.posting_frequency ?? ""} · CTA: ${s.primary_cta ?? ""}
          </div>
        </div>`;
      }).join("")}
    </div>

    <div class="section">
      <h2 class="section-title">Hashtag Strategy</h2>
      <div class="grid-3">
        <div class="card"><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-light);margin-bottom:8px;">Branded</div>${(brief.hashtag_strategy?.branded ?? []).map((h: string) => `<span class="chip">${h}</span>`).join("")}</div>
        <div class="card"><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-light);margin-bottom:8px;">Campaign</div>${(brief.hashtag_strategy?.campaign ?? []).map((h: string) => `<span class="chip blue">${h}</span>`).join("")}</div>
        <div class="card"><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-light);margin-bottom:8px;">Community</div>${(brief.hashtag_strategy?.community ?? []).map((h: string) => `<span class="chip green">${h}</span>`).join("")}</div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Budget Allocation</h2>
      <table><tr><th>Channel</th><th>Allocation</th></tr>${budgetRows}</table>
    </div>

    ${calendarItems.length > 0 ? `
    <div class="section">
      <h2 class="section-title">Content Calendar (first 30 items)</h2>
      <table><tr><th>Date</th><th>Channel</th><th>Format</th><th>Topic</th><th>Hashtags</th></tr>${calRows}</table>
    </div>` : ""}

    ${footer(`Campaign Brief — ${brief.campaign_name}`)}
  </div></body></html>`;

  triggerDownload(html, `campaign-brief-${brief.campaign_name?.replace(/\s+/g, "-").toLowerCase()}.html`);
}
