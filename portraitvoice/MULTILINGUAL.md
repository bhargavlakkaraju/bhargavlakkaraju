# Multilingual video release

The source is the approved `f5d8172df62c295852075e5271202349b32169da` commit on `claude/peaceful-ramanujan-nissro`. Only `portraitvoice/` changes are included.

Input and output languages are independent. Text, note photos and audio accept source-language detection or an override (including a named other/mixed language). Gemini transcription preserves the source; users review it before translation. Each selected target has an editable script and explicit review check. Changed sources invalidate approval while retaining previous drafts. Original text and source language are saved per workflow; original audio is retained separately. Translated audio uses the chosen stock AI voice rather than pretending to preserve the recording.

Output languages: English, Hindi, Punjabi, Telugu, Tamil, Kannada, Marathi, Bengali, Gujarati and Odia; the existing Malayalam option remains. These are documented Eleven v3 languages and appeared in the read-only HeyGen translation catalog on 5 October 2026. Input recognition quality varies; this is not a promise of literal any-language support.

For newly created videos, reviewed scripts fan out to separate Avatar IV entries with independent tokens, request IDs, progress, failures, resume and downloads. A failed output is retried only after HeyGen confirms failure; ambiguous submissions retain the duplicate-charge guard. Preparing a batch retries the original per-language request IDs and does not repeat completed outputs.

Completed videos, including resumable legacy completions, offer precision video translation. The source video stays intact. A HeyGen proofread session is created per target; the timed translated subtitles must be reviewed before final lip-sync rendering. Edited SRT uploads are attempted only when words are changed. The runtime checks the existing API key's non-secret scope metadata; the action is disabled without translation read/write access. No permissions are granted. Enterprise subtitle-editing entitlements and actual voice/render quality require separate provider acceptance testing.

Official references:
- https://elevenlabs.io/docs/overview/models#eleven-v3
- https://developers.heygen.com/docs/video-translation-precision
- https://developers.heygen.com/docs/api-key-permissions
- https://developers.heygen.com/reference/get-current-api-key

Validation: native-script/length/unclear-word checks, ownership/idempotency/finalization/provider-failure retry tests, desktop and mobile draft/review/consent/layout checks, production build. No paid renders, transcription or translation calls are made by these tests. Existing opt-in live tests remain skipped.

Publication from the repository root, after checks:
1. Commit only `portraitvoice/`; fast-forward `claude/peaceful-ramanujan-nissro` to the reviewed feature commit and push that branch.
2. Verify `git ls-remote origin refs/heads/claude/peaceful-ramanujan-nissro` matches the local release SHA.
3. Link the existing project: `vercel link --yes --project portraitvoice --scope bhargavlakkarajus-projects` (already linked in this working checkout).
4. Run `vercel --prod --yes` from the monorepo root. Root directory must remain `portraitvoice`; project ID `prj_RIet44B4bdCpyyCt6qt8jEn7ZNfJ`.
5. Verify Ready build status, canonical https://portraitvoice.vercel.app/ and desktop/mobile changed flows with all paid POST requests blocked. Read only the capability endpoint to verify existing-video access.

Known existing limitation: admin pages lack authentication and the shared generation endpoint lacks rate limits, as documented in README. This release does not change security permissions or that policy. The new Gemini translation/transcription token usage is not yet included in the legacy admin usage totals.

Release dependency requirement: Vercel refused the baseline Start 1.168.52 because of GHSA-qx66-fv34-fjm8. This release pins the patched @tanstack/react-start 1.168.60 and compatible @tanstack/react-router 1.170.41 and updates the lockfile. The patched version is confirmed by https://github.com/TanStack/router/security/advisories/GHSA-qx66-fv34-fjm8 . No unsafe deployment override is used.
