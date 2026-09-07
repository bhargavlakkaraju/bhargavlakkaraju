"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AutomationToggle({ id, enabled }: { id: string; enabled: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={async () => {
        setOn(!on);
        await fetch(`/api/automations/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: !on }),
        });
        router.refresh();
      }}
      className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-slate-900" : "bg-slate-200"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`}
      />
    </button>
  );
}
