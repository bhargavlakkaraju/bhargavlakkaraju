"use client";

import { useEffect, useState } from "react";
import { cn, formatDate, getPriorityColor, getTaskStatusColor, initials } from "@/lib/utils";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  completedThisWeek: number;
  projectsLed: { id: string; name: string }[];
  openTasks: {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string | null;
    project: { id: string; name: string } | null;
  }[];
}

export default function TeamPage() {
  const [team, setTeam] = useState<TeamMember[] | null>(null);

  useEffect(() => {
    fetch("/api/team")
      .then((res) => (res.ok ? res.json() : { team: [] }))
      .then((data) => setTeam(data.team || []))
      .catch(() => setTeam([]));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team</h1>
        <p className="text-sm text-gray-500">
          Who&apos;s working on what — workload and progress per person.
        </p>
      </div>

      {team === null ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {team.map((member) => (
            <div key={member.id} className="card">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                    {initials(member.name)}
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">{member.name}</h2>
                    <p className="text-xs text-gray-500">
                      {member.role.charAt(0) + member.role.slice(1).toLowerCase()} · {member.email}
                    </p>
                  </div>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <p>
                    <span className="font-semibold text-gray-900">{member.openTasks.length}</span> open
                  </p>
                  <p>
                    <span className="font-semibold text-green-600">{member.completedThisWeek}</span> done
                    this week
                  </p>
                </div>
              </div>

              {member.projectsLed.length > 0 && (
                <p className="mt-3 text-xs text-gray-500">
                  Leading: {member.projectsLed.map((p) => p.name).join(", ")}
                </p>
              )}

              <div className="mt-4 space-y-2 border-t border-gray-100 pt-3">
                {member.openTasks.length === 0 ? (
                  <p className="py-2 text-center text-sm text-gray-400">No open tasks</p>
                ) : (
                  member.openTasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-gray-700">{task.title}</p>
                        <p className="truncate text-xs text-gray-400">
                          {task.project?.name || "No project"}
                          {task.dueDate && ` · due ${formatDate(task.dueDate)}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <span className={cn("badge", getPriorityColor(task.priority))}>
                          {task.priority}
                        </span>
                        <span className={cn("badge", getTaskStatusColor(task.status))}>
                          {task.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                {member.openTasks.length > 5 && (
                  <p className="text-xs text-gray-400">
                    +{member.openTasks.length - 5} more task{member.openTasks.length - 5 === 1 ? "" : "s"}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
