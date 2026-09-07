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
  PROSPECT: "bg-blue-50 text-blue-700",
  CONTACTED: "bg-amber-50 text-amber-700",
  REPLIED: "bg-violet-50 text-violet-700",
  MEETING_BOOKED: "bg-sky-50 text-sky-700",
  CLIENT: "bg-emerald-50 text-emerald-700",
  NOT_INTERESTED: "bg-slate-50 text-slate-500",
};

// Dot colors for pipeline stage indicators
export const STAGE_COLORS: Record<string, string> = {
  LEAD_IN: "bg-blue-500",
  QUALIFIED: "bg-violet-500",
  PROPOSAL: "bg-amber-500",
  NEGOTIATION: "bg-orange-500",
  WON: "bg-emerald-500",
  LOST: "bg-slate-300",
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
