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
  const [canManage, setCanManage] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [credentials, setCredentials] = useState<{
    name: string;
    email: string;
    tempPassword: string;
  } | null>(null);

  const loadTeam = () => {
    fetch("/api/team")
      .then((res) => (res.ok ? res.json() : { team: [] }))
      .then((data) => {
        setTeam(data.team || []);
        setCanManage(Boolean(data.canManage));
      })
      .catch(() => setTeam([]));
  };

  useEffect(loadTeam, []);

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddError("");
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, email: newEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add member");
      setCredentials({
        name: data.member.name,
        email: data.member.email,
        tempPassword: data.tempPassword,
      });
      setNewName("");
      setNewEmail("");
      setShowAdd(false);
      loadTeam();
    } catch (err: any) {
      setAddError(err.message);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-sm text-gray-500">
            Who&apos;s working on what — workload and progress per person.
          </p>
        </div>
        {canManage && (
          <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-sm">
            {showAdd ? "Cancel" : "Add team member"}
          </button>
        )}
      </div>

      {showAdd && (
        <form onSubmit={handleAddMember} className="card space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Add a team member</h2>
          {addError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{addError}</div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Full name</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="input"
                placeholder="Jane Smith"
                required
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="input"
                placeholder="jane@youragency.com"
                required
              />
            </div>
          </div>
          <button type="submit" className="btn-primary text-sm" disabled={adding}>
            {adding ? "Adding..." : "Create login"}
          </button>
        </form>
      )}

      {credentials && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-green-900">
            {credentials.name} has been added — share these login details with them:
          </h3>
          <div className="space-y-1 text-sm text-green-800">
            <p>
              Website: <span className="font-mono">{typeof window !== "undefined" ? window.location.origin : ""}</span>
            </p>
            <p>
              Email: <span className="font-mono">{credentials.email}</span>
            </p>
            <p>
              Password: <span className="font-mono font-semibold">{credentials.tempPassword}</span>
            </p>
          </div>
          <p className="mt-2 text-xs text-green-700">
            This password is only shown once — copy it now.
          </p>
          <button
            onClick={() => setCredentials(null)}
            className="mt-3 text-xs font-medium text-green-700 underline hover:text-green-900"
          >
            Dismiss
          </button>
        </div>
      )}

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
