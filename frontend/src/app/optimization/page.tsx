"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import PageLayout from "@/components/layout/PageLayout";
import Card, { CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Calendar,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Target,
  Mail,
  BarChart2,
  Flame,
  XCircle,
  CheckCircle,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChannelOptimization {
  channel: string;
  current_performance: string;
  recommendation: string;
  specific_actions: string[];
  priority: "high" | "medium" | "low";
}

interface ContentPillarAdjustment {
  pillar: string;
  current_allocation: number;
  recommended_allocation: number;
  rationale: string;
}

interface ScheduleChange {
  channel: string;
  current_schedule: string;
  recommended_schedule: string;
  reason: string;
}

interface ABTest {
  test_name: string;
  hypothesis: string;
  variant_a: string;
  variant_b: string;
  success_metric: string;
  duration_days: number;
}

interface EmailOptimization {
  area: string;
  current_issue: string;
  recommendation: string;
  expected_impact: string;
}

interface CalendarPreviewItem {
  date: string;
  channel: string;
  content_type: string;
  topic: string;
  notes?: string;
}

interface OptimizationPlan {
  cycle: number;
  generated_at: string;
  executive_summary: string;
  performance_assessment: "strong" | "moderate" | "needs_improvement";
  channel_optimizations: ChannelOptimization[];
  content_pillar_adjustments: ContentPillarAdjustment[];
  schedule_changes: ScheduleChange[];
  ab_tests: ABTest[];
  topics_to_retire: string[];
  topics_to_double_down: string[];
  email_optimizations: EmailOptimization[];
  strategy_feedback: string;
  next_cycle_priorities: string[];
  calendar_preview: CalendarPreviewItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const priorityVariant = (p: string) => {
  if (p === "high") return "red";
  if (p === "medium") return "yellow";
  return "green";
};

const assessmentColor = (a: string) => {
  if (a === "strong") return "text-green-600 bg-green-50 border-green-200";
  if (a === "moderate") return "text-yellow-700 bg-yellow-50 border-yellow-200";
  return "text-red-600 bg-red-50 border-red-200";
};

const assessmentIcon = (a: string) => {
  if (a === "strong") return <CheckCircle className="w-5 h-5 text-green-600" />;
  if (a === "moderate") return <AlertCircle className="w-5 h-5 text-yellow-600" />;
  return <XCircle className="w-5 h-5 text-red-500" />;
};

const channelIcon: Record<string, string> = {
  twitter: "🐦",
  instagram: "📸",
  linkedin: "💼",
  email: "📧",
  blog: "✍️",
  video: "🎬",
  ads: "📣",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Accordion({ title, icon, children, defaultOpen = false }: {
  title: string; icon?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2 font-semibold text-gray-800">
          {icon}
          {title}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5 pt-1 bg-white border-t border-gray-100">{children}</div>}
    </div>
  );
}

function AllocationBar({ current, recommended, label }: { current: number; recommended: number; label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{label}</span>
        <span className="text-gray-400">{current}% → <span className="font-semibold text-brand-600">{recommended}%</span></span>
      </div>
      <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className="absolute h-full bg-gray-300 rounded-full" style={{ width: `${current}%` }} />
        <div
          className="absolute h-full bg-brand-500 rounded-full opacity-70 transition-all"
          style={{ width: `${recommended}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OptimizationPage() {
  const [cycle, setCycle] = useState(1);
  const [applyToCalendar, setApplyToCalendar] = useState(true);
  const [expandedAB, setExpandedAB] = useState<number | null>(null);
  const [calendarFilter, setCalendarFilter] = useState("all");

  // Run optimization
  const runMutation = useMutation({
    mutationFn: () =>
      api.post("/optimization/run", { cycle, apply_to_calendar: applyToCalendar }).then((r) => r.data),
  });

  // Fetch existing plan
  const { data: planData } = useQuery<{ plan: OptimizationPlan }>({
    queryKey: ["optimization-plan"],
    queryFn: () => api.get("/optimization/plan").then((r) => r.data),
    retry: false,
  });

  const plan: OptimizationPlan | undefined = runMutation.data?.plan ?? planData?.plan;

  // Calendar
  const { data: calData } = useQuery({
    queryKey: ["opt-calendar", cycle],
    queryFn: () => api.get(`/optimization/calendar/${cycle}`).then((r) => r.data),
    enabled: !!plan,
    retry: false,
  });

  const calendarItems: CalendarPreviewItem[] = calData?.calendar ?? plan?.calendar_preview ?? [];
  const channels = ["all", ...Array.from(new Set(calendarItems.map((i) => i.channel)))];
  const filteredCalendar =
    calendarFilter === "all" ? calendarItems : calendarItems.filter((i) => i.channel === calendarFilter);

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Optimization</h1>
          <p className="text-sm text-gray-500 mt-1">
            Analyse performance data and generate actionable improvements for the next campaign cycle.
          </p>
        </div>

        {/* Run Controls */}
        <Card>
          <CardTitle>Run Optimization</CardTitle>
          <div className="mt-4 flex flex-wrap gap-6 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Campaign Cycle</label>
              <select
                value={cycle}
                onChange={(e) => setCycle(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>Cycle {n}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="apply-cal"
                type="checkbox"
                checked={applyToCalendar}
                onChange={(e) => setApplyToCalendar(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <label htmlFor="apply-cal" className="text-sm text-gray-700 select-none">
                Apply changes to content calendar
              </label>
            </div>

            <Button
              onClick={() => runMutation.mutate()}
              loading={runMutation.isPending}
              variant="primary"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Run Optimization
            </Button>
          </div>

          {runMutation.isError && (
            <p className="mt-3 text-sm text-red-600">
              Failed to run optimization — ensure analytics and prior agent outputs exist.
            </p>
          )}
        </Card>

        {plan && (
          <>
            {/* Executive Summary */}
            <Card>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>Executive Summary — Cycle {plan.cycle}</CardTitle>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Generated {new Date(plan.generated_at).toLocaleString()}
                  </p>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${assessmentColor(plan.performance_assessment)}`}>
                  {assessmentIcon(plan.performance_assessment)}
                  {plan.performance_assessment.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-700 leading-relaxed">{plan.executive_summary}</p>
            </Card>

            {/* Channel Optimizations */}
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-brand-500" /> Channel Optimizations
              </h2>
              {plan.channel_optimizations.map((ch, i) => (
                <Accordion
                  key={i}
                  title={`${channelIcon[ch.channel] ?? "📌"} ${ch.channel.charAt(0).toUpperCase() + ch.channel.slice(1)}`}
                  icon={<Badge variant={priorityVariant(ch.priority) as any}>{ch.priority}</Badge>}
                  defaultOpen={i === 0}
                >
                  <div className="space-y-3 mt-2">
                    <div>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Current Performance</span>
                      <p className="text-sm text-gray-700 mt-0.5">{ch.current_performance}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recommendation</span>
                      <p className="text-sm text-gray-700 mt-0.5">{ch.recommendation}</p>
                    </div>
                    {ch.specific_actions.length > 0 && (
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</span>
                        <ul className="mt-1 space-y-1">
                          {ch.specific_actions.map((a, j) => (
                            <li key={j} className="flex items-start gap-2 text-sm text-gray-700">
                              <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-brand-400 shrink-0" />
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </Accordion>
              ))}
            </div>

            {/* Content Pillar Adjustments */}
            <Card>
              <CardTitle>Content Pillar Adjustments</CardTitle>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left">
                      <th className="pb-2 font-semibold text-gray-600">Pillar</th>
                      <th className="pb-2 font-semibold text-gray-600 text-center">Current %</th>
                      <th className="pb-2 font-semibold text-gray-600 text-center">Recommended %</th>
                      <th className="pb-2 font-semibold text-gray-600">Rationale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {plan.content_pillar_adjustments.map((p, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="py-3 pr-4 font-medium text-gray-800">{p.pillar}</td>
                        <td className="py-3 pr-4 text-center text-gray-600">{p.current_allocation}%</td>
                        <td className="py-3 pr-4 text-center">
                          <span className={`font-semibold ${p.recommended_allocation > p.current_allocation ? "text-green-600" : p.recommended_allocation < p.current_allocation ? "text-red-500" : "text-gray-600"}`}>
                            {p.recommended_allocation}%
                          </span>
                        </td>
                        <td className="py-3 text-gray-600">{p.rationale}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-5 space-y-3">
                {plan.content_pillar_adjustments.map((p, i) => (
                  <AllocationBar key={i} label={p.pillar} current={p.current_allocation} recommended={p.recommended_allocation} />
                ))}
              </div>
            </Card>

            {/* Posting Schedule Changes */}
            {plan.schedule_changes.length > 0 && (
              <Card>
                <CardTitle>Posting Schedule Changes</CardTitle>
                <div className="mt-4 space-y-3">
                  {plan.schedule_changes.map((s, i) => (
                    <div key={i} className="flex flex-col sm:flex-row gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="sm:w-24 shrink-0">
                        <span className="text-xs font-semibold text-gray-500 uppercase">{s.channel}</span>
                      </div>
                      <div className="flex-1 flex flex-wrap gap-4 text-sm">
                        <div>
                          <span className="text-xs text-gray-400">Current</span>
                          <p className="font-medium text-gray-700 line-through">{s.current_schedule}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-brand-400 self-center" />
                        <div>
                          <span className="text-xs text-gray-400">Recommended</span>
                          <p className="font-semibold text-brand-700">{s.recommended_schedule}</p>
                        </div>
                        <div className="ml-auto max-w-xs">
                          <span className="text-xs text-gray-400">Reason</span>
                          <p className="text-gray-600">{s.reason}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* A/B Tests */}
            {plan.ab_tests.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <Target className="w-4 h-4 text-brand-500" /> A/B Tests to Run
                </h2>
                {plan.ab_tests.map((t, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 transition-colors text-left"
                      onClick={() => setExpandedAB(expandedAB === i ? null : i)}
                    >
                      <div>
                        <p className="font-semibold text-gray-800">{t.test_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{t.hypothesis}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <Badge variant="blue">{t.duration_days}d</Badge>
                        {expandedAB === i ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </button>
                    {expandedAB === i && (
                      <div className="border-t border-gray-100 bg-white px-5 py-4 grid grid-cols-2 gap-4 text-sm">
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-xs font-semibold text-blue-500 uppercase mb-1">Variant A (Control)</p>
                          <p className="text-gray-700">{t.variant_a}</p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <p className="text-xs font-semibold text-purple-500 uppercase mb-1">Variant B (Test)</p>
                          <p className="text-gray-700">{t.variant_b}</p>
                        </div>
                        <div className="col-span-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Success Metric</p>
                          <p className="text-gray-700">{t.success_metric}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Topics: Retire vs Double Down */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardTitle>
                  <span className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" /> Topics to Retire
                  </span>
                </CardTitle>
                <ul className="mt-3 space-y-2">
                  {plan.topics_to_retire.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <TrendingDown className="w-3.5 h-3.5 mt-0.5 text-red-400 shrink-0" />
                      {t}
                    </li>
                  ))}
                  {plan.topics_to_retire.length === 0 && (
                    <p className="text-sm text-gray-400 italic">No topics to retire this cycle.</p>
                  )}
                </ul>
              </Card>

              <Card>
                <CardTitle>
                  <span className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-500" /> Topics to Double Down
                  </span>
                </CardTitle>
                <ul className="mt-3 space-y-2">
                  {plan.topics_to_double_down.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <TrendingUp className="w-3.5 h-3.5 mt-0.5 text-green-500 shrink-0" />
                      {t}
                    </li>
                  ))}
                  {plan.topics_to_double_down.length === 0 && (
                    <p className="text-sm text-gray-400 italic">No specific topics flagged yet.</p>
                  )}
                </ul>
              </Card>
            </div>

            {/* Email Optimizations */}
            {plan.email_optimizations.length > 0 && (
              <Card>
                <CardTitle>
                  <span className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-brand-500" /> Email Optimizations
                  </span>
                </CardTitle>
                <div className="mt-4 space-y-3">
                  {plan.email_optimizations.map((e, i) => (
                    <div key={i} className="p-4 bg-gray-50 rounded-lg border border-gray-200 grid sm:grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Area</p>
                        <p className="font-medium text-gray-800">{e.area}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-red-400 uppercase mb-1">Current Issue</p>
                        <p className="text-gray-700">{e.current_issue}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-green-600 uppercase mb-1">Recommendation</p>
                        <p className="text-gray-700">{e.recommendation}</p>
                        {e.expected_impact && (
                          <p className="text-xs text-brand-600 mt-1 font-medium">Expected: {e.expected_impact}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Strategy Feedback */}
            <Card>
              <CardTitle>
                <span className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500" /> Strategy Feedback
                </span>
              </CardTitle>
              <p className="mt-3 text-sm text-gray-700 leading-relaxed">{plan.strategy_feedback}</p>
            </Card>

            {/* Next Cycle Priorities */}
            <Card>
              <CardTitle>Next Cycle Priorities</CardTitle>
              <ol className="mt-4 space-y-2">
                {plan.next_cycle_priorities.map((p, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    {p}
                  </li>
                ))}
              </ol>
            </Card>

            {/* Calendar Preview */}
            <Card>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle>
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-brand-500" /> Revised Calendar Preview
                  </span>
                </CardTitle>
                <div className="flex gap-2 flex-wrap">
                  {channels.map((ch) => (
                    <button
                      key={ch}
                      onClick={() => setCalendarFilter(ch)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${calendarFilter === ch ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                    >
                      {ch === "all" ? "All" : ch.charAt(0).toUpperCase() + ch.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {filteredCalendar.length === 0 ? (
                <p className="mt-4 text-sm text-gray-400 italic text-center py-8">No calendar data available.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left">
                        <th className="pb-2 font-semibold text-gray-600 pr-4">Date</th>
                        <th className="pb-2 font-semibold text-gray-600 pr-4">Channel</th>
                        <th className="pb-2 font-semibold text-gray-600 pr-4">Type</th>
                        <th className="pb-2 font-semibold text-gray-600 pr-4">Topic</th>
                        <th className="pb-2 font-semibold text-gray-600">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredCalendar.map((item, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">
                            {new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </td>
                          <td className="py-2 pr-4">
                            <span className="flex items-center gap-1">
                              {channelIcon[item.channel] ?? "📌"}
                              <span className="capitalize text-gray-700">{item.channel}</span>
                            </span>
                          </td>
                          <td className="py-2 pr-4">
                            <Badge variant="blue">{item.content_type}</Badge>
                          </td>
                          <td className="py-2 pr-4 font-medium text-gray-800 max-w-xs truncate">{item.topic}</td>
                          <td className="py-2 text-gray-500 text-xs max-w-xs">{item.notes ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}

        {!plan && !runMutation.isPending && (
          <div className="text-center py-20 text-gray-400">
            <RotateCcw className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No optimization plan yet. Run the optimizer above to generate insights.</p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
