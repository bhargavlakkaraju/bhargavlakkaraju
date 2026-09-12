import { useEffect, useMemo, useState } from "react";
import { Check as IconCheck, Sprout as IconSprout } from "lucide-react";
import { Icon } from "@higgsfield/quanta/icon";
import { Loader } from "@higgsfield/quanta/loader";
import { Progress } from "@higgsfield/quanta/progress";
import { Typography } from "@higgsfield/quanta/typography";
import { FARMING_FACTS } from "@/lib/portraitvoice/facts";
import { formatSeconds } from "@/lib/portraitvoice/format";
import type { RunningState } from "@/lib/portraitvoice/use-pipeline";
import { STAGES, type Stage } from "@/lib/portraitvoice/types";
import { cn } from "@/lib/utils";

const STAGE_TITLES: Record<Stage, string> = {
  portrait: "Portrait",
  voice: "Voice",
  avatar: "Video",
};

const STAGE_BLURBS: Record<Stage, string> = {
  portrait: "Re-framing your photo into a vertical village scene",
  voice: "Locking the testimonial voice",
  avatar: "Animating and lip-syncing the talking-head video",
};

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/** Progress model: stage weights from the estimates, elapsed within the stage capped at 95%. */
export function useWaitingProgress(state: RunningState, now: number) {
  return useMemo(() => {
    const total = STAGES.reduce((sum, stage) => sum + state.estimate[stage], 0);
    let percent = 0;
    for (const stage of STAGES) {
      const weight = state.estimate[stage] / total;
      if (state.done.includes(stage)) percent += weight;
      else if (stage === state.stage) {
        const elapsed = (now - state.stageStartedAt) / 1000;
        percent += weight * Math.min(0.95, elapsed / Math.max(1, state.estimate[stage]));
      }
    }
    const elapsedTotal = (now - state.startedAt) / 1000;
    const remaining = Math.max(5, total - elapsedTotal * Math.max(percent, 0.05) / Math.max(percent, 0.05));
    const remainingByStages = STAGES.reduce((sum, stage) => {
      if (state.done.includes(stage)) return sum;
      if (stage === state.stage) return sum + Math.max(3, state.estimate[stage] - (now - state.stageStartedAt) / 1000);
      return sum + state.estimate[stage];
    }, 0);
    return { percent: Math.round(percent * 100), elapsed: elapsedTotal, remaining: Math.min(remaining, remainingByStages) };
  }, [now, state]);
}

export function WaitingScreen({ state, className }: { state: RunningState; className?: string }) {
  const now = useNow(1000);
  const { percent, elapsed, remaining } = useWaitingProgress(state, now);
  const factIndex = Math.floor((now - state.startedAt) / 8000) % FARMING_FACTS.length;
  const fact = FARMING_FACTS[factIndex] ?? FARMING_FACTS[0];

  return (
    <section
      aria-live="polite"
      className={cn(
        "flex min-h-[calc(100dvh-7rem)] w-full flex-col justify-between gap-6 rounded-q-600 border border-q-border-subtle bg-q-background-secondary p-5 lg:min-h-0 lg:p-8",
        className,
      )}
    >
      <div className="flex flex-col gap-2">
        <Typography as="p" variant="caption-sm-medium" color="secondary" className="uppercase tracking-wide">
          Creating your video
        </Typography>
        <div className="flex items-center gap-3">
          <Loader variant="stars" size="sm" color="brand" aria-label="Working" />
          <Typography as="h2" variant="title-lg-semi-bold" color="primary" className="truncate">
            {STAGE_TITLES[state.stage]}: {state.stageLabel}
          </Typography>
        </div>
        <Typography as="p" variant="body-sm-regular" color="secondary">
          {STAGE_BLURBS[state.stage]}
        </Typography>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-end justify-between">
          <Typography as="span" variant="display-md-bold" color="primary" className="tabular-nums">
            {percent}%
          </Typography>
          <div className="text-right">
            <Typography as="p" variant="caption-sm-medium" color="secondary" className="tabular-nums">
              Elapsed {formatSeconds(elapsed)}
            </Typography>
            <Typography as="p" variant="caption-sm-medium" color="tertiary" className="tabular-nums">
              About {formatSeconds(remaining)} left
            </Typography>
          </div>
        </div>
        <Progress value={percent} max={100} size="md" color="brand" animated aria-label="Overall progress" />
      </div>

      <ol className="flex flex-col gap-2">
        {STAGES.map((stage, index) => {
          const isDone = state.done.includes(stage);
          const isActive = stage === state.stage;
          return (
            <li
              key={stage}
              aria-current={isActive ? "step" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-q-400 border px-3 py-2",
                isActive
                  ? "border-q-border-strong bg-q-transparent-light-05"
                  : "border-q-border-subtle",
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-q-caption-sm-medium",
                  isDone ? "bg-q-brand-primary text-q-text-inverse" : "bg-q-background-tertiary text-q-text-secondary",
                )}
              >
                {isDone ? <Icon size="xs" as={IconCheck} /> : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <Typography as="p" variant="label-lg-semi-bold" color={isDone || isActive ? "primary" : "tertiary"}>
                  {STAGE_TITLES[stage]}
                </Typography>
                <Typography as="p" variant="caption-sm-regular" color="tertiary" truncate>
                  {isDone ? "Done" : isActive ? state.stageLabel : "Waiting"}
                </Typography>
              </div>
              {isActive ? <Loader size="xs" color="neutral" aria-label="In progress" /> : null}
            </li>
          );
        })}
      </ol>

      <div className="flex items-start gap-3 rounded-q-400 bg-q-background-tertiary p-4">
        <Icon size="md" as={IconSprout} color="brand" />
        <div className="min-w-0">
          <Typography as="p" variant="caption-sm-medium" color="secondary" className="uppercase tracking-wide">
            Did you know?
          </Typography>
          <Typography as="p" variant="body-md-regular" color="primary" key={factIndex}>
            {fact}
          </Typography>
        </div>
      </div>
    </section>
  );
}
