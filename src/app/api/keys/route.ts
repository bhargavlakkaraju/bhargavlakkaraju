import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const parsed = z.object({ name: z.string().min(1) }).safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "A key name is required" }, { status: 422 });
  }
  const key = `hoopla_${randomBytes(24).toString("hex")}`;
  const apiKey = await prisma.apiKey.create({
    data: { name: parsed.data.name, key },
  });
  return NextResponse.json(apiKey, { status: 201 });
}
