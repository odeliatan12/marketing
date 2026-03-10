"use client";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  CalendarDays, Target, Layers, Hash, DollarSign,
  AlertCircle, CheckCircle2, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, Clock, ArrowRight, Save, Download,
} from "lucide-react";
import Link from "next/link";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api";
import { getFlowContext } from "@/lib/flowContext";
import { downloadStrategyBrief } from "@/lib/exportHtml";
import { addDays, format, startOfWeek, eachDayOfInterval } from "date-fns";

// --- Types ---
interface StrategyRequest {
  campaign_name: string;
  campaign_goal: string;
  duration_days: number;
  budget_tier: string;
  channels: string[];
}

interface CampaignAngle {
  angle: string;
  description: string;
  channels: string[];
}

interface ContentPillar {
  pillar: string;
  description: string;
  percentage: string;
}

interface ChannelKpis {
  primary: string;
  targets: Record<string, string>;
}

interface ChannelStrategy {
  role: string;
  content_types: string[];
  posting_frequency: string;
  primary_cta: string;
  kpis: ChannelKpis;
}

interface CalendarItem {
  date: string;
  channel: string;
  content_pillar: string;
  format: string;
  angle: string;
  topic: string;
  caption_brief: string;
  visual_brief: string;
  hashtags: string[];
  cta: string;
}

interface CampaignBrief {
  campaign_name: string;
  campaign_goal: string;
  target_audience_summary: string;
  core_message: string;
  campaign_angles: CampaignAngle[];
  content_pillars: ContentPillar[];
  channel_strategy: Record<string, ChannelStrategy>;
  hashtag_strategy: { branded: string[]; campaign: string[]; community: string[] };
  key_dates: { date_offset_days: number; event: string; action: string }[];
  budget_allocation: Record<string, string>;
  success_metrics: Record<string, string>;
}

interface StrategyResult {
  campaign_brief: CampaignBrief;
  content_calendar_items: number;
  content_calendar_preview: CalendarItem[];
}

// --- Constants ---
const ALL_CHANNELS = ["instagram", "tiktok", "linkedin", "twitter", "blog", "email"];
const DURATION_OPTIONS = [7, 14, 30, 60];
const BUDGET_TIERS = ["low", "medium", "high"];

const CHANNEL_COLORS: Record<string, string> = {
  instagram: "bg-pink-500",
  tiktok:    "bg-gray-900",
  linkedin:  "bg-blue-600",
  twitter:   "bg-sky-500",
  blog:      "bg-orange-500",
  email:     "bg-purple-600",
};

const CHANNEL_LIGHT: Record<string, string> = {
  instagram: "bg-pink-50 text-pink-700 border-pink-200",
  tiktok:    "bg-gray-100 text-gray-700 border-gray-300",
  linkedin:  "bg-blue-50 text-blue-700 border-blue-200",
  twitter:   "bg-sky-50 text-sky-700 border-sky-200",
  blog:      "bg-orange-50 text-orange-700 border-orange-200",
  email:     "bg-purple-50 text-purple-700 border-purple-200",
};

// --- Sub-components ---

function FormInput({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
    </div>
  );
}

