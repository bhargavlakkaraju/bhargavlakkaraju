import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionContext } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await db.project.findMany({
    where: { organizationId: ctx.organizationId },
    include: {
      client: { select: { id: true, name: true, company: true } },
      lead: { select: { id: true, name: true } },
      tasks: {
        select: { id: true, status: true },
      },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });

  return NextResponse.json({
    projects: projects.map((p) => {
      const total = p.tasks.length;
      const done = p.tasks.filter((t) => t.status === "DONE").length;
      const { tasks, ...rest } = p;
      return {
        ...rest,
        tasksTotal: total,
        tasksDone: done,
        progress: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    }),
  });
}

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  clientId: z.string().optional(),
  leadId: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  budget: z.number().optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createProjectSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { dueDate, ...data } = parsed.data;
  const project = await db.project.create({
    data: {
      ...data,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      organizationId: ctx.organizationId,
    },
  });

  await db.activity.create({
    data: {
      type: "PROJECT_CREATED",
      message: `created project "${project.name}"`,
      entityType: "project",
      entityId: project.id,
      actorId: ctx.userId,
      organizationId: ctx.organizationId,
    },
  });

  return NextResponse.json({ project }, { status: 201 });
}
