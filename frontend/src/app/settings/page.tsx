"use client";

import { useState } from "react";
import PageLayout from "@/components/layout/PageLayout";
import Card, { CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  Key,
  Globe,
  Mail,
  BarChart2,
  Search,
  ShoppingBag,
  Zap,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiKeyField {
  key: string;
  label: string;
  placeholder: string;
  helpUrl?: string;
  required: boolean;
}

interface ApiSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  fields: ApiKeyField[];
}

// ─── Config ───────────────────────────────────────────────────────────────────

const API_SECTIONS: ApiSection[] = [
  {
    id: "ai",
    title: "AI Provider",
    icon: <Zap className="w-4 h-4 text-yellow-500" />,
    description: "Powers all AI-generated content, analysis, and recommendations.",
    fields: [
      { key: "ANTHROPIC_API_KEY", label: "Anthropic API Key", placeholder: "sk-ant-...", required: true },
    ],
  },
  {
    id: "search",
    title: "Search & Research",
    icon: <Search className="w-4 h-4 text-blue-500" />,
    description: "Used by the Market Intelligence and Research agents for web and trend data.",
    fields: [
      { key: "SERPAPI_API_KEY", label: "SerpAPI Key", placeholder: "Your SerpAPI key", required: true },
      { key: "TAVILY_API_KEY", label: "Tavily API Key", placeholder: "tvly-...", required: false },
    ],
  },
  {
    id: "ecommerce",
    title: "E-Commerce Scraping",
    icon: <ShoppingBag className="w-4 h-4 text-orange-500" />,
    description: "Enables scraping of Amazon, Shopee, and Lazada product and review data.",
    fields: [
      { key: "RAPIDAPI_KEY", label: "RapidAPI Key", placeholder: "Your RapidAPI key", required: false },
      { key: "AMAZON_AFFILIATE_TAG", label: "Amazon Affiliate Tag", placeholder: "yourtag-20", required: false },
    ],
  },
  {
    id: "social",
    title: "Social Media",
    icon: <Globe className="w-4 h-4 text-purple-500" />,
    description: "Connect platform accounts for publishing and analytics retrieval.",
    fields: [
      { key: "TWITTER_API_KEY", label: "Twitter API Key", placeholder: "Your Twitter API key", required: false },
      { key: "TWITTER_API_SECRET", label: "Twitter API Secret", placeholder: "Your Twitter API secret", required: false },
      { key: "TWITTER_ACCESS_TOKEN", label: "Twitter Access Token", placeholder: "Your access token", required: false },
      { key: "TWITTER_ACCESS_SECRET", label: "Twitter Access Secret", placeholder: "Your access secret", required: false },
      { key: "INSTAGRAM_ACCESS_TOKEN", label: "Instagram Access Token", placeholder: "Your Instagram token", required: false },
      { key: "INSTAGRAM_ACCOUNT_ID", label: "Instagram Account ID", placeholder: "17841...", required: false },
      { key: "LINKEDIN_ACCESS_TOKEN", label: "LinkedIn Access Token", placeholder: "Your LinkedIn token", required: false },
      { key: "LINKEDIN_PERSON_ID", label: "LinkedIn Person ID", placeholder: "urn:li:person:...", required: false },
      { key: "BUFFER_ACCESS_TOKEN", label: "Buffer Access Token", placeholder: "Your Buffer token", required: false },
    ],
  },
  {
    id: "email",
    title: "Email Marketing",
    icon: <Mail className="w-4 h-4 text-green-500" />,
    description: "SendGrid integration for campaign sends and sequence automation.",
    fields: [
      { key: "SENDGRID_API_KEY", label: "SendGrid API Key", placeholder: "SG.xxx", required: false },
      { key: "SENDGRID_FROM_EMAIL", label: "From Email Address", placeholder: "marketing@yourbrand.com", required: false },
      { key: "SENDGRID_FROM_NAME", label: "From Name", placeholder: "Your Brand", required: false },
    ],
  },
  {
    id: "analytics",
    title: "Analytics",
    icon: <BarChart2 className="w-4 h-4 text-brand-500" />,
    description: "Additional analytics integrations (optional).",
    fields: [
      { key: "GOOGLE_ANALYTICS_ID", label: "Google Analytics ID", placeholder: "G-XXXXXXXXXX", required: false },
    ],
  },
];

