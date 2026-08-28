import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionContext } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const TASK_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "DONE"] as const;

export async function GET(req: NextRequest) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const assigneeId = searchParams.get("assigneeId") || undefined;
  const projectId = searchParams.get("projectId") || undefined;
  const status = searchParams.get("status") || undefined;

  const tasks = await db.task.findMany({
    where: {
      organizationId: ctx.organizationId,
      ...(assigneeId ? { assigneeId } : {}),
      ...(projectId ? { projectId } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      assignee: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });

  return NextResponse.json({ tasks });
}

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().optional(),
  projectId: z.string().optional(),
  dueDate: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createTaskSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { dueDate, ...data } = parsed.data;
  const task = await db.task.create({
    data: {
      ...data,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      organizationId: ctx.organizationId,
    },
    include: { assignee: { select: { name: true } } },
  });

  await db.activity.create({
    data: {
      type: "TASK_CREATED",
      message: `created task "${task.title}"${
        task.assignee ? ` and assigned it to ${task.assignee.name}` : ""
      }`,
      entityType: "task",
      entityId: task.id,
      actorId: ctx.userId,
      organizationId: ctx.organizationId,
    },
  });

  return NextResponse.json({ task }, { status: 201 });
}

const updateTaskSchema = z.object({
  id: z.string().min(1),
  status: z.enum(TASK_STATUSES).optional(),
  assigneeId: z.string().nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = updateTaskSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id, dueDate, ...data } = parsed.data;
  const existing = await db.task.findFirst({
    where: { id, organizationId: ctx.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const task = await db.task.update({
    where: { id },
    data: {
      ...data,
      ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
      ...(data.status === "DONE"
        ? { completedAt: new Date() }
        : data.status
        ? { completedAt: null }
        : {}),
    },
  });

  if (data.status && data.status !== existing.status) {
    await db.activity.create({
      data: {
        type: data.status === "DONE" ? "TASK_COMPLETED" : "TASK_STATUS",
        message:
          data.status === "DONE"
            ? `completed "${task.title}"`
            : `moved "${task.title}" to ${data.status.replace("_", " ").toLowerCase()}`,
        entityType: "task",
        entityId: task.id,
        actorId: ctx.userId,
        organizationId: ctx.organizationId,
      },
    });
  }

  return NextResponse.json({ task });
}
