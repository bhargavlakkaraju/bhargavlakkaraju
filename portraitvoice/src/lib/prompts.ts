export const PORTRAIT_PROMPT = [
  "Edit this photo into a realistic vertical 9:16 smartphone portrait of the same person for a farmer testimonial video.",
  "Keep the person's identity, face, skin tone, age, clothing and body proportions exactly as photographed. No stretching, warping, slimming or beautifying.",
  "Frame from mid-torso up, centred, looking into the camera with a natural relaxed expression.",
  "Place them in an Indian village or farm setting: softly blurred green fields, crops or a brick house behind them, natural daylight with gentle warm sun.",
  "Authentic user-generated look from a phone camera, slight natural grain, no studio lighting, no text, no logos, no watermark, no extra people.",
].join(" ");

export const TALKING_HEAD_PROMPT = [
  "A real Indian farmer gives a sincere testimonial straight to camera in a vertical selfie-style phone video.",
  "Keep the face, clothing, framing and village background exactly as in the image.",
  "Natural talking mouth movement, small honest head nods, occasional blinks, relaxed hand gestures below the chest.",
  "Handheld camera, nearly static with a gentle sway. Natural daylight, authentic phone footage.",
  "No zoom, no cuts, no captions, no text, no logos. Quiet farm ambience only, no music.",
].join(" ");

export const EXTENSION_PROMPT =
  `${TALKING_HEAD_PROMPT} Continue the same take seamlessly; the person keeps speaking with the same calm energy.`;

export const NOTE_OCR_PROMPT = [
  "Transcribe the handwritten testimonial in this photo exactly as written, in its original language and script.",
  "Do not translate, summarise or add anything. Fix only obvious spelling slips. Return the plain text only, nothing else.",
].join(" ");
