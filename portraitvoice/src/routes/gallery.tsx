import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Play, Film, ArrowRight } from "lucide-react";
import { listGalleryEntries } from "@/server/fns";
import { languageLabel, LANGUAGES } from "@/lib/languages";
import { Select } from "@/components/ui/select";
export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Farmer stories — PortraitVoice by Syngenta" },
      {
        name: "description",
        content:
          "Hear the stories of farmers, in their own words and their own language. Explore completed PortraitVoice testimonial videos.",
      },
    ],
  }),
  loader: () => listGalleryEntries(),
  component: Gallery,
});
function Gallery() {
  const entries = Route.useLoaderData(),
    [filter, setFilter] = useState("all"),
    [playing, setPlaying] = useState<string | null>(null);
  const visible = entries.filter(
    (e) => filter === "all" || e.language === filter,
  );
  return (
    <main className="page-shell gallery-page">
      <div className="page-heading">
        <div>
          <h1>Stories from the field.</h1>
          <p>Every story has a voice.</p>
        </div>
        <Link to="/" className="gallery-create">
          Create a video <ArrowRight size={16} />
        </Link>
      </div>
      <div className="gallery-toolbar">
        <span>
          {visible.length} {visible.length === 1 ? "story" : "stories"}
        </span>
        {entries.length > 0 && (
          <div className="gallery-filter">
            <label htmlFor="gallery-language">Language</label>
            <Select
              id="gallery-language"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All languages</option>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>
      {visible.length ? (
        <div className="gallery-grid">
          {visible.map((e) => (
            <article className="video-card" key={e.id}>
              {playing === e.id ? (
                <video
                  src={e.video_url ?? undefined}
                  controls
                  autoPlay
                  playsInline
                  aria-label={`${languageLabel(e.language)} testimonial video`}
                />
              ) : (
                <button
                  onClick={() => setPlaying(e.id)}
                  aria-label={`Play ${languageLabel(e.language)} testimonial`}
                >
                  {(e.portrait_url || e.source_portrait_url) && (
                    <img
                      src={e.portrait_url ?? e.source_portrait_url ?? ""}
                      alt="Farmer portrait"
                      loading="lazy"
                    />
                  )}
                  <span>
                    <Play size={22} fill="currentColor" />
                  </span>
                </button>
              )}
              <div className="video-meta">
                <span>{languageLabel(e.language)}</span>
                <span className="voice-label">
                  {e.input_mode === "audio" ? "Original voice" : "AI voice"}
                </span>
              </div>
              <p>
                {new Date(e.completed_at ?? e.created_at).toLocaleDateString(
                  "en-IN",
                  { day: "numeric", month: "short", year: "numeric" },
                )}{" "}
                · AI-generated
              </p>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Film size={34} strokeWidth={1} />
          <h2>
            {entries.length
              ? "No stories in this language yet."
              : "The first story could be yours."}
          </h2>
          <p>Create your first video to see it here.</p>
          <Link to="/">
            Create a testimonial <ArrowRight size={15} />
          </Link>
        </div>
      )}
    </main>
  );
}
