import { scoreTone } from "@/lib/scoring";

export function ScoreBadge({ score, reason }: { score: number | null; reason?: string | null }) {
  if (score == null) return <span className="text-xs text-slate-300">—</span>;
  return (
    <span
      title={reason ?? undefined}
      className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs font-bold ${scoreTone(score)}`}
    >
      {score}
    </span>
  );
}
