# PortraitVoice by Syngenta

A standalone, server-rendered portrait-to-testimonial generator powered by Higgsfield. The existing Syngenta assets were recovered from the original unfinished project; that project was preserved.

## Run

Requires Node 22.12+ (tested with Node 24), npm, and the authenticated Higgsfield CLI on the server.

```sh
npm ci
higgsfield account status
npm run dev
```

Open http://localhost:3000. The server reads the owner's existing CLI session using `higgsfield auth token` in memory, caches it for 60 seconds, and never exposes it to the client. Alternatively configure `HIGGSFIELD_API_KEY` in a private `.env`. An expired session requires the administrator to run `higgsfield auth login` on the host.

```sh
npm run typecheck
npm run test:unit
npm run test:e2e
npm run build
npm start
```

The Playwright config uses installed Google Chrome. For environments without Chrome, install Playwright Chromium and remove `channel: 'chrome'`. The local production server is `server.mjs`, serving the built SSR handler and static files. It defaults to localhost; set `HOST=0.0.0.0` only when preparing an intentional public deployment.

## Generation

| Stage          | Provider / model                                  | Behavior                                                             |
| -------------- | ------------------------------------------------- | -------------------------------------------------------------------- |
| Portrait       | Higgsfield / Seedream 4.5                         | Calm, front-facing 9:16 interview close-up; hands outside frame       |
| Read note      | Higgsfield / GPT-5 vision (`llm_text`)            | Original-language transcription; author edits and confirms           |
| Voice          | Higgsfield / Text to Speech V2, ElevenLabs engine | Standard gender-matched preset; original script is spoken            |
| Video          | Higgsfield / Grok Video 1.5                       | Relaxed interview: gentle breathing and small irregular posture adjustments |
| Final lip-sync | Higgsfield / Sync Lipsync 3                       | Exact full recording drives the mouth; extends motion with loop mode |

Grok rejects combining a start frame and audio references. Consequently the video stage uses Grok for movement and Sync for audio-driven lip-sync. Uploaded recordings skip synthesis and are not trimmed; non-MP3 inputs are transcoded only for compatibility. Both server and browser measure audio duration. Maximums are 700 text characters, 15 MB per image, and 30 MB / 180 seconds per recording.

The motion prompt allows relaxed shoulders, gentle visible breathing and a small irregular posture adjustment, with moments of rest. Large gestures, repeated swaying and camera movement remain excluded. Sync adds speech afterward. These instructions need visual review on each generated output; a successful render alone does not establish realistic motion.

Long testimonials use the same short motion base in Sync's loop mode. The audio stays complete, but gestures/background motion may repeat. A native speaker should approve pronunciation and mouth movement before campaign release.

All ten requested language options are present: Hindi, Bengali, Tamil, Telugu, Kannada, Marathi, Gujarati, Punjabi, Malayalam, English. Write in the chosen language; selecting a language does not translate the script. The current Higgsfield catalog exposes preset gender but no dependable regional-accent metadata, so Maya / Arthur are multilingual defaults, not verified native regional voices. `src/lib/voices.ts` holds standard-preset overrides. No voice cloning or voice picker is exposed. Cross-language quality still needs native-speaker acceptance; the engine version behind Higgsfield's ElevenLabs selector is provider controlled.

The example portrait is a fictional AI-generated person, clearly labeled in the preview. It is not a real farmer endorsement. Test scripts use an explicitly identified technical-test message.

## White interface and outdoor ambience

The white interface uses a compact two-step form, minimal guidance, an optional sound preview, and a playable 9:16 example on desktop. Gallery, progress, results and internal pages share the same light visual language. Text and note modes start with outdoor ambience on; uploaded recordings start with it off so an existing environment recording is not doubled. The user can change the setting before generation.

`src/lib/ambience.ts` mixes the bundled field bed after lip-sync, ducks it beneath speech and fades its edges. Audio mixing and final muxing are separate to preserve complete speech on short clips. The original video packets are copied. Existing videos are unchanged. Retries reuse a persisted final upload when available. FFmpeg and `public/audio/outdoor-ambience.mp3` must be included on the server; the normal source package contains both the asset and the FFmpeg dependency.

`public/demo-ugc.mp4` is the separate HeyGen motion audition with the user-approved Kanika Hindi audio and the same ambience mix. It is a fictional AI speaker and a neutral demonstration, not a product endorsement. The app's automatic generation pipeline remains Higgsfield; connector authentication does not configure a standalone HeyGen API key. Kanika/HeyGen integration into the generation backend is not claimed by this UI update. The sound source and processing notes are in `public/audio/outdoor-ambience.json`.

## Persistence and recovery

Production uses a private Vercel Blob store (`PV_STORAGE=blob`) for entries, credit usage, and the workflow registry. Conditional writes protect concurrent updates; shared leases prevent duplicate submissions across server instances. Uploaded files go directly to private storage with signed, size-limited grants, then pass server validation before provider upload. This supports the full photo/audio size limits on Vercel. See `DEPLOYMENT.md`.

Local development defaults to atomic files in `.data`. A local file registry requires one Node process and durable storage. Supabase is also available for entries and usage by applying the supplied migration. Private workflow tokens, credentials, and `.data` are excluded from source packages.

Stages use `submitTestimonialJob`, `checkTestimonialJob`, and `getTestimonialJobResult` server functions. Polling is every six seconds. Browser state permits refresh/resume without resubmitting completed jobs. Closing all tabs pauses orchestration between stages; an already-submitted provider job keeps running, and reopening the generator resumes advancement.

Accepted jobs record a cost quote once. A failed transport with an uncertain submit result is held for administrator recovery rather than automatically resubmitted. If a provider response was lost, inspect recent Higgsfield jobs and the private registry before resolving the guard. Never clear it blindly. The credit dashboard shows estimates from the live quote endpoint with labeled fallback estimates, not a reconciled provider invoice.

OCR is billed and recorded against a draft entry immediately, including abandoned notes. The draft becomes the generation entry after consent. Consent is validated on the server. Publicly discoverable entry IDs alone cannot submit or resolve somebody else's workflow.

## Routes and the no-auth limitation

- `/` — generator, progress, result and download
- `/gallery` — completed videos, language filter and click-to-play
- `/admin` — all entries and stage/error/media/timestamp details
- `/admin/usage` — credits grouped by provider, model and stage
- `/api/download/:id` — completed-video attachment download

Only Gallery is linked in the public header. The admin routes have noindex metadata and robots.txt exclusions. **URL obscurity is not access control.** As requested, admin pages have no authentication, and the SQL grants public SELECT on both business tables, including scripts, source media, errors and usage. Anyone who discovers these URLs or knows the Supabase configuration can read them. The published app retains this requested no-login behavior.

## Structure and verification

`src/routes` contains thin route views. Components are under `src/components`, including shadcn-style Radix primitives. Business logic, provider integration, persistence and client orchestration live under `src/lib`. Server functions validate input and map errors in `src/server/fns.ts`. TanStack Start 1, React 19, Vite 7, Tailwind 4; strict TypeScript checked with `tsgo`.

`e2e/smoke.spec.ts` covers desktop/mobile forms, tabs, disabled and enabled consent states, file inputs, gallery, internal routes, metadata, robots and horizontal overflow. Unit tests exercise server-side consent, ownership, stage binding, idempotency, file signatures and URL validation. `scripts/live-check.ts` is a separately invoked acceptance test that spends real Higgsfield credits; it is never run by normal tests.

See `VERIFICATION.md` for the actual checks and current limitations.
