import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiKey } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { ingestContactSchema, upsertContact } from "@/lib/ingest";

export const dynamic = "force-dynamic";

// The batch shape must be tried first: every field of a single contact is
// optional, so `{ contacts: [...] }` would otherwise match as an empty contact.
const bodySchema = z.union([
  z.object({ contacts: z.array(ingestContactSchema).min(1).max(500) }),
  ingestContactSchema,
]);

/**
 * Public push endpoint for external tools (Zapier, chatbots, landing pages,
 * sheet exports…). Accepts a single contact object or `{ contacts: [...] }`.
 *
 *   curl -X POST https://crm.example.com/api/v1/ingest \
 *     -H "Authorization: Bearer <API_KEY>" \
 *     -H "Content-Type: application/json" \
 *     -d '{"name":"Asha Patel","email":"asha@x.com","campaign":"Pexalon","source":"chatbot"}'
 */
export async function POST(req: NextRequest) {
  const apiKey = await authenticateApiKey(req);
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing or invalid API key. Send it as 'Authorization: Bearer <key>'." },
      { status: 401 }
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 });
  }

  const event = await prisma.ingestEvent.create({
    data: {
      apiKeyName: apiKey.name,
      endpoint: "/api/v1/ingest",
      payload: JSON.stringify(raw).slice(0, 20000),
    },
  });

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    await prisma.ingestEvent.update({
      where: { id: event.id },
      data: { status: "FAILED", result: JSON.stringify(parsed.error.flatten()) },
    });
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const items = "contacts" in parsed.data ? parsed.data.contacts : [parsed.data];
  const results: { email?: string | null; id?: string; created?: boolean; error?: string }[] = [];
  let failed = 0;

  for (const item of items) {
    try {
      const { contact, created } = await upsertContact(item, "api");
      results.push({ id: contact.id, email: contact.email, created });
    } catch (err) {
      failed++;
      results.push({ email: item.email, error: err instanceof Error ? err.message : "failed" });
    }
  }

  await prisma.ingestEvent.update({
    where: { id: event.id },
    data: {
      status: failed === items.length ? "FAILED" : "PROCESSED",
      result: JSON.stringify({ processed: items.length - failed, failed }),
    },
  });

  return NextResponse.json(
    { processed: items.length - failed, failed, results },
    { status: failed === items.length ? 422 : 200 }
  );
}
