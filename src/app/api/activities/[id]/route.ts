import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  completed: z.boolean().optional(),
  content: z.string().min(1).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  const activity = await prisma.activity.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json(activity);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.activity.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
