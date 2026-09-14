import { useEffect, useState } from "react";
import {
  Check,
  LoaderCircle,
  ScanFace,
  AudioLines,
  Video,
  Sprout,
  ArrowLeft,
  Download,
} from "lucide-react";
import { Button } from "./ui/button";
import { AGRI_FACTS } from "@/lib/facts";
import { formatDuration } from "@/lib/utils";
import type { PipelineState } from "@/lib/client/pipeline";
export function GenerationScreen({
  state,
  onReset,
}: {
  state: PipelineState;
  onReset: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const stages = [
    { key: "portrait", name: "Prepare portrait", icon: ScanFace },
    {
      key: "avatar",
      name: state.skipVoice ? "Animate your recording" : "Create voice & video",
      icon: AudioLines,
    },
    { key: "finish", name: "Finishing touches", icon: Video },
  ];
  const index = Math.max(
      0,
      state.statusNote === "Finishing your video"
        ? 2
        : stages.findIndex((s) => s.key === state.stage),
    ),
    elapsed = (now - (state.startedAt ?? now)) / 1000,
    stageElapsed = (now - (state.stageStartedAt ?? now)) / 1000;
  const progress =
    state.phase === "uploading"
      ? 3
      : Math.min(
          97,
          index * 30 +
            5 +
            Math.min(
              25,
              (25 * stageElapsed) / Math.max(1, state.stageEstimateSeconds),
            ),
        );
  const remaining =
    Math.max(0, state.stageEstimateSeconds - stageElapsed) + (2 - index) * 65;
  if (state.phase === "done")
    return (
      <main className="result-page">
        <div className="success-mark">
          <Check size={23} />
        </div>
        <h1>Your story is ready.</h1>

        <video
          src={state.videoUrl ?? undefined}
          poster={state.portraitUrl ?? undefined}
          controls
          playsInline
          className="result-video"
        />
        <div className="result-actions">
          <a
            className="download-link"
            href={`/api/download/${state.entry?.id}`}
          >
            <Download size={17} /> Download video
          </a>
          <Button variant="secondary" onClick={onReset}>
            <ArrowLeft size={16} /> Create another
          </Button>
        </div>
        <small>
          AI-generated video · Shared in the gallery with your consent
        </small>
      </main>
    );
  return (
    <main className="waiting-screen" aria-busy="true">
      <div className="waiting-art">
        {state.portraitUrl ? (
          <img src={state.portraitUrl} alt="Prepared portrait" />
        ) : (
          <ScanFace size={64} strokeWidth={1} />
        )}
        <div className="scan-line" />
      </div>
      <div className="waiting-heading">
        <h1>
          {state.phase === "uploading"
            ? "Uploading your files"
            : (state.statusNote ?? stages[index]?.name)}
        </h1>
        <p role="status">Natural voice. Unhurried movement.</p>
      </div>
      <div className="progress-block">
        <div
          className="progress-track"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Estimated generation progress"
        >
          <div style={{ width: `${progress}%` }} />
        </div>
        <div className="progress-numbers">
          <span>
            {Math.round(progress)}% <small>estimated</small>
          </span>
          <span>
            {formatDuration(elapsed)} elapsed <b>·</b>{" "}
            {remaining > 5
              ? `About ${formatDuration(remaining)} left`
              : "Taking a little longer"}
          </span>
        </div>
      </div>
      <ol className="stage-list">
        {stages.map((s, i) => {
          const done = i < index,
            active = i === index;
          return (
            <li
              key={s.key}
              className={done ? "complete" : active ? "current" : ""}
            >
              <span>
                {done ? (
                  <Check size={17} />
                ) : active ? (
                  <LoaderCircle className="spin" size={17} />
                ) : (
                  <s.icon size={17} />
                )}
              </span>
              <div>
                {s.name}
                <small>
                  {done
                    ? state.skipVoice && i === 1
                      ? "Original recording"
                      : "Complete"
                    : active
                      ? "In progress"
                      : "Up next"}
                </small>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="fact-panel">
        <Sprout size={22} />
        <div>
          <span>A little from the field</span>
          <p key={Math.floor(elapsed / 12)}>
            {AGRI_FACTS[Math.floor(elapsed / 12) % AGRI_FACTS.length]}
          </p>
        </div>
      </div>
    </main>
  );
}
