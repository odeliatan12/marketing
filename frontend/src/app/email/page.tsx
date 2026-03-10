"use client";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Mail, Send, CheckCircle2, XCircle, Clock,
  AlertCircle, ChevronDown, ChevronUp, Layers,
} from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CopyButton } from "@/components/ui/CopyButton";
import { api } from "@/lib/api";

// --- Types ---
interface CampaignRequest {
  sender_name: string;
  sender_email: string;
  list_id: string;
  mode: string;
  dry_run: boolean;
  max_emails: number;
}

interface SequenceRequest {
  sequence_type: string;
  sender_name: string;
  sender_email: string;
  product_name: string;
  num_emails: number;
}

interface SendLogEntry {
  index: number;
  date: string;
  topic: string;
  subject: string;
  result: {
    status: string;
    campaign_id?: string;
    send_at?: string;
    error?: string;
  };
  processed_at: string;
}

interface SequenceEmail {
  sequence_number: number;
  send_delay_days: number;
  subject_line: string;
  preview_text: string;
  subject_line_b: string;
  body_html: string;
  body_plain: string;
  cta_button_text: string;
  cta_url_placeholder: string;
}

// --- Constants ---
const SEQUENCE_TYPES = [
  { key: "welcome",       label: "Welcome",       color: "bg-green-50 text-green-700 border-green-200",   desc: "Onboard new subscribers with your brand story" },
  { key: "nurture",       label: "Nurture",        color: "bg-blue-50 text-blue-700 border-blue-200",     desc: "Build trust with educational content" },
  { key: "promotional",  label: "Promotional",    color: "bg-orange-50 text-orange-700 border-orange-200", desc: "Drive conversions with time-limited offers" },
  { key: "re-engagement",label: "Re-engagement",  color: "bg-purple-50 text-purple-700 border-purple-200", desc: "Win back inactive subscribers" },
];

const STATUS_CONFIG: Record<string, { variant: "green" | "blue" | "grey" | "red"; icon: React.ElementType; label: string }> = {
  sent:      { variant: "green", icon: CheckCircle2, label: "Sent"      },
  scheduled: { variant: "blue",  icon: Clock,        label: "Scheduled" },
  dry_run:   { variant: "blue",  icon: Send,         label: "Dry Run"   },
  error:     { variant: "red",   icon: XCircle,      label: "Error"     },
};

// --- Sub-components ---

function FormInput({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
    </div>
  );
}

function DryRunBanner() {
  return (
    <div className="flex items-center gap-2.5 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
      <Send className="w-4 h-4 text-blue-500 flex-shrink-0" />
      <p className="text-xs text-blue-700">
        <span className="font-semibold">Dry Run active</span> — no emails will be sent to SendGrid.
      </p>
    </div>
  );
}

