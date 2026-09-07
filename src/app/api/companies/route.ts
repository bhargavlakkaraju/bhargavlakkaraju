import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1),
  domain: z.string().optional(),
  industry: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  try {
    const company = await prisma.company.create({ data: parsed.data });
    return NextResponse.json(company, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "A company with this name already exists" }, { status: 409 });
    }
    throw err;
  }
}
