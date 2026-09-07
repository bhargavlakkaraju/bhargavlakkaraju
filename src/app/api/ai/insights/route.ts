import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { differenceInDays, format } from "date-fns";
import { z } from "zod";
import { aiChat, aiEnabled } from "@/lib/ai";
import { prisma } from "@/lib/db";
import { fullName, STAGE_LABELS } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Insights = { summary: string; actions: string[]; emailDraft: string; engine: "ai" | "rules" };

/**
 * Generates a relationship summary, next-best-actions and a follow-up email
 * draft for one contact. Uses the configured LLM when available; otherwise
 * falls back to a deterministic rules engine so the feature always works.
 */
export async function POST(req: NextRequest) {
  const parsed = z.object({ contactId: z.string() }).safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "contactId required" }, { status: 422 });
  }

  const contact = await prisma.contact.findUnique({
    where: { id: parsed.data.contactId },
    include: {
      company: true,
      campaign: true,
      deals: { orderBy: { createdAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  let insights = aiEnabled() ? await generateWithAi(contact) : null;
  insights ??= generateWithRules(contact);

  await prisma.contact.update({
    where: { id: contact.id },
    data: { aiSummary: insights.summary },
  });

  return NextResponse.json(insights);
}

type FullContact = Prisma.ContactGetPayload<{
  include: { company: true; campaign: true; deals: true; activities: true };
}>;

async function generateWithAi(contact: FullContact): Promise<Insights | null> {
  const context = {
    name: fullName(contact),
    title: contact.title,
    status: contact.status,
    source: contact.source,
    score: contact.score,
    company: contact.company?.name,
    campaign: contact.campaign?.name,
    customData: contact.customData ? JSON.parse(contact.customData) : null,
    deals: contact.deals.map((d) => ({ title: d.title, value: d.value, stage: d.stage })),
    recentActivity: contact.activities.map((a) => ({
      type: a.type,
      content: a.content.slice(0, 300),
      date: format(a.createdAt, "yyyy-MM-dd"),
      completed: a.completed,
    })),
  };

  const raw = await aiChat(
    [
      {
        role: "system",
        content:
          "You are a CRM copilot for Hoopla, a marketing agency in India. Given a contact record, respond with JSON: " +
          '{"summary": "2-3 sentence relationship summary", "actions": ["3-4 concrete next best actions"], ' +
          '"emailDraft": "a short, warm, professional follow-up email with subject line"}. Be specific to the data given.',
      },
      { role: "user", content: JSON.stringify(context) },
    ],
    { json: true, maxTokens: 700 }
  );
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.summary || !Array.isArray(parsed.actions) || !parsed.emailDraft) return null;
    return { summary: parsed.summary, actions: parsed.actions, emailDraft: parsed.emailDraft, engine: "ai" };
  } catch {
    return null;
  }
}

function generateWithRules(contact: FullContact): Insights {
  const name = fullName(contact);
  const first = contact.firstName;
  const openDeals = contact.deals.filter((d) => !["WON", "LOST"].includes(d.stage));
  const openTasks = contact.activities.filter((a) => a.type === "TASK" && !a.completed);
  const lastTouch = contact.activities[0];
  const daysSinceTouch = lastTouch ? differenceInDays(new Date(), lastTouch.createdAt) : null;

  const summaryParts = [
    `${name} is a ${contact.status.toLowerCase()} lead from ${contact.source}` +
      (contact.campaign ? ` on the ${contact.campaign.name} campaign` : "") +
      (contact.company ? `, linked to ${contact.company.name}` : "") +
      ".",
  ];
  if (openDeals.length) {
    summaryParts.push(
      `There ${openDeals.length === 1 ? "is" : "are"} ${openDeals.length} open deal${openDeals.length > 1 ? "s" : ""} worth ₹${openDeals.reduce((s, d) => s + d.value, 0).toLocaleString("en-IN")} (${openDeals.map((d) => STAGE_LABELS[d.stage] ?? d.stage).join(", ")}).`
    );
  }
  summaryParts.push(
    lastTouch
      ? `Last touchpoint was a ${lastTouch.type.toLowerCase()} ${daysSinceTouch === 0 ? "today" : `${daysSinceTouch} day${daysSinceTouch === 1 ? "" : "s"} ago`}.`
      : "No touchpoints logged yet."
  );

  const actions: string[] = [];
  if (contact.status === "NEW") actions.push("Make first contact within 24 hours — fresh leads convert best.");
  if (!contact.phone) actions.push("Collect a phone number on the next touch — reachability lifts the lead score.");
  if (daysSinceTouch != null && daysSinceTouch > 7) actions.push(`Re-engage: no activity for ${daysSinceTouch} days.`);
  if (openTasks.length) actions.push(`Clear ${openTasks.length} pending task${openTasks.length > 1 ? "s" : ""}: "${openTasks[0].content.slice(0, 60)}…"`);
  if (contact.status === "QUALIFIED" && !openDeals.length) actions.push("Qualified with no open deal — create one so the pipeline reflects reality.");
  if (openDeals.length) actions.push(`Push "${openDeals[0].title}" to the next stage or log why it's blocked.`);
  if (!actions.length) actions.push("Log a check-in call to keep the relationship warm.");

  const emailDraft = [
    `Subject: Quick follow-up from Hoopla${contact.campaign ? ` — ${contact.campaign.name}` : ""}`,
    "",
    `Hi ${first},`,
    "",
    contact.campaign
      ? `Thanks for your interest in the ${contact.campaign.name} campaign. I wanted to check in and see how we can help you take the next step.`
      : "I wanted to follow up on our recent conversation and see how we can help you take the next step.",
    openDeals.length ? `On our side, "${openDeals[0].title}" is ready to move whenever you are.` : "Happy to set up a quick call this week if that's easier.",
    "",
    "Best regards,",
    "Team Hoopla",
  ].join("\n");

  return { summary: summaryParts.join(" "), actions: actions.slice(0, 4), emailDraft, engine: "rules" };
}