function ChannelToggle({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const toggle = (ch: string) =>
    onChange(selected.includes(ch) ? selected.filter((c) => c !== ch) : [...selected, ch]);
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Channels</label>
      <div className="flex flex-wrap gap-2">
        {ALL_CHANNELS.map((ch) => {
          const active = selected.includes(ch);
          return (
            <button key={ch} onClick={() => toggle(ch)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors capitalize ${
                active ? CHANNEL_LIGHT[ch] : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
              }`}>
              {ch}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Collapsible({ icon: Icon, title, children, defaultOpen = true }: {
  icon: React.ElementType; title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="p-0 overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors">
        <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
          <Icon className="w-3.5 h-3.5 text-brand-600" />
        </div>
        <span className="text-sm font-semibold text-gray-800 flex-1 text-left">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </Card>
  );
}

// --- Content Calendar ---
function ContentCalendar({ items, startDate }: { items: CalendarItem[]; startDate: Date }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selected, setSelected] = useState<CalendarItem | null>(null);

  const weekStart = startOfWeek(addDays(startDate, weekOffset * 7), { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  const itemsByDate: Record<string, CalendarItem[]> = {};
  items.forEach((item) => {
    if (!itemsByDate[item.date]) itemsByDate[item.date] = [];
    itemsByDate[item.date].push(item);
  });

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setWeekOffset(weekOffset - 1)}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        <span className="text-sm font-semibold text-gray-700">
          {format(weekStart, "MMM d")} — {format(addDays(weekStart, 6), "MMM d, yyyy")}
        </span>
        <button onClick={() => setWeekOffset(weekOffset + 1)}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {weekDays.map((day) => (
          <div key={day.toString()} className="text-center">
            <p className="text-xs font-semibold text-gray-400 uppercase">{format(day, "EEE")}</p>
            <p className={`text-sm font-bold mt-0.5 w-7 h-7 mx-auto rounded-full flex items-center justify-center ${
              format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
                ? "bg-brand-600 text-white"
                : "text-gray-700"
            }`}>
              {format(day, "d")}
            </p>
          </div>
        ))}

        {/* Day cells */}
        {weekDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayItems = itemsByDate[dateStr] ?? [];
          return (
            <div key={dateStr} className="min-h-24 bg-gray-50 rounded-lg p-1 space-y-1">
              {dayItems.map((item, i) => (
                <button key={i} onClick={() => setSelected(item === selected ? null : item)}
                  className={`w-full text-left p-1.5 rounded text-xs font-medium transition-colors truncate flex items-center gap-1 ${
                    selected === item ? "ring-2 ring-brand-500" : ""
                  }`}
                  style={{ backgroundColor: `${CHANNEL_COLORS[item.channel]}20` }}>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${CHANNEL_COLORS[item.channel]}`} />
                  <span className="truncate text-gray-700">{item.topic}</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {/* Selected item detail drawer */}
      {selected && (
        <div className="mt-4 p-4 bg-white border border-brand-200 rounded-xl shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${CHANNEL_LIGHT[selected.channel] ?? ""}`}>
                  {selected.channel}
                </span>
                <Badge label={selected.format} variant="grey" />
                <span className="text-xs text-gray-400">{selected.date}</span>
              </div>
              <p className="text-sm font-semibold text-gray-900">{selected.topic}</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Caption Brief</p>
              <p className="text-gray-700">{selected.caption_brief}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Visual Brief</p>
              <p className="text-gray-700">{selected.visual_brief}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">CTA</p>
              <p className="text-gray-700">{selected.cta}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Hashtags</p>
              <div className="flex flex-wrap gap-1">
                {selected.hashtags?.map((h, i) => (
                  <span key={i} className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded">{h}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Channel legend */}
      <div className="flex flex-wrap gap-3 mt-4">
        {ALL_CHANNELS.map((ch) => (
          <div key={ch} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${CHANNEL_COLORS[ch]}`} />
            <span className="text-xs text-gray-500 capitalize">{ch}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Main page ---
export default function StrategyPage() {
  const [form, setForm] = useState<StrategyRequest>({
    campaign_name: "",
    campaign_goal: "",
    duration_days: 14,
    budget_tier: "low",
    channels: ["instagram", "tiktok", "linkedin", "email"],
  });
  const [result, setResult] = useState<StrategyResult | null>(null);
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  const [activeTab, setActiveTab] = useState<"brief" | "calendar">("brief");
  const [prefilled, setPrefilled] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!result) return;
    const existing = JSON.parse(localStorage.getItem("saved_strategies") ?? "[]");
    const entry = { ...result.campaign_brief, calendar_items: calendarItems, saved_at: new Date().toISOString() };
    const idx = existing.findIndex((s: any) => s.campaign_name === result.campaign_brief.campaign_name);
    if (idx >= 0) existing[idx] = entry; else existing.unshift(entry);
    localStorage.setItem("saved_strategies", JSON.stringify(existing.slice(0, 10)));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  useEffect(() => {
    const ctx = getFlowContext();
    if (ctx.brand_name || ctx.campaign_goal) {
      setForm((f) => ({
        ...f,
        campaign_name: ctx.brand_name ? `${ctx.brand_name} Launch Campaign` : f.campaign_name,
        campaign_goal: ctx.campaign_goal ?? f.campaign_goal,
        channels: ctx.channels && ctx.channels.length > 0 ? ctx.channels : f.channels,
      }));
      setPrefilled(true);
    }
  }, []);

  const mutation = useMutation({
    mutationFn: (data: StrategyRequest) => api.post("/strategy", data).then((r) => r.data),
    onSuccess: (data: StrategyResult) => {
      setResult(data);
      setCalendarItems(data.content_calendar_preview ?? []);
      setActiveTab("brief");
    },
  });

  const brief = result?.campaign_brief;

  return (
    <PageLayout
      title="Strategy"
      subtitle="Build your campaign plan and generate a day-by-day content calendar."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Form */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardTitle>Campaign Setup</CardTitle>
            <div className="space-y-4">
              {prefilled && (
                <div className="flex items-center gap-2 text-xs text-brand-700 bg-brand-50 border border-brand-100 px-3 py-2 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  Pre-filled from your brand and research. Review and adjust if needed.
                </div>
              )}
              <FormInput label="Campaign Name" value={form.campaign_name}
                onChange={(v) => setForm({ ...form, campaign_name: v })}
                placeholder="e.g. Flo Launch Campaign" />
              <FormInput label="Campaign Goal" value={form.campaign_goal}
                onChange={(v) => setForm({ ...form, campaign_goal: v })}
                placeholder="e.g. brand awareness, app downloads" />

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
                <div className="flex gap-2">
                  {DURATION_OPTIONS.map((d) => (
                    <button key={d} onClick={() => setForm({ ...form, duration_days: d })}
                      className={`flex-1 py-1.5 text-sm rounded-lg border font-medium transition-colors ${
                        form.duration_days === d
                          ? "bg-brand-600 text-white border-brand-600"
                          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                      }`}>
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget tier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Budget Tier</label>
                <div className="flex gap-2">
                  {BUDGET_TIERS.map((tier) => (
                    <button key={tier} onClick={() => setForm({ ...form, budget_tier: tier })}
                      className={`flex-1 py-1.5 text-sm rounded-lg border font-medium transition-colors capitalize ${
                        form.budget_tier === tier
                          ? "bg-brand-600 text-white border-brand-600"
                          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                      }`}>
                      {tier}
                    </button>
                  ))}
                </div>
              </div>

              <ChannelToggle
                selected={form.channels}
                onChange={(v) => setForm({ ...form, channels: v })}
              />

              <Button
                onClick={() => mutation.mutate(form)}
                loading={mutation.isPending}
                disabled={!form.campaign_name || !form.campaign_goal || form.channels.length === 0}
                className="w-full mt-2"
              >
                <CalendarDays className="w-4 h-4" />
                {mutation.isPending ? "Building Strategy..." : "Generate Strategy"}
              </Button>

              {mutation.isError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Failed. Ensure Branding and Research agents have run first.
                </div>
              )}
              {mutation.isSuccess && (
                <>
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    {result?.content_calendar_items ?? 0} calendar items generated.
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSave}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 hover:border-brand-400 hover:text-brand-600 transition-colors">
                      <Save className="w-3.5 h-3.5" />{saved ? "Saved!" : "Save"}
                    </button>
                    <button onClick={() => result && downloadStrategyBrief(result.campaign_brief, calendarItems)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 hover:border-brand-400 hover:text-brand-600 transition-colors">
                      <Download className="w-3.5 h-3.5" />Download
                    </button>
                  </div>
                  <Link href="/content">
                    <button className="w-full flex items-center justify-between px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors">
                      <span>Continue to Content</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-2">
          {!result && !mutation.isPending && (
            <div className="flex flex-col items-center justify-center h-64 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
              <CalendarDays className="w-10 h-10 mb-3 text-gray-300" />
              <p className="text-sm font-medium">Campaign brief and calendar will appear here</p>
              <p className="text-xs mt-1">Fill in the setup form and generate</p>
            </div>
          )}

          {mutation.isPending && (
            <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-gray-200 bg-white">
              <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mb-4" />
              <p className="text-sm font-medium text-gray-600">Building campaign strategy and content calendar...</p>
              <p className="text-xs mt-1 text-gray-400">Generating {form.duration_days}-day calendar in one pass — usually under 60 seconds</p>
            </div>
          )}

          {result && brief && (
            <div className="space-y-4">
              {/* Tab toggle */}
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
                {(["brief", "calendar"] as const).map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                      activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}>
                    {tab === "brief" ? "Campaign Brief" : `Calendar (${result.content_calendar_items})`}
                  </button>
                ))}
              </div>

              {/* Campaign Brief tab */}
              {activeTab === "brief" && (
                <div className="space-y-4">
                  {/* Core message */}
                  <Card className="bg-gradient-to-r from-brand-600 to-brand-500 text-white border-0">
                    <p className="text-xs font-semibold uppercase tracking-wide opacity-75 mb-2">Core Message</p>
                    <p className="text-lg font-semibold leading-snug">{brief.core_message}</p>
                    <p className="text-sm opacity-75 mt-2">{brief.target_audience_summary}</p>
                  </Card>

                  {/* Campaign angles */}
                  <Collapsible icon={Target} title="Campaign Angles">
                    <div className="space-y-3">
                      {brief.campaign_angles?.map((a, i) => (
                        <div key={i} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                              {i + 1}
                            </span>
                            <p className="text-sm font-semibold text-gray-800">{a.angle}</p>
                          </div>
                          <p className="text-sm text-gray-600 ml-7">{a.description}</p>
                          <div className="flex flex-wrap gap-1 mt-2 ml-7">
                            {a.channels?.map((ch) => (
                              <span key={ch} className={`text-xs px-2 py-0.5 rounded-full border capitalize ${CHANNEL_LIGHT[ch] ?? "bg-gray-100 text-gray-600"}`}>
                                {ch}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Collapsible>

                  {/* Content pillars */}
                  <Collapsible icon={Layers} title="Content Pillars">
                    <div className="space-y-2">
                      {brief.content_pillars?.map((p, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-0.5">
                              <p className="text-sm font-semibold text-gray-800">{p.pillar}</p>
                              <Badge label={p.percentage} variant="blue" />
                            </div>
                            <p className="text-xs text-gray-500">{p.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Collapsible>

                  {/* Channel strategy */}
                  <Collapsible icon={CalendarDays} title="Channel Strategy" defaultOpen={false}>
                    <div className="space-y-3">
                      {Object.entries(brief.channel_strategy ?? {}).map(([ch, strategy]) => (
                        <div key={ch} className="border border-gray-100 rounded-lg overflow-hidden">
                          <div className={`px-3 py-2 flex items-center justify-between ${CHANNEL_LIGHT[ch] ?? "bg-gray-50"}`}>
                            <span className="text-sm font-semibold capitalize">{ch}</span>
                            <div className="flex items-center gap-2">
                              <Clock className="w-3 h-3 opacity-60" />
                              <span className="text-xs">{strategy.posting_frequency}</span>
                            </div>
                          </div>
                          <div className="p-3 space-y-2 text-sm text-gray-600">
                            <p><span className="font-medium text-gray-700">Role:</span> {strategy.role}</p>
                            <p><span className="font-medium text-gray-700">CTA:</span> {strategy.primary_cta}</p>
                            <p><span className="font-medium text-gray-700">KPI:</span> {strategy.kpis?.primary}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {strategy.content_types?.map((t, i) => (
                                <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200">{t}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Collapsible>

                  {/* Hashtag strategy */}
                  <Collapsible icon={Hash} title="Hashtag Strategy" defaultOpen={false}>
                    {[
                      { label: "Branded", items: brief.hashtag_strategy?.branded, color: "bg-brand-50 text-brand-700 border-brand-100" },
                      { label: "Campaign", items: brief.hashtag_strategy?.campaign, color: "bg-green-50 text-green-700 border-green-100" },
                      { label: "Community", items: brief.hashtag_strategy?.community, color: "bg-gray-100 text-gray-600 border-gray-200" },
                    ].map(({ label, items, color }) => (
                      <div key={label} className="mb-3">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{label}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {items?.map((h, i) => (
                            <span key={i} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${color}`}>{h}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </Collapsible>

                  {/* Budget allocation */}
                  <Collapsible icon={DollarSign} title="Budget Allocation" defaultOpen={false}>
                    <div className="space-y-2">
                      {Object.entries(brief.budget_allocation ?? {}).map(([ch, pct]) => (
                        <div key={ch} className="flex items-center gap-3">
                          <span className="text-sm capitalize text-gray-700 w-24 flex-shrink-0">{ch}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div className={`h-2 rounded-full ${CHANNEL_COLORS[ch] ?? "bg-gray-400"}`}
                              style={{ width: pct }} />
                          </div>
                          <span className="text-sm font-semibold text-gray-700 w-12 text-right">{pct}</span>
                        </div>
                      ))}
                    </div>
                  </Collapsible>
                </div>
              )}

              {/* Calendar tab */}
              {activeTab === "calendar" && (
                <Card>
                  <ContentCalendar items={calendarItems} startDate={new Date()} />
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
