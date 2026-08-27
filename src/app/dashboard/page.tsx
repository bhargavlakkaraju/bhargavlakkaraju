"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import GmailPanel from "@/components/dashboard/GmailPanel";
import {
  cn,
  formatCurrency,
  formatDate,
  getHealthColor,
  getTaskStatusColor,
  initials,
  timeAgo,
} from "@/lib/utils";

interface CommandCenterData {
  stats: {
    monthRevenue: number;
    outstandingAmount: number;
    outstandingCount: number;
    overdueAmount: number;
    overdueCount: number;
    monthExpenses: number;
    activeProjects: number;
    openTasks: number;
    overdueTaskCount: number;
  };
  projects: {
    id: string;
    name: string;
    status: string;
    health: string;
    dueDate: string | null;
    client: { name: string; company: string | null } | null;
    lead: { id: string; name: string } | null;
    tasksTotal: number;
    tasksDone: number;
    progress: number;
  }[];
  team: {
    id: string;
    name: string;
    role: string;
    openTaskCount: number;
    blockedCount: number;
    currentTask: {
      id: string;
      title: string;
      status: string;
      project: { name: string } | null;
    } | null;
  }[];
  tasksDueSoon: {
    id: string;
    title: string;
    dueDate: string | null;
    status: string;
    assignee: { name: string } | null;
    project: { name: string } | null;
  }[];
  activities: {
    id: string;
    type: string;
    message: string;
    createdAt: string;
    actor: { name: string } | null;
  }[];
  needsAttention: {
    kind: string;
    message: string;
    link: string;
  }[];
}

const activityIcon: Record<string, { bg: string; symbol: string }> = {
  TASK_COMPLETED: { bg: "bg-green-100 text-green-600", symbol: "✓" },
  TASK_CREATED: { bg: "bg-blue-100 text-blue-600", symbol: "+" },
  TASK_STATUS: { bg: "bg-purple-100 text-purple-600", symbol: "→" },
  PROJECT_CREATED: { bg: "bg-brand-100 text-brand-600", symbol: "◆" },
  PROJECT_UPDATE: { bg: "bg-brand-100 text-brand-600", symbol: "◆" },
  INVOICE_SENT: { bg: "bg-yellow-100 text-yellow-600", symbol: "$" },
  PAYMENT_RECEIVED: { bg: "bg-green-100 text-green-600", symbol: "$" },
  CLIENT_ADDED: { bg: "bg-indigo-100 text-indigo-600", symbol: "@" },
  NOTE: { bg: "bg-gray-100 text-gray-600", symbol: "•" },
};

