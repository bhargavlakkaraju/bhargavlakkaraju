import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { languageLabel, type TestimonialEntry } from "@/lib/types";
import { listGalleryEntries } from "@/server/fns";
import { SITE_URL } from "./__root";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery · PortraitVoice by Syngenta" },
      { name: "description", content: "Finished farmer testimonial videos created with PortraitVoice." },
      { property: "og:title", content: "PortraitVoice gallery" },
      { property: "og:url", content: `${SITE_URL}/gallery` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/gallery` }],
  }),
  loader: async () => {
    const result = await listGalleryEntries();
    return result.ok ? { entries: result.value, error: null } : { entries: [], error: result.error.message };
  },
  component: GalleryPage,
});

const MODE_LABELS: Record<TestimonialEntry["input_mode"], string> = { text: "Typed", note: "Handwritten note", audio: "Voice recording" };

function GalleryCard({ entry }: { entry: TestimonialEntry }) {
  if (!entry.video_url) return null;
  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl border border-line bg-black">
        <video
          className="h-full w-full object-contain"
          src={entry.video_url}
          poster={entry.portrait_url ?? undefined}
          controls
          playsInline
          preload="none"
          onClick={(event) => {
            const video = event.currentTarget;
            if (video.paused) void video.play();
          }}
        />
      </div>
      <figcaption className="flex flex-col gap-1">
        <div className="flex flex-wrap gap-1">
          <Badge tone="green">{languageLabel(entry.language)}</Badge>
          {entry.voice_gender ? <Badge tone="blue">{entry.voice_gender}</Badge> : null}
          <Badge>{MODE_LABELS[entry.input_mode]}</Badge>
        </div>
        <p className="text-xs text-white/50">{formatDate(entry.completed_at ?? entry.created_at)}</p>
      </figcaption>
    </figure>
  );
}

function GalleryPage() {
  const { entries, error } = Route.useLoaderData();
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-bold tracking-tight">Gallery</h1>
      <p className="mt-1 text-sm text-white/60">Finished testimonial videos. Tap a video to play it.</p>
      {error ? (
        <div className="glass-card mt-6 flex flex-col items-start gap-3 p-5">
          <p className="text-sm text-red-200">{error}</p>
          <Button variant="secondary" asChild><a href="/gallery">Retry</a></Button>
        </div>
      ) : entries.length === 0 ? (
        <div className="glass-card mt-6 flex flex-col items-start gap-3 p-5">
          <p className="text-sm font-semibold">No videos yet</p>
          <p className="text-sm text-white/60">The first finished testimonial will appear here.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {entries.map((entry) => <GalleryCard key={entry.id} entry={entry} />)}
        </div>
      )}
    </main>
  );
}
