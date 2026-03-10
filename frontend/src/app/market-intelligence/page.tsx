"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Plus, Trash2, Globe, ShoppingBag, Search,
  AlertCircle, CheckCircle2, ChevronDown, ChevronUp,
  Save, Download, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api";
import { setFlowContext } from "@/lib/flowContext";

// --- Types ---
interface ProductBrief {
  product_name: string;
  description: string;
  category: string;
  target_audience: string;
  competitor_urls: string[];
}

interface Listing {
  source: string;
  title: string;
  price: string;
  rating: string;
  review_count?: string;
  sold?: string;
  brand?: string;
  url?: string;
}

interface AISummary {
  competitor_names: string[];
  competitor_taglines: string[];
  price_range: { low: string; high: string; average: string };
  top_customer_pain_points: string[];
  top_customer_desires: string[];
  trending_keywords: string[];
  market_gaps: string[];
  common_visual_tone_patterns: string[];
  differentiation_opportunities: string[];
}

interface Report {
  product_name: string;
  generated_at: string;
  ecommerce_listings: { amazon: Listing[]; shopee: Listing[]; lazada: Listing[] };
  competitor_site_data: { url: string; page_title: string; meta_description: string; headings: string[] }[];
  ai_summary: AISummary;
}

// --- Sub-components ---

function FormInput({
  label, value, onChange, placeholder, textarea = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; textarea?: boolean;
}) {
  const cls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white";
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {textarea ? (
        <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} className={cls} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} className={cls} />
      )}
    </div>
  );
}

