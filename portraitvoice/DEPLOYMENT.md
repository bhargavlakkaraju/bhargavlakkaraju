# PortraitVoice deployment

Production URL: https://portraitvoice.vercel.app
Vercel project: portraitvoice (`prj_RIet44B4bdCpyyCt6qt8jEn7ZNfJ`).
Source folder in GitHub: `portraitvoice` on `claude/peaceful-ramanujan-nissro`.

Current production deployment: `dpl_D5RABAYzB9X1KedkWd7ofn4Yfrc3` (14 September 2026 IST).

## Runtime

Node 24, TanStack Start and Nitro Vercel preset. Server functions run in Mumbai with a 300-second maximum. FFmpeg is installed for the deployment platform and bundled with the ambience asset. The local Hono entry point is excluded from Nitro auto-detection.

Private Vercel Blob holds entries, usage, and workflow ownership state. `PV_STORAGE=blob`, `BLOB_READ_WRITE_TOKEN`, and `HIGGSFIELD_API_KEY` are server environment values; never include them in source or browser variables. Photos/audio upload directly using short-lived, scoped grants so large recordings avoid the Vercel request-body limit.

## Release and rollback

Deploy from the repository root because the project root directory is `portraitvoice`. Use `vercel --prod` in the linked repository after typecheck, unit tests and browser checks. Keep credentials, `.data`, `.vercel`, work files, node_modules, build output and browser traces out of release packages.

Prior live deployment: `dpl_5y5KbixSUamvSvWN1CnMXCy3QkRv` (https://portraitvoice-nm80yzxn4-bhargavlakkarajus-projects.vercel.app). Use Vercel rollback to restore its alias if needed. Storage changes are additive and previous state is preserved.

The approved HeyGen/Kanika example is bundled. Automatic generation still uses the documented Higgsfield pipeline.

Initial release commit: `7a08d4efcf08f03080292db3ea4fff8b117bed22`. The server uses the current Higgsfield account credential; if it expires, refresh the CLI session with `higgsfield account status`, update the sensitive production/preview environment value, and redeploy. Credentials are not included in the source.

Optional cloud regression check: set `PV_STORAGE=blob` and `BLOB_READ_WRITE_TOKEN`, then run `npm run test:cloud`. It uses a unique private test prefix and removes its test objects. This check spends no generation credits.
