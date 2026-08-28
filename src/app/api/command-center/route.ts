import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionContext } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const OPEN_TASK_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "BLOCKED"];

export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { organizationId } = ctx;

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      monthRevenue,
      outstanding,
      overdueInvoices,
      monthExpenses,
      projects,
      members,
      openTasks,
      tasksDueSoon,
      overdueTasks,
      activities,
    ] = await Promise.all([
      db.payment.aggregate({
        where: { organizationId, status: "COMPLETED", paidAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      db.invoice.aggregate({
        where: { organizationId, status: { in: ["SENT", "VIEWED", "PARTIALLY_PAID"] } },
        _sum: { totalAmount: true, paidAmount: true },
        _count: true,
      }),
      db.invoice.findMany({
        where: { organizationId, status: "OVERDUE" },
        include: { customer: { select: { name: true } } },
        orderBy: { dueDate: "asc" },
      }),
      db.expense.aggregate({
        where: { organizationId, date: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      db.project.findMany({
        where: { organizationId, status: { in: ["ACTIVE", "ON_HOLD"] } },
        include: {
          client: { select: { name: true, company: true } },
          lead: { select: { id: true, name: true } },
          tasks: { select: { status: true } },
        },
        orderBy: { dueDate: "asc" },
      }),
      db.user.findMany({
        where: { organizationId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          tasksAssigned: {
            where: { status: { in: OPEN_TASK_STATUSES } },
            include: { project: { select: { name: true } } },
            orderBy: [{ status: "desc" }, { dueDate: "asc" }],
          },
        },
        orderBy: { name: "asc" },
      }),
      db.task.count({
        where: { organizationId, status: { in: OPEN_TASK_STATUSES } },
      }),
      db.task.findMany({
        where: {
          organizationId,
          status: { in: OPEN_TASK_STATUSES },
          dueDate: { gte: now, lte: weekAhead },
        },
        include: {
          assignee: { select: { name: true } },
          project: { select: { name: true } },
        },
        orderBy: { dueDate: "asc" },
        take: 8,
      }),
      db.task.findMany({
        where: {
          organizationId,
          status: { in: OPEN_TASK_STATUSES },
          dueDate: { lt: now },
        },
        include: {
          assignee: { select: { name: true } },
          project: { select: { name: true } },
        },
        orderBy: { dueDate: "asc" },
      }),
      db.activity.findMany({
        where: { organizationId },
        include: { actor: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    const projectSummaries = projects.map((p) => {
      const total = p.tasks.length;
      const done = p.tasks.filter((t) => t.status === "DONE").length;
      return {
        id: p.id,
        name: p.name,
        status: p.status,
        health: p.health,
        dueDate: p.dueDate,
        budget: p.budget,
        client: p.client,
        lead: p.lead,
        tasksTotal: total,
        tasksDone: done,
        progress: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    });

    const team = members.map((m) => {
      const inProgress = m.tasksAssigned.filter((t) => t.status === "IN_PROGRESS");
      const blocked = m.tasksAssigned.filter((t) => t.status === "BLOCKED");
      return {
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role,
        openTaskCount: m.tasksAssigned.length,
        blockedCount: blocked.length,
        currentTask: inProgress[0] || m.tasksAssigned[0] || null,
        tasks: m.tasksAssigned.slice(0, 5),
      };
    });

    const blockedTasks = await db.task.findMany({
      where: { organizationId, status: "BLOCKED" },
      include: {
        assignee: { select: { name: true } },
        project: { select: { name: true } },
      },
    });

    const needsAttention = [
      ...overdueInvoices.map((inv) => ({
        kind: "OVERDUE_INVOICE" as const,
        message: `Invoice ${inv.invoiceNumber} (${inv.customer.name}) is overdue — $${(
          inv.totalAmount - inv.paidAmount
        ).toLocaleString()}`,
        link: `/dashboard/invoices/${inv.id}`,
        date: inv.dueDate,
      })),
      ...blockedTasks.map((t) => ({
        kind: "BLOCKED_TASK" as const,
        message: `"${t.title}" is blocked${t.assignee ? ` (${t.assignee.name})` : ""}${
          t.project ? ` — ${t.project.name}` : ""
        }`,
        link: "/dashboard/projects",
        date: t.updatedAt,
      })),
      ...overdueTasks.slice(0, 5).map((t) => ({
        kind: "OVERDUE_TASK" as const,
        message: `"${t.title}" is past due${t.assignee ? ` (${t.assignee.name})` : ""}`,
        link: "/dashboard/projects",
        date: t.dueDate,
      })),
      ...projectSummaries
        .filter((p) => p.health !== "ON_TRACK")
        .map((p) => ({
          kind: "PROJECT_AT_RISK" as const,
          message: `Project "${p.name}" is ${p.health === "AT_RISK" ? "at risk" : "off track"}`,
          link: "/dashboard/projects",
          date: null as Date | null,
        })),
    ];

    return NextResponse.json({
      stats: {
        monthRevenue: monthRevenue._sum.amount || 0,
        outstandingAmount:
          (outstanding._sum.totalAmount || 0) - (outstanding._sum.paidAmount || 0),
        outstandingCount: outstanding._count || 0,
        overdueAmount: overdueInvoices.reduce(
          (sum, inv) => sum + (inv.totalAmount - inv.paidAmount),
          0
        ),
        overdueCount: overdueInvoices.length,
        monthExpenses: monthExpenses._sum.amount || 0,
        activeProjects: projectSummaries.filter((p) => p.status === "ACTIVE").length,
        openTasks,
        overdueTaskCount: overdueTasks.length,
      },
      projects: projectSummaries,
      team,
      tasksDueSoon,
      activities,
      needsAttention,
    });
  } catch (error) {
    console.error("Command center error:", error);
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}
