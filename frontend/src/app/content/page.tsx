"use client";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  FileText, Image, Video, Mail, AlignLeft,
  Megaphone, Sparkles, AlertCircle, CheckCircle2, X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CopyButton } from "@/components/ui/CopyButton";
import { api } from "@/lib/api";

// --- Types ---
interface ContentRequest {
  generate_for_channels: string[];
  max_items: number;
  include_image_prompts: boolean;
  include_video_scripts: boolean;
}

interface SocialPost {
  caption: string;
  hashtags: string[];
  cta_text: string;
  image_prompt: string;
  alt_caption: string;
}

interface BlogPost {
  title: string;
  meta_description: string;
  slug: string;
  body_markdown: string;
  estimated_word_count: number;
  suggested_tags: string[];
  featured_image_prompt: string;
}

interface EmailContent {
  subject_line: string;
  preview_text: string;
  subject_line_b: string;
  body_html: string;
  body_plain: string;
  cta_button_text: string;
}

interface VideoScript {
  hook: string;
  script: { timecode: string; voiceover: string; on_screen_text: string; visual: string }[];
  cta_closing: string;
  caption: string;
  hashtags: string[];
  music_mood: string;
}

interface AdCopy {
  headline_a: string;
  headline_b: string;
  headline_c: string;
  primary_text: string;
  primary_text_long: string;
  description: string;
  cta_button: string;
  image_prompt: string;
}

interface ContentItem {
  date: string;
  channel: string;
  format: string;
  topic: string;
  content_type: string;
  generated_content: SocialPost | BlogPost | EmailContent | VideoScript | AdCopy;
  generated_at?: string;
  error?: string;
}

// --- Constants ---
const ALL_CHANNELS = ["instagram", "tiktok", "linkedin", "twitter", "blog", "email"];

const CHANNEL_COLORS: Record<string, string> = {
  instagram: "bg-pink-50 text-pink-700 border-pink-200",
  tiktok:    "bg-gray-100 text-gray-700 border-gray-300",
  linkedin:  "bg-blue-50 text-blue-700 border-blue-200",
  twitter:   "bg-sky-50 text-sky-700 border-sky-200",
  blog:      "bg-orange-50 text-orange-700 border-orange-200",
  email:     "bg-purple-50 text-purple-700 border-purple-200",
};

const FORMAT_ICONS: Record<string, React.ElementType> = {
  post:         AlignLeft,
  reel:         Video,
  thread:       AlignLeft,
  article:      FileText,
  newsletter:   Mail,
  story:        Image,
  video:        Video,
  ad:           Megaphone,
  email:        Mail,
  blog_post:    FileText,
  social_post:  AlignLeft,
  video_script: Video,
  ad_copy:      Megaphone,
};

