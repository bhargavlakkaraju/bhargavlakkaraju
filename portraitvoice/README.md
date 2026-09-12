# PortraitVoice (Syngenta)

AI testimonial video generator for Indian farmers and farmer ambassadors: one portrait photo plus a
testimonial becomes a vertical 9:16 talking-head video with audio-driven lip-sync.

Stack: TanStack Start (React 19, SSR) on Vite 8 + Nitro, Tailwind CSS v4, shadcn-style components,
Vercel Blob for files, Neon / Vercel Postgres for data. Deploys to Vercel with zero extra config.

## Pipeline (three stages; each is a server function the client polls every ~6 s)

| Stage | Provider / model | What happens |
| --- | --- | --- |
| Portrait | xAI `grok-imagine-image-2.0` (`POST /v1/images/edits`) | Re-frames the photo into a 9:16 rural UGC composition; result mirrored to Blob |
| Voice | ElevenLabs `eleven_v3` | Text and note modes are synthesised (speed 0.94, standard female/male voice by language). Audio mode uses the recording as-is |
| Video | xAI `grok-imagine-video-1.5` (`/v1/videos/generations`, `/v1/videos/extensions`) then sync.so `lipsync-2-pro` | Grok animates the portrait for the audio length (15 s clip plus 10 s extensions), sync.so re-times the mouth to the real audio |

Handwritten notes are transcribed by xAI `grok-4.6` (vision) with the original language kept; the
text is editable before generation (max 700 characters). Testimonials are capped at 60 seconds of
speech (about six Grok extensions).

`XAI_REFERENCE_AUDIO=true` (trusted xAI partner accounts only) passes the audio straight into Grok
as a reference clip for testimonials up to 15 s and skips the sync.so step.

Server functions live in `src/server/fns.ts`: `uploadMedia`, `extractNoteText`,
`createTestimonialEntry`, `submitTestimonialJob`, `checkTestimonialJob`, `getTestimonialJobResult`,
`listGalleryEntries`, `listAdminEntries`, `listAdminUsage`. Provider clients and stage logic are in
`src/lib/services/` and `src/lib/pipeline/`; the browser orchestration is `src/lib/use-pipeline.ts`.

## Routes

- `/` generator: single screen, mobile-first, sticky 9:16 preview aside on desktop, full waiting
  screen (stage, percentage, elapsed and remaining time, three stages, rotating farming facts),
  finished video with download.
- `/gallery` public grid of completed videos.
- `/admin` all entries; `/admin/usage` AI credit usage grouped by provider, model and stage with
  totals. Internal only: never linked, `robots.txt` disallows `/admin`, `noindex` meta. There is
  no login; URL obscurity is the only protection.

## Setup

1. Create a Neon (or Vercel Postgres) database and a Vercel Blob store.
2. Copy `.env.example` to `.env` and fill `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `XAI_API_KEY`,
   `ELEVENLABS_API_KEY`, `SYNC_API_KEY`.
3. `npm install`, then `npm run db:migrate` (applies `db/migrations/*.sql`).
4. `npm run dev` for local work; `npm run typecheck` and `npm run test:smoke` before shipping.

On Vercel, set the same variables in the project settings (link the Blob store and Postgres
integration and they are injected automatically), then deploy from this folder as the root
directory. Nitro selects the Vercel preset on its own.

## Credits

`src/lib/usage-rates.ts` holds the per-unit rates written to `ai_usage_events`. One credit is one US
cent of list price: portrait 4 per image, note extraction 0.3 per 1k tokens, voice 3 per 1k chars,
video 8 per second, lip-sync 7.5 per second.

## Notes

- `public/syngenta-logo.svg` is a stand-in wordmark. Replace it with the official Syngenta file.
- Grok Imagine Video's public API accepts reference audio only for approved partners, which is why
  sync.so does the audio-driven lip-sync in the default configuration.
