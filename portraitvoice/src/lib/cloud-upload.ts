import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { get, issueSignedToken, presignUrl, del } from "@vercel/blob";
import { cloudPath, cloudStorageEnabled } from "./cloud-store";

interface Receipt {
  pathname: string;
  name: string;
  size: number;
  contentType: string;
  kind: "image" | "audio";
  expiresAt: number;
}
function signature(value: string) {
  const secret = process.env.BLOB_READ_WRITE_TOKEN;
  if (!secret) throw new Error("Cloud uploads need to reconnect.");
  return createHmac("sha256", secret).update(value).digest("hex");
}
export async function prepareCloudUpload(input: {
  name: string;
  size: number;
  contentType: string;
  kind: "image" | "audio";
}) {
  if (!cloudStorageEnabled()) return { cloud: false as const };
  const max = (input.kind === "image" ? 15 : 30) * 1024 * 1024;
  if (input.size <= 0 || input.size > max)
    throw new Error("Please upload a smaller file.");
  const extension = input.name.split(".").pop()?.toLowerCase() ?? "";
  const allowed =
    input.kind === "image"
      ? ["jpg", "jpeg", "png", "webp"]
      : [
          "mp3",
          "wav",
          "m4a",
          "aac",
          "ogg",
          "webm",
          "mp4",
          "caf",
          "opus",
          "flac",
          "3gp",
          "amr",
        ];
  if (!allowed.includes(extension))
    throw new Error("Please upload a supported photo or recording.");
  const contentType = input.contentType || "application/octet-stream";
  const value: Receipt = {
    ...input,
    contentType,
    name: `upload.${extension}`,
    pathname: cloudPath(`incoming/${randomUUID()}.${extension}`),
    expiresAt: Date.now() + 15 * 60_000,
  };
  const token = await issueSignedToken({
    pathname: value.pathname,
    operations: ["put"],
    validUntil: value.expiresAt,
    allowedContentTypes: [contentType],
    maximumSizeInBytes: input.size,
  });
  const { presignedUrl } = await presignUrl(token, {
    access: "private",
    operation: "put",
    pathname: value.pathname,
    allowOverwrite: false,
    addRandomSuffix: false,
  });
  const encoded = Buffer.from(JSON.stringify(value)).toString("base64url");
  return {
    cloud: true as const,
    presignedUrl,
    contentType,
    receipt: `${encoded}.${signature(encoded)}`,
  };
}
function verifyReceipt(raw: string): Receipt {
  const [encoded, mac] = raw.split(".");
  if (
    !encoded ||
    !mac ||
    !/^[a-f0-9]{64}$/.test(mac) ||
    !timingSafeEqual(Buffer.from(mac), Buffer.from(signature(encoded)))
  )
    throw new Error("Please upload your file again.");
  const value = JSON.parse(
    Buffer.from(encoded, "base64url").toString(),
  ) as Receipt;
  if (
    value.expiresAt < Date.now() ||
    !value.pathname.startsWith(cloudPath("incoming/"))
  )
    throw new Error("This upload expired. Please upload your file again.");
  return value;
}
export async function readCloudUpload(raw: string, kind: "image" | "audio") {
  const receipt = verifyReceipt(raw);
  if (receipt.kind !== kind)
    throw new Error("Please upload the correct file type.");
  const blob = await get(receipt.pathname, {
    access: "private",
    useCache: false,
  });
  if (!blob?.stream || blob.blob.size !== receipt.size)
    throw new Error("This upload is incomplete. Please upload again.");
  const bytes = await new Response(blob.stream).arrayBuffer();
  if (bytes.byteLength !== receipt.size)
    throw new Error("This upload is incomplete.");
  return new File([bytes], receipt.name, { type: receipt.contentType });
}
export async function cleanCloudUpload(raw: string) {
  const receipt = verifyReceipt(raw);
  await del(receipt.pathname).catch(() => undefined);
}
