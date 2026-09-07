import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const parsed = z.object({ enabled: z.boolean() }).safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  const automation = await prisma.automation.update({
    where: { id: params.id },
    data: { enabled: parsed.data.enabled },
  });
  return NextResponse.json(automation);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.automation.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
