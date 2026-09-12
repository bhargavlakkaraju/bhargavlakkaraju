import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Sprout } from "lucide-react";
import { FARMING_FACTS } from "@/lib/facts";
import { formatSeconds } from "@/lib/format";
import { STAGES, type Stage } from "@/lib/types";
import type { RunningState } from "@/lib/use-pipeline";
import { cn } from "@/lib/utils";

const STAGE_TITLES: Record<Stage, string> = { portrait: "Portrait", voice: "Voice", avatar: "Video" };
const STAGE_BLURBS: Record<Stage, string> = {
  portrait: "Re-framing your photo into a vertical village scene",
  voice: "Turning the testimonial into natural speech",
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

/** Stage weights come from the estimates; elapsed time within a stage is capped at 95%. */
export function useWaitingProgress(state: RunningState, now: number) {
  return useMemo(() => {
    const total = STAGES.reduce((sum, stage) => sum + state.estimate[stage], 0);
    let percent = 0;
    let remaining = 0;
    for (const stage of STAGES) {
      const weight = state.estimate[stage] / total;
      if (state.done.includes(stage)) percent += weight;
      else if (stage === state.stage) {
        const elapsed = (now - state.stageStartedAt) / 1000;
        percent += weight * Math.min(0.95, elapsed / Math.max(1, state.estimate[stage]));
        remaining += Math.max(3, state.estimate[stage] - elapsed);
      } else remaining += state.estimate[stage];
    }
    return { percent: Math.round(percent * 100), elapsed: (now - state.startedAt) / 1000, remaining };
  }, [now, state]);
}

export function WaitingScreen({ state, className }: { state: RunningState; className?: string }) {
  const now = useNow(1000);
  const { percent, elapsed, remaining } = useWaitingProgress(state, now);
  const factIndex = Math.floor((now - state.startedAt) / 8000) % FARMING_FACTS.length;
  const fact = FARMING_FACTS[factIndex] ?? FARMING_FACTS[0];

  return (
    <section aria-live="polite" className={cn("glass-card flex min-h-[calc(100dvh-6rem)] w-full flex-col justify-between gap-5 p-5 lg:min-h-0 lg:p-6", className)}>
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-green-light">Creating your video</p>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Loader2 className="size-5 animate-spin text-brand-green-light" aria-hidden />
          <span className="truncate">{STAGE_TITLES[state.stage]}: {state.stageLabel}</span>
        </h2>
        <p className="text-sm text-white/60">{STAGE_BLURBS[state.stage]}</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-end justify-between">
          <span className="text-4xl font-bold tabular-nums">{percent}%</span>
          <div className="text-right text-xs text-white/60 tabular-nums">
            <p>Elapsed {formatSeconds(elapsed)}</p>
            <p>About {formatSeconds(remaining)} left</p>
          </div>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-gradient-to-r from-brand-green to-brand-blue-light transition-[width] duration-700" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <ol className="flex flex-col gap-2">
        {STAGES.map((stage, index) => {
          const isDone = state.done.includes(stage);
          const isActive = stage === state.stage;
          return (
            <li key={stage} aria-current={isActive ? "step" : undefined} className={cn("flex items-center gap-3 rounded-xl border px-3 py-2", isActive ? "border-brand-green/40 bg-brand-green/10" : "border-line")}>
              <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold", isDone ? "bg-brand-green text-black" : "bg-white/10 text-white/70")}>
                {isDone ? <Check className="size-4" strokeWidth={3} /> : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-semibold", isDone || isActive ? "text-white" : "text-white/50")}>{STAGE_TITLES[stage]}</p>
                <p className="truncate text-xs text-white/50">{isDone ? "Done" : isActive ? state.stageLabel : "Waiting"}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex items-start gap-3 rounded-xl bg-black/25 p-4">
        <Sprout className="mt-0.5 size-5 shrink-0 text-brand-green-light" aria-hidden />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Did you know?</p>
          <p key={factIndex} className="fade-up text-sm text-white/90">{fact}</p>
        </div>
      </div>
    </section>
  );
}
