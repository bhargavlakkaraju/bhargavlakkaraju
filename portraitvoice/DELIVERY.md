# PortraitVoice delivery

The complete runnable source is in this folder. Use `README.md` for setup, model choices and limitations; `VERIFICATION.md` records what was actually tested.

The public interface, gallery and both internal dashboards are built. Generation uses the account owner's existing Higgsfield authentication on the server, so the browser needs no sign-in.

The current review clip is `PortraitVoice-UGC-preview.mp4` in the parent outputs folder and `public/demo-ugc.mp4` inside the app. It uses the HeyGen natural-motion revision, the user-approved Kanika Hindi voice and quiet outdoor ambience. Earlier technical-test clips remain available for comparison. These are fictional AI demonstrations, not farmer endorsements. See `UGC_REVIEW.md` for the current revision.

This app is currently configured for local persistence. Before deploying, configure Supabase if required, apply the SQL migration, provide durable private storage for the workflow registry, and review the intentionally open admin/data access.
