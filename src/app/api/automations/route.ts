import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("SET_STATUS"), value: z.string().min(1) }),
  z.object({ type: z.literal("ADD_TAG"), value: z.string().min(1) }),
  z.object({ type: z.literal("CREATE_TASK"), value: z.string().min(1) }),
  z.object({ type: z.literal("CREATE_DEAL"), title: z.string().min(1), value: z.coerce.number().optional() }),
  z.object({ type: z.literal("WEBHOOK"), url: z.string().url() }),
]);

const createSchema = z.object({
  name: z.string().min(1),
  trigger: z.enum(["CONTACT_CREATED", "STATUS_CHANGED"]),
  conditions: z
    .object({
      campaign: z.string().optional(),
      source: z.string().optional(),
      status: z.string().optional(),
      minScore: z.coerce.number().min(0).max(100).optional(),
    })
    .default({}),
  actions: z.array(actionSchema).min(1),
  enabled: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  const automation = await prisma.automation.create({
    data: {
      name: parsed.data.name,
      trigger: parsed.data.trigger,
      conditions: JSON.stringify(parsed.data.conditions),
      actions: JSON.stringify(parsed.data.actions),
      enabled: parsed.data.enabled,
    },
  });
  return NextResponse.json(automation, { status: 201 });
}
