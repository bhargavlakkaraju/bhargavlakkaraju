import { z } from "zod";
import { prisma } from "./db";
import { runAutomations } from "./automations";
import { heuristicScore } from "./scoring";

export const ingestContactSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().optional(),
  // Accept a single "name" field too — many tools only send one name string
  name: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  title: z.string().optional(),
  status: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  company: z.string().optional(),
  campaign: z.string().optional(),
  source: z.string().optional(),
  note: z.string().optional(),
  deal: z
    .object({
      title: z.string().min(1),
      value: z.coerce.number().optional(),
      currency: z.string().optional(),
      stage: z.string().optional(),
    })
    .optional(),
  // Any extra fields the tool wants to attach
  customData: z.record(z.any()).optional(),
});

export type IngestContact = z.infer<typeof ingestContactSchema>;

function splitName(input: IngestContact) {
  if (input.firstName) return { firstName: input.firstName, lastName: input.lastName ?? null };
  const name = (input.name ?? "").trim();
  if (!name) return null;
  const [first, ...rest] = name.split(/\s+/);
  return { firstName: first, lastName: rest.join(" ") || null };
}

/**
 * Upserts a contact (matched by email, falling back to phone), auto-creating
 * the referenced company/campaign by name. Optionally attaches a note and a
 * deal. This is the single entry point used by both the public ingest API
 * and the CSV importer, so every source behaves identically.
 */
export async function upsertContact(input: IngestContact, defaultSource = "api") {
  const names = splitName(input);
  const email = input.email?.trim().toLowerCase() || null;
  const phone = input.phone?.trim() || null;

  if (!names && !email && !phone) {
    throw new Error("A contact needs at least a name, email or phone");
  }

  let companyId: string | null = null;
  if (input.company?.trim()) {
    const company = await prisma.company.upsert({
      where: { name: input.company.trim() },
      create: { name: input.company.trim() },
      update: {},
    });
    companyId = company.id;
  }

  let campaignId: string | null = null;
  if (input.campaign?.trim()) {
    const campaign = await prisma.campaign.upsert({
      where: { name: input.campaign.trim() },
      create: { name: input.campaign.trim() },
      update: {},
    });
    campaignId = campaign.id;
  }

  const tags = Array.isArray(input.tags) ? input.tags.join(",") : input.tags;
  const customData = input.customData ? JSON.stringify(input.customData) : undefined;

  const existing = email
    ? await prisma.contact.findUnique({ where: { email } })
    : phone
      ? await prisma.contact.findFirst({ where: { phone } })
      : null;

  const contact = existing
    ? await prisma.contact.update({
        where: { id: existing.id },
        data: {
          ...(names ?? {}),
          phone: phone ?? existing.phone,
          title: input.title ?? existing.title,
          status: input.status ?? existing.status,
          tags: tags ?? existing.tags,
          customData: customData ?? existing.customData,
          companyId: companyId ?? existing.companyId,
          campaignId: campaignId ?? existing.campaignId,
        },
      })
    : await prisma.contact.create({
        data: {
          firstName: names?.firstName ?? email ?? phone ?? "Unknown",
          lastName: names?.lastName ?? null,
          email,
          phone,
          title: input.title,
          status: input.status ?? "PROSPECT",
          source: input.source ?? defaultSource,
          tags,
          customData,
          companyId,
          campaignId,
        },
      });

  if (input.note?.trim()) {
    await prisma.activity.create({
      data: { type: "NOTE", content: input.note.trim(), contactId: contact.id },
    });
  }

  if (input.deal) {
    await prisma.deal.create({
      data: {
        title: input.deal.title,
        value: input.deal.value ?? 0,
        currency: input.deal.currency ?? "INR",
        stage: input.deal.stage ?? "LEAD_IN",
        contactId: contact.id,
        companyId,
        campaignId,
      },
    });
  }

  await rescoreContact(contact.id);

  if (!existing) {
    await runAutomations("CONTACT_CREATED", contact.id);
  } else if (input.status && input.status !== existing.status) {
    await runAutomations("STATUS_CHANGED", contact.id);
  }

  return { contact, created: !existing };
}

/** Recomputes the deterministic lead score and stores it on the contact. */
export async function rescoreContact(contactId: string) {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    include: { deals: true, activities: true },
  });
  if (!contact) return;
  const { score, reason } = heuristicScore(contact);
  await prisma.contact.update({
    where: { id: contactId },
    data: { score, scoreReason: reason },
  });
}
