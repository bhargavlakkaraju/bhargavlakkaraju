import { useEffect, useRef, useState } from "react";
import { Play, X, Check } from "lucide-react";

export function PortraitPreview({ image }: { image: string | null }) {
  const [playing, setPlaying] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (playing) dialog.current?.showModal();
    else dialog.current?.close();
  }, [playing]);
  useEffect(() => setPlaying(false), [image]);
  return (
    <aside
      className={`preview-aside ${image ? "has-portrait" : ""}`}
      aria-label="Video preview"
    >
      <div className="preview-stage">
        <span className="preview-tag">
          {image ? (
            <>
              <Check size={13} /> Photo added
            </>
          ) : (
            "Made with PortraitVoice"
          )}
        </span>
        <div className="portrait-frame">
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
        </div>
        <span className="preview-format">9:16</span>
      </div>
      <div className="preview-caption">
        <div>
          <span>{image ? "Your portrait" : "See what’s possible"}</span>
          <strong>
            {image ? "A face to your story." : "One photo. A familiar voice."}
          </strong>
        </div>
        {!image && (
          <button
            type="button"
            className="example-play"
            aria-label="Watch example"
            onClick={() => setPlaying(true)}
          >
            <Play size={17} fill="currentColor" />
            <span>Watch example</span>
          </button>
        )}
      </div>
      <dialog
        ref={dialog}
        className="example-dialog"
        aria-label="Example testimonial"
        onClose={() => setPlaying(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setPlaying(false);
        }}
      >
        <button
          type="button"
          className="close-example"
          aria-label="Close example"
          onClick={() => setPlaying(false)}
        >
          <X size={20} />
        </button>
        {playing && (
          <video
            src="/demo-ugc.mp4"
            poster="/demo-poster.webp"
            controls
            autoPlay
            playsInline
            aria-label="Hindi example video"
          />
        )}
      </dialog>
    </aside>
  );
}