// Connection status check — derived from whether key has a value
const getStatus = (val: string, required: boolean): "connected" | "missing" | "optional" => {
  if (val.trim()) return "connected";
  if (required) return "missing";
  return "optional";
};

const statusBadge = (status: "connected" | "missing" | "optional") => {
  if (status === "connected") return <Badge variant="green">Connected</Badge>;
  if (status === "missing") return <Badge variant="red">Required</Badge>;
  return <Badge variant="grey">Optional</Badge>;
};

const statusIcon = (status: "connected" | "missing" | "optional") => {
  if (status === "connected") return <CheckCircle className="w-4 h-4 text-green-500" />;
  if (status === "missing") return <XCircle className="w-4 h-4 text-red-500" />;
  return <AlertCircle className="w-4 h-4 text-gray-300" />;
};

// ─── ApiKeyInput ──────────────────────────────────────────────────────────────

function ApiKeyInput({
  field,
  value,
  onChange,
}: {
  field: ApiKeyField;
  value: string;
  onChange: (v: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const status = getStatus(value, field.required);

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-600">{field.label}</label>
        <div className="flex items-center gap-2">
          {statusIcon(status)}
          {statusBadge(status)}
        </div>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={visible ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-20 text-sm font-mono focus:ring-2 focus:ring-brand-500 focus:border-transparent placeholder:text-gray-300 placeholder:font-sans"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
            <button
              type="button"
              onClick={() => setVisible(!visible)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title={visible ? "Hide" : "Show"}
            >
              {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Copy"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  // Local state — keys are keyed by env var name
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      API_SECTIONS.flatMap((s) => s.fields.map((f) => [f.key, ""]))
    )
  );
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState("ai");

  const setValue = (key: string, val: string) =>
    setValues((prev) => ({ ...prev, [key]: val }));

  // Summary counts
  const allFields = API_SECTIONS.flatMap((s) => s.fields);
  const connectedCount = allFields.filter((f) => values[f.key]?.trim()).length;
  const requiredMissing = allFields.filter(
    (f) => f.required && !values[f.key]?.trim()
  ).length;

  const handleSave = () => {
    // In a real deployment this would POST to backend /settings endpoint.
    // Here we show success feedback and instruct .env setup.
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const currentSection = API_SECTIONS.find((s) => s.id === activeSection)!;

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure API keys and platform connections for all agents.
          </p>
        </div>

        {/* Status Banner */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${requiredMissing > 0 ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>
          {requiredMissing > 0 ? (
            <XCircle className="w-5 h-5 text-red-500 shrink-0" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
          )}
          <span>
            {connectedCount} / {allFields.length} keys configured
            {requiredMissing > 0 ? ` — ${requiredMissing} required key${requiredMissing > 1 ? "s" : ""} missing` : " — all required keys set"}
          </span>
        </div>

        {/* Notice */}
        <Card>
          <div className="flex items-start gap-3">
            <Key className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
            <div className="text-sm text-gray-600 space-y-1">
              <p className="font-semibold text-gray-800">How API keys work</p>
              <p>
                Keys entered here are stored in your browser session only. For persistent configuration, add them to{" "}
                <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">backend/.env</code> using the{" "}
                <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">.env.example</code> template.
              </p>
              <p className="text-gray-500">
                The backend reads env vars on startup — restart the server after editing <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">.env</code>.
              </p>
            </div>
          </div>
        </Card>

        {/* Two-column layout: nav + form */}
        <div className="flex gap-6">
          {/* Section Nav */}
          <nav className="w-44 shrink-0 space-y-1">
            {API_SECTIONS.map((s) => {
              const sectionFields = s.fields;
              const hasRequired = sectionFields.some((f) => f.required && !values[f.key]?.trim());
              const allConnected = sectionFields.every((f) => values[f.key]?.trim());
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${activeSection === s.id ? "bg-brand-50 text-brand-700 font-semibold" : "text-gray-600 hover:bg-gray-100"}`}
                >
                  <span className="flex items-center gap-2">
                    {s.icon}
                    {s.title}
                  </span>
                  {hasRequired ? (
                    <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  ) : allConnected ? (
                    <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
                  ) : null}
                </button>
              );
            })}
          </nav>

          {/* Form Panel */}
          <div className="flex-1">
            <Card>
              <div className="flex items-start justify-between mb-1">
                <div>
                  <CardTitle>
                    <span className="flex items-center gap-2">
                      {currentSection.icon}
                      {currentSection.title}
                    </span>
                  </CardTitle>
                  <p className="text-xs text-gray-500 mt-1">{currentSection.description}</p>
                </div>
              </div>

              <div className="mt-5 space-y-5 divide-y divide-gray-100">
                {currentSection.fields.map((field) => (
                  <div key={field.key} className="pt-5 first:pt-0">
                    <ApiKeyInput
                      field={field}
                      value={values[field.key]}
                      onChange={(v) => setValue(field.key, v)}
                    />
                    {field.helpUrl && (
                      <a
                        href={field.helpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-brand-500 hover:underline mt-1"
                      >
                        Get API key <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Changes are session-only unless saved to <code className="font-mono">.env</code>
                </p>
                <Button onClick={handleSave} variant="primary">
                  {saved ? (
                    <><Check className="w-4 h-4 mr-1 text-white" /> Saved</>
                  ) : (
                    "Save Keys"
                  )}
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* .env Reference */}
        <Card>
          <CardTitle>Environment Variable Reference</CardTitle>
          <p className="text-xs text-gray-500 mt-1 mb-4">
            Copy these into your <code className="font-mono bg-gray-100 px-1 py-0.5 rounded">backend/.env</code> file.
          </p>
          <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
            <pre className="text-xs text-gray-300 leading-relaxed font-mono whitespace-pre">
{`# AI
ANTHROPIC_API_KEY=sk-ant-...

# Search & Research
SERPAPI_API_KEY=
TAVILY_API_KEY=

# E-Commerce Scraping
RAPIDAPI_KEY=
AMAZON_AFFILIATE_TAG=

# Social Media
TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_SECRET=
INSTAGRAM_ACCESS_TOKEN=
INSTAGRAM_ACCOUNT_ID=
LINKEDIN_ACCESS_TOKEN=
LINKEDIN_PERSON_ID=
BUFFER_ACCESS_TOKEN=

# Email Marketing
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=
SENDGRID_FROM_NAME=

# Analytics
GOOGLE_ANALYTICS_ID=`}
            </pre>
          </div>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardTitle>API Documentation Links</CardTitle>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Anthropic Console", url: "https://console.anthropic.com" },
              { label: "SerpAPI Dashboard", url: "https://serpapi.com/dashboard" },
              { label: "RapidAPI Hub", url: "https://rapidapi.com" },
              { label: "Twitter Developer", url: "https://developer.twitter.com" },
              { label: "Meta for Developers", url: "https://developers.facebook.com" },
              { label: "LinkedIn Developers", url: "https://developer.linkedin.com" },
              { label: "Buffer Developers", url: "https://buffer.com/developers" },
              { label: "SendGrid API Keys", url: "https://app.sendgrid.com/settings/api_keys" },
              { label: "Google Analytics", url: "https://analytics.google.com" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-brand-400 hover:text-brand-600 transition-colors group"
              >
                {link.label}
                <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-brand-400" />
              </a>
            ))}
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}
