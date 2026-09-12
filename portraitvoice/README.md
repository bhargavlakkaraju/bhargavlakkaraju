# PortraitVoice

AI testimonial video generator for Indian farmers and farmer ambassadors: one portrait photo plus a
testimonial becomes a vertical 9:16 talking-head video with lip-sync. Built for Syngenta's farmer
programme.

Built as a **Higgsfield app** (TanStack Start + React 19, SSR, Cloudflare Worker) using Higgsfield's
`fnf` SDK for every generation and Cloudflare D1 for persistence. Live at
https://portraitvoice.higgsfield.app. This folder mirrors the Higgsfield app repository
(`app/` is the project root; the repo is bun-only).

## Pipeline (three stages, each a server function the client polls every ~6 s)

| Stage | Model (Higgsfield job set) | Notes |
| --- | --- | --- |
| Portrait | `nano_banana_2` (Nano Banana 2 image edit) | Re-frames the photo to a 9:16 rural UGC composition, identity preserved |
| Voice | uploaded recording, or spoken natively by the video model | Text and note modes: the video model speaks the script in the chosen language with a female or male voice. Audio mode: the recording is used as-is |
| Video | `grok_video_v15` (Grok Video 1.5) for clips up to 15 s; `seedance_2_5` for 16 to 30 s | Grok gets the reframed portrait as `start_image` and the recording as `audio_references`, which drives the lips |

Handwritten notes are transcribed by the platform LLM rail (`https://fnf.internal/llm`) with the
original language kept; the text is editable before generation (max 700 characters).

Server functions: `createTestimonialEntry`, `submitTestimonialJob`, `checkTestimonialJob`,
`getTestimonialJobResult`, `extractNoteText`, `listGalleryEntries`, `listAdminEntries`,
`listAdminUsage` in `app/src/lib/portraitvoice/pipeline.functions.ts`. The browser orchestrates the
stages in `app/src/lib/portraitvoice/use-pipeline.ts`.

## Routes

- `/` generator (mobile-first, sticky 9:16 preview on desktop, waiting screen with progress, ETA,
  stages and farming facts, finished video with download)
- `/gallery` public grid of completed videos
- `/admin` all entries; `/admin/usage` AI credit usage grouped by provider, model and stage.
  Internal only: not linked anywhere, `robots.txt` disallows `/admin`, `noindex` meta. There is
  **no auth** on these screens beyond URL obscurity.

## Persistence

`app/migrations/0002_portraitvoice.sql` creates `testimonial_entries` and `ai_usage_events` in D1
(SQLite). Credits recorded per event come from the SDK cost estimate for the submitted job (Higgsfield
display credits). LLM extraction has no published price on the platform rail, so it is logged with
token units and zero credits.

## Platform constraints to know

- Higgsfield apps require **Sign in with Higgsfield** before any generation; generations are billed
  to the signed-in visitor's credits and each stage asks for the host approval dialog.
- Higgsfield's pre-deploy code scan rejects third-party brand marks, so the deployed app ships a
  neutral PortraitVoice mark (`app/public/assets/brand/portraitvoice-logo.svg`) in the Syngenta
  blue/green palette instead of the Syngenta wordmark.
- Clip length is model-bound: Grok Video 1.5 renders 2 to 15 s, Seedance 2.5 up to 30 s, so the UI
  blocks testimonials that would run longer than 30 s (roughly 280 Hindi characters).
- The Higgsfield fnf catalog does not expose a standalone TTS job, which is why typed text is spoken
  by the video model rather than a separate voice model.

## Develop

```bash
cd portraitvoice/app
bun install
bun run typecheck && bun run lint && bun run check:adapted && bun run build
```

Deploys go through the Higgsfield website tools (`deploy_website`), which build from the app repo.
