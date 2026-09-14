import { useEffect, useRef, useState } from "react";
import { Play, X, Check } from "lucide-react";

export function PortraitPreview({
  image,
  onChangePhoto,
}: {
  image: string | null;
  onChangePhoto: () => void;
}) {
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
            "AI-generated example"
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
          <span>{image ? "Your photo" : "Example video"}</span>
          <strong>
            {image ? "Ready to use" : "See a finished testimonial"}
          </strong>
        </div>
        {image && (
          <button
            type="button"
            className="change-photo"
            onClick={onChangePhoto}
          >
            Change photo
          </button>
        )}
        {!image && (
          <button
            type="button"
            className="example-play"
            aria-label="Watch example"
            disabled={!hydrated}
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
