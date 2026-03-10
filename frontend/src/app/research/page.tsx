"use client";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Users, TrendingUp, Search, BarChart2, Radio,
  Clock, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, ArrowRight,
  Save, Download,
} from "lucide-react";
import Link from "next/link";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { getFlowContext, setFlowContext } from "@/lib/flowContext";
import { downloadResearchReport } from "@/lib/exportHtml";

// --- Types ---
interface ResearchRequest {
  product_name: string;
  category: string;
  target_audience: string;
  campaign_goal: string;
  channels: string[];
}

interface AudienceProfile {
  demographics: string;
  psychographics: string;
  online_behavior: string;
  language_patterns: string[];
}

interface SeoStrategy {
  primary_keywords: string[];
  long_tail_keywords: string[];
  content_topics: string[];
}

interface TrendInsights {
  rising_trends: string[];
  seasonal_patterns: string;
  viral_content_formats: string[];
}

interface CompetitorContentAnalysis {
  what_works: string[];
  gaps: string[];
}

interface ChannelRecommendations {
  priority_channels: string[];
  posting_frequency: Record<string, string>;
  best_posting_times: Record<string, string>;
}

interface ResearchReport {
  product_name: string;
  generated_at: string;
  audience_profile: AudienceProfile;
  seo_strategy: SeoStrategy;
  trend_insights: TrendInsights;
  competitor_content_analysis: CompetitorContentAnalysis;
  channel_recommendations: ChannelRecommendations;
  campaign_angles: string[];
}

// --- Constants ---
const ALL_CHANNELS = ["instagram", "tiktok", "linkedin", "twitter", "blog", "email"];

const CHANNEL_COLORS: Record<string, string> = {
  instagram: "bg-pink-100 text-pink-700 border-pink-200",
  tiktok:    "bg-gray-900 text-white border-gray-700",
  linkedin:  "bg-blue-100 text-blue-700 border-blue-200",
  twitter:   "bg-sky-100 text-sky-700 border-sky-200",
  blog:      "bg-orange-100 text-orange-700 border-orange-200",
  email:     "bg-purple-100 text-purple-700 border-purple-200",
};

// --- Sub-components ---

function FormInput({
  label, value, onChange, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
      />
    </div>
  );
}

