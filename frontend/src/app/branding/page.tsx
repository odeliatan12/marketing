"use client";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Palette, Type, MessageSquare, Target, Download,
  AlertCircle, CheckCircle2, Sparkles, Eye, EyeOff, ArrowRight, Upload,
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
}

interface BrandingResult {
  brand_config: BrandConfig;
  brand_guide_preview: string;
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
        className="w-full h-16 rounded-xl flex flex-col items-center justify-center shadow-sm border border-black/5"
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

// --- Main page ---
export default function BrandingPage() {
  const [form, setForm] = useState<BrandingRequest>({
    product_name: "",
    description: "",
    target_audience: "",
    goals: "",
    vibe: "",
  });
  const [result, setResult] = useState<BrandingResult | null>(null);
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

  const mutation = useMutation({
    mutationFn: (data: BrandingRequest) =>
      api.post("/branding", data).then((r) => r.data),
    onSuccess: (data) => {
      setResult(data);
      if (data?.brand_config?.brand_name) {
        setFlowContext({ brand_name: data.brand_config.brand_name });
      }
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

        {/* Left: Form */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardTitle>Brand Brief</CardTitle>
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
                  Run Market Intelligence first — or upload a saved report (JSON) to use existing research.
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
                      <CheckCircle2 className="w-3.5 h-3.5" /> Report loaded
                    </span>
                  )}
                  {uploadStatus === "error" && (
                    <span className="flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle className="w-3.5 h-3.5" /> Upload failed
                    </span>
                  )}
                </label>
              </div>

              <Button
                onClick={() => mutation.mutate(form)}
                loading={mutation.isPending}
                disabled={!form.product_name || !form.description}
                className="w-full"
              >
                <Sparkles className="w-4 h-4" />
                {mutation.isPending ? "Generating..." : "Generate Brand Identity"}
              </Button>

              {mutation.isError && (
                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    {(mutation.error as any)?.response?.data?.detail
                      ?? (mutation.error as any)?.message
                      ?? "Branding failed. Check backend logs for details."}
                  </span>
                </div>
              )}
              {mutation.isSuccess && (
                <>
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    Brand identity generated successfully.
                  </div>
                  <Link href="/research">
                    <button className="w-full flex items-center justify-between px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors">
                      <span>Continue to Research</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                </>
              )}
            </div>
          </Card>

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
                  {saved ? "Saved to Dashboard!" : "Save to Dashboard"}
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Right: Brand Identity */}
        <div className="lg:col-span-2 space-y-6">

          {!brand && !mutation.isPending && (
            <div className="flex flex-col items-center justify-center h-64 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
              <Palette className="w-10 h-10 mb-3 text-gray-300" />
              <p className="text-sm font-medium">Your brand identity will appear here</p>
              <p className="text-xs mt-1">Fill in the form and click Generate</p>
            </div>
          )}

          {mutation.isPending && (
            <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-gray-200 bg-white">
              <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mb-4" />
              <p className="text-sm font-medium text-gray-600">Generating your brand identity...</p>
              <p className="text-xs mt-1 text-gray-400">Reading market research and crafting your brand</p>
            </div>
          )}

          {brand && (
            <>
              {/* Hero: Brand name + tagline */}
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

              {/* Mission, Vision, Values */}
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
                  Paste this prompt into DALL-E, Midjourney, or Stable Diffusion to generate logo concepts.
                </p>
              </Card>

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
