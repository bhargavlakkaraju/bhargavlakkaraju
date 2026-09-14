# PortraitVoice

Syngenta-branded portrait-to-testimonial generator. TanStack Start, React 19, Vite 7, TypeScript and Tailwind 4. Public site: https://portraitvoice.vercel.app.

## Generation

- Portraits are stored unchanged in private Blob storage. HeyGen animates the original photo directly; it does not redraw the person's identity or generate a replacement background.
- Text and reviewed notes go to HeyGen with its **ElevenLabs v3** engine. Female: **Kanika**, the user-approved Hindi voice. Male: **Manu**, from the Indian voice catalog. Voice settings match the approved demo: stability 0.5, speed 1, pitch 0. Hindi requires Devanagari before any paid render. Selecting a language does not translate the text. The same Indian multilingual presets serve the other requested languages; individual regional pronunciation still needs native-speaker review.
- **HeyGen Avatar IV** renders one continuous 1080p, 9:16 video with synchronized speech and subtle, irregular body movement. There is no short motion loop or separate lip-sync job. Arbitrary photo input uses IV; Avatar V requires eligible reference footage/looks and is not presented as a working photo option.
- Uploaded audio is used as-is; non-MP3 recordings are transcoded only for compatibility. No cloning, trimming, or synthesized replacement. Limits: 15 MB image, 30 MB / 180-second recording, 700-character script.
- Handwritten note OCR uses **Google Gemini 2.5 Flash through Vercel AI Gateway**. The user edits and confirms the transcription. Unreadable words are marked; notes are treated as source data, never instructions.
- Optional quiet outdoor ambience is mixed after rendering, with speech ducking and copied video packets. Original recordings default to ambience off. Finished videos are copied into durable Blob storage; expiring provider URLs are not the permanent gallery source.

The generator has **no Higgsfield integration or fallback**. Legacy completed videos and usage records remain readable. Unfinished legacy requests ask the user to start a new HeyGen video.

## Run locally

Node 22.12+ (tested on 24), npm, and FFmpeg (`ffmpeg-static` bundled).

```sh
npm ci
cp .env.example .env
npm run dev
```

Set a server-only `HEYGEN_API_KEY` with Videos write, Assets write, Voices read, and Account read permissions. HeyGen's API wallet is separate from its web subscription credits. The integrated ElevenLabs voice engine is billed through HeyGen; a separate ElevenLabs key is unnecessary.

For note OCR, Vercel production automatically supplies OIDC authentication. Locally use `AI_GATEWAY_API_KEY`, or run `vercel env pull` and load the resulting OIDC token (valid 12 hours). Never expose provider credentials as `VITE_*` variables.

## Persistence and recovery

On Vercel set `PV_STORAGE=blob`, `BLOB_READ_WRITE_TOKEN`, and `APP_URL=https://portraitvoice.vercel.app`. The private Blob store holds entries, usage, media, and workflow leases. Local development uses `.data/`; Supabase entry/usage persistence remains supported through the supplied SQL migration and server-role credentials, alongside a durable workflow/media store.

Uploads receive random capability URLs at `/api/media/<uuid>` and support byte-range playback. The public gallery publishes completed videos after explicit consent. Workflow ownership tokens stay in the creating browser. Refresh or Resume continues the registered HeyGen job without resubmitting it. Finalization failures retry the download/mix, never the paid render.

Before submitting a paid job, persist a submission guard and use HeyGen's `Idempotency-Key`. Definite rejected requests can be retried; ambiguous transport errors retain the guard for administrator recovery. Inspect the HeyGen dashboard using the title `PortraitVoice <entry-id>` and bind the accepted video ID into the private workflow before clearing an ambiguous submission. Never clear it blindly or retry after the provider's 24-hour idempotency window without checking. The usage page records HeyGen renders as one combined speech/video event and OCR tokens separately; it does not invent cross-provider credit estimates. Historical credits are labeled legacy.

## Routes and access

`/`, `/gallery`, `/admin`, `/admin/usage`, `/api/download/<entry-id>`, and `/api/media/<media-id>`.

No user login. **Admin pages are protected only by URL obscurity and are accessible to anyone who knows the URL.** They are omitted from public navigation and marked noindex/robots-disallowed; those are not access controls. The generator uses a shared provider account. Add authentication/rate limits before wider untrusted public access.

## Verify and deploy

```sh
npm run typecheck
npm run test:unit
npm run build
npm run test:e2e
```

Normal tests never spend provider credits. `e2e/heygen-live.spec.ts` is an explicit opt-in short paid acceptance render. The smoke tests cover desktop/mobile UI, consent, uploads, gallery, admin, and existing completed playback/download. `scripts/check-cloud.ts` validates private storage, concurrency, and large signed uploads when explicitly enabled.

Vercel uses Nitro's native server handler, 300-second functions, private Blob storage, and Linux FFmpeg from the remote build. Never deploy a Mac prebuilt bundle. In the Git monorepo, only `portraitvoice/` belongs to this app. Publish the app branch `claude/peaceful-ramanujan-nissro` and explicitly deploy the linked PortraitVoice project; the repository's unrelated production branch is not this app's release branch.

## Demo

`public/demo-ugc.mp4` shows a fictional AI speaker using the user-approved Kanika Hindi voice and natural motion direction. It is a neutral demonstration, not a real farmer endorsement. The new backend uses the same voice engine/settings and motion direction. Sound provenance is recorded in `public/audio/outdoor-ambience.json`.
