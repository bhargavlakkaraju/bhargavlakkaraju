# Motion revision — 13 September 2026

The user rejected the original sample because it looked overacted and unrealistic. Reviewing the sequence confirmed repeated head tilts, leaning, hand gestures and broad changes in smiling within a four-second clip. The original prompt explicitly requested continuous talking motions and expressive hand gestures before audio was applied. The earlier technical acceptance checks missed this creative failure.

## Changes

- Prepare a front-facing interview close-up with a calm expression, relaxed closed lips and hands outside the frame.
- Generate a quiet source shot with a fixed camera and posture. Exclude gestures, nods, head tilts, swaying, leaning, broad smiles, camera drift and wind. Permit minimal breathing and blinking.
- Add speech using the same original Hindi MP3 in Sync. No new voice synthesis was used for the comparison.
- Round the short source duration to the next whole second; avoid the previous unnecessary extra second at this duration.
- Keep the rejected entry and its usage history, but remove it from the completed public gallery.

Sync-3 manages expressiveness natively; manual temperature tuning is not used. [Provider documentation](https://sync.so/docs/models/sync-3).

## Revised result

`portraitvoice-motion-revision.mp4`: 720 × 1280, 89 frames at 24 fps, approximately 3.708 seconds. The revised sequence keeps the head and shoulders steady, without hands entering the frame. Blinking and speech-driven mouth movements remain.

Approximate upper-face optical tracking across the complete 89-frame clips measured a head-rotation range of 29.13° in the original and 0.57° in the revision. Horizontal movement fell from 0.138 to 0.016 face widths. This is a diagnostic estimate using tracked features outside the mouth; it can contain tracking error and is not a realism score.

The source audio decoded to 3.680 seconds and the final audio to 3.692 seconds, including codec padding. Their waveform correlation at zero offset was 0.99940. The original recording is preserved.

The revised clip addresses the excessive movement. Mouth, teeth and skin can still look generated, and this remains a candidate for human review rather than an approved real-farmer testimonial. Long recordings and repeated source-loop transitions were not re-rendered in this revision.