function ListingTable({ listings, source }: { listings: Listing[]; source: string }) {
  if (!listings?.length) return <p className="text-sm text-gray-400 py-3">No listings found for {source}.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Title</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Price</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Rating</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">
              {source === "shopee" ? "Sold" : "Reviews"}
            </th>
          </tr>
        </thead>
        <tbody>
          {listings.map((item, i) => (
            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-800 max-w-xs truncate">{item.title || "—"}</td>
              <td className="py-2 px-3 text-gray-600 whitespace-nowrap">{item.price || "—"}</td>
              <td className="py-2 px-3 text-gray-600">{item.rating || "—"}</td>
              <td className="py-2 px-3 text-gray-600">{item.sold || item.review_count || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="flex gap-1 border-b border-gray-200 mb-4">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors capitalize ${
            active === tab
              ? "bg-white border border-b-white border-gray-200 -mb-px text-brand-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

function ChipList({ items, color = "blue" }: { items: string[]; color?: string }) {
  const colors: Record<string, string> = {
    blue:   "bg-blue-50 text-blue-700 border-blue-100",
    green:  "bg-green-50 text-green-700 border-green-100",
    red:    "bg-red-50 text-red-700 border-red-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-100",
    grey:   "bg-gray-100 text-gray-600 border-gray-200",
  };
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span key={i} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${colors[color] ?? colors.grey}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

function CollapsibleCard({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <Card className="p-0 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-700">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </Card>
  );
}

// --- Main page ---
export default function MarketIntelligencePage() {
  const [brief, setBrief] = useState<ProductBrief>({
    product_name: "",
    description: "",
    category: "",
    target_audience: "",
    competitor_urls: [""],
  });
  const [activeTab, setActiveTab] = useState("amazon");
  const [report, setReport] = useState<Report | null>(null);

  const mutation = useMutation({
    mutationFn: (data: ProductBrief) => api.post("/market-intelligence", data).then((r) => r.data),
    onSuccess: (data) => {
      setReport(data);
      setFlowContext({
        product_name: brief.product_name,
        category: brief.category,
        description: brief.description,
        target_audience: brief.target_audience,
      });
    },
  });

  const updateUrl = (i: number, val: string) => {
    const urls = [...brief.competitor_urls];
    urls[i] = val;
    setBrief({ ...brief, competitor_urls: urls });
  };
  const addUrl = () => setBrief({ ...brief, competitor_urls: [...brief.competitor_urls, ""] });
  const removeUrl = (i: number) => {
    const urls = brief.competitor_urls.filter((_, idx) => idx !== i);
    setBrief({ ...brief, competitor_urls: urls.length ? urls : [""] });
  };

  const handleRun = () => {
    mutation.mutate({
      ...brief,
      competitor_urls: brief.competitor_urls.filter((u) => u.trim()),
    });
  };

  const summary: AISummary | null = report?.ai_summary ?? null;
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!report) return;
    const existing: Report[] = JSON.parse(localStorage.getItem("mi_saved_reports") ?? "[]");
    const entry = { ...report, saved_at: new Date().toISOString() };
    // Replace if same product, otherwise prepend
    const idx = existing.findIndex((r) => r.product_name === report.product_name);
    if (idx >= 0) existing[idx] = entry; else existing.unshift(entry);
    localStorage.setItem("mi_saved_reports", JSON.stringify(existing.slice(0, 10)));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDownload = () => {
    if (!report || !summary) return;
    const s = summary;
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Market Intelligence — ${report.product_name}</title>
  <style>
    body{font-family:system-ui,sans-serif;max-width:860px;margin:40px auto;padding:0 24px;color:#111}
    h1{font-size:24px;margin-bottom:4px}
    h2{font-size:16px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-top:32px;color:#374151}
    h3{font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin:20px 0 8px}
    p,li{font-size:14px;line-height:1.6;color:#374151}
    ul{padding-left:20px}
    .meta{font-size:12px;color:#9ca3af;margin-bottom:24px}
    .chip{display:inline-block;background:#f3f4f6;border-radius:9999px;padding:2px 10px;font-size:12px;margin:2px}
    .gap{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 14px;margin:6px 0;font-size:13px}
    .opp{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 14px;margin:6px 0;font-size:13px}
    .price-row{display:flex;gap:32px;margin:12px 0}
    .price-box{text-align:center}.price-box .val{font-size:22px;font-weight:700}
    .price-box .lbl{font-size:11px;color:#9ca3af}
    table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}
    th{text-align:left;padding:6px 8px;background:#f9fafb;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:11px;text-transform:uppercase}
    td{padding:6px 8px;border-bottom:1px solid #f3f4f6}
    @media print{body{margin:20px}}
  </style>
</head>
<body>
  <h1>Market Intelligence Report</h1>
  <p class="meta">Product: <strong>${report.product_name}</strong> &nbsp;|&nbsp; Generated: ${new Date(report.generated_at).toLocaleString()}</p>

  <h2>Price Range</h2>
  <div class="price-row">
    <div class="price-box"><div class="val">${s.price_range?.low ?? "—"}</div><div class="lbl">Low</div></div>
    <div class="price-box"><div class="val">${s.price_range?.average ?? "—"}</div><div class="lbl">Average</div></div>
    <div class="price-box"><div class="val">${s.price_range?.high ?? "—"}</div><div class="lbl">High</div></div>
  </div>

  <h2>Competitor Brands</h2>
  <div>${(s.competitor_names ?? []).map((c) => `<span class="chip">${c}</span>`).join("")}</div>

  <h2>Competitor Taglines</h2>
  <ul>${(s.competitor_taglines ?? []).map((t) => `<li>"${t}"</li>`).join("")}</ul>

  <h2>Customer Pain Points</h2>
  <ul>${(s.top_customer_pain_points ?? []).map((p) => `<li>${p}</li>`).join("")}</ul>

  <h2>Customer Desires</h2>
  <ul>${(s.top_customer_desires ?? []).map((d) => `<li>${d}</li>`).join("")}</ul>

  <h2>Trending Keywords</h2>
  <div>${(s.trending_keywords ?? []).map((k) => `<span class="chip">${k}</span>`).join("")}</div>

  <h2>Market Gaps</h2>
  ${(s.market_gaps ?? []).map((g) => `<div class="gap">◆ ${g}</div>`).join("")}

  <h2>Differentiation Opportunities</h2>
  ${(s.differentiation_opportunities ?? []).map((d) => `<div class="opp">→ ${d}</div>`).join("")}

  <h2>Common Patterns (to differentiate from)</h2>
  <div>${(s.common_visual_tone_patterns ?? []).map((p) => `<span class="chip">${p}</span>`).join("")}</div>

  <h2>Amazon Listings</h2>
  <table>
    <tr><th>Product</th><th>Price</th><th>Rating</th><th>Reviews</th></tr>
    ${(report.ecommerce_listings?.amazon ?? []).map((l) => `<tr><td>${l.title}</td><td>${l.price}</td><td>${l.rating}</td><td>${l.review_count ?? ""}</td></tr>`).join("")}
  </table>
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `market-intelligence-${report.product_name.replace(/\s+/g, "-").toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageLayout
      title="Market Intelligence"
      subtitle="Scrape Amazon, Shopee, Lazada, and Google to research your market before building your brand."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Form */}
        <div className="lg:col-span-1">
          <Card>
            <CardTitle>Product Brief</CardTitle>
            <div className="space-y-4">
              <FormInput label="Product Name" value={brief.product_name}
                onChange={(v) => setBrief({ ...brief, product_name: v })}
                placeholder="e.g. Flo Hydration Tracker" />
              <FormInput label="Category" value={brief.category}
                onChange={(v) => setBrief({ ...brief, category: v })}
                placeholder="e.g. fitness apps, skincare, supplements" />
              <FormInput label="Description" value={brief.description}
                onChange={(v) => setBrief({ ...brief, description: v })}
                placeholder="What does your product do?" textarea />
              <FormInput label="Target Audience" value={brief.target_audience}
                onChange={(v) => setBrief({ ...brief, target_audience: v })}
                placeholder="e.g. 18-35 active adults, gym-goers" />

              {/* Competitor URLs */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Competitor URLs <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="space-y-2">
                  {brief.competitor_urls.map((url, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => updateUrl(i, e.target.value)}
                        placeholder="https://competitor.com"
                        className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <button onClick={() => removeUrl(i)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button onClick={addUrl}
                    className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium mt-1">
                    <Plus className="w-3.5 h-3.5" /> Add URL
                  </button>
                </div>
              </div>

              <Button
                onClick={handleRun}
                loading={mutation.isPending}
                disabled={!brief.product_name || !brief.category}
                className="w-full mt-2"
              >
                <Search className="w-4 h-4" />
                {mutation.isPending ? "Researching..." : "Run Market Intelligence"}
              </Button>

              {mutation.isError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Research failed. Check your API keys and try again.
                </div>
              )}
              {mutation.isSuccess && (
                <>
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    Research complete. Scroll right to view results.
                  </div>
                  <Link href="/branding">
                    <button className="w-full flex items-center justify-between px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors">
                      <span>Continue to Branding</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-2 space-y-6">
          {!report && !mutation.isPending && (
            <div className="flex flex-col items-center justify-center h-64 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
              <ShoppingBag className="w-10 h-10 mb-3 text-gray-300" />
              <p className="text-sm font-medium">Fill in the form and run the agent</p>
              <p className="text-xs mt-1">Results will appear here</p>
            </div>
          )}

          {mutation.isPending && (
            <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-gray-200 bg-white text-gray-400">
              <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mb-4" />
              <p className="text-sm font-medium text-gray-600">Scraping Amazon, Shopee, Lazada and Google...</p>
              <p className="text-xs mt-1 text-gray-400">This may take 20-40 seconds</p>
            </div>
          )}

          {report && (
            <>
              {/* Action bar */}
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-gray-500">
                  Results for <span className="font-semibold text-gray-800">{report.product_name}</span>
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:border-brand-400 hover:text-brand-600 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saved ? "Saved!" : "Save to Dashboard"}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:border-brand-400 hover:text-brand-600 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Report
                  </button>
                </div>
              </div>

              {/* E-commerce listings */}
              <Card>
                <CardTitle>E-Commerce Listings</CardTitle>
                <Tabs
                  tabs={["amazon", "shopee", "lazada"]}
                  active={activeTab}
                  onChange={setActiveTab}
                />
                {activeTab === "amazon" && <ListingTable listings={report.ecommerce_listings?.amazon} source="amazon" />}
                {activeTab === "shopee" && <ListingTable listings={report.ecommerce_listings?.shopee} source="shopee" />}
                {activeTab === "lazada" && <ListingTable listings={report.ecommerce_listings?.lazada} source="lazada" />}
              </Card>

              {/* Competitor sites */}
              {report.competitor_site_data?.length > 0 && (
                <Card>
                  <CardTitle>Competitor Sites</CardTitle>
                  <div className="space-y-3">
                    {report.competitor_site_data.map((site, i) => (
                      <div key={i} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Globe className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs text-gray-500 truncate">{site.url}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-800">{site.page_title}</p>
                        {site.meta_description && (
                          <p className="text-xs text-gray-500 mt-1">{site.meta_description}</p>
                        )}
                        {site.headings?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {site.headings.map((h, j) => (
                              <span key={j} className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded">
                                {h}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* AI Summary */}
              {summary && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Price range */}
                    <Card>
                      <CardTitle>Price Range</CardTitle>
                      <div className="flex gap-4 text-center">
                        {[
                          { label: "Low",  val: summary.price_range?.low },
                          { label: "Avg",  val: summary.price_range?.average },
                          { label: "High", val: summary.price_range?.high },
                        ].map(({ label, val }) => (
                          <div key={label} className="flex-1">
                            <p className="text-xs text-gray-400 mb-1">{label}</p>
                            <p className="text-lg font-bold text-gray-900">{val || "—"}</p>
                          </div>
                        ))}
                      </div>
                    </Card>

                    {/* Competitor names */}
                    <Card>
                      <CardTitle>Competitor Brands</CardTitle>
                      <ChipList items={summary.competitor_names ?? []} color="grey" />
                    </Card>
                  </div>

                  {/* Competitor taglines */}
                  {summary.competitor_taglines?.length > 0 && (
                    <CollapsibleCard title="Competitor Taglines">
                      <ul className="space-y-2">
                        {summary.competitor_taglines.map((t, i) => (
                          <li key={i} className="text-sm text-gray-700 flex gap-2">
                            <span className="text-gray-300">"</span>{t}<span className="text-gray-300">"</span>
                          </li>
                        ))}
                      </ul>
                    </CollapsibleCard>
                  )}

                  {/* Pain points & desires */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <CollapsibleCard title="Customer Pain Points">
                      <ul className="space-y-2">
                        {summary.top_customer_pain_points?.map((p, i) => (
                          <li key={i} className="flex gap-2 text-sm text-gray-700">
                            <span className="text-red-400 flex-shrink-0">✗</span>{p}
                          </li>
                        ))}
                      </ul>
                    </CollapsibleCard>
                    <CollapsibleCard title="Customer Desires">
                      <ul className="space-y-2">
                        {summary.top_customer_desires?.map((d, i) => (
                          <li key={i} className="flex gap-2 text-sm text-gray-700">
                            <span className="text-green-400 flex-shrink-0">✓</span>{d}
                          </li>
                        ))}
                      </ul>
                    </CollapsibleCard>
                  </div>

                  {/* Trending keywords */}
                  <CollapsibleCard title="Trending Keywords">
                    <ChipList items={summary.trending_keywords ?? []} color="blue" />
                  </CollapsibleCard>

                  {/* Market gaps */}
                  <CollapsibleCard title="Market Gaps & Whitespace">
                    <div className="space-y-2">
                      {summary.market_gaps?.map((g, i) => (
                        <div key={i} className="flex gap-2.5 p-2.5 bg-green-50 rounded-lg border border-green-100">
                          <span className="text-green-500 flex-shrink-0 mt-0.5">◆</span>
                          <p className="text-sm text-green-800">{g}</p>
                        </div>
                      ))}
                    </div>
                  </CollapsibleCard>

                  {/* Differentiation opportunities */}
                  <CollapsibleCard title="Differentiation Opportunities">
                    <div className="space-y-2">
                      {summary.differentiation_opportunities?.map((d, i) => (
                        <div key={i} className="flex gap-2.5 p-2.5 bg-brand-50 rounded-lg border border-brand-100">
                          <span className="text-brand-500 flex-shrink-0 mt-0.5">→</span>
                          <p className="text-sm text-brand-800">{d}</p>
                        </div>
                      ))}
                    </div>
                  </CollapsibleCard>

                  {/* Common patterns to avoid */}
                  <CollapsibleCard title="Common Visual/Tone Patterns (to differentiate from)">
                    <ChipList items={summary.common_visual_tone_patterns ?? []} color="yellow" />
                  </CollapsibleCard>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
