import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CONTACT_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "CUSTOMER",
  "LOST",
] as const;

export const DEAL_STAGES = [
  "LEAD_IN",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
] as const;

export const STAGE_LABELS: Record<string, string> = {
  LEAD_IN: "Lead In",
  QUALIFIED: "Qualified",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

export const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  CONTACTED: "bg-amber-100 text-amber-700",
  QUALIFIED: "bg-violet-100 text-violet-700",
  CUSTOMER: "bg-emerald-100 text-emerald-700",
  LOST: "bg-slate-100 text-slate-500",
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
  "MEETING",
  "TASK",
] as const;

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
