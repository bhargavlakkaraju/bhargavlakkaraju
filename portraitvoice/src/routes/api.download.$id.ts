import { createFileRoute } from "@tanstack/react-router";
import { getRepository } from "@/lib/db";
import { assertMediaUrl } from "@/lib/higgsfield";
export const Route = createFileRoute("/api/download/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const entry = await getRepository().getEntry(params.id);
        if (!entry?.video_url || entry.status !== "completed")
          return new Response("Video not found", { status: 404 });
        assertMediaUrl(entry.video_url);
        const source = await fetch(entry.video_url, {
          signal: AbortSignal.timeout(120000),
          redirect: "error",
        });
        if (!source.ok)
          return new Response("Video is temporarily unavailable", {
            status: 502,
          });
        return new Response(source.body, {
          headers: {
            "Content-Type": "video/mp4",
            "Content-Disposition": `attachment; filename="portraitvoice-${entry.id}.mp4"`,
            "Cache-Control": "private, max-age=3600",
          },
        });
      },
    },
  },
});
