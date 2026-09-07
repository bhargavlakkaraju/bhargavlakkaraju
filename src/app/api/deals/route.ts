import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().min(1),
  value: z.coerce.number().min(0).default(0),
  currency: z.string().default("INR"),
  stage: z.string().default("LEAD_IN"),
  expectedClose: z.string().optional(),
  notes: z.string().optional(),
  contactId: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  campaignId: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  const { expectedClose, ...rest } = parsed.data;
  const deal = await prisma.deal.create({
    data: {
      ...rest,
      contactId: rest.contactId || null,
      companyId: rest.companyId || null,
      campaignId: rest.campaignId || null,
      expectedClose: expectedClose ? new Date(expectedClose) : null,
    },
  });
  return NextResponse.json(deal, { status: 201 });
}
