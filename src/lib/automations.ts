import type { Contact } from "@prisma/client";
import { prisma } from "./db";
import { fullName } from "./utils";

export type AutomationTrigger = "CONTACT_CREATED" | "STATUS_CHANGED";

export type AutomationConditions = {
  campaign?: string;
  source?: string;
  status?: string;
  minScore?: number;
};

export type AutomationAction =
  | { type: "SET_STATUS"; value: string }
  | { type: "ADD_TAG"; value: string }
  | { type: "CREATE_TASK"; value: string }
  | { type: "CREATE_DEAL"; title: string; value?: number }
  | { type: "WEBHOOK"; url: string };

type ContactWithRels = Contact & { campaign?: { name: string } | null };

function matches(conditions: AutomationConditions, contact: ContactWithRels) {
  if (conditions.campaign && conditions.campaign !== (contact.campaign?.name ?? "")) return false;
  if (conditions.source && conditions.source !== contact.source) return false;
  if (conditions.status && conditions.status !== contact.status) return false;
  if (conditions.minScore != null && (contact.score ?? 0) < conditions.minScore) return false;
  return true;
}

async function applyAction(action: AutomationAction, contact: ContactWithRels): Promise<string> {
  switch (action.type) {
    case "SET_STATUS":
      await prisma.contact.update({ where: { id: contact.id }, data: { status: action.value } });
      return `status → ${action.value}`;
    case "ADD_TAG": {
      const tags = new Set((contact.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean));
      tags.add(action.value);
      await prisma.contact.update({
        where: { id: contact.id },
        data: { tags: Array.from(tags).join(",") },
      });
      return `tag +${action.value}`;
    }
    case "CREATE_TASK":
      await prisma.activity.create({
        data: {
          type: "TASK",
          content: action.value,
          contactId: contact.id,
          dueAt: new Date(Date.now() + 24 * 3600 * 1000),
        },
      });
      return `task "${action.value}"`;
    case "CREATE_DEAL":
      await prisma.deal.create({
        data: {
          title: action.title,
          value: action.value ?? 0,
          contactId: contact.id,
          companyId: contact.companyId,
          campaignId: contact.campaignId,
        },
      });
      return `deal "${action.title}"`;
    case "WEBHOOK": {
      const res = await fetch(action.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "automation",
          contact: {
            id: contact.id,
            name: fullName(contact),
            email: contact.email,
            phone: contact.phone,
            status: contact.status,
            source: contact.source,
            score: contact.score,
            campaign: contact.campaign?.name ?? null,
          },
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`webhook responded ${res.status}`);
      return `webhook → ${new URL(action.url).host}`;
    }
  }
}

/**
 * Runs every enabled automation for the given trigger against a contact.
 * Each rule is logged to AutomationRun; failures never break the caller
 * (ingest must succeed even if a webhook target is down).
 */
export async function runAutomations(trigger: AutomationTrigger, contactId: string) {
  const automations = await prisma.automation.findMany({ where: { trigger, enabled: true } });
  if (!automations.length) return;

  for (const automation of automations) {
    // Re-read inside the loop so chained rules see earlier rules' changes
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: { campaign: { select: { name: true } } },
    });
    if (!contact) return;

    let conditions: AutomationConditions;
    let actions: AutomationAction[];
    try {
      conditions = JSON.parse(automation.conditions);
      actions = JSON.parse(automation.actions);
    } catch {
      continue;
    }
    if (!matches(conditions, contact)) continue;

    const applied: string[] = [];
    let failed: string | null = null;
    for (const action of actions) {
      try {
        applied.push(await applyAction(action, contact));
      } catch (err) {
        failed = err instanceof Error ? err.message : "action failed";
        break;
      }
    }

    await prisma.automationRun.create({
      data: {
        automationId: automation.id,
        contactId: contact.id,
        contactName: fullName(contact),
        status: failed ? "FAILED" : "SUCCESS",
        detail: failed ? `${applied.join("; ")}${applied.length ? "; " : ""}error: ${failed}` : applied.join("; "),
      },
    });
  }
}
