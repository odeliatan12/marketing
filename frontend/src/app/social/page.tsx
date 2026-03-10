"use client";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Share2, CheckCircle2, XCircle, Clock, MinusCircle,
  AlertCircle, Twitter, Linkedin, Instagram, Send,
} from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api";

// --- Types ---
interface PublishRequest {
  mode: string;
  channels: string[];
  dry_run: boolean;
  max_items: number;
}

interface PublishResult {
  total_processed: number;
  success: number;
  failed: number;
  skipped: number;
  dry_run: boolean;
  log_preview: LogEntry[];
}

interface LogEntry {
  item_index: number;
  date: string;
  channel: string;
  format: string;
  topic: string;
  publish_result: {
    status: string;
    platform?: string;
    post_id?: string;
    url?: string;
    reason?: string;
    error?: string;
  };
  processed_at: string;
}

// --- Constants ---
const ALL_CHANNELS = ["instagram", "tiktok", "linkedin", "twitter", "facebook"];

const CHANNEL_COLORS: Record<string, string> = {
  instagram: "bg-pink-50 text-pink-700 border-pink-200",
  tiktok:    "bg-gray-100 text-gray-700 border-gray-300",
  linkedin:  "bg-blue-50 text-blue-700 border-blue-200",
  twitter:   "bg-sky-50 text-sky-700 border-sky-200",
  facebook:  "bg-indigo-50 text-indigo-700 border-indigo-200",
};

const STATUS_CONFIG: Record<string, { variant: "green" | "blue" | "grey" | "red" | "yellow"; icon: React.ElementType; label: string }> = {
  published: { variant: "green",  icon: CheckCircle2, label: "Published" },
  scheduled: { variant: "blue",   icon: Clock,        label: "Scheduled" },
  dry_run:   { variant: "blue",   icon: Send,         label: "Dry Run"   },
  skipped:   { variant: "grey",   icon: MinusCircle,  label: "Skipped"   },
  error:     { variant: "red",    icon: XCircle,      label: "Error"     },
};

const PLATFORM_CONNECTIONS = [
  { key: "twitter",   label: "Twitter / X",  icon: Twitter,    env: "TWITTER_API_KEY" },
  { key: "instagram", label: "Instagram",    icon: Instagram,  env: "INSTAGRAM_ACCESS_TOKEN" },
  { key: "linkedin",  label: "LinkedIn",     icon: Linkedin,   env: "LINKEDIN_ACCESS_TOKEN" },
  { key: "tiktok",    label: "TikTok",       icon: Share2,     env: "TIKTOK_ACCESS_TOKEN" },
  { key: "buffer",    label: "Buffer",       icon: Clock,      env: "BUFFER_ACCESS_TOKEN" },
];

// --- Sub-components ---

