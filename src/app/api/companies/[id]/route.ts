import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  domain: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  const company = await prisma.company.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json(company);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.company.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
