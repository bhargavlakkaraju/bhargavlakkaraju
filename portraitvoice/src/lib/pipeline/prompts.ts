/** Seedream 4.5 image-edit prompt: re-frame the uploaded portrait into a 9:16 rural UGC still. */
export const PORTRAIT_PROMPT = [
  "Create a full-bleed, borderless, realistic 9:16 vertical photograph of this exact person standing directly in a rural setting. The actual person and scenery fill the entire image from edge to edge. This is a photograph, not a picture of a photograph.",
  "Keep the same face, skin tone, hair, clothing, body proportions and identity exactly as in the photo — no beautification, no age change, no stretching or warping.",
  "Framing: a close interview portrait from the top of the head to the upper chest only. The face is large and clearly visible, centred, facing straight toward the camera. Leave modest space above the head. Shoulders are loose and naturally balanced, with comfortable, unposed posture. Hands, elbows, waist and lower body are outside the frame.",
  "Expression: calm, attentive and neutral, lips gently together, no visible teeth, no broad smile, no laughing or posed enthusiasm. Preserve realistic skin texture and asymmetry.",
  "Background: a softly blurred Indian village farm setting (green crop field, mud path, trees, a distant house) with shallow depth of field.",
  "Lighting: natural soft daylight matching the person's original lighting, realistic skin texture, candid photographic realism with subtle natural texture.",
  "Absolutely no phone, smartphone, tablet, screen, device, bezel, border, inset image, poster, mockup, picture frame, UI or rounded-corner container anywhere. No text, captions, logos, watermarks, extra people or hands covering the face.",
].join(" ");

/** Relaxed source movement; the supplied recording drives speech in Sync. */
export function avatarPrompt(_language: string): string {
  return [
    "A stationary documentary interview close-up. The person is comfortably engaged in an informal conversation, quietly listening between thoughts. Preserve the framing, identity and setting of the start image.",
    "Shoulders are loose, with gentle visible breathing and a small irregular upper-body adjustment. Include one soft head tilt or slight shift of weight, then return to a relaxed resting posture. Natural blinks and attentive eye contact. Movement is subtle, asymmetrical and unhurried, with moments of rest.",
    "The mouth stays gently closed and relaxed in this silent motion source; the exact supplied speech will be added separately. No exaggerated expressions, continuous swaying, bouncing, frequent nodding, deep leaning, arm movement or large gestures. Hands remain below the crop.",
    "Camera stays stationary: no zoom, pan, orbit, push-in, reframing or shake. Keep the landscape and lighting stable, with no conspicuous wind effects. Preserve natural skin texture and body proportions.",
    "One continuous full-bleed 9:16 shot with no cuts, transitions, borders, text, captions, logos, music or generated dialogue.",
  ].join(" ");
}

export const OCR_SYSTEM_PROMPT =
  "You are a precise OCR engine for handwritten and printed notes in any Indian language or English. Output only the transcribed text in the original language and script, preserving line breaks. Do not translate, do not add commentary, quotes or labels. If the note is unreadable, output an empty string.";

export const OCR_USER_PROMPT =
  "Transcribe all the text written in this image exactly as written.";