export default function CommandCenterPage() {
  const [data, setData] = useState<CommandCenterData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/command-center")
      .then(async (res) => {
        if (res.status === 401) {
          setError("unauthorized");
          return;
        }
        if (!res.ok) throw new Error("Failed to load");
        setData(await res.json());
      })
      .catch(() => setError("failed"));
  }, []);

  if (error === "unauthorized") {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-xl font-semibold text-gray-900">Sign in to see your Command Center</h1>
        <p className="text-sm text-gray-500">Your dashboard shows live data from your agency.</p>
        <Link href="/login" className="btn-primary">
          Sign in
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-24 text-center text-sm text-gray-500">
        Failed to load dashboard data. Is the database running and seeded?
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-xl bg-gray-100" />
      </div>
    );
  }

  const { stats } = data;
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Command Center</h1>
          <p className="text-sm text-gray-500">
            {today} — everything happening across your agency, in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/projects" className="btn-secondary text-sm">
            Projects
          </Link>
          <Link href="/dashboard/invoices/new" className="btn-primary text-sm">
            New Invoice
          </Link>
        </div>
      </div>

      {/* Needs attention */}
      {data.needsAttention.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <h2 className="text-sm font-semibold text-red-900">
              Needs your attention ({data.needsAttention.length})
            </h2>
          </div>
          <ul className="space-y-1.5">
            {data.needsAttention.slice(0, 5).map((item, i) => (
              <li key={i}>
                <Link href={item.link} className="text-sm text-red-800 hover:underline">
                  {item.message}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <p className="text-sm font-medium text-gray-500">Revenue this month</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(stats.monthRevenue)}</p>
          <p className="mt-1 text-xs text-gray-500">
            {formatCurrency(stats.monthExpenses)} in expenses
          </p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-500">Outstanding</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formatCurrency(stats.outstandingAmount)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {stats.outstandingCount} open invoice{stats.outstandingCount === 1 ? "" : "s"}
            {stats.overdueCount > 0 && (
              <span className="ml-1 font-medium text-red-600">
                · {stats.overdueCount} overdue ({formatCurrency(stats.overdueAmount)})
              </span>
            )}
          </p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-500">Active projects</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{stats.activeProjects}</p>
          <p className="mt-1 text-xs text-gray-500">
            {data.projects.filter((p) => p.health !== "ON_TRACK").length} need attention
          </p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-500">Open tasks</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{stats.openTasks}</p>
          <p className="mt-1 text-xs text-gray-500">
            {stats.overdueTaskCount > 0 ? (
              <span className="font-medium text-red-600">{stats.overdueTaskCount} past due</span>
            ) : (
              "Nothing past due"
            )}
          </p>
        </div>
      </div>

      {/* Team + Inbox */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Who&apos;s working on what</h2>
            <Link href="/dashboard/team" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              View team
            </Link>
          </div>
          <div className="space-y-3">
            {data.team.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 p-3 hover:bg-gray-50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                    {initials(member.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{member.name}</p>
                    {member.currentTask ? (
                      <p className="truncate text-xs text-gray-500">
                        {member.currentTask.title}
                        {member.currentTask.project && (
                          <span className="text-gray-400"> · {member.currentTask.project.name}</span>
                        )}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400">No open tasks</p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {member.blockedCount > 0 && (
                    <span className="badge bg-red-100 text-red-700">{member.blockedCount} blocked</span>
                  )}
                  {member.currentTask && (
                    <span className={cn("badge", getTaskStatusColor(member.currentTask.status))}>
                      {member.currentTask.status.replace("_", " ")}
                    </span>
                  )}
                  <span className="badge bg-gray-100 text-gray-600">
                    {member.openTaskCount} open
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Inbox</h2>
            <Link href="/dashboard/inbox" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              Open inbox
            </Link>
          </div>
          <GmailPanel limit={5} />
        </div>
      </div>

      {/* Projects + Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Projects</h2>
            <Link href="/dashboard/projects" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              View all
            </Link>
          </div>
          {data.projects.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No active projects yet.</p>
          ) : (
            <div className="space-y-3">
              {data.projects.slice(0, 6).map((project) => (
                <div key={project.id} className="rounded-lg border border-gray-100 p-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{project.name}</p>
                      <p className="truncate text-xs text-gray-500">
                        {project.client?.name || "Internal"}
                        {project.lead && <span> · Lead: {project.lead.name}</span>}
                        {project.dueDate && <span> · Due {formatDate(project.dueDate)}</span>}
                      </p>
                    </div>
                    <span className={cn("badge shrink-0", getHealthColor(project.health))}>
                      {project.health.replace("_", " ")}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-xs text-gray-500">
                      {project.tasksDone}/{project.tasksTotal} tasks
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Due soon */}
          {data.tasksDueSoon.length > 0 && (
            <div className="mt-5 border-t border-gray-100 pt-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-700">Due in the next 7 days</h3>
              <div className="space-y-1.5">
                {data.tasksDueSoon.map((task) => (
                  <div key={task.id} className="flex items-center justify-between gap-2 text-sm">
                    <p className="min-w-0 truncate text-gray-700">
                      {task.title}
                      {task.assignee && <span className="text-gray-400"> — {task.assignee.name}</span>}
                    </p>
                    <span className="shrink-0 text-xs text-gray-500">
                      {task.dueDate ? formatDate(task.dueDate) : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">What&apos;s happening</h2>
          {data.activities.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No activity yet.</p>
          ) : (
            <div className="space-y-4">
              {data.activities.slice(0, 12).map((activity) => {
                const icon = activityIcon[activity.type] || activityIcon.NOTE;
                return (
                  <div key={activity.id} className="flex gap-3">
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        icon.bg
                      )}
                    >
                      {icon.symbol}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-700">
                        {activity.actor && (
                          <span className="font-medium text-gray-900">{activity.actor.name} </span>
                        )}
                        {activity.message}
                      </p>
                      <p className="text-xs text-gray-400">{timeAgo(activity.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
