"use client";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  CheckCircle2, Circle, AlertCircle, Clock,
  TrendingUp, Mail, Share2, Zap, ArrowRight,
  FileText, Download, Trash2,
} from "lucide-react";
import Link from "next/link";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

// --- Types ---
interface AnalyticsReport {
  generated_at: string;
  insights: {
    overall_health: "green" | "yellow" | "red";
    summary: string;
    kpi_summary: {
      total_impressions: number;
      total_engagements: number;
      avg_engagement_rate: string;
      total_email_sends: number;
      avg_open_rate: string;
    };
    recommendations: string[];
  };
}

interface PublishLogEntry {
  date: string;
  channel: string;
  topic: string;
  publish_result: { status: string };
  processed_at: string;
}

// --- Agent pipeline steps ---
const PIPELINE_STEPS = [
  { key: "market-intelligence", label: "Market Intelligence", href: "/market-intelligence" },
  { key: "branding",            label: "Branding",            href: "/branding" },
  { key: "research",            label: "Research",            href: "/research" },
  { key: "strategy",            label: "Strategy",            href: "/strategy" },
  { key: "content",             label: "Content Creation",    href: "/content" },
  { key: "social",              label: "Social Media",        href: "/social" },
  { key: "email",               label: "Email Marketing",     href: "/email" },
  { key: "analytics",           label: "Analytics",           href: "/analytics" },
  { key: "optimization",        label: "Optimization",        href: "/optimization" },
];

// --- Helper: determine which steps are done by checking report files ---
function usePipelineStatus() {
  const analytics = useQuery({
    queryKey: ["analytics-report"],
    queryFn: () => api.get("/analytics/report").then((r) => r.data).catch(() => null),
  });
  const publishLog = useQuery({
    queryKey: ["publish-log"],
    queryFn: () => api.get("/social/publish-log").then((r) => r.data).catch(() => []),
  });
  const optimizationPlan = useQuery({
    queryKey: ["optimization-plan"],
    queryFn: () => api.get("/optimization/plan").then((r) => r.data).catch(() => null),
  });

  return { analytics, publishLog, optimizationPlan };
}

// --- Health badge ---
function HealthBadge({ health }: { health?: string }) {
  if (!health) return <Badge label="No data yet" variant="grey" />;
  const map: Record<string, "green" | "yellow" | "red"> = {
    green: "green", yellow: "yellow", red: "red",
  };
  return <Badge label={health.toUpperCase()} variant={map[health] ?? "grey"} />;
}

// --- KPI card ---
function KpiCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <Card className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-brand-600" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
      </div>
    </Card>
  );
}

// --- Pipeline step row ---
function PipelineStep({
  step,
  index,
  done,
}: {
  step: (typeof PIPELINE_STEPS)[0];
  index: number;
  done: boolean;
}) {
  return (
    <Link href={step.href} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors group">
      <div className="flex-shrink-0">
        {done ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : (
          <Circle className="w-5 h-5 text-gray-300" />
        )}
      </div>
      <span className="text-sm text-gray-400 w-5">{index + 1}.</span>
      <span className={`text-sm font-medium flex-1 ${done ? "text-gray-900" : "text-gray-400"}`}>
        {step.label}
      </span>
      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
    </Link>
  );
}

