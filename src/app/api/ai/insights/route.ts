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
          "You are a new-business outreach copilot for Hoopla, a marketing agency in India pitching its services " +
          "(campaign strategy, performance marketing, AI chatbots, full-funnel tracking) to prospective clients. " +
          "Given a prospect record, respond with JSON: " +
          '{"summary": "2-3 sentence summary of where this prospect is in the outreach funnel", ' +
          '"actions": ["3-4 concrete next outreach moves"], ' +
          '"emailDraft": "a short, personalised outreach or follow-up email with subject line, pitching Hoopla\'s services, tailored to the prospect\'s company/industry and funnel stage"}. ' +
          "Be specific to the data given; never invent facts about the prospect.",
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
  const companyBit = contact.company ? ` at ${contact.company.name}` : "";
  const openDeals = contact.deals.filter((d) => !["WON", "LOST"].includes(d.stage));
  const openTasks = contact.activities.filter((a) => a.type === "TASK" && !a.completed);
  const lastTouch = contact.activities.find((a) => a.type !== "TASK");
  const daysSinceTouch = lastTouch ? differenceInDays(new Date(), lastTouch.createdAt) : null;

  const stageLine: Record<string, string> = {
    PROSPECT: `${name}${companyBit} is an unworked prospect from ${contact.source} — no outreach sent yet`,
    CONTACTED: `${name}${companyBit} has been contacted via ${contact.source} and hasn't replied yet`,
    REPLIED: `${name}${companyBit} replied to our outreach — the conversation is live`,
    MEETING_BOOKED: `${name}${companyBit} has a meeting booked — prep is the priority`,
    CLIENT: `${name}${companyBit} is now a client`,
    NOT_INTERESTED: `${name}${companyBit} passed on our pitch for now`,
  };
  const summaryParts = [
    (stageLine[contact.status] ?? `${name}${companyBit} is in the outreach funnel`) +
      (contact.campaign ? ` (${contact.campaign.name})` : "") +
      ".",
  ];
  if (openDeals.length) {
    summaryParts.push(
      `There ${openDeals.length === 1 ? "is" : "are"} ${openDeals.length} open pitch${openDeals.length > 1 ? "es" : ""} worth ₹${openDeals.reduce((s, d) => s + d.value, 0).toLocaleString("en-IN")} (${openDeals.map((d) => STAGE_LABELS[d.stage] ?? d.stage).join(", ")}).`
    );
  }
  summaryParts.push(
    lastTouch
      ? `Last touchpoint was a ${lastTouch.type.toLowerCase()} ${daysSinceTouch === 0 ? "today" : `${daysSinceTouch} day${daysSinceTouch === 1 ? "" : "s"} ago`}.`
      : "No touchpoints logged yet."
  );

  const actions: string[] = [];
  if (contact.status === "PROSPECT") actions.push("Send the first outreach — personalise the opener with their company or industry.");
  if (contact.status === "CONTACTED" && daysSinceTouch != null && daysSinceTouch >= 3)
    actions.push(`No reply for ${daysSinceTouch} days — send follow-up with a new angle (case study or result, not a "just checking in").`);
  if (contact.status === "REPLIED") actions.push("They replied — propose two concrete time slots for a 20-minute intro call.");
  if (contact.status === "MEETING_BOOKED") actions.push("Prep the meeting: research their current marketing, bring one relevant case study and a strawman scope.");
  if (contact.status === "MEETING_BOOKED" && !openDeals.length) actions.push("Open a pitch in the pipeline so the meeting has a deal attached.");
  if (!contact.phone && contact.status !== "PROSPECT") actions.push("Get a phone/WhatsApp number on the next touch — faster loops than email.");
  if (openTasks.length) actions.push(`Clear ${openTasks.length} pending task${openTasks.length > 1 ? "s" : ""}: "${openTasks[0].content.slice(0, 60)}…"`);
  if (openDeals.length) actions.push(`Move "${openDeals[0].title}" forward or log what's blocking it.`);
  if (!actions.length) actions.push("Log the next touchpoint to keep the thread warm.");

  const isFollowUp = contact.status !== "PROSPECT";
  const industryBit = contact.company?.industry ? ` ${contact.company.industry.toLowerCase()}` : "";
  const emailDraft = [
    `Subject: ${isFollowUp ? `Re: Hoopla × ${contact.company?.name ?? first}` : `Growing ${contact.company?.name ?? "your brand"} — an idea from Hoopla`}`,
    "",
    `Hi ${first},`,
    "",
    isFollowUp
      ? `Following up on my last note — I know inboxes are brutal. We've been helping${industryBit} brands run full-funnel campaigns (strategy, performance marketing, AI chatbots) and I think there's a fit with ${contact.company?.name ?? "your team"}.`
      : `I run new business at Hoopla — we build full-funnel campaigns (strategy, performance marketing, AI chatbots, end-to-end tracking) for${industryBit} brands, and ${contact.company?.name ?? "your company"} looks like exactly the kind of team we do our best work with.`,
    "",
    "Worth a 20-minute call this week? Happy to share a case study relevant to your space either way.",
    "",
    "Best,",
    "Team Hoopla",
  ].join("\n");

  return { summary: summaryParts.join(" "), actions: actions.slice(0, 4), emailDraft, engine: "rules" };
}
