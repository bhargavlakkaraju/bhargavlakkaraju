import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@higgsfield/quanta/button";
import { Tag } from "@higgsfield/quanta/tag";
import { Typography } from "@higgsfield/quanta/typography";
import { BrandBar } from "@/components/portraitvoice/brand-bar";
import { listGalleryEntries } from "@/lib/portraitvoice/pipeline.functions";
import { formatDate } from "@/lib/portraitvoice/format";
import { languageLabel, type TestimonialEntry } from "@/lib/portraitvoice/types";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery · PortraitVoice" },
      { name: "description", content: "Finished farmer testimonial videos created with PortraitVoice." },
      { property: "og:title", content: "PortraitVoice gallery" },
      { property: "og:description", content: "Finished farmer testimonial videos created with PortraitVoice." },
    ],
    links: [{ rel: "canonical", href: "https://portraitvoice.higgsfield.app/gallery" }],
  }),
  loader: async () => {
    const result = await listGalleryEntries();
    return result.ok ? { entries: result.value, error: null } : { entries: [], error: result.error.message };
  },
  component: GalleryPage,
});

const MODE_LABELS: Record<TestimonialEntry["input_mode"], string> = {
  text: "Typed",
  note: "Handwritten note",
  audio: "Voice recording",
};

function GalleryCard({ entry }: { entry: TestimonialEntry }) {
  if (!entry.video_url) return null;
  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-q-400 bg-q-background-tertiary">
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
      <figcaption className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap gap-1">
          <Tag color="brand">{languageLabel(entry.language)}</Tag>
          {entry.voice_gender ? <Tag>{entry.voice_gender === "female" ? "Female voice" : "Male voice"}</Tag> : null}
          <Tag>{MODE_LABELS[entry.input_mode]}</Tag>
        </div>
        <Typography as="p" variant="caption-sm-regular" color="tertiary">
          {formatDate(entry.completed_at ?? entry.created_at)}
        </Typography>
      </figcaption>
    </figure>
  );
}

function GalleryPage() {
  const { entries, error } = Route.useLoaderData();
  return (
    <main className="min-h-dvh bg-q-background-primary text-q-text-primary">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
        <BrandBar active="gallery" />
        <div className="flex flex-col gap-1">
          <Typography as="h1" variant="headline-sm-semi-bold" color="primary">
            Gallery
          </Typography>
          <Typography as="p" variant="body-sm-regular" color="secondary">
            Finished testimonial videos. Tap a video to play it.
          </Typography>
        </div>
        {error ? (
          <div className="flex flex-col items-start gap-3 rounded-q-400 border border-q-border-subtle bg-q-background-secondary p-5">
            <Typography as="p" variant="body-sm-regular" color="danger">{error}</Typography>
            <Button variant="tertiary" size="md" as="a" href="/gallery">Retry</Button>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-q-400 border border-q-border-subtle bg-q-background-secondary p-5">
            <Typography as="p" variant="title-sm-semi-bold" color="primary">No videos yet</Typography>
            <Typography as="p" variant="body-sm-regular" color="secondary">
              The first finished testimonial will appear here.
            </Typography>
            <Button variant="brandSoft" size="md" as="a" href="/">Create a testimonial video</Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {entries.map((entry) => (
              <GalleryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
