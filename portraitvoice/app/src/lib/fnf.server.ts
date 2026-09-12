import { createJobClient } from "@higgsfield/fnf/client";
import { createMediaClient } from "@higgsfield/fnf/media";
import { createWorkflowPlatformAdapter } from "@higgsfield/fnf/workflow-platform";
import { PORTRAITVOICE_JOBS } from "@/lib/portraitvoice/jobs";

/** Server-only FNF clients. Browser code must cross the app-local RPC bridge. */
export function createServerFnf(options: { confirmationToken?: string } = {}) {
  const adapter = createWorkflowPlatformAdapter({
    baseUrl: "https://fnf.internal",
    // The browser already obtained this token from the host approval dialog
    // (window.hf.requestGeneration) for the exact wire params; the server
    // re-builds the same params and forwards the token. Never auto-confirm.
    confirm: async () => {
      if (!options.confirmationToken) throw new Error("Generation was not approved.");
      return options.confirmationToken;
    },
  });

  return {
    adapter,
    media: createMediaClient({ mediaAdapter: adapter }),
    jobs: createJobClient({ adapter, jobs: PORTRAITVOICE_JOBS }),
  };
}

/** Server-side identity check: fnf.internal returns 401 for guests. */
export async function requireCurrentUser(): Promise<
  { ok: true; user: { id: string } } | { ok: false; status: number }
> {
  const response = await fetch("https://fnf.internal/user");
  if (!response.ok) return { ok: false, status: response.status };
  const body = (await response.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) return { ok: false, status: 401 };
  return { ok: true, user: { id: body.id } };
}
