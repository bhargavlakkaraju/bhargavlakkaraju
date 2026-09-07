import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ingestContactSchema, upsertContact } from "@/lib/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({
  fileName: z.string().optional(),
  rows: z.array(ingestContactSchema).min(1).max(5000),
});

/**
 * Bulk import endpoint used by the CSV import page. Rows are already mapped
 * to CRM fields client-side; each row goes through the same upsert logic as
 * the public ingest API.
 */
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  let created = 0;
  let updated = 0;
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < parsed.data.rows.length; i++) {
    try {
      const result = await upsertContact(parsed.data.rows[i], "csv-import");
      result.created ? created++ : updated++;
    } catch (err) {
      errors.push({ row: i + 1, error: err instanceof Error ? err.message : "failed" });
    }
  }

  await prisma.ingestEvent.create({
    data: {
      apiKeyName: "CSV import",
      endpoint: "/api/import",
      status: errors.length === parsed.data.rows.length ? "FAILED" : "PROCESSED",
      payload: JSON.stringify({ fileName: parsed.data.fileName, rowCount: parsed.data.rows.length }),
      result: JSON.stringify({ created, updated, failed: errors.length }),
    },
  });

  return NextResponse.json({ created, updated, errors });
}
