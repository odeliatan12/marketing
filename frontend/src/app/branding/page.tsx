"use client";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Palette, Type, MessageSquare, Target, Download,
  AlertCircle, CheckCircle2, Sparkles, Eye, EyeOff, ArrowRight, Upload, Check, Box, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CopyButton } from "@/components/ui/CopyButton";
import { api } from "@/lib/api";
import { getFlowContext, setFlowContext } from "@/lib/flowContext";
import { downloadBrandGuide } from "@/lib/exportHtml";

// --- Types ---
interface BrandingRequest {
  product_name: string;
  description: string;
  target_audience: string;
  goals: string;
  vibe: string;
}

interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  rationale: string;
}

interface BrandFonts {
  heading: string;
  body: string;
  rationale: string;
}

interface BrandConfig {
  brand_name: string;
  tagline: string;
  positioning_angle?: string;
  mission: string;
  vision: string;
  core_values: string[];
  personality_archetype: string;
  tone_adjectives: string[];
  voice_dos: string[];
  voice_donts: string[];
  colors: BrandColors;
  fonts: BrandFonts;
  logo_prompt: string;
  illustration_style: string;
  elevator_pitch: string;
  one_liner: string;
  value_proposition: string;
  generated_at: string;
  mockup_prompts?: Record<string, string>;
}

interface PomelliStep {
  label: string;
  value?: string;
  dos?: string;
  donts?: string;
  colors?: Record<string, string>;
  rationale?: string;
  heading?: string;
  body?: string;
}

interface PomelliSetup {
  pomelli_url: string;
  [key: string]: string | PomelliStep;
}

interface BrandingResult {
  brand_config: BrandConfig;
  brand_guide_preview: string;
  mockup_images?: Record<string, string>;  // { key: "/brand-assets/mockups/..." }
  pomelli_setup?: PomelliSetup;
}

// --- Sub-components ---

function FormInput({
  label, value, onChange, placeholder, textarea = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; textarea?: boolean;
}) {
  const cls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white";
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

function ColorSwatch({ name, hex }: { name: string; hex: string }) {
  const isLight = (h: string) => {
    const hex = h.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 128;
  };
  const textColor = isLight(hex) ? "text-gray-800" : "text-white";
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="w-full h-16 rounded-xl flex items-center justify-center shadow-sm border border-black/5"
        style={{ backgroundColor: hex }}
      >
        <span className={`text-xs font-bold ${textColor}`}>{hex.toUpperCase()}</span>
      </div>
      <p className="text-xs text-center text-gray-500 font-medium capitalize">{name}</p>
    </div>
  );
}

function FontPreview({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="space-y-3">
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
        <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Heading — {heading}</p>
        <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: heading }}>
          The quick brown fox
        </p>
      </div>
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
        <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Body — {body}</p>
        <p className="text-sm text-gray-700 leading-relaxed" style={{ fontFamily: body }}>
          The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.
        </p>
      </div>
    </div>
  );
}

