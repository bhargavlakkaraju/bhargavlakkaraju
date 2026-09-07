import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  type: z.string().default("NOTE"),
  content: z.string().min(1),
  dueAt: z.string().optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  const { dueAt, ...rest } = parsed.data;
  const activity = await prisma.activity.create({
    data: { ...rest, dueAt: dueAt ? new Date(dueAt) : null },
  });
  return NextResponse.json(activity, { status: 201 });
}
