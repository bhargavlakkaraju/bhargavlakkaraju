import { defineJob, nanoBanana2, seedance2_5, z } from "@higgsfield/fnf/jobs";
import { intRange, oneOf, promptMax, promptRequired } from "@higgsfield/fnf/jobs";

const GROK_RESOLUTIONS = ["480p", "720p"] as const;

/**
 * Grok Video 1.5 as a talking-head animator. The catalog's `grokImagineV15`
 * declares only `start_image`; the Higgsfield model additionally accepts
 * `audio_references` (see the platform model catalog for `grok_video_v15`),
 * which is what drives the lips from an uploaded testimonial recording. The
 * job set type, settings and credits mirror the catalog entry; the 9:16 box
 * is derived server-side from the start image's measured size.
 */
export const grokTalkingHead = defineJob({
  jobSetType: "grok_video_v15",
  outputType: "video",
  params: {
    prompt: true,
    media: {
      field: "medias",
      format: "wrapped",
      roles: ["start_image", "audio_references"],
      counts: { start_image: { min: 1, max: 1 }, audio_references: { max: 1 } },
    },
    settings: {
      duration: z._default(z.duration({ min: 2, max: 15 }), 6),
      resolution: z._default(z.enum(GROK_RESOLUTIONS), "720p"),
    },
  },
  credits: ({ settings }) => {
    const duration = Math.max(settings.duration ?? 6, 2);
    return duration * (settings.resolution === "720p" ? 4.5 : 2.5);
  },
  validate: ({ prompt, settings }) => [
    ...promptRequired(prompt),
    ...promptMax(prompt, 2500),
    ...intRange("duration", settings.duration, 2, 15),
    ...oneOf("resolution", settings.resolution, GROK_RESOLUTIONS),
  ],
  finalize: (wire) => ({
    ...wire,
    duration: Math.max(wire.duration as number, 2),
    aspect_ratio: "9:16",
    width: wire.resolution === "480p" ? 480 : 720,
    height: wire.resolution === "480p" ? 854 : 1280,
    medias: wire.medias ?? [],
  }),
});

/** One registry for the whole app: portrait re-frame, Grok talking head, Seedance fallback. */
export const PORTRAITVOICE_JOBS = [nanoBanana2, grokTalkingHead, seedance2_5] as const;
