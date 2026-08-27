import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionContext } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const OPEN_TASK_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "BLOCKED"];

export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  const members = await db.user.findMany({
    where: { organizationId: ctx.organizationId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      tasksAssigned: {
        where: { status: { in: OPEN_TASK_STATUSES } },
        include: { project: { select: { id: true, name: true } } },
        orderBy: [{ status: "desc" }, { dueDate: "asc" }],
      },
      projectsLed: {
        where: { status: "ACTIVE" },
        select: { id: true, name: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const completedCounts = await db.task.groupBy({
    by: ["assigneeId"],
    where: {
      organizationId: ctx.organizationId,
      status: "DONE",
      completedAt: { gte: startOfWeek },
    },
    _count: true,
  });
  const completedByUser = new Map(
    completedCounts.map((c) => [c.assigneeId, c._count])
  );

  return NextResponse.json({
    team: members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      openTasks: m.tasksAssigned,
      projectsLed: m.projectsLed,
      completedThisWeek: completedByUser.get(m.id) || 0,
    })),
  });
}
