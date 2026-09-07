import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rescoreContact } from "@/lib/ingest";
import { runAutomations } from "@/lib/automations";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  title: z.string().optional(),
  status: z.string().optional(),
  tags: z.string().optional(),
  companyId: z.string().optional().nullable(),
  campaignId: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  const { email, ...rest } = parsed.data;
  try {
    const contact = await prisma.contact.create({
      data: {
        ...rest,
        email: email ? email.toLowerCase() : null,
        companyId: rest.companyId || null,
        campaignId: rest.campaignId || null,
        source: "manual",
      },
    });
    await rescoreContact(contact.id);
    await runAutomations("CONTACT_CREATED", contact.id);
    return NextResponse.json(contact, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "A contact with this email already exists" }, { status: 409 });
    }
    throw err;
  }
}
