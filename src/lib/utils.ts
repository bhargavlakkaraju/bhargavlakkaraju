import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Outreach lifecycle for agency new-business prospecting
export const CONTACT_STATUSES = [
  "PROSPECT",
  "CONTACTED",
  "REPLIED",
  "MEETING_BOOKED",
  "CLIENT",
  "NOT_INTERESTED",
] as const;

export const STATUS_LABELS: Record<string, string> = {
  PROSPECT: "Prospect",
  CONTACTED: "Contacted",
  REPLIED: "Replied",
  MEETING_BOOKED: "Meeting booked",
  CLIENT: "Client",
  NOT_INTERESTED: "Not interested",
};

export const DEAL_STAGES = [
  "LEAD_IN",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
] as const;

// New-business pipeline labels (keys kept stable for stored data)
export const STAGE_LABELS: Record<string, string> = {
  LEAD_IN: "Opportunity",
  QUALIFIED: "Discovery call",
  PROPOSAL: "Proposal sent",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

export const STATUS_COLORS: Record<string, string> = {
  PROSPECT: "bg-blue-100 text-blue-700",
  CONTACTED: "bg-amber-100 text-amber-700",
  REPLIED: "bg-violet-100 text-violet-700",
  MEETING_BOOKED: "bg-sky-100 text-sky-700",
  CLIENT: "bg-emerald-100 text-emerald-700",
  NOT_INTERESTED: "bg-slate-100 text-slate-500",
};

export const STAGE_COLORS: Record<string, string> = {
  LEAD_IN: "border-blue-400",
  QUALIFIED: "border-violet-400",
  PROPOSAL: "border-amber-400",
  NEGOTIATION: "border-orange-400",
  WON: "border-emerald-400",
  LOST: "border-slate-300",
};

export const ACTIVITY_TYPES = [
  "NOTE",
  "CALL",
  "EMAIL",
  "LINKEDIN",
  "MEETING",
  "TASK",
] as const;

/** Statuses meaning "we reached out" — the denominator for reply rate. */
export const OUTREACHED_STATUSES = ["CONTACTED", "REPLIED", "MEETING_BOOKED", "CLIENT"];
/** Statuses meaning "they responded" — the numerator for reply rate. */
export const REPLIED_STATUSES = ["REPLIED", "MEETING_BOOKED", "CLIENT"];

export function formatMoney(value: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function fullName(c: { firstName: string; lastName?: string | null }) {
  return [c.firstName, c.lastName].filter(Boolean).join(" ");
}