function ChannelToggle({
  channels, selected, onChange,
}: {
  channels: string[]; selected: string[]; onChange: (v: string[]) => void;
}) {
  const toggle = (ch: string) =>
    onChange(selected.includes(ch) ? selected.filter((c) => c !== ch) : [...selected, ch]);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Channels</label>
      <div className="flex flex-wrap gap-2">
        {channels.map((ch) => {
          const active = selected.includes(ch);
          return (
            <button
              key={ch}
              onClick={() => toggle(ch)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors capitalize ${
                active ? CHANNEL_COLORS[ch] : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
              }`}
            >
              {ch}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CollapsibleSection({
  icon: Icon, title, children, defaultOpen = true,
}: {
  icon: React.ElementType; title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="p-0 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
          <Icon className="w-3.5 h-3.5 text-brand-600" />
        </div>
        <span className="text-sm font-semibold text-gray-800 flex-1 text-left">{title}</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-400" />
          : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </Card>
  );
}

function ChipList({
  items, color = "grey",
}: {
  items: string[]; color?: string;
}) {
  const colors: Record<string, string> = {
    blue:   "bg-blue-50 text-blue-700 border-blue-100",
    green:  "bg-green-50 text-green-700 border-green-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
    orange: "bg-orange-50 text-orange-700 border-orange-100",
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

function BulletList({ items, icon = "dot" }: { items: string[]; icon?: "dot" | "arrow" | "check" }) {
  const icons = { dot: "•", arrow: "→", check: "✓" };
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm text-gray-700">
          <span className="text-gray-400 flex-shrink-0 mt-0.5">{icons[icon]}</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function ChannelTable({ report }: { report: ResearchReport }) {
  const { priority_channels = [], posting_frequency = {}, best_posting_times = {} } = report.channel_recommendations ?? {};
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Priority</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Channel</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Frequency</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Best Time</th>
          </tr>
        </thead>
        <tbody>
          {priority_channels.map((ch, i) => (
            <tr key={ch} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="py-2.5 px-3">
                <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold inline-flex items-center justify-center">
                  {i + 1}
                </span>
              </td>
              <td className="py-2.5 px-3">
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium capitalize ${CHANNEL_COLORS[ch] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                  {ch}
                </span>
              </td>
              <td className="py-2.5 px-3 text-gray-600">{posting_frequency?.[ch] ?? "—"}</td>
              <td className="py-2.5 px-3 text-gray-600">{best_posting_times?.[ch] ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- Main page ---
export default function ResearchPage() {
  const [form, setForm] = useState<ResearchRequest>({
    product_name: "",
    category: "",
    target_audience: "",
    campaign_goal: "",
    channels: ["instagram", "tiktok", "linkedin", "twitter", "blog", "email"],
  });
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!report) return;
    const existing = JSON.parse(localStorage.getItem("saved_research_reports") ?? "[]");
    const entry = { ...report, saved_at: new Date().toISOString() };
    const idx = existing.findIndex((r: any) => r.product_name === report.product_name);
    if (idx >= 0) existing[idx] = entry; else existing.unshift(entry);
    localStorage.setItem("saved_research_reports", JSON.stringify(existing.slice(0, 10)));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  useEffect(() => {
    const ctx = getFlowContext();
    if (ctx.product_name || ctx.category) {
      setForm((f) => ({
        ...f,
        product_name: ctx.product_name ?? f.product_name,
        category: ctx.category ?? f.category,
        target_audience: ctx.target_audience ?? f.target_audience,
      }));
      setPrefilled(true);
    }
  }, []);

  const mutation = useMutation({
    mutationFn: (data: ResearchRequest) => api.post("/research", data).then((r) => r.data),
    onSuccess: (data) => {
      setReport(data);
      setFlowContext({ campaign_goal: form.campaign_goal, channels: form.channels });
    },
  });

  return (
    <PageLayout
      title="Research"
      subtitle="Deep-dive into audience behavior, SEO keywords, trends, and competitor content strategy."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Form */}
        <div className="lg:col-span-1">
          <Card>
            <CardTitle>Research Brief</CardTitle>
            <div className="space-y-4">
              {prefilled && (
                <div className="flex items-center gap-2 text-xs text-brand-700 bg-brand-50 border border-brand-100 px-3 py-2 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  Pre-filled from Market Intelligence. Review and adjust if needed.
                </div>
              )}
              <FormInput label="Product Name" value={form.product_name}
                onChange={(v) => setForm({ ...form, product_name: v })}
                placeholder="e.g. Flo Hydration Tracker" />
              <FormInput label="Category" value={form.category}
                onChange={(v) => setForm({ ...form, category: v })}
                placeholder="e.g. fitness apps, skincare" />
              <FormInput label="Target Audience" value={form.target_audience}
                onChange={(v) => setForm({ ...form, target_audience: v })}
                placeholder="e.g. 18-35 active adults" />
              <FormInput label="Campaign Goal" value={form.campaign_goal}
                onChange={(v) => setForm({ ...form, campaign_goal: v })}
                placeholder="e.g. brand awareness, app downloads" />
              <ChannelToggle
                channels={ALL_CHANNELS}
                selected={form.channels}
                onChange={(v) => setForm({ ...form, channels: v })}
              />

              <Button
                onClick={() => mutation.mutate(form)}
                loading={mutation.isPending}
                disabled={!form.product_name || !form.category || form.channels.length === 0}
                className="w-full mt-2"
              >
                <Search className="w-4 h-4" />
                {mutation.isPending ? "Researching..." : "Run Research"}
              </Button>

              {mutation.isError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Research failed. Check your API keys.
                </div>
              )}
              {mutation.isSuccess && (
                <>
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    Research complete.
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSave}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 hover:border-brand-400 hover:text-brand-600 transition-colors">
                      <Save className="w-3.5 h-3.5" />{saved ? "Saved!" : "Save"}
                    </button>
                    <button onClick={() => report && downloadResearchReport(report)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 hover:border-brand-400 hover:text-brand-600 transition-colors">
                      <Download className="w-3.5 h-3.5" />Download
                    </button>
                  </div>
                  <Link href="/strategy">
                    <button className="w-full flex items-center justify-between px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors">
                      <span>Continue to Strategy</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-2 space-y-4">

          {!report && !mutation.isPending && (
            <div className="flex flex-col items-center justify-center h-64 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
              <BarChart2 className="w-10 h-10 mb-3 text-gray-300" />
              <p className="text-sm font-medium">Research results will appear here</p>
              <p className="text-xs mt-1">Fill in the form and run the agent</p>
            </div>
          )}

          {mutation.isPending && (
            <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-gray-200 bg-white">
              <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mb-4" />
              <p className="text-sm font-medium text-gray-600">Running research across Google Trends, SEO, and content analysis...</p>
              <p className="text-xs mt-1 text-gray-400">This may take 20-30 seconds</p>
            </div>
          )}

          {report && (
            <>
              {/* Audience Profile */}
              <CollapsibleSection icon={Users} title="Audience Profile">
                <div className="space-y-3">
                  {[
                    { label: "Demographics", value: report.audience_profile?.demographics },
                    { label: "Psychographics", value: report.audience_profile?.psychographics },
                    { label: "Online Behavior", value: report.audience_profile?.online_behavior },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                      <p className="text-sm text-gray-700">{value}</p>
                    </div>
                  ))}
                  {report.audience_profile?.language_patterns?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Language Patterns</p>
                      <ChipList items={report.audience_profile.language_patterns} color="purple" />
                    </div>
                  )}
                </div>
              </CollapsibleSection>

              {/* SEO Strategy */}
              <CollapsibleSection icon={Search} title="SEO Strategy">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Primary Keywords</p>
                    <ChipList items={report.seo_strategy?.primary_keywords ?? []} color="blue" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Long-tail Keywords</p>
                    <ChipList items={report.seo_strategy?.long_tail_keywords ?? []} color="grey" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Content Topic Ideas</p>
                    <BulletList items={report.seo_strategy?.content_topics ?? []} icon="arrow" />
                  </div>
                </div>
              </CollapsibleSection>

              {/* Trend Insights */}
              <CollapsibleSection icon={TrendingUp} title="Trend Insights">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Rising Trends</p>
                    <ChipList items={report.trend_insights?.rising_trends ?? []} color="orange" />
                  </div>
                  {report.trend_insights?.seasonal_patterns && (
                    <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg">
                      <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1">Seasonal Patterns</p>
                      <p className="text-sm text-gray-700">{report.trend_insights.seasonal_patterns}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Viral Content Formats</p>
                    <ChipList items={report.trend_insights?.viral_content_formats ?? []} color="purple" />
                  </div>
                </div>
              </CollapsibleSection>

              {/* Competitor Content Analysis */}
              <CollapsibleSection icon={BarChart2} title="Competitor Content Analysis">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">What Works for Competitors</p>
                    <BulletList items={report.competitor_content_analysis?.what_works ?? []} icon="check" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-2">Content Gaps We Can Own</p>
                    <BulletList items={report.competitor_content_analysis?.gaps ?? []} icon="arrow" />
                  </div>
                </div>
              </CollapsibleSection>

              {/* Channel Recommendations */}
              <CollapsibleSection icon={Radio} title="Channel Recommendations">
                <ChannelTable report={report} />
              </CollapsibleSection>

              {/* Campaign Angles */}
              <CollapsibleSection icon={Clock} title="Campaign Angles">
                <div className="space-y-2">
                  {report.campaign_angles?.map((angle, i) => (
                    <div key={i} className="flex gap-3 p-3 bg-brand-50 border border-brand-100 rounded-lg">
                      <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-sm text-gray-800">{angle}</p>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