// --- Activity item ---
function ActivityItem({ entry }: { entry: PublishLogEntry }) {
  const status = entry.publish_result?.status;
  const statusVariant =
    status === "published" || status === "scheduled" ? "green"
    : status === "dry_run" ? "blue"
    : status === "skipped"  ? "grey"
    : "red";

  const channelColors: Record<string, string> = {
    twitter: "bg-sky-100 text-sky-700",
    instagram: "bg-pink-100 text-pink-700",
    linkedin: "bg-blue-100 text-blue-700",
    tiktok: "bg-gray-900 text-white",
    email: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${channelColors[entry.channel] ?? "bg-gray-100 text-gray-600"}`}>
        {entry.channel}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 truncate">{entry.topic}</p>
        <p className="text-xs text-gray-400 mt-0.5">{entry.date}</p>
      </div>
      <Badge label={status} variant={statusVariant} />
    </div>
  );
}

// --- Saved Documents Dashboard ---

import { downloadBrandGuide, downloadResearchReport, downloadStrategyBrief } from "@/lib/exportHtml";

const DOC_TYPES = [
  { key: "mi_saved_reports",     label: "Market Intelligence", color: "bg-orange-100 text-orange-700", icon: "🔍", href: "/market-intelligence" },
  { key: "saved_brand_configs",  label: "Brand Guidelines",    color: "bg-purple-100 text-purple-700", icon: "🎨", href: "/branding" },
  { key: "saved_research_reports", label: "Research Report",   color: "bg-blue-100 text-blue-700",    icon: "📊", href: "/research" },
  { key: "saved_strategies",     label: "Campaign Strategy",   color: "bg-green-100 text-green-700",  icon: "📅", href: "/strategy" },
];

function handleDocDownload(type: string, doc: any) {
  if (type === "mi_saved_reports") {
    const s = doc.ai_summary ?? {};
    const chips = (arr: string[]) => (arr ?? []).map((c: string) => `<span style="display:inline-block;background:#f1f5f9;border-radius:9999px;padding:2px 10px;font-size:12px;margin:2px;">${c}</span>`).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Market Intelligence — ${doc.product_name}</title>
    <style>body{font-family:system-ui,sans-serif;max-width:860px;margin:40px auto;padding:0 24px;color:#0f172a}h1{font-size:28px;margin-bottom:4px}h2{font-size:14px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-top:28px;color:#475569;text-transform:uppercase;letter-spacing:.05em}p,li{font-size:14px;line-height:1.7;color:#475569}ul{padding-left:18px}.meta{font-size:12px;color:#94a3b8;margin-bottom:24px}.gap{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 14px;margin:6px 0;font-size:13px;color:#166534}.opp{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 14px;margin:6px 0;font-size:13px;color:#1e40af}table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}th{text-align:left;padding:8px;background:#f8fafc;border-bottom:2px solid #e2e8f0;color:#64748b;font-size:11px;text-transform:uppercase}td{padding:8px;border-bottom:1px solid #f1f5f9}</style></head><body>
    <h1>Market Intelligence</h1><p class="meta">Product: <strong>${doc.product_name}</strong> · ${new Date(doc.generated_at).toLocaleString()}</p>
    <h2>Price Range</h2><div style="display:flex;gap:24px;margin:12px 0">${["low","average","high"].map(k=>`<div style="text-align:center;flex:1;padding:12px;border:1px solid #e2e8f0;border-radius:8px"><div style="font-size:22px;font-weight:700">${s.price_range?.[k]??"—"}</div><div style="font-size:11px;color:#94a3b8;text-transform:uppercase">${k}</div></div>`).join("")}</div>
    <h2>Competitors</h2>${chips(s.competitor_names??[])}
    <h2>Customer Pain Points</h2><ul>${(s.top_customer_pain_points??[]).map((p:string)=>`<li>${p}</li>`).join("")}</ul>
    <h2>Customer Desires</h2><ul>${(s.top_customer_desires??[]).map((d:string)=>`<li>${d}</li>`).join("")}</ul>
    <h2>Market Gaps</h2>${(s.market_gaps??[]).map((g:string)=>`<div class="gap">◆ ${g}</div>`).join("")}
    <h2>Differentiation Opportunities</h2>${(s.differentiation_opportunities??[]).map((d:string)=>`<div class="opp">→ ${d}</div>`).join("")}
    <h2>Amazon Listings</h2><table><tr><th>Product</th><th>Price</th><th>Rating</th><th>Reviews</th></tr>${(doc.ecommerce_listings?.amazon??[]).map((l:any)=>`<tr><td>${l.title}</td><td>${l.price}</td><td>${l.rating}</td><td>${l.review_count??""}</td></tr>`).join("")}</table>
    </body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `market-intelligence-${doc.product_name?.replace(/\s+/g,"-").toLowerCase()}.html`; a.click(); URL.revokeObjectURL(url);
  } else if (type === "saved_brand_configs") {
    downloadBrandGuide(doc, "", doc.product_name ?? doc.brand_name);
  } else if (type === "saved_research_reports") {
    downloadResearchReport(doc);
  } else if (type === "saved_strategies") {
    downloadStrategyBrief(doc, doc.calendar_items ?? []);
  }
}

function SavedDocuments() {
  const [docs, setDocs] = useState<{ type: string; label: string; color: string; icon: string; href: string; items: any[] }[]>([]);

  useEffect(() => {
    const loaded = DOC_TYPES.map((t) => ({
      ...t,
      items: JSON.parse(localStorage.getItem(t.key) ?? "[]"),
    })).filter((t) => t.items.length > 0);
    setDocs(loaded);
  }, []);

  const handleDelete = (typeKey: string, name: string) => {
    const updated = JSON.parse(localStorage.getItem(typeKey) ?? "[]")
      .filter((d: any) => (d.product_name ?? d.brand_name ?? d.campaign_name) !== name);
    localStorage.setItem(typeKey, JSON.stringify(updated));
    setDocs((prev) => prev.map((t) => t.key === typeKey ? { ...t, items: updated } : t).filter((t) => t.items.length > 0));
  };

  if (docs.length === 0) return null;

  return (
    <Card>
      <CardTitle>Saved Documents</CardTitle>
      <div className="mt-3 space-y-4">
        {docs.map((group) => (
          <div key={group.key}>
            <div className="flex items-center gap-2 mb-2">
              <span>{group.icon}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${group.color}`}>{group.label}</span>
            </div>
            <div className="space-y-1.5">
              {group.items.map((doc: any) => {
                const name = doc.product_name ?? doc.brand_name ?? doc.campaign_name ?? "Untitled";
                return (
                  <div key={name} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                    <FileText className="w-4 h-4 text-brand-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
                      {doc.saved_at && <p className="text-xs text-gray-400">Saved {new Date(doc.saved_at).toLocaleDateString()}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => handleDocDownload(group.key, doc)} title="Download"
                        className="p-1.5 rounded hover:bg-gray-200 text-gray-400 hover:text-brand-600 transition-colors">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(group.key, name)} title="Remove"
                        className="p-1.5 rounded hover:bg-gray-200 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// --- Main page ---
export default function DashboardPage() {
  const { analytics, publishLog, optimizationPlan } = usePipelineStatus();

  const report: AnalyticsReport | null = analytics.data;
  const kpis = report?.insights?.kpi_summary;
  const health = report?.insights?.overall_health;
  const summary = report?.insights?.summary;
  const recommendations = report?.insights?.recommendations ?? [];
  const recentActivity: PublishLogEntry[] = (publishLog.data ?? []).slice(-5).reverse();

  // Determine which steps are "done" based on available data
  const done = {
    "market-intelligence": true,   // assume done if user got here
    branding: true,
    research: !!report,
    strategy: !!report,
    content: !!report,
    social: recentActivity.length > 0,
    email: !!report,
    analytics: !!report,
    optimization: !!optimizationPlan.data,
  } as Record<string, boolean>;

  return (
    <PageLayout
      title="Dashboard"
      subtitle="Overview of your AI marketing team campaign"
    >
      {/* Health banner */}
      <div className={`rounded-xl p-4 mb-6 flex items-center gap-4 border ${
        health === "green"  ? "bg-green-50 border-green-200"  :
        health === "yellow" ? "bg-yellow-50 border-yellow-200" :
        health === "red"    ? "bg-red-50 border-red-200"      :
        "bg-gray-50 border-gray-200"
      }`}>
        {health ? (
          health === "red" ? <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          : <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
        ) : (
          <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">Campaign Health</span>
            <HealthBadge health={health} />
          </div>
          {summary && <p className="text-sm text-gray-600 mt-0.5">{summary}</p>}
          {!summary && <p className="text-sm text-gray-400 mt-0.5">Run the Analytics Agent to see your campaign health.</p>}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Total Impressions"
          value={kpis ? formatNumber(kpis.total_impressions) : "—"}
          icon={TrendingUp}
        />
        <KpiCard
          label="Total Engagements"
          value={kpis ? formatNumber(kpis.total_engagements) : "—"}
          icon={Share2}
        />
        <KpiCard
          label="Avg Engagement Rate"
          value={kpis?.avg_engagement_rate ?? "—"}
          icon={Zap}
        />
        <KpiCard
          label="Email Open Rate"
          value={kpis?.avg_open_rate ?? "—"}
          icon={Mail}
        />
      </div>

      {/* Bottom two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Pipeline status */}
        <Card>
          <CardTitle>Agent Pipeline</CardTitle>
          <div className="divide-y divide-gray-50">
            {PIPELINE_STEPS.map((step, i) => (
              <PipelineStep key={step.key} step={step} index={i} done={!!done[step.key]} />
            ))}
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          {/* Recent activity */}
          <Card>
            <CardTitle>Recent Activity</CardTitle>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-gray-400">No activity yet. Run the Social Media Agent to see posts here.</p>
            ) : (
              recentActivity.map((entry, i) => (
                <ActivityItem key={i} entry={entry} />
              ))
            )}
          </Card>

          {/* Recommendations */}
          <Card>
            <CardTitle>AI Recommendations</CardTitle>
            {recommendations.length === 0 ? (
              <p className="text-sm text-gray-400">Run the Analytics Agent to get recommendations.</p>
            ) : (
              <ol className="space-y-2">
                {recommendations.map((rec, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-gray-700">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    {rec}
                  </li>
                ))}
              </ol>
            )}
          </Card>

          {/* Saved documents */}
          <SavedDocuments />
        </div>
      </div>
    </PageLayout>
  );
}
