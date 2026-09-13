import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  readCloudJson,
  mutateCloudJson,
  withCloudLock,
  writeCloudJson,
  cloudPath,
} from "../src/lib/cloud-store";
import {
  prepareCloudUpload,
  readCloudUpload,
  cleanCloudUpload,
} from "../src/lib/cloud-upload";
import { list, del } from "@vercel/blob";
if (process.env.PV_STORAGE !== "blob" || !process.env.BLOB_READ_WRITE_TOKEN)
  throw new Error(
    "Set PV_STORAGE=blob and BLOB_READ_WRITE_TOKEN to run the opt-in cloud check.",
  );
process.env.PV_BLOB_PREFIX = `portraitvoice/checks/${randomUUID()}`;
try {
  await writeCloudJson("counter.json", {
    value: 0,
    padding: "large saved workflow ".repeat(500),
  });
  await Promise.all(
    Array.from({ length: 6 }, () =>
      mutateCloudJson(
        "counter.json",
        () => ({ value: 0 }),
        (v) => ++v.value,
      ),
    ),
  );
  assert.equal(
    (await readCloudJson<{ value: number }>("counter.json"))?.value.value,
    6,
  );
  let active = 0;
  await Promise.all(
    Array.from({ length: 3 }, () =>
      withCloudLock("same-job", async () => {
        assert.equal(++active, 1);
        await new Promise((r) => setTimeout(r, 300));
        active--;
      }),
    ),
  );
  const source = await readFile("e2e/fixtures/example-portrait.png");
  const grant = await prepareCloudUpload({
    name: "example.png",
    size: source.length,
    contentType: "image/png",
    kind: "image",
  });
  assert.ok(grant.cloud);
  const uploaded = await fetch(grant.presignedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "image/png",
      Origin: "https://portraitvoice.vercel.app",
    },
    body: source,
  });
  assert.ok(uploaded.ok, `Upload HTTP ${uploaded.status}`);
  const restored = await readCloudUpload(grant.receipt, "image");
  assert.deepEqual(Buffer.from(await restored.arrayBuffer()), source);
  await assert.rejects(
    () => readCloudUpload(grant.receipt.slice(0, -1) + "z", "image"),
    /upload/,
  );
  await cleanCloudUpload(grant.receipt);
  console.log(
    JSON.stringify({
      cloudPersistence: "passed",
      concurrentUpdates: 6,
      sharedLease: "passed",
      uploadBytes: source.length,
      signedUpload: "passed",
      receiptTamperRejected: true,
    }),
  );
} finally {
  const files = await list({ prefix: cloudPath("") });
  if (files.blobs.length) await del(files.blobs.map((b) => b.url));
}
