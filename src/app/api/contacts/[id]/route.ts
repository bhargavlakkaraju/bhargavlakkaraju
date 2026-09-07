import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rescoreContact } from "@/lib/ingest";
import { runAutomations } from "@/lib/automations";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  status: z.string().optional(),
  tags: z.string().nullable().optional(),
  companyId: z.string().nullable().optional(),
  campaignId: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  const { email, ...rest } = parsed.data;
  const before = await prisma.contact.findUnique({ where: { id: params.id } });
  const contact = await prisma.contact.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(email !== undefined ? { email: email ? email.toLowerCase() : null } : {}),
      ...(rest.companyId !== undefined ? { companyId: rest.companyId || null } : {}),
      ...(rest.campaignId !== undefined ? { campaignId: rest.campaignId || null } : {}),
    },
  });
  await rescoreContact(contact.id);
  if (rest.status && before && rest.status !== before.status) {
    await runAutomations("STATUS_CHANGED", contact.id);
  }
  return NextResponse.json(contact);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.contact.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
