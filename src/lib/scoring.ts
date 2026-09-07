import type { Activity, Contact, Deal } from "@prisma/client";

export type ScorableContact = Contact & {
  deals?: Deal[];
  activities?: Activity[];
  campaign?: { name: string } | null;
  company?: { name: string } | null;
};

/**
 * Deterministic prospect score (0–100) for agency outreach. Rewards
 * engagement (replies, meetings), reachability and open pipeline; penalises
 * outreach that has gone quiet. Always available — AI only adds a richer
 * explanation on top, never replaces the number.
 */
export function heuristicScore(c: ScorableContact): { score: number; reason: string } {
  if (c.status === "NOT_INTERESTED") {
    return { score: 5, reason: "Marked not interested — park them and revisit in a quarter or two." };
  }
  if (c.status === "CLIENT") {
    return { score: 95, reason: "Already a client — focus on delivery, retention and upsell." };
  }

  let score = 15;
  const why: string[] = [];

  if (c.status === "MEETING_BOOKED") { score += 40; why.push("meeting booked"); }
  else if (c.status === "REPLIED") { score += 30; why.push("replied to outreach"); }
  else if (c.status === "CONTACTED") { score += 8; why.push("outreach sent, awaiting reply"); }

  if (c.email) { score += 8; why.push("email on file"); }
  if (c.phone) { score += 6; why.push("phone on file"); }
  if (c.companyId) { score += 6; why.push("company identified"); }
  if (c.title) { score += 5; why.push("decision-maker title known"); }

  const openDeals = (c.deals ?? []).filter((d) => !["WON", "LOST"].includes(d.stage));
  if (openDeals.length) {
    score += Math.min(15, openDeals.length * 8);
    why.push(`${openDeals.length} open pitch${openDeals.length > 1 ? "es" : ""}`);
  }

  const touches = (c.activities ?? []).filter((a) => a.type !== "TASK").length;
  if (touches >= 3) { score += 6; why.push("multiple touchpoints"); }
  else if (touches > 0) { score += 3; why.push("some touchpoints"); }

  const lastActivity = (c.activities ?? [])
    .map((a) => new Date(a.createdAt).getTime())
    .sort((a, b) => b - a)[0];
  const daysSinceTouch = lastActivity ? (Date.now() - lastActivity) / 86400000 : null;
  if (c.status === "CONTACTED" && daysSinceTouch != null && daysSinceTouch > 5) {
    score -= 8;
    why.push(`no reply for ${Math.floor(daysSinceTouch)} days — follow up`);
  }

  const ageDays = (Date.now() - new Date(c.createdAt).getTime()) / 86400000;
  if (c.status === "PROSPECT" && ageDays <= 3) { score += 5; why.push("fresh prospect"); }
  else if (c.status === "PROSPECT" && ageDays > 14) { score -= 5; why.push("sitting unworked for 2+ weeks"); }

  score = Math.max(0, Math.min(94, score));
  return { score, reason: `Signals: ${why.join(", ") || "very little data yet"}.` };
}

export function scoreTone(score: number | null | undefined) {
  if (score == null) return "bg-slate-50 text-slate-400";
  if (score >= 75) return "bg-emerald-50 text-emerald-700";
  if (score >= 50) return "bg-amber-50 text-amber-700";
  return "bg-slate-50 text-slate-500";
}
