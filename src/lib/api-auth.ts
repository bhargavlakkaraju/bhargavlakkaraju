import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export interface SessionContext {
  userId: string;
  organizationId: string;
  name: string;
  email: string;
}

/** Returns the authenticated user's context, or null when not signed in. */
export async function getSessionContext(): Promise<SessionContext | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as
    | { id?: string; organizationId?: string; name?: string; email?: string }
    | undefined;
  if (!user?.id || !user?.organizationId) return null;
  return {
    userId: user.id,
    organizationId: user.organizationId,
    name: user.name || "",
    email: user.email || "",
  };
}