function ChannelToggle({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const toggle = (ch: string) =>
    onChange(selected.includes(ch) ? selected.filter((c) => c !== ch) : [...selected, ch]);
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Channels</label>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onChange([])}
          className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
            selected.length === 0 ? "bg-gray-800 text-white border-gray-800" : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
          }`}
        >
          All
        </button>
        {ALL_CHANNELS.map((ch) => {
          const active = selected.includes(ch);
          return (
            <button key={ch} onClick={() => toggle(ch)}
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

function ModeToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Mode</label>
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {["schedule", "publish"].map((m) => (
          <button key={m} onClick={() => onChange(m)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
              value === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {m === "schedule" ? "Schedule" : "Publish Now"}
          </button>
        ))}
      </div>
    </div>
  );
}

function DryRunBanner() {
  return (
    <div className="flex items-center gap-2.5 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
      <Send className="w-4 h-4 text-blue-500 flex-shrink-0" />
      <div>
        <p className="text-sm font-semibold text-blue-800">Dry Run Mode Active</p>
        <p className="text-xs text-blue-600 mt-0.5">
          No posts will be sent to any platform. Results simulate what would happen with live credentials.
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl p-4 border ${color}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium mt-0.5 opacity-75 uppercase tracking-wide">{label}</p>
    </div>
  );
}

function LogTable({ entries, channelFilter }: { entries: LogEntry[]; channelFilter: string }) {
  const filtered = channelFilter === "all"
    ? entries
    : entries.filter((e) => e.channel === channelFilter);

  if (!filtered.length) {
    return <p className="text-sm text-gray-400 py-4 text-center">No entries for this filter.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {["Date", "Channel", "Topic", "Status", "Detail", "Processed"].map((h) => (
              <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((entry, i) => {
            const status = entry.publish_result?.status ?? "unknown";
            const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.error;
            const Icon = cfg.icon;
            return (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-2.5 px-3 text-gray-600 whitespace-nowrap">{entry.date}</td>
                <td className="py-2.5 px-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium capitalize ${CHANNEL_COLORS[entry.channel] ?? "bg-gray-100 text-gray-600"}`}>
                    {entry.channel}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-gray-800 max-w-xs truncate">{entry.topic}</td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 ${
                      cfg.variant === "green" ? "text-green-500" :
                      cfg.variant === "blue"  ? "text-blue-500"  :
                      cfg.variant === "red"   ? "text-red-500"   : "text-gray-400"
                    }`} />
                    <Badge label={cfg.label} variant={cfg.variant} />
                  </div>
                </td>
                <td className="py-2.5 px-3 text-gray-500 text-xs max-w-xs truncate">
                  {entry.publish_result?.post_id
                    ? <span className="font-mono">{entry.publish_result.post_id}</span>
                    : entry.publish_result?.reason
                    ? <span className="italic">{entry.publish_result.reason}</span>
                    : entry.publish_result?.error
                    ? <span className="text-red-500">{entry.publish_result.error}</span>
                    : "—"}
                </td>
                <td className="py-2.5 px-3 text-gray-400 text-xs whitespace-nowrap">
                  {entry.processed_at?.slice(0, 16).replace("T", " ")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PlatformStatus({ connected }: { connected: Record<string, boolean> }) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {PLATFORM_CONNECTIONS.map(({ key, label, icon: Icon }) => {
        const ok = connected[key];
        return (
          <div key={key} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2.5">
              <Icon className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">{label}</span>
            </div>
            {ok ? (
              <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Connected
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
                <XCircle className="w-3.5 h-3.5" /> Not configured
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- Main page ---
export default function SocialMediaPage() {
  const [config, setConfig] = useState<PublishRequest>({
    mode: "schedule",
    channels: [],
    dry_run: true,
    max_items: 0,
  });
  const [result, setResult] = useState<PublishResult | null>(null);
  const [logFilter, setLogFilter] = useState("all");

  const publishMutation = useMutation({
    mutationFn: (data: PublishRequest) =>
      api.post("/social/publish", data).then((r) => r.data),
    onSuccess: (data) => {
      setResult(data);
      logQuery.refetch();
    },
  });

  const logQuery = useQuery({
    queryKey: ["publish-log"],
    queryFn: () => api.get("/social/publish-log").then((r) => r.data as LogEntry[]).catch(() => []),
  });

  const allLog: LogEntry[] = logQuery.data ?? [];

  // Simulate platform connection status based on env key presence
  // In production this would be a real /api/settings/status endpoint
  const connected: Record<string, boolean> = {
    twitter:   false,
    instagram: false,
    linkedin:  false,
    tiktok:    false,
    buffer:    false,
  };

  return (
    <PageLayout
      title="Social Media"
      subtitle="Publish or schedule your content to all connected social platforms."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Controls + Platform status */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardTitle>Publish Controls</CardTitle>
            <div className="space-y-5">
              <ModeToggle value={config.mode} onChange={(v) => setConfig({ ...config, mode: v })} />
              <ChannelToggle selected={config.channels} onChange={(v) => setConfig({ ...config, channels: v })} />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max items</label>
                <input
                  type="number" min={0} value={config.max_items}
                  onChange={(e) => setConfig({ ...config, max_items: Number(e.target.value) })}
                  placeholder="0 = all"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Dry run toggle */}
              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                <input type="checkbox" checked={config.dry_run}
                  onChange={(e) => setConfig({ ...config, dry_run: e.target.checked })}
                  className="mt-0.5 accent-brand-600" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Dry Run</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Simulate publishing without calling any platform API.
                    Safe to use for testing.
                  </p>
                </div>
              </label>

              {config.dry_run && <DryRunBanner />}

              <Button
                onClick={() => publishMutation.mutate(config)}
                loading={publishMutation.isPending}
                className="w-full"
                variant={config.dry_run ? "secondary" : "primary"}
              >
                <Share2 className="w-4 h-4" />
                {publishMutation.isPending
                  ? "Processing..."
                  : config.dry_run
                  ? "Simulate Publish"
                  : config.mode === "schedule"
                  ? "Schedule Posts"
                  : "Publish Now"}
              </Button>

              {publishMutation.isError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Failed. Make sure Content Agent has run first.
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardTitle>Platform Connections</CardTitle>
            <PlatformStatus connected={connected} />
            <p className="text-xs text-gray-400 mt-3">
              Add credentials in <a href="/settings" className="text-brand-600 hover:underline">Settings</a> to enable live publishing.
            </p>
          </Card>
        </div>

        {/* Right: Results + Log */}
        <div className="lg:col-span-2 space-y-4">

          {/* Run result stats */}
          {result && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Processed" value={result.total_processed}
                color="bg-gray-50 border-gray-200 text-gray-800" />
              <StatCard label="Success" value={result.success}
                color="bg-green-50 border-green-200 text-green-800" />
              <StatCard label="Skipped" value={result.skipped}
                color="bg-gray-50 border-gray-200 text-gray-600" />
              <StatCard label="Failed" value={result.failed}
                color="bg-red-50 border-red-200 text-red-800" />
            </div>
          )}

          {/* Publish log */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <CardTitle>Publish Log</CardTitle>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setLogFilter("all")}
                  className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                    logFilter === "all" ? "bg-gray-800 text-white border-gray-800" : "text-gray-500 border-gray-200 hover:bg-gray-50"
                  }`}>All</button>
                {ALL_CHANNELS.map((ch) => (
                  <button key={ch} onClick={() => setLogFilter(ch)}
                    className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors capitalize ${
                      logFilter === ch ? CHANNEL_COLORS[ch] : "text-gray-500 border-gray-200 hover:bg-gray-50"
                    }`}>{ch}</button>
                ))}
              </div>
            </div>

            {logQuery.isLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full" />
              </div>
            ) : allLog.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Share2 className="w-8 h-8 mb-2 text-gray-300" />
                <p className="text-sm font-medium">No publish history yet</p>
                <p className="text-xs mt-1">Run the publisher above to see results here</p>
              </div>
            ) : (
              <LogTable entries={allLog} channelFilter={logFilter} />
            )}
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
