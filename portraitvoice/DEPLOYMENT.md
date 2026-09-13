# PortraitVoice deployment

Production URL: https://portraitvoice.vercel.app
Vercel project: portraitvoice (`prj_RIet44B4bdCpyyCt6qt8jEn7ZNfJ`).
Source folder in GitHub: `portraitvoice` on `claude/peaceful-ramanujan-nissro`.

Current production deployment: `dpl_3PTqUZLrC6HhAECLpkFvzPmiie9N` (14 September 2026 IST).

## Runtime

Node 24, TanStack Start and Nitro Vercel preset. Server functions run in Mumbai with a 300-second maximum. FFmpeg is installed for the deployment platform and bundled with the ambience asset. The local Hono entry point is excluded from Nitro auto-detection.

Private Vercel Blob holds entries, usage, and workflow ownership state. `PV_STORAGE=blob`, `BLOB_READ_WRITE_TOKEN`, and `HIGGSFIELD_API_KEY` are server environment values; never include them in source or browser variables. Photos/audio upload directly using short-lived, scoped grants so large recordings avoid the Vercel request-body limit.

## Release and rollback

Deploy from the repository root because the project root directory is `portraitvoice`. Use `vercel --prod` in the linked repository after typecheck, unit tests and browser checks. Keep credentials, `.data`, `.vercel`, work files, node_modules, build output and browser traces out of release packages.

Prior live deployment: `dpl_5y5KbixSUamvSvWN1CnMXCy3QkRv` (https://portraitvoice-nm80yzxn4-bhargavlakkarajus-projects.vercel.app). Use Vercel rollback to restore its alias if needed. Storage changes are additive and previous state is preserved.

The approved HeyGen/Kanika example is bundled. Automatic generation still uses the documented Higgsfield pipeline.
