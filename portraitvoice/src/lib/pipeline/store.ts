import {
  cloudStorageEnabled,
  readCloudJson,
  mutateCloudJson,
  withCloudLock,
} from "../cloud-store";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createHash, randomBytes } from "node:crypto";
import type { Stage } from "../types";
import { env } from "../env";
export interface StageJob {
  id: string;
  model: string;
  provider?: "heygen" | "local";
  stage: Stage | "extraction" | "lipsync";
  credits: number;
  units: number;
  resolved?: boolean;
}
export interface Workflow {
  provider?: "heygen";
  imageAssetId?: string;
  audioAssetId?: string;
  finalVideoUrl?: string;
  finalAudioUrl?: string;
  id: string;
  tokenHash: string;
  requestId?: string;
  jobs: StageJob[];
  consentAt?: string;
  audioDuration?: number;
  ambience?: boolean;
  ambienceVideoUrl?: string;
  extractionText?: string;
  submitting?: string;
  error?: string;
}
interface Store {
  workflows: Record<string, Workflow>;
  uploads: Record<
    string,
    { url: string; kind: string; durationSec: number | null }
  >;
}
const path = resolve(dirname(env.LOCAL_DB_PATH), "workflow-state.json");
let queue: Promise<unknown> = Promise.resolve();
const locks = new Map<string, Promise<unknown>>();
async function read(): Promise<Store> {
  if (cloudStorageEnabled())
    return (
      (await readCloudJson<Store>("workflow-state.json"))?.value ?? {
        workflows: {},
        uploads: {},
      }
    );
  try {
    return JSON.parse(await readFile(path, "utf8")) as Store;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT")
      return { workflows: {}, uploads: {} };
    throw e;
  }
}
async function mutate<T>(fn: (store: Store) => T): Promise<T> {
  if (cloudStorageEnabled())
    return mutateCloudJson<Store, T>(
      "workflow-state.json",
      () => ({ workflows: {}, uploads: {} }),
      fn,
    );
  const work = queue.then(async () => {
    const s = await read();
    const result = fn(s);
    await mkdir(dirname(path), { recursive: true });
    const tmp = `${path}.tmp`;
    await writeFile(tmp, JSON.stringify(s), { mode: 0o600 });
    await rename(tmp, path);
    return result;
  });
  queue = work.catch(() => undefined);
  return work;
}
export function withWorkflowLock<T>(
  id: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (cloudStorageEnabled()) return withCloudLock(id, fn);
  const prev = locks.get(id) ?? Promise.resolve();
  const next = prev.then(fn);
  const settled = next.catch(() => undefined);
  locks.set(id, settled);
  void next
    .finally(() => {
      if (locks.get(id) === settled) locks.delete(id);
    })
    .catch(() => undefined);
  return next;
}
export function newToken() {
  return randomBytes(32).toString("hex");
}
export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export async function saveWorkflow(w: Workflow) {
  await mutate((s) => {
    s.workflows[w.id] = w;
  });
}
export async function getWorkflow(id: string) {
  await queue;
  return (await read()).workflows[id] ?? null;
}
export async function findRequest(requestId: string) {
  await queue;
  return (
    Object.values((await read()).workflows).find(
      (w) => w.requestId === requestId,
    ) ?? null
  );
}
export async function assertOwner(id: string, token: string) {
  const w = await getWorkflow(id);
  if (!w || w.tokenHash !== hashToken(token))
    throw new Error(
      "This generation cannot be resumed in this browser. Please start a new video.",
    );
  return w;
}
export async function registerUpload(
  id: string,
  url: string,
  kind: string,
  durationSec: number | null,
) {
  await mutate((s) => {
    s.uploads[id] = { url, kind, durationSec };
  });
}
export async function requireUpload(id: string, url: string) {
  await queue;
  const u = (await read()).uploads[id];
  if (!u || u.url !== url) throw new Error("Please upload your media again.");
  return u;
}
export async function requireAudio(url: string) {
  await queue;
  const u = Object.values((await read()).uploads).find(
    (u) => u.url === url && u.kind === "audio",
  );
  if (!u) throw new Error("Please upload your recording again.");
  return u;
}
