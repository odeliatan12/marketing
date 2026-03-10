"use client";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BarChart3, TrendingUp, Mail, Share2, Zap,
  AlertCircle, CheckCircle2, ThumbsUp, ThumbsDown,
  ChevronDown, ChevronUp,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

// --- Types ---
interface AnalyticsRequest {
  days_back: number;
  dry_run: boolean;
}

interface PostMetric {
  platform: string;
  post_id: string;
  date: string;
  topic: string;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  saves: number;
  engagement_rate: number;
}

interface EmailMetric {
  campaign_id: string;
  subject: string;
  date: string;
  sends: number;
  opens: number;
  clicks: number;
  unsubscribes: number;
  bounces: number;
  open_rate: number;
  click_rate: number;
}

interface Insights {
  overall_health: "green" | "yellow" | "red";
  summary: string;
  top_performing_posts: { platform: string; topic: string; why: string }[];
  underperforming_posts: { platform: string; topic: string; why: string; recommendation: string }[];
  platform_insights: Record<string, { avg_engagement_rate: string; best_performing_format: string; insight: string }>;
  email_insights: { avg_open_rate: string; avg_click_rate: string; best_subject_line: string; insight: string };
  recommendations: string[];
  kpi_summary: {
    total_impressions: number;
    total_engagements: number;
    avg_engagement_rate: string;
    total_email_sends: number;
    avg_open_rate: string;
  };
}

interface AnalyticsReport {
  generated_at: string;
  period_days: number;
  dry_run: boolean;
  raw_metrics: {
    twitter: PostMetric[];
    instagram: PostMetric[];
    linkedin: PostMetric[];
    email: EmailMetric[];
  };
  insights: Insights;
}

// --- Constants ---
const PLATFORM_COLORS: Record<string, string> = {
  twitter:   "#0ea5e9",
  instagram: "#ec4899",
  linkedin:  "#3b82f6",
};

const DAYS_OPTIONS = [7, 14, 30];

// --- Sub-components ---

function KpiCard({ label, value, icon: Icon, sub }: {
  label: string; value: string; icon: React.ElementType; sub?: string;
}) {
  return (
    <Card className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-brand-600" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium truncate">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value || "—"}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </Card>
  );
}

function HealthBanner({ health, summary }: { health?: string; summary?: string }) {
  const config: Record<string, { bg: string; border: string; text: string; label: string }> = {
    green:  { bg: "bg-green-50",  border: "border-green-200",  text: "text-green-800",  label: "Healthy" },
    yellow: { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-800", label: "Needs Attention" },
    red:    { bg: "bg-red-50",    border: "border-red-200",    text: "text-red-800",    label: "Critical" },
  };
  const c = config[health ?? ""] ?? { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700", label: "No data" };
  return (
    <div className={`rounded-xl p-4 border ${c.bg} ${c.border} flex items-start gap-3`}>
      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
        health === "green" ? "bg-green-500" : health === "yellow" ? "bg-yellow-400" : health === "red" ? "bg-red-500" : "bg-gray-400"
      }`} />
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-sm font-bold ${c.text}`}>Campaign Health: {c.label}</span>
        </div>
        {summary && <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>}
      </div>
    </div>
  );
}

