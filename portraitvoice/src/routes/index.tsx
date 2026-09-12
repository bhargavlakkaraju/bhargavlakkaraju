import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ImagePlus, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DEFAULT_FORM_VALUE, TestimonialForm, type TestimonialFormValue } from "@/components/pv/testimonial-form";
import { VideoResult } from "@/components/pv/video-result";
import { WaitingScreen } from "@/components/pv/waiting-screen";
import { extractNoteText } from "@/server/fns";
import { MAX_AUDIO_SECONDS } from "@/lib/types";
import { plannedSeconds, uploadFile, usePipeline } from "@/lib/use-pipeline";
import { cn } from "@/lib/utils";
import { SITE_URL } from "./__root";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Create a testimonial video · PortraitVoice by Syngenta" },
      { name: "description", content: "Upload one portrait and a testimonial in Hindi, Tamil, Telugu or seven more languages, and get a vertical lip-synced talking-head video." },
      { property: "og:title", content: "Create a testimonial video · PortraitVoice" },
      { property: "og:description", content: "One photo and a testimonial become a vertical talking-head video for farmers and farmer ambassadors." },
      { property: "og:url", content: `${SITE_URL}/` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
  }),
  component: HomePage,
});

const HERO_PREVIEW = "/assets/hero-preview.jpg";

function HomePage() {
  const pipeline = usePipeline();
  const [portrait, setPortrait] = useState<{ file: File; preview: string } | null>(null);
  const [form, setForm] = useState<TestimonialFormValue>(DEFAULT_FORM_VALUE);
  const [previewMissing, setPreviewMissing] = useState(false);
  const phase = pipeline.phase;
  const busy = phase.kind === "running";

  const hasTestimonial = form.mode === "audio" ? form.audioFile != null : form.scriptText.trim().length > 0;
  const planned = plannedSeconds(form, null);
  const canGenerate = portrait != null && hasTestimonial && form.consent && planned <= MAX_AUDIO_SECONDS && !busy;

  const handleExtractNote = useCallback(async (file: File) => {
    const url = await uploadFile(file, "image");
    const result = await extractNoteText({ data: { imageUrl: url } });
    if (!result.ok) throw new Error(result.error.message);
    return result.value.text;
  }, []);

  const choosePortrait = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a JPG, PNG or WebP photo.");
      return;
    }
    if (portrait) URL.revokeObjectURL(portrait.preview);
    setPortrait({ file, preview: URL.createObjectURL(file) });
  };

  const handleGenerate = () => {
    if (!portrait) return toast.error("Upload a portrait photo first.");
    if (!hasTestimonial) return toast.error(form.mode === "audio" ? "Upload a voice recording." : "Add the testimonial text.");
    if (!form.consent) return toast.error("Please confirm the farmer's consent.");
    if (planned > MAX_AUDIO_SECONDS) return toast.error(`Keep the testimonial under ${MAX_AUDIO_SECONDS} seconds.`);
    void pipeline.start({
      portraitFile: portrait.file,
      mode: form.mode,
      language: form.language,
      gender: form.gender,
      scriptText: form.scriptText.trim(),
      audioFile: form.audioFile,
    });
  };

  const resetAll = () => {
    pipeline.reset();
    setForm(DEFAULT_FORM_VALUE);
    if (portrait) URL.revokeObjectURL(portrait.preview);
    setPortrait(null);
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-10 pt-4 sm:px-6 sm:pt-8">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        {/* Generator. On phones the waiting screen or result replaces it. */}
        <Card className={cn(busy || phase.kind === "done" ? "hidden lg:block" : "block")}>
          <CardContent className="flex flex-col gap-5">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Create a testimonial video</h1>
              <p className="mt-1 text-sm text-white/60">One photo and a testimonial become a vertical talking-head video.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-white/85">Portrait photo</span>
              {portrait ? (
                <div className="flex items-center gap-3 rounded-xl border border-line bg-black/20 p-2">
                  <img src={portrait.preview} alt="Selected portrait" className="size-16 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="truncate font-medium">{portrait.file.name}</p>
                    <p className="text-xs text-white/50">Re-framed to 9:16 automatically</p>
                  </div>
                  <button type="button" aria-label="Remove portrait" className="rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white" disabled={busy} onClick={() => setPortrait(null)}>
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <label htmlFor="portrait-file" className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/20 bg-black/20 px-3 py-6 text-center transition hover:border-brand-green/60 hover:bg-white/5">
                  <input id="portrait-file" type="file" accept="image/*" className="sr-only" disabled={busy} onChange={(event) => choosePortrait(event.target.files?.[0])} />
                  <ImagePlus className="size-6 text-brand-green-light" />
                  <span className="text-sm font-medium">Upload portrait</span>
                  <span className="text-xs text-white/50">Clear, front-facing photo of the farmer</span>
                </label>
              )}
            </div>

            <TestimonialForm value={form} onChange={setForm} onExtractNote={handleExtractNote} disabled={busy} />

            {phase.kind === "failed" ? (
              <p className="rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">{phase.message}</p>
            ) : null}

            <Button size="lg" className="w-full" disabled={!canGenerate} onClick={handleGenerate}>
              {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {busy ? "Creating…" : "Generate video"}
            </Button>
          </CardContent>
        </Card>

        {/* Preview aside: sticky 9:16 example on desktop, waiting screen or result while working. */}
        <aside className={cn("w-full lg:sticky lg:top-20", phase.kind === "idle" ? "hidden lg:block" : "block")}>
          {phase.kind === "running" ? (
            <WaitingScreen state={phase} />
          ) : phase.kind === "done" ? (
            <VideoResult videoUrl={phase.videoUrl} posterUrl={phase.portraitUrl} onCreateAnother={resetAll} className="fade-up" />
          ) : phase.kind === "failed" ? (
            <div className="glass-card flex flex-col gap-3 p-5">
              <p className="text-sm font-semibold">The video could not be created</p>
              <p className="text-sm text-white/70">{phase.message}</p>
              <Button variant="secondary" onClick={pipeline.reset}>Try again</Button>
            </div>
          ) : (
            <div className="glass-card overflow-hidden">
              <div className="relative aspect-[9/16] w-full bg-gradient-to-b from-brand-blue/60 via-panel to-brand-green/30">
                {previewMissing ? null : (
                  <img src={HERO_PREVIEW} alt="Example vertical farmer testimonial frame" className="h-full w-full object-cover" onError={() => setPreviewMissing(true)} />
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand-green-light">Example</p>
                  <p className="text-sm text-white/85">Vertical 9:16, mid-torso, natural daylight</p>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