function SendLogTable({ entries }: { entries: SendLogEntry[] }) {
  if (!entries.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-400">
        <Mail className="w-8 h-8 mb-2 text-gray-300" />
        <p className="text-sm font-medium">No emails sent yet</p>
        <p className="text-xs mt-1">Run a campaign to see results here</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {["Date", "Subject", "Topic", "Status", "Detail", "Processed"].map((h) => (
              <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => {
            const status = entry.result?.status ?? "error";
            const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.error;
            const Icon = cfg.icon;
            return (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap text-xs">{entry.date}</td>
                <td className="py-2.5 px-3 text-gray-800 max-w-[180px] truncate font-medium">{entry.subject}</td>
                <td className="py-2.5 px-3 text-gray-500 max-w-[160px] truncate text-xs">{entry.topic}</td>
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
                <td className="py-2.5 px-3 text-xs text-gray-400 max-w-[140px] truncate">
                  {entry.result?.campaign_id
                    ? <span className="font-mono">{entry.result.campaign_id}</span>
                    : entry.result?.send_at
                    ? entry.result.send_at.slice(0, 16).replace("T", " ")
                    : entry.result?.error
                    ? <span className="text-red-500">{entry.result.error}</span>
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

function SequenceEmailCard({ email }: { email: SequenceEmail }) {
  const [open, setOpen] = useState(false);
  const [showHtml, setShowHtml] = useState(false);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header row */}
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
        <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
          {email.sequence_number}
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-gray-900 truncate">{email.subject_line}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Send delay: {email.send_delay_days === 0 ? "Immediately" : `+${email.send_delay_days} days`}
          </p>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
          {/* Subject lines */}
          <div className="grid grid-cols-1 gap-2 mt-3">
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-purple-600 uppercase">Subject A</p>
                <CopyButton text={email.subject_line} />
              </div>
              <p className="text-sm font-semibold text-gray-800">{email.subject_line}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Subject B (A/B)</p>
              <p className="text-sm text-gray-600 italic">{email.subject_line_b}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2.5">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Preview Text</p>
              <p className="text-xs text-gray-600">{email.preview_text}</p>
            </div>
          </div>

          {/* CTA */}
          <div className="bg-green-50 border border-green-100 rounded-lg p-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-green-600 uppercase mb-0.5">CTA Button</p>
              <p className="text-sm font-bold text-gray-800">{email.cta_button_text}</p>
            </div>
            <span className="text-xs text-gray-400 font-mono">{email.cta_url_placeholder}</span>
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase">Email Body</p>
              <div className="flex gap-2">
                <button onClick={() => setShowHtml(!showHtml)}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                  {showHtml ? "Plain Text" : "HTML"}
                </button>
                <CopyButton text={showHtml ? email.body_html : email.body_plain} />
              </div>
            </div>
            <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono">
              {showHtml ? email.body_html : email.body_plain}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main page ---
export default function EmailPage() {
  const [activeTab, setActiveTab] = useState<"campaign" | "sequences">("campaign");

  // Campaign state
  const [campaignForm, setCampaignForm] = useState<CampaignRequest>({
    sender_name: "",
    sender_email: "",
    list_id: "",
    mode: "schedule",
    dry_run: true,
    max_emails: 0,
  });
  const [campaignResult, setCampaignResult] = useState<{ success: number; failed: number; total_processed: number } | null>(null);

  // Sequence state
  const [seqForm, setSeqForm] = useState<SequenceRequest>({
    sequence_type: "welcome",
    sender_name: "",
    sender_email: "",
    product_name: "",
    num_emails: 5,
  });
  const [sequence, setSequence] = useState<SequenceEmail[] | null>(null);

  const campaignMutation = useMutation({
    mutationFn: (data: CampaignRequest) =>
      api.post("/email/campaign", data).then((r) => r.data),
    onSuccess: (data) => {
      setCampaignResult(data);
      logQuery.refetch();
    },
  });

  const sequenceMutation = useMutation({
    mutationFn: (data: SequenceRequest) =>
      api.post("/email/sequence", data).then((r) => r.data),
    onSuccess: (data) => {
      // Try to load the sequence from the returned file
      api.get(`/email/sequence/${seqForm.sequence_type}`)
        .then((r) => setSequence(r.data))
        .catch(() => setSequence(data.preview ? [data.preview] : null));
    },
  });

  const logQuery = useQuery({
    queryKey: ["email-send-log"],
    queryFn: () => api.get("/email/send-log").then((r) => r.data as SendLogEntry[]).catch(() => []),
  });

  const sendLog: SendLogEntry[] = logQuery.data ?? [];

  return (
    <PageLayout
      title="Email Marketing"
      subtitle="Send campaigns from your content calendar and generate full email sequences."
    >
      {/* Tab toggle */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
        {(["campaign", "sequences"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
              activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "campaign" ? "Campaigns" : "Sequences"}
          </button>
        ))}
      </div>

      {/* ── CAMPAIGNS TAB ── */}
      {activeTab === "campaign" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Campaign form */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardTitle>Campaign Settings</CardTitle>
              <div className="space-y-4">
                <FormInput label="Sender Name" value={campaignForm.sender_name}
                  onChange={(v) => setCampaignForm({ ...campaignForm, sender_name: v })}
                  placeholder="Your Brand Name" />
                <FormInput label="Sender Email" value={campaignForm.sender_email}
                  onChange={(v) => setCampaignForm({ ...campaignForm, sender_email: v })}
                  placeholder="hello@yourbrand.com" type="email" />
                <FormInput label="SendGrid List ID" value={campaignForm.list_id}
                  onChange={(v) => setCampaignForm({ ...campaignForm, list_id: v })}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />

                {/* Mode toggle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mode</label>
                  <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                    {["schedule", "send"].map((m) => (
                      <button key={m} onClick={() => setCampaignForm({ ...campaignForm, mode: m })}
                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          campaignForm.mode === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                        }`}
                      >
                        {m === "schedule" ? "Schedule" : "Send Now"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Emails</label>
                  <input type="number" min={0} value={campaignForm.max_emails}
                    onChange={(e) => setCampaignForm({ ...campaignForm, max_emails: Number(e.target.value) })}
                    placeholder="0 = all"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>

                {/* Dry run */}
                <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                  <input type="checkbox" checked={campaignForm.dry_run}
                    onChange={(e) => setCampaignForm({ ...campaignForm, dry_run: e.target.checked })}
                    className="mt-0.5 accent-brand-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Dry Run</p>
                    <p className="text-xs text-gray-500 mt-0.5">Simulate without calling SendGrid</p>
                  </div>
                </label>

                {campaignForm.dry_run && <DryRunBanner />}

                <Button
                  onClick={() => campaignMutation.mutate(campaignForm)}
                  loading={campaignMutation.isPending}
                  disabled={!campaignForm.sender_email || !campaignForm.sender_name}
                  className="w-full"
                  variant={campaignForm.dry_run ? "secondary" : "primary"}
                >
                  <Send className="w-4 h-4" />
                  {campaignMutation.isPending
                    ? "Processing..."
                    : campaignForm.dry_run
                    ? "Simulate Campaign"
                    : campaignForm.mode === "schedule"
                    ? "Schedule Campaign"
                    : "Send Campaign"}
                </Button>

                {campaignMutation.isError && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    Failed. Ensure Content Agent has run and SENDGRID_API_KEY is set.
                  </div>
                )}
              </div>
            </Card>

            {/* Result stats */}
            {campaignResult && (
              <Card>
                <CardTitle>Last Run</CardTitle>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "Processed", value: campaignResult.total_processed, color: "text-gray-800" },
                    { label: "Success",   value: campaignResult.success,          color: "text-green-600" },
                    { label: "Failed",    value: campaignResult.failed,           color: "text-red-500"   },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-gray-50 rounded-lg p-2.5">
                      <p className={`text-xl font-bold ${color}`}>{value}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Right: Send log */}
          <div className="lg:col-span-2">
            <Card>
              <CardTitle>Send Log</CardTitle>
              {logQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full" />
                </div>
              ) : (
                <SendLogTable entries={sendLog} />
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ── SEQUENCES TAB ── */}
      {activeTab === "sequences" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Sequence form */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardTitle>Generate Sequence</CardTitle>
              <div className="space-y-4">

                {/* Sequence type selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sequence Type</label>
                  <div className="space-y-2">
                    {SEQUENCE_TYPES.map(({ key, label, color, desc }) => (
                      <button key={key} onClick={() => setSeqForm({ ...seqForm, sequence_type: key })}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          seqForm.sequence_type === key
                            ? `${color} border-current`
                            : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        <p className="text-sm font-semibold">{label}</p>
                        <p className="text-xs mt-0.5 opacity-75">{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <FormInput label="Product Name" value={seqForm.product_name}
                  onChange={(v) => setSeqForm({ ...seqForm, product_name: v })}
                  placeholder="e.g. Flo Hydration App" />
                <FormInput label="Sender Name" value={seqForm.sender_name}
                  onChange={(v) => setSeqForm({ ...seqForm, sender_name: v })}
                  placeholder="Your Brand Name" />
                <FormInput label="Sender Email" value={seqForm.sender_email}
                  onChange={(v) => setSeqForm({ ...seqForm, sender_email: v })}
                  placeholder="hello@yourbrand.com" type="email" />

                {/* Number of emails */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Emails: <span className="text-brand-600 font-bold">{seqForm.num_emails}</span>
                  </label>
                  <input type="range" min={2} max={8} value={seqForm.num_emails}
                    onChange={(e) => setSeqForm({ ...seqForm, num_emails: Number(e.target.value) })}
                    className="w-full accent-brand-600" />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>2</span><span>8</span>
                  </div>
                </div>

                <Button
                  onClick={() => sequenceMutation.mutate(seqForm)}
                  loading={sequenceMutation.isPending}
                  disabled={!seqForm.product_name || !seqForm.sender_email}
                  className="w-full"
                >
                  <Layers className="w-4 h-4" />
                  {sequenceMutation.isPending ? "Generating..." : "Generate Sequence"}
                </Button>

                {sequenceMutation.isError && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    Generation failed. Check your API key.
                  </div>
                )}
                {sequenceMutation.isSuccess && (
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    Sequence generated — {seqForm.num_emails} emails ready.
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right: Sequence viewer */}
          <div className="lg:col-span-2">
            {!sequence && !sequenceMutation.isPending && (
              <div className="flex flex-col items-center justify-center h-64 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
                <Mail className="w-10 h-10 mb-3 text-gray-300" />
                <p className="text-sm font-medium">Your email sequence will appear here</p>
                <p className="text-xs mt-1">Select a type and click Generate</p>
              </div>
            )}

            {sequenceMutation.isPending && (
              <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-gray-200 bg-white">
                <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mb-4" />
                <p className="text-sm font-medium text-gray-600">Writing your {seqForm.sequence_type} email sequence...</p>
                <p className="text-xs mt-1 text-gray-400">Claude is crafting {seqForm.num_emails} on-brand emails</p>
              </div>
            )}

            {sequence && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-sm font-semibold text-gray-700 capitalize">
                    {seqForm.sequence_type} Sequence — {sequence.length} emails
                  </h2>
                  <Badge label={seqForm.sequence_type} variant={
                    seqForm.sequence_type === "welcome"       ? "green"  :
                    seqForm.sequence_type === "nurture"       ? "blue"   :
                    seqForm.sequence_type === "promotional"   ? "yellow" : "purple"
                  } />
                </div>

                {/* Timeline line */}
                <div className="relative">
                  {sequence.map((email, i) => (
                    <div key={i} className="relative pl-8 mb-3">
                      {/* Timeline dot + line */}
                      <div className="absolute left-0 top-3.5 w-3 h-3 rounded-full bg-brand-500 border-2 border-white shadow z-10" />
                      {i < sequence.length - 1 && (
                        <div className="absolute left-1.5 top-6 bottom-0 w-0.5 bg-gray-200" style={{ height: "calc(100% + 0.75rem)" }} />
                      )}
                      <SequenceEmailCard email={email} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </PageLayout>
  );
}
