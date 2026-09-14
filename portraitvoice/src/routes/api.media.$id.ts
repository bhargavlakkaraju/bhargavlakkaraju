import { createFileRoute } from "@tanstack/react-router";
import { readMedia, mediaResponse } from "@/lib/media-store";
async function serve(id: string, request: Request) {
  const media = await readMedia(id);
  if (!media) return new Response("Media not found", { status: 404 });
  return mediaResponse(
    media.bytes,
    media.record.type,
    request.headers.get("range"),
    request.method === "HEAD",
  );
}
export const Route = createFileRoute("/api/media/$id")({
  server: {
    handlers: {
      GET: ({ params, request }) => serve(params.id, request),
      HEAD: ({ params, request }) => serve(params.id, request),
    },
  },
});
