import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  value: z.coerce.number().min(0).optional(),
  currency: z.string().optional(),
  stage: z.string().optional(),
  expectedClose: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  contactId: z.string().nullable().optional(),
  companyId: z.string().nullable().optional(),
  campaignId: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  const { expectedClose, ...rest } = parsed.data;
  const deal = await prisma.deal.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(expectedClose !== undefined
        ? { expectedClose: expectedClose ? new Date(expectedClose) : null }
        : {}),
    },
  });
  return NextResponse.json(deal);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.deal.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
