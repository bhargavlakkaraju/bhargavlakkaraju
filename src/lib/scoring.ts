import type { Activity, Contact, Deal } from "@prisma/client";

export type ScorableContact = Contact & {
  deals?: Deal[];
  activities?: Activity[];
  campaign?: { name: string } | null;
  company?: { name: string } | null;
};

/**
 * Deterministic lead score (0–100). Rewards reachability, qualification
 * progress, engagement and open pipeline. Always available — AI only adds
 * a richer explanation on top, never replaces the number.
 */
export function heuristicScore(c: ScorableContact): { score: number; reason: string } {
  if (c.status === "LOST") {
    return { score: 5, reason: "Marked lost — revisit only if the campaign re-engages them." };
  }
  if (c.status === "CUSTOMER") {
    return { score: 95, reason: "Already a customer — prioritise retention and upsell." };
  }

  let score = 20;
  const why: string[] = [];

  if (c.email) { score += 12; why.push("email on file"); }
  if (c.phone) { score += 10; why.push("phone on file"); }
  if (c.companyId) { score += 8; why.push("linked to a company"); }
  if (c.title) { score += 5; why.push("job title known"); }
  if (c.campaignId) { score += 5; why.push("attributed to a campaign"); }

  if (c.status === "QUALIFIED") { score += 22; why.push("qualified"); }
  else if (c.status === "CONTACTED") { score += 10; why.push("already contacted"); }

  const openDeals = (c.deals ?? []).filter((d) => !["WON", "LOST"].includes(d.stage));
  if (openDeals.length) {
    score += Math.min(15, openDeals.length * 8);
    why.push(`${openDeals.length} open deal${openDeals.length > 1 ? "s" : ""}`);
  }

  const activityCount = (c.activities ?? []).length;
  if (activityCount >= 3) { score += 8; why.push("actively engaged"); }
  else if (activityCount > 0) { score += 4; why.push("some engagement"); }

  const ageDays = (Date.now() - new Date(c.createdAt).getTime()) / 86400000;
  if (ageDays <= 3) { score += 5; why.push("fresh lead"); }
  else if (ageDays > 30 && c.status === "NEW") { score -= 10; why.push("going cold (30+ days untouched)"); }

  score = Math.max(0, Math.min(94, score));
  return { score, reason: `Signals: ${why.join(", ") || "very little data yet"}.` };
}

export function scoreTone(score: number | null | undefined) {
  if (score == null) return "bg-slate-100 text-slate-400";
  if (score >= 75) return "bg-emerald-100 text-emerald-700";
  if (score >= 50) return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-500";
}