// --- Sub-components ---

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${checked ? "bg-brand-600" : "bg-gray-200"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : ""}`} />
      </button>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

function ChannelFilter({ selected, onChange }: { selected: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        onClick={() => onChange("all")}
        className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
          selected === "all" ? "bg-gray-800 text-white border-gray-800" : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
        }`}
      >
        All
      </button>
      {ALL_CHANNELS.map((ch) => (
        <button
          key={ch}
          onClick={() => onChange(ch)}
          className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors capitalize ${
            selected === ch ? CHANNEL_COLORS[ch] : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
          }`}
        >
          {ch}
        </button>
      ))}
    </div>
  );
}

// --- Content detail renderers ---

function SocialPostDetail({ content }: { content: SocialPost }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Caption</p>
          <CopyButton text={content.caption} />
        </div>
        <p className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3 leading-relaxed whitespace-pre-wrap">{content.caption}</p>
      </div>
      {content.alt_caption && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Alt Caption (A/B)</p>
          <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 leading-relaxed italic">{content.alt_caption}</p>
        </div>
      )}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Hashtags</p>
        <div className="flex flex-wrap gap-1.5">
          {content.hashtags?.map((h, i) => (
            <span key={i} className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full">{h}</span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 border border-green-100 rounded-lg p-3">
          <p className="text-xs font-semibold text-green-600 uppercase mb-1">CTA</p>
          <p className="text-sm text-gray-800">{content.cta_text}</p>
        </div>
      </div>
      {content.image_prompt && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Image Prompt</p>
            <CopyButton text={content.image_prompt} />
          </div>
          <p className="text-sm text-gray-600 bg-purple-50 border border-purple-100 rounded-lg p-3 italic">{content.image_prompt}</p>
        </div>
      )}
    </div>
  );
}

function BlogPostDetail({ content }: { content: BlogPost }) {
  const [showPreview, setShowPreview] = useState(false);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Title (H1)</p>
            <CopyButton text={content.title} />
          </div>
          <p className="text-base font-bold text-gray-900">{content.title}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Meta Description</p>
            <p className="text-xs text-gray-600">{content.meta_description}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Slug</p>
            <p className="text-xs text-gray-600 font-mono">/{content.slug}</p>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {content.suggested_tags?.map((t, i) => (
              <span key={i} className="text-xs bg-orange-50 text-orange-700 border border-orange-100 px-2 py-0.5 rounded-full">{t}</span>
            ))}
          </div>
        </div>
        {content.featured_image_prompt && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Featured Image Prompt</p>
              <CopyButton text={content.featured_image_prompt} />
            </div>
            <p className="text-xs text-gray-600 bg-purple-50 border border-purple-100 rounded-lg p-3 italic">{content.featured_image_prompt}</p>
          </div>
        )}
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Article Body (~{content.estimated_word_count} words)
          </p>
          <div className="flex gap-2">
            <button onClick={() => setShowPreview(!showPreview)}
              className="text-xs text-brand-600 hover:text-brand-700 font-medium">
              {showPreview ? "Show Markdown" : "Preview"}
            </button>
            <CopyButton text={content.body_markdown} />
          </div>
        </div>
        {showPreview ? (
          <div className="prose prose-sm max-w-none text-gray-700 bg-gray-50 rounded-lg p-4 max-h-72 overflow-y-auto">
            <ReactMarkdown>{content.body_markdown}</ReactMarkdown>
          </div>
        ) : (
          <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 max-h-56 overflow-y-auto whitespace-pre-wrap font-mono">
            {content.body_markdown}
          </pre>
        )}
      </div>
    </div>
  );
}

function EmailDetail({ content }: { content: EmailContent }) {
  const [showHtml, setShowHtml] = useState(false);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-purple-600 uppercase">Subject Line A</p>
            <CopyButton text={content.subject_line} />
          </div>
          <p className="text-sm font-semibold text-gray-800">{content.subject_line}</p>
        </div>
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Subject Line B (A/B)</p>
          <p className="text-sm text-gray-700 italic">{content.subject_line_b}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Preview Text</p>
          <p className="text-xs text-gray-600">{content.preview_text}</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-lg p-3">
          <p className="text-xs font-semibold text-green-600 uppercase mb-1">CTA Button</p>
          <p className="text-sm font-semibold text-gray-800">{content.cta_button_text}</p>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Email Body</p>
          <div className="flex gap-2">
            <button onClick={() => setShowHtml(!showHtml)}
              className="text-xs text-brand-600 hover:text-brand-700 font-medium">
              {showHtml ? "Plain Text" : "HTML"}
            </button>
            <CopyButton text={showHtml ? content.body_html : content.body_plain} />
          </div>
        </div>
        <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 max-h-56 overflow-y-auto whitespace-pre-wrap font-mono">
          {showHtml ? content.body_html : content.body_plain}
        </pre>
      </div>
    </div>
  );
}

function VideoScriptDetail({ content }: { content: VideoScript }) {
  return (
    <div className="space-y-4">
      <div className="bg-gray-900 text-white rounded-lg p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Hook (First 3 seconds)</p>
        <p className="text-base font-bold">{content.hook}</p>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Script</p>
        <div className="space-y-2">
          {content.script?.map((scene, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 text-xs border border-gray-100 rounded-lg overflow-hidden">
              <div className="col-span-2 bg-gray-100 p-2 flex items-center justify-center">
                <span className="font-mono text-gray-600 font-semibold">{scene.timecode}</span>
              </div>
              <div className="col-span-10 p-2 grid grid-cols-3 gap-2">
                <div>
                  <p className="text-gray-400 font-semibold mb-0.5">Voiceover</p>
                  <p className="text-gray-700">{scene.voiceover}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-semibold mb-0.5">On Screen</p>
                  <p className="text-gray-700">{scene.on_screen_text}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-semibold mb-0.5">Visual</p>
                  <p className="text-gray-700">{scene.visual}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Closing CTA</p>
          <p className="text-gray-700">{content.cta_closing}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Music Mood</p>
          <p className="text-gray-700">{content.music_mood}</p>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Caption + Hashtags</p>
        <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{content.caption}</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {content.hashtags?.map((h, i) => (
            <span key={i} className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full">{h}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdCopyDetail({ content }: { content: AdCopy }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2">
        {[
          { label: "Headline A", value: content.headline_a, highlight: true },
          { label: "Headline B", value: content.headline_b },
          { label: "Headline C", value: content.headline_c },
        ].map(({ label, value, highlight }) => (
          <div key={label} className={`rounded-lg p-3 border ${highlight ? "bg-brand-50 border-brand-100" : "bg-gray-50 border-gray-100"}`}>
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-xs font-semibold text-gray-400 uppercase">{label}</p>
              <CopyButton text={value} />
            </div>
            <p className={`text-sm font-semibold ${highlight ? "text-brand-800" : "text-gray-700"}`}>{value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-gray-400 uppercase">Primary Text</p>
            <CopyButton text={content.primary_text} />
          </div>
          <p className="text-sm text-gray-700">{content.primary_text}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Description</p>
          <p className="text-sm text-gray-700">{content.description}</p>
        </div>
      </div>
      <div className="bg-green-50 border border-green-100 rounded-lg p-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-green-600 uppercase mb-0.5">CTA Button</p>
          <p className="text-sm font-bold text-gray-800">{content.cta_button}</p>
        </div>
      </div>
      {content.image_prompt && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-gray-400 uppercase">Ad Image Prompt</p>
            <CopyButton text={content.image_prompt} />
          </div>
          <p className="text-sm text-gray-600 bg-purple-50 border border-purple-100 rounded-lg p-3 italic">{content.image_prompt}</p>
        </div>
      )}
    </div>
  );
}

function ContentDetail({ item, onClose }: { item: ContentItem; onClose: () => void }) {
  const g = item.generated_content;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl h-full bg-white shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${CHANNEL_COLORS[item.channel] ?? "bg-gray-100"}`}>
                {item.channel}
              </span>
              <Badge label={item.format} variant="grey" />
              <span className="text-xs text-gray-400">{item.date}</span>
            </div>
            <p className="text-sm font-semibold text-gray-900 pr-6">{item.topic}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {item.content_type === "social_post"   && <SocialPostDetail   content={g as SocialPost} />}
          {item.content_type === "blog_post"      && <BlogPostDetail     content={g as BlogPost} />}
          {item.content_type === "email"          && <EmailDetail        content={g as EmailContent} />}
          {item.content_type === "video_script"   && <VideoScriptDetail  content={g as VideoScript} />}
          {item.content_type === "ad_copy"        && <AdCopyDetail       content={g as AdCopy} />}
        </div>
      </div>
    </div>
  );
}

