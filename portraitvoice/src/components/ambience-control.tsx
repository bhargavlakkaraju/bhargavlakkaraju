import { useEffect, useRef, useState } from "react";
import { Leaf, Play, Square } from "lucide-react";
import { toast } from "sonner";
export function AmbienceControl({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(
    () => () => {
      audio.current?.pause();
    },
    [],
  );
  async function togglePreview() {
    if (playing) {
      audio.current?.pause();
      setPlaying(false);
      return;
    }
    const sound = audio.current ?? new Audio("/audio/outdoor-ambience.mp3");
    audio.current = sound;
    sound.volume = 0.6;
    sound.currentTime = 0;
    sound.onended = () => setPlaying(false);
    try {
      await sound.play();
      setPlaying(true);
    } catch {
      toast.error("The ambience preview could not play. Please try again.");
      setPlaying(false);
    }
  }
  return (
    <div className="ambience-control">
      <div className="ambience-copy">
        <Leaf size={18} strokeWidth={1.6} />
        <div>
          <strong id="ambience-label">Outdoor ambience</strong>
          <small>Soft field sounds, beneath your voice</small>
        </div>
      </div>
      <div className="ambience-actions">
        <button
          type="button"
          className="sound-preview"
          aria-label={
            playing ? "Stop ambience preview" : "Preview outdoor ambience"
          }
          onClick={() => void togglePreview()}
        >
          {playing ? (
            <Square size={11} fill="currentColor" />
          ) : (
            <Play size={12} fill="currentColor" />
          )}
        </button>
        <button
          type="button"
          role="switch"
          aria-labelledby="ambience-label"
          aria-checked={enabled}
          className="switch"
          onClick={() => onChange(!enabled)}
        >
          <span />
        </button>
      </div>
    </div>
  );
}
