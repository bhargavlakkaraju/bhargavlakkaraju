import { useEffect, useState } from "react";
import { Play, AudioLines, Check } from "lucide-react";
export function PortraitPreview({ image }: { image: string | null }) {
  const [playing, setPlaying] = useState(false);
  useEffect(() => setPlaying(false), [image]);
  return (
    <aside className="preview-aside" aria-label="Video preview">
      <div className="preview-topline">
        <span>Preview</span>
        <span className="ratio-label">9:16 · Vertical</span>
      </div>
      <div className="preview-stage">
        <div className={`portrait-frame ${playing ? "is-playing" : ""}`}>
          {playing && !image ? (
            <video
              className="demo-video"
              src="/demo-ugc.mp4"
              poster="/demo-poster.webp"
              controls
              autoPlay
              playsInline
              aria-label="Hindi example video"
              onEnded={() => setPlaying(false)}
            />
          ) : (
            <>
              <img
                src={image ?? "/demo-poster.webp"}
                alt={
                  image
                    ? "Portrait composition preview"
                    : "AI-generated example farmer portrait"
                }
                className="portrait-image"
                decoding="async"
              />
              <span className="preview-pill">
                <span className="status-dot" />
                {image ? "Your portrait" : "AI example · हिन्दी"}
              </span>
              <div className="preview-bottom">
                <h2>
                  {image ? (
                    "Ready for your story."
                  ) : (
                    <>
                      A story.
                      <br />A familiar voice.
                    </>
                  )}
                </h2>
                {!image && (
                  <button
                    type="button"
                    className="example-play"
                    onClick={() => setPlaying(true)}
                  >
                    <Play size={12} fill="currentColor" /> Watch example
                  </button>
                )}
              </div>
            </>
          )}
        </div>
        <div className="preview-foot">
          <span>
            <AudioLines size={13} />
            Your language
          </span>
          <span>
            <Check size={13} />
            Made to share
          </span>
        </div>
      </div>
      <div className="preview-caption">
        <strong>One photo. A new possibility.</strong>
        <span>PortraitVoice</span>
      </div>
    </aside>
  );
}
