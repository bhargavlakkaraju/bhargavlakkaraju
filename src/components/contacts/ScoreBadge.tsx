import { scoreTone } from "@/lib/scoring";

export function ScoreBadge({ score, reason }: { score: number | null; reason?: string | null }) {
  if (score == null) return <span className="text-xs text-slate-300">—</span>;
  return (
    <span
      title={reason ?? undefined}
      className={`inline-flex h-6 min-w-8 items-center justify-center rounded-md px-1.5 text-xs font-semibold ring-1 ring-inset ring-black/5 ${scoreTone(score)}`}
    >
      {score}
    </span>
  );
}
