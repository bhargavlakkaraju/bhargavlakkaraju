import { createFileRoute } from "@tanstack/react-router";
import { getRepository } from "@/lib/db";
import { downloadMedia } from "@/lib/media-store";
export const Route = createFileRoute("/api/download/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const entry = await getRepository().getEntry(params.id);
        if (!entry?.video_url || entry.status !== "completed")
          return new Response("Video not found", { status: 404 });
        const bytes = await downloadMedia(entry.video_url);
        return new Response(Buffer.from(bytes), {
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
