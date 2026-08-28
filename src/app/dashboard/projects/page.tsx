"use client";

import { useEffect, useState } from "react";
import {
  cn,
  formatCurrency,
  formatDate,
  getHealthColor,
  getStatusColor,
  initials,
} from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  health: string;
  dueDate: string | null;
  budget: number | null;
  client: { id: string; name: string; company: string | null } | null;
  lead: { id: string; name: string } | null;
  tasksTotal: number;
  tasksDone: number;
  progress: number;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => (res.ok ? res.json() : { projects: [] }))
      .then((data) => setProjects(data.projects || []))
      .catch(() => setProjects([]));
  }, []);

  const filtered = (projects || []).filter(
    (p) => filter === "ALL" || p.status === filter
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500">Every engagement, its owner, and where it stands.</p>
        </div>
        <div className="flex items-center gap-2">
          {["ALL", "ACTIVE", "ON_HOLD", "COMPLETED"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                filter === s
                  ? "bg-brand-100 text-brand-700"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              )}
            >
              {s === "ALL" ? "All" : s.replace("_", " ").toLowerCase().replace(/^./, (c) => c.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {projects === null ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card py-16 text-center text-sm text-gray-500">
          No projects found.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((project) => (
            <div key={project.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-gray-900">{project.name}</h2>
                  <p className="text-sm text-gray-500">
                    {project.client?.name || "Internal"}
                    {project.client?.company && ` (${project.client.company})`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <span className={cn("badge", getStatusColor(project.status))}>
                    {project.status.replace("_", " ")}
                  </span>
                  <span className={cn("badge", getHealthColor(project.health))}>
                    {project.health.replace("_", " ")}
                  </span>
                </div>
              </div>

              {project.description && (
                <p className="mt-2 line-clamp-2 text-sm text-gray-600">{project.description}</p>
              )}

              <div className="mt-4 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <span className="shrink-0 text-xs font-medium text-gray-600">
                  {project.progress}%
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
                <div className="flex items-center gap-2">
                  {project.lead ? (
                    <>
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                        {initials(project.lead.name)}
                      </div>
                      <span className="text-gray-600">{project.lead.name}</span>
                    </>
                  ) : (
                    <span className="text-gray-400">No lead</span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>
                    {project.tasksDone}/{project.tasksTotal} tasks
                  </span>
                  {project.budget != null && <span>{formatCurrency(project.budget)}</span>}
                  {project.dueDate && <span>Due {formatDate(project.dueDate)}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