function VoiceList({ items, type }: { items: string[]; type: "do" | "dont" }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
          <span className={`flex-shrink-0 mt-0.5 font-bold ${type === "do" ? "text-green-500" : "text-red-400"}`}>
            {type === "do" ? "✓" : "✗"}
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function MockupPromptsSection({
  mockups,
  images,
}: {
  mockups: NonNullable<BrandConfig["mockup_prompts"]>;
  images?: Record<string, string>;
}) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Object.entries(mockups).map(([key, prompt]) => {
        if (!prompt) return null;
        const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        const imageUrl = images?.[key];
        const isExpanded = expandedKey === key;

        return (
          <div key={key} className="border border-gray-200 rounded-xl overflow-hidden bg-white hover:border-brand-200 hover:shadow-md transition-all">
            {/* Image area */}
            <div className="relative bg-gray-100 aspect-square">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`http://localhost:8000${imageUrl}`}
                  alt={label}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-2">
                  <Box className="w-10 h-10" />
                  <span className="text-xs text-gray-400">No image generated</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-gray-800">{label}</p>
                <CopyButton text={prompt} />
              </div>
              <button
                onClick={() => setExpandedKey(isExpanded ? null : key)}
                className="text-xs text-brand-600 hover:text-brand-700"
              >
                {isExpanded ? "Hide prompt" : "View prompt"}
              </button>
              {isExpanded && (
                <p className="text-xs text-gray-500 mt-2 leading-relaxed bg-gray-50 rounded-lg p-2">
                  {prompt}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PomelliSection({ setup }: { setup: PomelliSetup }) {
  const steps = Object.entries(setup).filter(([key]) => key !== "pomelli_url") as [string, PomelliStep][];

  return (
    <div className="space-y-4">
      {/* Header banner */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Powered by</p>
          <p className="text-xl font-bold">Google Pomelli</p>
          <p className="text-xs opacity-75 mt-0.5">AI marketing campaigns — Business DNA setup</p>
        </div>
        <a
          href={setup.pomelli_url as string}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-4 py-2 bg-white text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors"
        >
          Open Pomelli <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <p className="text-xs text-gray-500">
        Paste these values into Pomelli's Business DNA setup to instantly configure your brand and start generating on-brand marketing content.
      </p>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map(([key, step]) => {
          const stepNum = key.match(/\d+/)?.[0];
          const stepLabel = step.label;

          return (
            <div key={key} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
                {stepNum && (
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {stepNum}
                  </span>
                )}
                <p className="text-xs font-semibold text-gray-700">{stepLabel}</p>
              </div>
              <div className="p-3">
                {/* Plain value */}
                {step.value && (
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-gray-800 leading-relaxed flex-1">{step.value}</p>
                    <CopyButton text={step.value} />
                  </div>
                )}

                {/* Do/Don't */}
                {(step.dos || step.donts) && (
                  <div className="space-y-1.5">
                    {step.dos && (
                      <div className="flex items-start gap-2">
                        <span className="text-green-500 font-bold text-xs mt-0.5 shrink-0">Do:</span>
                        <p className="text-sm text-gray-700">{step.dos}</p>
                        <CopyButton text={`Do: ${step.dos}\nDon't: ${step.donts ?? ""}`} />
                      </div>
                    )}
                    {step.donts && (
                      <div className="flex items-start gap-2">
                        <span className="text-red-400 font-bold text-xs mt-0.5 shrink-0">Don't:</span>
                        <p className="text-sm text-gray-700">{step.donts}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Color palette */}
                {step.colors && (
                  <div className="space-y-2">
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(step.colors).map(([name, hex]) => hex && (
                        <div key={name} className="flex flex-col items-center gap-1">
                          <div
                            className="w-10 h-10 rounded-lg border border-black/10 shadow-sm"
                            style={{ backgroundColor: hex }}
                            title={hex}
                          />
                          <span className="text-[10px] text-gray-500 capitalize">{name}</span>
                          <span className="text-[10px] text-gray-400 font-mono">{hex}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-500 italic flex-1">{step.rationale}</p>
                      <CopyButton text={Object.entries(step.colors ?? {}).map(([k, v]) => `${k}: ${v}`).join(", ")} />
                    </div>
                  </div>
                )}

                {/* Fonts */}
                {(step.heading || step.body) && (
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Heading</p>
                      <p className="text-sm font-semibold text-gray-800">{step.heading}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Body</p>
                      <p className="text-sm text-gray-700">{step.body}</p>
                    </div>
                    <CopyButton text={`Heading: ${step.heading}, Body: ${step.body}`} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 text-brand-600" />
      </div>
      <h2 className="text-base font-semibold text-gray-800">{title}</h2>
    </div>
  );
}

// --- Option Card ---
function OptionCard({
  option, index, selected, onSelect,
}: {
  option: BrandConfig; index: number; selected: boolean; onSelect: () => void;
}) {
  const colors = option.colors ?? {};
  const swatchKeys = ["primary", "secondary", "accent"] as const;

  return (
    <div
      className={`relative rounded-xl border-2 transition-all cursor-pointer ${
        selected
          ? "border-brand-500 shadow-lg shadow-brand-100"
          : "border-gray-200 hover:border-brand-300 hover:shadow-md"
      }`}
      onClick={onSelect}
    >
      {/* Selection indicator */}
      <div className={`absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
        selected ? "bg-brand-500 border-brand-500" : "border-gray-300 bg-white"
      }`}>
        {selected && <Check className="w-3.5 h-3.5 text-white" />}
      </div>

      {/* Color bar */}
      <div className="h-2 rounded-t-xl overflow-hidden flex">
        {swatchKeys.map((key) => (
          <div key={key} className="flex-1" style={{ backgroundColor: colors[key] ?? "#ccc" }} />
        ))}
      </div>

      <div className="p-5">
        <div className="flex items-start gap-2 mb-1 pr-8">
          <Badge label={`Option ${index + 1}`} variant="blue" />
          <Badge label={option.personality_archetype} variant="purple" />
        </div>

        <h3 className="text-xl font-bold text-gray-900 mt-3">{option.brand_name}</h3>
        <p className="text-sm text-gray-500 italic mt-0.5">"{option.tagline}"</p>

        {option.positioning_angle && (
          <p className="text-xs text-gray-600 mt-2 leading-relaxed border-l-2 border-brand-200 pl-2">
            {option.positioning_angle}
          </p>
        )}

        {/* Mini color palette */}
        <div className="flex gap-2 mt-4">
          {swatchKeys.map((key) => colors[key] && (
            <div key={key} className="flex flex-col items-center gap-1">
              <div
                className="w-8 h-8 rounded-lg border border-black/5 shadow-sm"
                style={{ backgroundColor: colors[key] }}
                title={`${key}: ${colors[key]}`}
              />
              <span className="text-[10px] text-gray-400 capitalize">{key}</span>
            </div>
          ))}
          <div className="flex flex-col items-center gap-1 ml-2">
            <div className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50">
              <span className="text-[10px] font-bold text-gray-600" style={{ fontFamily: option.fonts?.heading }}>Aa</span>
            </div>
            <span className="text-[10px] text-gray-400 truncate max-w-[36px]">{option.fonts?.heading?.split(" ")[0]}</span>
          </div>
        </div>

        {/* Tone tags */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {option.tone_adjectives?.slice(0, 4).map((adj) => (
            <span key={adj} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {adj}
            </span>
          ))}
        </div>

        <p className="text-xs text-gray-500 mt-3 leading-relaxed line-clamp-2">{option.one_liner}</p>
      </div>
    </div>
  );
}

// --- Main page ---
export default function BrandingPage() {
  const [form, setForm] = useState<BrandingRequest>({
    product_name: "",
    description: "",
    target_audience: "",
    goals: "",
    vibe: "",
  });

  // Step 1: form, Step 2: picking options, Step 3: full result
  const [step, setStep] = useState<"form" | "options" | "result">("form");
  const [options, setOptions] = useState<BrandConfig[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [result, setResult] = useState<BrandingResult | null>(null);
  const [mockupImages, setMockupImages] = useState<Record<string, string>>({});
  const [showGuide, setShowGuide] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");

  useEffect(() => {
    const ctx = getFlowContext();
    if (ctx.product_name || ctx.description) {
      setForm((f) => ({
        ...f,
        product_name: ctx.product_name ?? f.product_name,
        description: ctx.description ?? f.description,
        target_audience: ctx.target_audience ?? f.target_audience,
      }));
      setPrefilled(true);
    }
  }, []);

  // Mutation: get 3 options
  const optionsMutation = useMutation({
    mutationFn: (data: BrandingRequest) =>
      api.post("/branding/options", data).then((r) => r.data),
    onSuccess: (data) => {
      setOptions(data.options ?? []);
      setSelectedIndex(0);
      setStep("options");
    },
  });

  // Mutation: confirm chosen option → generates guide
  const confirmMutation = useMutation({
    mutationFn: (brand: BrandConfig) =>
      api.post("/branding/confirm", {
        product_name: form.product_name,
        target_audience: form.target_audience,
        brand,
      }).then((r) => r.data),
    onSuccess: (data) => {
      setResult(data);
      setMockupImages(data.mockup_images ?? {});
      if (data?.brand_config?.brand_name) {
        setFlowContext({ brand_name: data.brand_config.brand_name });
      }
      setStep("result");
    },
  });

  const brand = result?.brand_config;

  const handleUploadReport = async (file: File) => {
    setUploadStatus("uploading");
    const formData = new FormData();
    formData.append("file", file);
    try {
      await fetch("/api/agents/branding/upload-market-intelligence", {
        method: "POST",
        body: formData,
      });
      setUploadStatus("done");
    } catch {
      setUploadStatus("error");
    }
  };

  const handleDownloadGuide = () => {
    if (!brand) return;
    downloadBrandGuide(brand, result?.brand_guide_preview ?? "", form.product_name);
  };

  const handleSave = () => {
    if (!brand) return;
    const existing = JSON.parse(localStorage.getItem("saved_brand_configs") ?? "[]");
    const entry = { ...brand, product_name: form.product_name, saved_at: new Date().toISOString() };
    const idx = existing.findIndex((b: any) => b.brand_name === brand.brand_name);
    if (idx >= 0) existing[idx] = entry; else existing.unshift(entry);
    localStorage.setItem("saved_brand_configs", JSON.stringify(existing.slice(0, 10)));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <PageLayout
      title="Branding"
      subtitle="Generate a complete brand identity grounded in market research."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Form / actions */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardTitle>Brand Brief</CardTitle>
            <div className="space-y-4">
              {prefilled && (
                <div className="flex items-center gap-2 text-xs text-brand-700 bg-brand-50 border border-brand-100 px-3 py-2 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  Pre-filled from Market Intelligence.
                </div>
              )}
              <FormInput label="Product Name" value={form.product_name}
                onChange={(v) => setForm({ ...form, product_name: v })}
                placeholder="e.g. Flo Hydration Tracker" />
              <FormInput label="Description" value={form.description}
                onChange={(v) => setForm({ ...form, description: v })}
                placeholder="What does your product do?" textarea />
              <FormInput label="Target Audience" value={form.target_audience}
                onChange={(v) => setForm({ ...form, target_audience: v })}
                placeholder="e.g. 18-35 active adults" />
              <FormInput label="Goals" value={form.goals}
                onChange={(v) => setForm({ ...form, goals: v })}
                placeholder="e.g. brand awareness, app downloads" />
              <FormInput
                label="Desired Vibe (optional)"
                value={form.vibe}
                onChange={(v) => setForm({ ...form, vibe: v })}
                placeholder="e.g. bold, clean, energetic, minimal"
              />

              {/* Market intelligence upload */}
              <div className="border border-dashed border-gray-200 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-600 mb-1.5">Market Intelligence Report</p>
                <p className="text-xs text-gray-400 mb-2">
                  Run Market Intelligence first — or upload a saved report (JSON).
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-xs font-medium text-gray-700">
                    <Upload className="w-3.5 h-3.5" />
                    {uploadStatus === "uploading" ? "Uploading..." : "Upload JSON"}
                  </div>
                  <input
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadReport(file);
                    }}
                  />
                  {uploadStatus === "done" && (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Loaded
                    </span>
                  )}
                  {uploadStatus === "error" && (
                    <span className="flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle className="w-3.5 h-3.5" /> Failed
                    </span>
                  )}
                </label>
              </div>

              <Button
                onClick={() => optionsMutation.mutate(form)}
                loading={optionsMutation.isPending}
                disabled={!form.product_name || !form.description}
                className="w-full"
              >
                <Sparkles className="w-4 h-4" />
                {optionsMutation.isPending ? "Generating options..." : "Generate 3 Brand Options"}
              </Button>

              {optionsMutation.isError && (
                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    {(optionsMutation.error as any)?.response?.data?.detail
                      ?? (optionsMutation.error as any)?.message
                      ?? "Failed. Check backend logs."}
                  </span>
                </div>
              )}
              {confirmMutation.isError && (
                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    {(confirmMutation.error as any)?.response?.data?.detail
                      ?? (confirmMutation.error as any)?.message
                      ?? "Failed to confirm brand."}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Quick actions after result */}
          {brand && (
            <Card>
              <CardTitle>Quick Actions</CardTitle>
              <div className="space-y-2">
                <Button variant="secondary" className="w-full" onClick={() => setShowGuide(!showGuide)}>
                  {showGuide ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showGuide ? "Hide Brand Guide" : "View Brand Guide"}
                </Button>
                <Button variant="secondary" className="w-full" onClick={handleDownloadGuide}>
                  <Download className="w-4 h-4" />
                  Download Brand Guidelines
                </Button>
                <Button variant="secondary" className="w-full" onClick={handleSave}>
                  <Sparkles className="w-4 h-4" />
                  {saved ? "Saved!" : "Save to Dashboard"}
                </Button>
                <Button variant="secondary" className="w-full" onClick={() => { setStep("options"); setResult(null); }}>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  Back to Options
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Right: Main content area */}
        <div className="lg:col-span-2 space-y-6">

          {/* STEP: empty state */}
          {step === "form" && !optionsMutation.isPending && (
            <div className="flex flex-col items-center justify-center h-64 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
              <Palette className="w-10 h-10 mb-3 text-gray-300" />
              <p className="text-sm font-medium">3 brand concepts will appear here</p>
              <p className="text-xs mt-1">Fill in the form and click Generate</p>
            </div>
          )}

          {/* STEP: loading options */}
          {optionsMutation.isPending && (
            <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-gray-200 bg-white">
              <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mb-4" />
              <p className="text-sm font-medium text-gray-600">Generating 3 brand concepts...</p>
              <p className="text-xs mt-1 text-gray-400">Reading market research — usually under 60 seconds</p>
            </div>
          )}

          {/* STEP: pick an option */}
          {step === "options" && options.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-800">Choose a Brand Direction</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Each concept has a different personality, visual style, and positioning angle.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {options.map((opt, i) => (
                  <OptionCard
                    key={i}
                    option={opt}
                    index={i}
                    selected={selectedIndex === i}
                    onSelect={() => setSelectedIndex(i)}
                  />
                ))}
              </div>

              <Button
                onClick={() => {
                  if (selectedIndex !== null) confirmMutation.mutate(options[selectedIndex]);
                }}
                loading={confirmMutation.isPending}
                disabled={selectedIndex === null}
                className="w-full"
              >
                {confirmMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating full brand guide...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Select Option {selectedIndex !== null ? selectedIndex + 1 : ""} & Generate Brand Guide
                  </>
                )}
              </Button>
              {confirmMutation.isPending && (
                <p className="text-xs text-center text-gray-400">Writing brand guide + generating mockup images with DALL-E 3 — usually 60-90 seconds</p>
              )}
            </>
          )}

          {/* STEP: full brand result */}
          {step === "result" && brand && (
            <>
              {/* Hero */}
              <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 text-white">
                <div className="flex items-start justify-between mb-1">
                  <Badge label={brand.personality_archetype} variant="blue" />
                  <span className="text-xs text-gray-400">{brand.generated_at?.slice(0, 10)}</span>
                </div>
                <h2 className="text-4xl font-bold mt-4 text-white">{brand.brand_name}</h2>
                <p className="text-lg text-gray-300 mt-2 italic">"{brand.tagline}"</p>
                <p className="text-sm text-gray-400 mt-4 leading-relaxed">{brand.one_liner}</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {brand.tone_adjectives?.map((adj) => (
                    <span key={adj} className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-gray-200 border border-white/10">
                      {adj}
                    </span>
                  ))}
                </div>
              </Card>

              {/* Mission / Vision / Values */}
              <Card>
                <SectionHeader icon={Target} title="Mission, Vision & Values" />
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Mission</p>
                    <p className="text-sm text-gray-800">{brand.mission}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Vision</p>
                    <p className="text-sm text-gray-800">{brand.vision}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Core Values</p>
                    <div className="flex flex-wrap gap-2">
                      {brand.core_values?.map((v) => (
                        <Badge key={v} label={v} variant="purple" />
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Color Palette */}
              <Card>
                <SectionHeader icon={Palette} title="Color Palette" />
                <div className="grid grid-cols-5 gap-3 mb-4">
                  {Object.entries(brand.colors ?? {})
                    .filter(([key]) => key !== "rationale")
                    .map(([name, hex]) => (
                      <ColorSwatch key={name} name={name} hex={hex as string} />
                    ))}
                </div>
                {brand.colors?.rationale && (
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 italic">
                    {brand.colors.rationale}
                  </p>
                )}
              </Card>

              {/* Typography */}
              <Card>
                <SectionHeader icon={Type} title="Typography" />
                <FontPreview heading={brand.fonts?.heading ?? "Georgia"} body={brand.fonts?.body ?? "Arial"} />
                {brand.fonts?.rationale && (
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 mt-3 italic">
                    {brand.fonts.rationale}
                  </p>
                )}
              </Card>

              {/* Voice & Tone */}
              <Card>
                <SectionHeader icon={MessageSquare} title="Voice & Tone" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">Do</p>
                    <VoiceList items={brand.voice_dos ?? []} type="do" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">Don't</p>
                    <VoiceList items={brand.voice_donts ?? []} type="dont" />
                  </div>
                </div>
              </Card>

              {/* Messaging */}
              <Card>
                <SectionHeader icon={MessageSquare} title="Messaging Hierarchy" />
                <div className="space-y-3">
                  <div className="p-3 bg-brand-50 border border-brand-100 rounded-lg">
                    <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-1">One-liner</p>
                    <p className="text-sm text-gray-800 font-medium">{brand.one_liner}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Elevator Pitch</p>
                    <p className="text-sm text-gray-700">{brand.elevator_pitch}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Value Proposition</p>
                    <p className="text-sm text-gray-700">{brand.value_proposition}</p>
                  </div>
                </div>
              </Card>

              {/* Logo Prompt */}
              <Card>
                <CardTitle>Logo Generation Prompt</CardTitle>
                <div className="relative bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700 pr-16 leading-relaxed">{brand.logo_prompt}</p>
                  <div className="absolute top-3 right-3">
                    <CopyButton text={brand.logo_prompt ?? ""} />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Paste into DALL-E, Midjourney, or Stable Diffusion to generate logo concepts.
                </p>
              </Card>

              {/* Visual Mockups */}
              {brand.mockup_prompts && Object.keys(brand.mockup_prompts).length > 0 && (
                <Card>
                  <SectionHeader icon={Box} title="Product Placement & Packaging Mockups" />
                  <p className="text-xs text-gray-500 mb-4 -mt-2">
                    {Object.keys(mockupImages).length > 0
                      ? `${Object.keys(mockupImages).length} mockup images generated with DALL-E 3. Click "View prompt" to see the prompt used.`
                      : "Add your OpenAI API key to auto-generate photorealistic mockups with DALL-E 3."}
                  </p>
                  <MockupPromptsSection mockups={brand.mockup_prompts} images={mockupImages} />
                </Card>
              )}

              {/* Pomelli Setup */}
              {result?.pomelli_setup && (
                <Card>
                  <PomelliSection setup={result.pomelli_setup} />
                </Card>
              )}

              {/* Success + next step */}
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                Brand identity saved. Ready for the next step.
              </div>
              <Link href="/research">
                <button className="w-full flex items-center justify-between px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors">
                  <span>Continue to Research</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>

              {/* Brand Guide preview */}
              {showGuide && result?.brand_guide_preview && (
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <CardTitle>Brand Style Guide</CardTitle>
                    <Button variant="secondary" onClick={handleDownloadGuide}>
                      <Download className="w-4 h-4" /> Download
                    </Button>
                  </div>
                  <div className="prose prose-sm max-w-none text-gray-700">
                    <ReactMarkdown>{result.brand_guide_preview}</ReactMarkdown>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
