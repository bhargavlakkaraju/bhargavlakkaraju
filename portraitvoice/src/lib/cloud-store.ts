import { get, put, BlobPreconditionFailedError } from "@vercel/blob";
import { createHash, randomUUID } from "node:crypto";

export const cloudStorageEnabled = () => process.env.PV_STORAGE === "blob";
const prefix = () => process.env.PV_BLOB_PREFIX || "portraitvoice/v1";
export const cloudPath = (name: string) => `${prefix()}/${name}`;
const pause = (ms: number) => new Promise((done) => setTimeout(done, ms));
export function isWriteConflict(error: unknown) {
  return (
    error instanceof BlobPreconditionFailedError ||
    (error instanceof Error &&
      /already exists|precondition/i.test(error.message))
  );
}
export async function readCloudJson<T>(
  name: string,
): Promise<{ value: T; etag: string } | null> {
  const result = await get(cloudPath(name), {
    access: "private",
    useCache: false,
  });
  if (!result) return null;
  if (!result.stream) throw new Error("Could not read saved video state.");
  return {
    value: (await new Response(result.stream).json()) as T,
    etag: result.blob.etag,
  };
}
export async function writeCloudJson<T>(name: string, value: T, etag?: string) {
  return put(cloudPath(name), JSON.stringify(value), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: Boolean(etag),
    ...(etag ? { ifMatch: etag } : {}),
    cacheControlMaxAge: 60,
  });
}
/** Retried callbacks only mutate JSON; provider requests must stay outside. */
export async function mutateCloudJson<S, T>(
  name: string,
  initial: () => S,
  mutate: (value: S) => T | Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const previous = await readCloudJson<S>(name);
    const state = previous?.value ?? initial();
    const result = await mutate(state);
    try {
      await writeCloudJson(name, state, previous?.etag);
      return result;
    } catch (error) {
      if (!isWriteConflict(error) || attempt === 11) throw error;
      await pause(25 + Math.random() * 100);
    }
  }
  throw new Error("Saved video state is busy. Please resume in a moment.");
}
/** A shared lease prevents two server instances from submitting the same paid job. */
export async function withCloudLock<T>(
  id: string,
  work: () => Promise<T>,
): Promise<T> {
  const name = `locks/${createHash("sha256").update(id).digest("hex")}.json`;
  const owner = randomUUID();
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    const previous = await readCloudJson<{ owner: string; expiresAt: number }>(
      name,
    );
    if (previous && previous.value.expiresAt > Date.now()) {
      await pause(300);
      continue;
    }
    let etag: string;
    try {
      const lease = await writeCloudJson(
        name,
        { owner, expiresAt: Date.now() + 900_000 },
        previous?.etag,
      );
      etag = lease.etag;
    } catch (error) {
      if (isWriteConflict(error)) {
        await pause(100);
        continue;
      }
      throw error;
    }
    try {
      return await work();
    } finally {
      // Release only our own revision. A killed function's lease expires safely.
      await writeCloudJson(name, { owner, expiresAt: 0 }, etag).catch(
        () => undefined,
      );
    }
  }
  throw new Error(
    "This video is already being updated. Please resume in a moment.",
  );
}
