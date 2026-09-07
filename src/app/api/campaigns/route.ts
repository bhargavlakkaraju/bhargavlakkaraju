import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1),
  client: z.string().optional(),
  status: z.string().default("ACTIVE"),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  try {
    const campaign = await prisma.campaign.create({ data: parsed.data });
    return NextResponse.json(campaign, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "A campaign with this name already exists" }, { status: 409 });
    }
    throw err;
  }
}
