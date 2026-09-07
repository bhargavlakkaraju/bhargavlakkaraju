"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2, CheckCircle2, Circle } from "lucide-react";

export function DeleteButton({
  url,
  label = "Delete",
  redirectTo,
}: {
  url: string;
  label?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn-danger"
      disabled={busy}
      onClick={async () => {
        if (!confirm("Delete this permanently?")) return;
        setBusy(true);
        await fetch(url, { method: "DELETE" });
        redirectTo ? router.push(redirectTo) : router.refresh();
      }}
    >
      <Trash2 className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

export function TaskToggle({ id, completed }: { id: string; completed: boolean }) {
  const router = useRouter();
  return (
    <button
      title={completed ? "Mark incomplete" : "Mark complete"}
      onClick={async () => {
        await fetch(`/api/activities/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: !completed }),
        });
        router.refresh();
      }}
      className={completed ? "text-emerald-500" : "text-slate-300 hover:text-slate-500"}
    >
      {completed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
    </button>
  );
}
