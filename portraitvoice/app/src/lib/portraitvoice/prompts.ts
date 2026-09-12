import type { Gender, InputMode, LanguageCode } from "./types";
import { languageLabel } from "./types";

export const PORTRAIT_PROMPT = [
  "Edit this photo into a realistic vertical 9:16 smartphone portrait of the same person for a farmer testimonial video.",
  "Keep the person's identity, face, skin tone, age, clothing and body proportions exactly as photographed. No stretching, warping, slimming or beautifying.",
  "Frame from mid-torso up, centred, looking into the camera with a natural relaxed expression.",
  "Place them in an Indian village or farm setting: softly blurred green fields, crops or a brick house behind them, natural daylight with gentle warm sun.",
  "Authentic user-generated look from a phone camera, slight natural grain, no studio lighting, no text, no logos, no watermark, no extra people.",
].join(" ");

const VOICE_BY_GENDER: Record<Gender, string> = {
  female: "a warm, clear adult female voice",
  male: "a warm, clear adult male voice",
};

/**
 * Talking-head direction for the video model. In text and note modes the model
 * speaks the testimonial itself; in audio mode the uploaded recording is the
 * audio reference and the mouth follows it.
 */
export function talkingHeadPrompt(input: {
  mode: InputMode;
  script: string | null;
  language: LanguageCode;
  gender: Gender | null;
}): string {
  const base = [
    "A real Indian farmer gives a sincere testimonial straight to camera in a vertical selfie-style phone video.",
    "Keep the face, clothing, framing and village background exactly as in the image.",
    "Natural talking mouth movement, small honest head nods, occasional blinks, relaxed hand gestures below the chest.",
    "Handheld camera, nearly static with a gentle sway. Natural daylight, authentic phone footage.",
    "No zoom, no cuts, no captions, no text, no logos. Quiet farm ambience in the background.",
  ];
  if (input.mode === "audio") {
    base.push(
      "The person speaks exactly the words in the reference audio, lips synchronised to it, in the same language and tone. Do not add any other speech or music.",
    );
  } else if (input.script) {
    const voice = input.gender ? VOICE_BY_GENDER[input.gender] : "a warm, clear adult voice";
    base.push(
      `They speak in ${languageLabel(input.language)} with ${voice}, calm and unhurried, saying exactly this and nothing else: "${input.script.trim()}"`,
    );
  }
  return base.join(" ");
}

export const NOTE_OCR_PROMPT = [
  "Transcribe the handwritten testimonial in this photo exactly as written, in its original language and script.",
  "Do not translate, summarise, or add anything. Fix only obvious spelling slips. Return the plain text only, nothing else.",
].join(" ");
