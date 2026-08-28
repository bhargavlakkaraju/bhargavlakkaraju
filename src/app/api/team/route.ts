import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
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
    canManage: ["OWNER", "ADMIN"].includes(ctx.role),
  });
}

const addMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email address"),
});

function generatePassword(): string {
  const words = ["Harbor", "Falcon", "Meadow", "Summit", "Indigo", "Casper", "Voyage", "Amber", "Juniper", "Atlas"];
  const pick = () => words[Math.floor(Math.random() * words.length)];
  return `${pick()}-${pick()}-${Math.floor(10 + Math.random() * 89)}`;
}

export async function POST(req: NextRequest) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["OWNER", "ADMIN"].includes(ctx.role)) {
    return NextResponse.json(
      { error: "Only the account owner can add team members" },
      { status: 403 }
    );
  }

  const parsed = addMemberSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const { name, email } = parsed.data;
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 400 }
    );
  }

  const tempPassword = generatePassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "MEMBER",
      organizationId: ctx.organizationId,
    },
  });

  await db.activity.create({
    data: {
      type: "MEMBER_ADDED",
      message: `added ${user.name} to the team`,
      entityType: "user",
      entityId: user.id,
      actorId: ctx.userId,
      organizationId: ctx.organizationId,
    },
  });

  return NextResponse.json(
    {
      member: { id: user.id, name: user.name, email: user.email },
      tempPassword,
    },
    { status: 201 }
  );
}
