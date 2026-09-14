import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { get, put } from "@vercel/blob";
import {
  cloudPath,
  cloudStorageEnabled,
  readCloudJson,
  writeCloudJson,
} from "./cloud-store";
import { env } from "./env";

interface MediaRecord {
  id: string;
  type: string;
  size: number;
}
const validId =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const localDir = () => join(dirname(env.LOCAL_DB_PATH), "media");
export async function storeMedia(bytes: Uint8Array, type: string) {
  const id = randomUUID();
  const record: MediaRecord = { id, type, size: bytes.length };
  if (cloudStorageEnabled()) {
    await put(cloudPath(`media/${id}`), Buffer.from(bytes), {
      access: "private",
      contentType: type,
      addRandomSuffix: false,
    });
    await writeCloudJson(`media/${id}.json`, record);
  } else {
    await mkdir(localDir(), { recursive: true });
    await writeFile(join(localDir(), id), bytes, { mode: 0o600 });
    await writeFile(join(localDir(), `${id}.json`), JSON.stringify(record), {
      mode: 0o600,
    });
  }
  return { id, url: `${env.APP_URL}/api/media/${id}` };
}
export function storedMediaId(url: string): string | null {
  const u = new URL(url);
  const id = u.pathname.replace(/^\/api\/media\//, "");
  return u.origin === new URL(env.APP_URL).origin &&
    validId.test(id) &&
    !u.search &&
    !u.hash
    ? id
    : null;
}
export async function readMedia(
  id: string,
): Promise<{ record: MediaRecord; bytes: Uint8Array } | null> {
  if (!validId.test(id)) return null;
  if (cloudStorageEnabled()) {
    const metadata = await readCloudJson<MediaRecord>(`media/${id}.json`);
    if (!metadata) return null;
    const data = await get(cloudPath(`media/${id}`), { access: "private" });
    if (!data?.stream) return null;
    return {
      record: metadata.value,
      bytes: new Uint8Array(await new Response(data.stream).arrayBuffer()),
    };
  }
  try {
    return {
      record: JSON.parse(
        await readFile(join(localDir(), `${id}.json`), "utf8"),
      ) as MediaRecord,
      bytes: await readFile(join(localDir(), id)),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
export async function readStoredUrl(url: string) {
  const id = storedMediaId(url);
  const media = id ? await readMedia(id) : null;
  if (!media)
    throw new Error(
      "The uploaded media could not be found. Please upload it again.",
    );
  return media;
}
/** Historical provider URLs stay readable, but are never used for new generation. */
export function assertMediaUrl(url: string) {
  if (storedMediaId(url)) return;
  const u = new URL(url);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.port ||
    ![
      "heygen.ai",
      "heygen.com",
      "cloudfront.net",
      "higgsfield.ai",
      "higgsfield.cloud",
    ].some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`))
  )
    throw new Error("Unrecognized media host. Please upload the file again.");
}
export async function downloadMedia(url: string): Promise<Uint8Array> {
  const id = storedMediaId(url);
  if (id) return (await readStoredUrl(url)).bytes;
  assertMediaUrl(url);
  const response = await fetch(url, {
    signal: AbortSignal.timeout(120_000),
    redirect: "error",
  });
  if (!response.ok)
    throw new Error(
      "Could not download the completed video. Please resume to retry.",
    );
  if (Number(response.headers.get("content-length")) > 300 * 1024 * 1024)
    throw new Error("The video is too large to process.");
  return new Uint8Array(await response.arrayBuffer());
}
export function mediaResponse(
  bytes: Uint8Array,
  type: string,
  range: string | null,
  head = false,
) {
  const headers = new Headers({
    "Content-Type": type,
    "Content-Length": String(bytes.length),
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  });
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!m || (!m[1] && !m[2]))
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${bytes.length}` },
      });
    const start = m[1]
      ? Number(m[1])
      : Math.max(0, bytes.length - Number(m[2]));
    const end =
      m[1] && m[2]
        ? Math.min(bytes.length - 1, Number(m[2]))
        : bytes.length - 1;
    if (start > end || start >= bytes.length)
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${bytes.length}` },
      });
    headers.set("Content-Range", `bytes ${start}-${end}/${bytes.length}`);
    headers.set("Content-Length", String(end - start + 1));
    return new Response(
      head ? null : Buffer.from(bytes.subarray(start, end + 1)),
      { status: 206, headers },
    );
  }
  return new Response(head ? null : Buffer.from(bytes), { headers });
}
