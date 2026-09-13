# Verification — 13 September 2026

## Current white UI and UGC revision

- Production client/SSR build and strict typecheck passed after the redesign and ambience implementation.
- Four unit tests passed, including a real FFmpeg test with voiced and silent intervals: identical encoded video packets, equal decoded audio length, speech at least 25 dB above the added signal, audible ambience during pauses, no clipping, and invalid-input handling. The test caught and prevented a short-clip truncation issue by mixing audio separately before muxing.
- Six desktop/mobile Playwright tests passed against the production server in 31.0 seconds. These cover text/note/audio modes, uploads, consent, language/voice selection, keyboard ambience toggling, sound preview, example playback, gallery, internal routes, existing result refresh and downloads. No new paid generation was submitted by these tests.
- The white generator, mobile form, gallery and internal credit dashboard were visually reviewed in the browser. The example poster was selected from a frame with open eyes. Fresh client bundle inspection found no server credentials, authentication command or workflow registry markers.
- The new 1080 × 1920 HeyGen demonstration uses the user's approved Kanika Hindi audio and the completed natural-body-motion revision. The app's public example uses this same UGC file.
- Before/after video packet SHA-256 is identical: `cb4a872a2ee72d536d4559ea718c6cd067b83aafc56a68b12ba11e4465ea6ee4`. Decoded audio is 15.893333 seconds before and after, with zero length difference; correlation is 0.998247 after adding ambience. Final sample peak is -0.63 dBFS; speech RMS is -18.57 dBFS and the added difference is -43.12 dBFS. These checks establish preservation and mix level, not human perception of realism.
- No new complete Higgsfield generation was purchased after the latest motion prompt and ambience changes. Mixer execution is locally tested; provider upload/result persistence follows the existing application path. The HeyGen/approved Hindi demo is separate from the Higgsfield automatic generation backend.

## Earlier pipeline acceptance history

## Verified

- Strict TypeScript: `npm run typecheck` (`tsgo --noEmit`), including application, tests and scripts.
- Three unit tests: server-enforced consent; concurrent duplicate submissions create one provider job and one usage event; owner tokens and job/stage binding; valid image signatures; rejection of local/unrecognized media URLs; correct Grok start-frame payload.
- Six Playwright tests across desktop Chrome and mobile Chrome: input modes, language/gender controls, uploads, consent gating, responsive widths, gallery, internal pages, robots/noindex, result playback, refresh recovery, and attachment download. No browser page errors in the live acceptance run.
- Clean installation from the delivered source archive: `npm ci`, strict typecheck, three unit tests, and production Vite client/SSR builds passed. All six browser tests passed against the production Node server in 11.2 seconds.
- Client bundle inspection found none of the server credential, CLI authentication, private workflow registry or provider API markers.
- The real authenticated Higgsfield account was used; no provider responses were mocked in the live acceptance run.

## Live acceptance result

The input portrait is a fictional AI-generated person. Spoken test text: `नमस्ते। यह एक तकनीकी परीक्षण है।` (“Hello. This is a technical test.”)

The app completed Seedream 4.5 portrait reframing, ElevenLabs speech via Higgsfield, Grok Video 1.5 movement, and Sync Lipsync 3. A browser resumed the in-progress workflow and advanced it to the result screen. Reloading preserved the completed result; the download endpoint returned HTTP 200 with an MP4 attachment. The user subsequently rejected this sample's excessive motion. The technical checks below establish pipeline operation, not creative acceptance.

- Final result: 720 × 1280, 9:16, 3.708 seconds.
- Source audio decoded length: 3.680 seconds; final audio: 3.692 seconds (codec padding).
- Waveform correlation: 0.99893 at zero timing offset, confirming the original audio is retained to a close numerical match.
- Initial frame inspection at 0.2, 1.7 and 3 seconds checked borders, identity and stretching. It missed excessive head tilts, leaning, hand gestures and smiling across the sequence. That sample is not an accepted realism reference.
- A printed-note image was transcribed exactly as `Namaste.\nThis is a technical test.` Real handwritten regional notes were not provided for live acceptance.

The first sample was rejected because an ambiguous portrait prompt caused the model to add a physical phone border. The prompt was corrected and the complete run repeated. The rejected entry and its usage remain in the admin history; it is excluded from the completed gallery. This history is kept only in local runtime data and is excluded from the source archive.

## Remaining external validation

The subsequent motion revision is documented in `MOTION_REVIEW.md`. It reuses the original audio, applies restrained close-up framing and source performance, and replaces the rejected gallery sample. Strict TypeScript, the three unit tests and the production build were rerun successfully after the code changes. All six desktop/mobile browser tests also passed against the updated production server in 18.4 seconds, including playback, refresh and download of the revision.

- Supabase: adapter and grant/RLS/trigger migration are included, but no Supabase credentials were present. The migration was not applied to a live project; persistence tests used the real local file store.
- Language/accent acceptance: Hindi was tested end-to-end. Ten languages are selectable. Higgsfield's preset catalog exposes gender but no reliable regional-accent metadata, and its ElevenLabs submodel version is provider-controlled. Default multilingual voices should not be advertised as verified native voices for every region.
- Long audio: full recording uses Sync loop mode; gestures may repeat. The 180-second maximum and all recording codecs were not live-rendered. The uploaded-audio path skips synthesis; its controls and validation are implemented.
- Deployment: no public website, DNS change, paid hosting purchase, or live Supabase mutation was performed. Current preview is local.
- No-auth design: admin URLs and both business tables' public SELECT access are intentionally open per the brief. Robots/noindex does not secure them. The workflow registry uses a persistent local volume and one Node process; it is not a horizontally scalable job queue.

## Model references

Model IDs and media schemas were checked against the authenticated Higgsfield CLI and agents API. The model metadata did not reveal regional voice accents. [ElevenLabs documents different language coverage across model families](https://elevenlabs.io/docs/overview/capabilities/voices), so this build does not infer all-language quality from the engine brand alone. The server setup follows [TanStack Start's documented SSR configuration](https://tanstack.com/start/latest/docs/framework/react/build-from-scratch).

## Published release — 14 September 2026 (IST)

- Production: https://portraitvoice.vercel.app
- Deployment: `dpl_3PTqUZLrC6HhAECLpkFvzPmiie9N`, Vercel READY.
- Typecheck and four unit tests passed. Linux production build passed and executed the bundled FFmpeg binary successfully.
- All six browser tests passed on the public URL (desktop and mobile): forms, consent, ambience preview, example playback, gallery, admin pages, completed-job recovery and download.
- Cloud persistence passed six concurrent updates and three exclusive lease users. A 5,488,042-byte signed private upload passed exact byte readback and receipt-tampering rejection.
- Existing entry and workflow JSON was migrated to private cloud storage and compared on readback. Completed-job recovery reused the existing video.
- No additional paid video generation was run for publication. The previously approved HeyGen/Kanika example is included; automatic generation remains the documented Higgsfield pipeline.