function ImpressionsChart({ metrics }: { metrics: Record<string, PostMetric[]> }) {
  // Build date-keyed data combining all platforms
  const dateMap: Record<string, Record<string, number>> = {};
  Object.entries(metrics).forEach(([platform, items]) => {
    items.forEach((m) => {
      if (!dateMap[m.date]) dateMap[m.date] = {};
      dateMap[m.date][platform] = (dateMap[m.date][platform] ?? 0) + m.impressions;
    });
  });

  const data = Object.entries(dateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date: date.slice(5), ...vals }));

  if (!data.length) return <p className="text-sm text-gray-400 py-4">No data available.</p>;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => formatNumber(v)} />
        <Tooltip formatter={(v: number) => formatNumber(v)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {Object.keys(PLATFORM_COLORS).map((platform) => (
          <Line key={platform} type="monotone" dataKey={platform}
            stroke={PLATFORM_COLORS[platform]} strokeWidth={2}
            dot={false} name={platform.charAt(0).toUpperCase() + platform.slice(1)} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function EngagementChart({ metrics }: { metrics: PostMetric[] }) {
  const data = metrics.slice(0, 10).map((m) => ({
    topic: m.topic?.slice(0, 20) ?? "—",
    rate: m.engagement_rate,
    platform: m.platform,
  }));

  if (!data.length) return <p className="text-sm text-gray-400 py-4">No data.</p>;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="topic" tick={{ fontSize: 10, fill: "#94a3b8" }} angle={-30} textAnchor="end" interval={0} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `${v}%`} />
        <Tooltip formatter={(v: number) => `${v}%`} />
        <Bar dataKey="rate" fill="#4357ff" radius={[4, 4, 0, 0]} name="Engagement Rate" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function EmailChart({ metrics }: { metrics: EmailMetric[] }) {
  const data = metrics.map((m) => ({
    subject: (m.subject ?? "").slice(0, 18),
    open_rate: m.open_rate,
    click_rate: m.click_rate,
  }));

  if (!data.length) return <p className="text-sm text-gray-400 py-4">No email data.</p>;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="subject" tick={{ fontSize: 10, fill: "#94a3b8" }} angle={-30} textAnchor="end" interval={0} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `${v}%`} />
        <Tooltip formatter={(v: number) => `${v}%`} />
        <Bar dataKey="open_rate"  fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Open Rate" />
        <Bar dataKey="click_rate" fill="#a78bfa" radius={[4, 4, 0, 0]} name="Click Rate" />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function MetricsTable({ metrics }: { metrics: PostMetric[] }) {
  if (!metrics.length) return <p className="text-sm text-gray-400 py-4 text-center">No data.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {["Date", "Topic", "Impressions", "Likes", "Comments", "Shares", "Clicks", "Eng. Rate"].map((h) => (
              <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map((m, i) => (
            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
              <td className="py-2 px-3 text-gray-500 text-xs whitespace-nowrap">{m.date}</td>
              <td className="py-2 px-3 text-gray-800 max-w-[160px] truncate">{m.topic || "—"}</td>
              <td className="py-2 px-3 text-gray-600">{formatNumber(m.impressions)}</td>
              <td className="py-2 px-3 text-gray-600">{formatNumber(m.likes)}</td>
              <td className="py-2 px-3 text-gray-600">{formatNumber(m.comments)}</td>
              <td className="py-2 px-3 text-gray-600">{formatNumber(m.shares)}</td>
              <td className="py-2 px-3 text-gray-600">{formatNumber(m.clicks)}</td>
              <td className="py-2 px-3">
                <Badge
                  label={`${m.engagement_rate}%`}
                  variant={m.engagement_rate >= 3 ? "green" : m.engagement_rate >= 1 ? "yellow" : "red"}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlatformInsightCard({ platform, insight }: {
  platform: string;
  insight: { avg_engagement_rate: string; best_performing_format: string; insight: string };
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold capitalize text-gray-800">{platform}</span>
          <Badge label={insight.avg_engagement_rate} variant="blue" />
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-2 border-t border-gray-100 pt-3">
          <p className="text-xs text-gray-500">
            <span className="font-semibold text-gray-700">Best format:</span> {insight.best_performing_format}
          </p>
          <p className="text-sm text-gray-700">{insight.insight}</p>
        </div>
      )}
    </div>
  );
}

// --- Main page ---
export default function AnalyticsPage() {
  const [config, setConfig] = useState<AnalyticsRequest>({ days_back: 7, dry_run: true });
  const [platformTab, setPlatformTab] = useState<"twitter" | "instagram" | "linkedin" | "email">("twitter");

  const runMutation = useMutation({
    mutationFn: (data: AnalyticsRequest) =>
      api.post("/analytics/run", data).then((r) => r.data),
    onSuccess: () => reportQuery.refetch(),
  });

  const reportQuery = useQuery({
    queryKey: ["analytics-report"],
    queryFn: () => api.get("/analytics/report").then((r) => r.data as AnalyticsReport).catch(() => null),
  });

  const report: AnalyticsReport | null = reportQuery.data ?? null;
  const insights: Insights | null = report?.insights ?? null;
  const kpis = insights?.kpi_summary;
  const rawMetrics = report?.raw_metrics;

  const allPostMetrics: PostMetric[] = [
    ...(rawMetrics?.twitter ?? []),
    ...(rawMetrics?.instagram ?? []),
    ...(rawMetrics?.linkedin ?? []),
  ];

  return (
    <PageLayout
      title="Analytics"
      subtitle="Pull live metrics from all platforms, store them, and get AI-generated campaign insights."
    >
      <div className="space-y-6">

        {/* Run controls */}
        <Card>
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Days Back</label>
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                {DAYS_OPTIONS.map((d) => (
                  <button key={d} onClick={() => setConfig({ ...config, days_back: d })}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      config.days_back === d ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}>
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
              <input type="checkbox" checked={config.dry_run}
                onChange={(e) => setConfig({ ...config, dry_run: e.target.checked })}
                className="mt-0.5 accent-brand-600" />
              <div>
                <p className="text-sm font-medium text-gray-800">Dry Run</p>
                <p className="text-xs text-gray-500 mt-0.5">Use mock data instead of live API calls</p>
              </div>
            </label>

            <div className="flex flex-col gap-2">
              <Button onClick={() => runMutation.mutate(config)} loading={runMutation.isPending}>
                <BarChart3 className="w-4 h-4" />
                {runMutation.isPending ? "Pulling metrics..." : "Pull Metrics"}
              </Button>
              {runMutation.isSuccess && (
                <span className="flex items-center gap-1.5 text-xs text-green-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Metrics updated
                </span>
              )}
              {runMutation.isError && (
                <span className="flex items-center gap-1.5 text-xs text-red-600">
                  <AlertCircle className="w-3.5 h-3.5" /> Failed to pull metrics
                </span>
              )}
            </div>
          </div>
        </Card>

        {!report && !reportQuery.isLoading && (
          <div className="flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
            <BarChart3 className="w-10 h-10 mb-3 text-gray-300" />
            <p className="text-sm font-medium">No analytics data yet</p>
            <p className="text-xs mt-1">Click "Pull Metrics" to run the Analytics Agent</p>
          </div>
        )}

        {reportQuery.isLoading && (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full" />
          </div>
        )}

        {report && insights && (
          <>
            {/* Health banner */}
            <HealthBanner health={insights.overall_health} summary={insights.summary} />

            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <KpiCard label="Total Impressions"    value={kpis ? formatNumber(kpis.total_impressions) : "—"}   icon={TrendingUp} />
              <KpiCard label="Total Engagements"    value={kpis ? formatNumber(kpis.total_engagements) : "—"}   icon={Share2} />
              <KpiCard label="Avg Engagement Rate"  value={kpis?.avg_engagement_rate ?? "—"}                    icon={Zap} />
              <KpiCard label="Email Sends"          value={kpis ? formatNumber(kpis.total_email_sends) : "—"}   icon={Mail} />
              <KpiCard label="Avg Open Rate"        value={kpis?.avg_open_rate ?? "—"}                          icon={Mail} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardTitle>Impressions Over Time</CardTitle>
                <ImpressionsChart metrics={{
                  twitter:   rawMetrics?.twitter ?? [],
                  instagram: rawMetrics?.instagram ?? [],
                  linkedin:  rawMetrics?.linkedin ?? [],
                }} />
              </Card>
              <Card>
                <CardTitle>Engagement Rate by Post</CardTitle>
                <EngagementChart metrics={allPostMetrics} />
              </Card>
            </div>

            {/* Platform metrics table */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <CardTitle>Platform Metrics</CardTitle>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                  {(["twitter", "instagram", "linkedin", "email"] as const).map((p) => (
                    <button key={p} onClick={() => setPlatformTab(p)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
                        platformTab === p ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                      }`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              {platformTab === "email" ? (
                <EmailChart metrics={rawMetrics?.email ?? []} />
              ) : (
                <MetricsTable metrics={rawMetrics?.[platformTab] ?? []} />
              )}
            </Card>

            {/* AI Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Top performing */}
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <ThumbsUp className="w-4 h-4 text-green-500" />
                  <CardTitle>Top Performing</CardTitle>
                </div>
                <div className="space-y-2">
                  {insights.top_performing_posts?.map((p, i) => (
                    <div key={i} className="p-3 bg-green-50 border border-green-100 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge label={p.platform} variant="green" />
                        <p className="text-sm font-semibold text-gray-800 truncate">{p.topic}</p>
                      </div>
                      <p className="text-xs text-gray-600">{p.why}</p>
                    </div>
                  ))}
                  {!insights.top_performing_posts?.length && (
                    <p className="text-sm text-gray-400">No top performers identified yet.</p>
                  )}
                </div>
              </Card>

              {/* Underperforming */}
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <ThumbsDown className="w-4 h-4 text-red-400" />
                  <CardTitle>Needs Improvement</CardTitle>
                </div>
                <div className="space-y-2">
                  {insights.underperforming_posts?.map((p, i) => (
                    <div key={i} className="p-3 bg-red-50 border border-red-100 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge label={p.platform} variant="red" />
                        <p className="text-sm font-semibold text-gray-800 truncate">{p.topic}</p>
                      </div>
                      <p className="text-xs text-gray-500 mb-1">{p.why}</p>
                      <p className="text-xs text-brand-700 font-medium">→ {p.recommendation}</p>
                    </div>
                  ))}
                  {!insights.underperforming_posts?.length && (
                    <p className="text-sm text-gray-400">No underperformers identified.</p>
                  )}
                </div>
              </Card>
            </div>

            {/* Platform insights + Email insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardTitle>Platform Insights</CardTitle>
                <div className="space-y-2">
                  {Object.entries(insights.platform_insights ?? {}).map(([platform, insight]) => (
                    <PlatformInsightCard key={platform} platform={platform} insight={insight} />
                  ))}
                  {!Object.keys(insights.platform_insights ?? {}).length && (
                    <p className="text-sm text-gray-400">No platform insights yet.</p>
                  )}
                </div>
              </Card>

              <div className="space-y-4">
                {/* Email insights */}
                <Card>
                  <CardTitle>Email Insights</CardTitle>
                  {insights.email_insights ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-center">
                          <p className="text-xl font-bold text-purple-700">{insights.email_insights.avg_open_rate}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Avg Open Rate</p>
                        </div>
                        <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-center">
                          <p className="text-xl font-bold text-purple-700">{insights.email_insights.avg_click_rate}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Avg Click Rate</p>
                        </div>
                      </div>
                      {insights.email_insights.best_subject_line && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Best Subject Line</p>
                          <p className="text-sm text-gray-800 italic">"{insights.email_insights.best_subject_line}"</p>
                        </div>
                      )}
                      <p className="text-sm text-gray-700">{insights.email_insights.insight}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No email data yet.</p>
                  )}
                </Card>

                {/* Recommendations */}
                <Card>
                  <CardTitle>Recommendations</CardTitle>
                  <ol className="space-y-2">
                    {insights.recommendations?.map((rec, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-gray-700">
                        <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {rec}
                      </li>
                    ))}
                  </ol>
                </Card>
              </div>
            </div>

            <p className="text-xs text-gray-400 text-right">
              Report generated: {report.generated_at?.slice(0, 16).replace("T", " ")} UTC
              {report.dry_run && " (dry run — mock data)"}
            </p>
          </>
        )}
      </div>
    </PageLayout>
  );
}