// --- Content card ---
function ContentCard({ item, onClick }: { item: ContentItem; onClick: () => void }) {
  const Icon = FORMAT_ICONS[item.content_type] ?? FORMAT_ICONS[item.format] ?? FileText;
  const hasError = !!item.error;

  return (
    <button onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all hover:shadow-md hover:-translate-y-0.5 ${
        hasError ? "border-red-200 bg-red-50" : "border-gray-200 bg-white hover:border-brand-200"
      }`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          hasError ? "bg-red-100" : "bg-brand-50"
        }`}>
          <Icon className={`w-4 h-4 ${hasError ? "text-red-500" : "text-brand-600"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${CHANNEL_COLORS[item.channel] ?? "bg-gray-100"}`}>
              {item.channel}
            </span>
            <Badge label={item.format} variant="grey" />
          </div>
          <p className="text-sm font-semibold text-gray-900 truncate">{item.topic}</p>
          <p className="text-xs text-gray-400 mt-0.5">{item.date}</p>
          {hasError && <p className="text-xs text-red-500 mt-1">Generation failed</p>}
        </div>
      </div>
    </button>
  );
}

// --- Main page ---
export default function ContentPage() {
  const [genConfig, setGenConfig] = useState<ContentRequest>({
    generate_for_channels: [],
    max_items: 0,
    include_image_prompts: true,
    include_video_scripts: true,
  });
  const [channelFilter, setChannelFilter] = useState("all");
  const [selected, setSelected] = useState<ContentItem | null>(null);

  const generateMutation = useMutation({
    mutationFn: (data: ContentRequest) =>
      api.post("/content/generate", data).then((r) => r.data),
    onSuccess: () => batchQuery.refetch(),
  });

  const batchQuery = useQuery({
    queryKey: ["content-batch"],
    queryFn: () => api.get("/content/batch").then((r) => r.data as ContentItem[]).catch(() => []),
  });

  const allItems: ContentItem[] = batchQuery.data ?? [];
  const filtered = channelFilter === "all" ? allItems : allItems.filter((i) => i.channel === channelFilter);

  return (
    <PageLayout
      title="Content"
      subtitle="Generate and review all content — captions, blog posts, emails, video scripts, and ad copy."
    >
      <div className="space-y-6">

        {/* Generation controls */}
        <Card>
          <CardTitle>Generate Content</CardTitle>
          <div className="flex flex-wrap items-end gap-6">
            <div className="flex-1 min-w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">Channels to generate</label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setGenConfig({ ...genConfig, generate_for_channels: [] })}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                    genConfig.generate_for_channels.length === 0
                      ? "bg-gray-800 text-white border-gray-800"
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  All
                </button>
                {ALL_CHANNELS.map((ch) => {
                  const active = genConfig.generate_for_channels.includes(ch);
                  return (
                    <button key={ch} onClick={() => {
                      const current = genConfig.generate_for_channels;
                      setGenConfig({
                        ...genConfig,
                        generate_for_channels: active
                          ? current.filter((c) => c !== ch)
                          : [...current, ch],
                      });
                    }}
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

            <div className="w-32">
              <label className="block text-sm font-medium text-gray-700 mb-1">Max items</label>
              <input
                type="number" min={0} value={genConfig.max_items}
                onChange={(e) => setGenConfig({ ...genConfig, max_items: Number(e.target.value) })}
                placeholder="0 = all"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Toggle label="Image prompts" checked={genConfig.include_image_prompts}
                onChange={(v) => setGenConfig({ ...genConfig, include_image_prompts: v })} />
              <Toggle label="Video scripts" checked={genConfig.include_video_scripts}
                onChange={(v) => setGenConfig({ ...genConfig, include_video_scripts: v })} />
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={() => generateMutation.mutate(genConfig)}
                loading={generateMutation.isPending}
              >
                <Sparkles className="w-4 h-4" />
                {generateMutation.isPending ? "Generating..." : "Generate Content"}
              </Button>
              {generateMutation.isSuccess && (
                <span className="flex items-center gap-1.5 text-xs text-green-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Done
                </span>
              )}
              {generateMutation.isError && (
                <span className="flex items-center gap-1.5 text-xs text-red-600">
                  <AlertCircle className="w-3.5 h-3.5" /> Failed — run Strategy first
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* Filter bar */}
        <div className="flex items-center justify-between">
          <ChannelFilter selected={channelFilter} onChange={setChannelFilter} />
          <p className="text-sm text-gray-400">
            {filtered.length} item{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Content grid */}
        {batchQuery.isLoading || generateMutation.isPending ? (
          <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-gray-200 bg-white">
            <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mb-4" />
            <p className="text-sm text-gray-600">
              {generateMutation.isPending ? "Generating content for each calendar item..." : "Loading content..."}
            </p>
            <p className="text-xs text-gray-400 mt-1">This may take a few minutes for large calendars</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
            <FileText className="w-10 h-10 mb-3 text-gray-300" />
            <p className="text-sm font-medium">No content generated yet</p>
            <p className="text-xs mt-1">Run Strategy first, then click Generate Content above</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item, i) => (
              <ContentCard key={i} item={item} onClick={() => setSelected(item)} />
            ))}
          </div>
        )}
      </div>

      {/* Side drawer */}
      {selected && <ContentDetail item={selected} onClose={() => setSelected(null)} />}
    </PageLayout>
  );
}
