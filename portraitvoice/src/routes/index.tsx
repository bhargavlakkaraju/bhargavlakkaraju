import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  AudioLines,
  FileImage,
  Type,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Check,
  LoaderCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { UploadZone } from "@/components/upload-zone";
import { AmbienceControl } from "@/components/ambience-control";
import { PortraitPreview } from "@/components/preview";
import { GenerationScreen } from "@/components/generation-screen";
import {
  useTestimonialPipeline,
  extractTextFromNote,
} from "@/lib/client/pipeline";
import { LANGUAGES } from "@/lib/languages";
import type { InputMode, VoiceGender } from "@/lib/types";
import { toast } from "sonner";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PortraitVoice by Syngenta — Create a testimonial video" },
      {
        name: "description",
        content:
          "Turn a portrait and your own words into a natural testimonial video. Ten Indian languages. Text, handwritten notes, or your own voice.",
      },
    ],
  }),
  component: Home,
});
function Home() {
  const [step, setStep] = useState(0);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  useEffect(() => {
    if (previousStep.current !== step) stepHeading.current?.focus();
    previousStep.current = step;
  }, [step]);
  const [portrait, setPortrait] = useState<File | null>(null),
    [preview, setPreview] = useState<string | null>(null),
    [mode, setMode] = useState<InputMode>("text"),
    [script, setScript] = useState(""),
    [language, setLanguage] = useState("hi"),
    [gender, setGender] = useState<VoiceGender>("female"),
    [consent, setConsent] = useState(false),
    [ambience, setAmbience] = useState<boolean | null>(null),
    [note, setNote] = useState<File | null>(null),
    [audio, setAudio] = useState<File | null>(null),
    [reading, setReading] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [extraction, setExtraction] = useState<{
      entryId: string;
      token: string;
    } | null>(null);
  const { state, generate, reset, resume } = useTestimonialPipeline();
  useEffect(() => {
    if (!portrait) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(portrait);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [portrait]);
  const storyReady = Boolean(
    mode === "audio"
      ? audio
      : script.trim() &&
          script.length <= 700 &&
          (mode === "text" || (confirmed && extraction)),
  );
  const ready = Boolean(portrait && consent && storyReady);
  function startAgain() {
    reset();
    setStep(0);
    setPortrait(null);
    setScript("");
    setNote(null);
    setAudio(null);
    setExtraction(null);
    setConfirmed(false);
    setConsent(false);
  }
  async function readNote() {
    if (!note) return;
    setReading(true);
    try {
      const result = await extractTextFromNote(note, language);
      setScript(result.text);
      setExtraction(result);
      setConfirmed(false);
      toast.success(
        result.text.length > 700
          ? "Your note is longer than 700 characters. Please shorten it before confirming."
          : "Your note is ready to review.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read this note.");
    } finally {
      setReading(false);
    }
  }
  if (
    state.phase === "uploading" ||
    state.phase === "running" ||
    state.phase === "done"
  )
    return <GenerationScreen state={state} onReset={startAgain} />;
  return (
    <main className="studio-shell">
      <div className="studio-heading">
        <div>
          <p className="studio-eyebrow">Your video studio</p>
          <h1>Make it personal.</h1>
        </div>
        <span className="studio-format">
          Portrait video <span>9:16</span>
        </span>
      </div>
      <div className={`studio-workspace studio-step-${step}`}>
        <PortraitPreview image={preview} />
        <section
          className="generator-main"
          aria-label="Create a testimonial video"
        >
          <nav className="creation-steps" aria-label="Creation steps">
            {["Photo", "Story", "Finish"].map((label, i) => (
              <button
                key={label}
                type="button"
                aria-current={step === i ? "step" : undefined}
                disabled={
                  reading || (i > 0 && !portrait) || (i === 2 && !storyReady)
                }
                className={i < step ? "step-complete" : ""}
                onClick={() => setStep(i)}
              >
                <span>{i < step ? <Check size={14} /> : i + 1}</span>
                {label}
              </button>
            ))}
          </nav>
          <form
            className="generator-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (reading) return;
              if (step === 0) {
                if (portrait) setStep(1);
                return;
              }
              if (step === 1) {
                if (storyReady) setStep(2);
                return;
              }
              if (!ready || !portrait) return;
              void generate({
                portrait,
                inputMode: mode,
                language,
                gender: mode === "audio" ? null : gender,
                scriptText: mode === "audio" ? null : script,
                audioFile: mode === "audio" ? audio : null,
                extraction: mode === "note" ? extraction : null,
                consent: true,
                ambience: ambience ?? mode !== "audio",
              });
            }}
          >
            <div className="step-intro">
              <h2 ref={stepHeading} tabIndex={-1}>
                {
                  [
                    "Start with a photo.",
                    "Tell your story.",
                    "Give it your voice.",
                  ][step]
                }
              </h2>
              <p>
                {
                  [
                    "A clear portrait is all you need.",
                    "Your words, in your own language.",
                    "A few final touches. Then, it’s yours.",
                  ][step]
                }
              </p>
            </div>
            {step === 0 && (
              <div className="photo-step">
                <UploadZone
                  kind="portrait"
                  file={portrait}
                  onChange={setPortrait}
                  preview={preview}
                />
                <div className="photo-guidance">
                  <span>Face the camera</span>
                  <span>Good lighting</span>
                  <span>One person</span>
                </div>
              </div>
            )}
            {step === 1 && (
              <div className="story-step">
                <Tabs
                  value={mode}
                  onValueChange={(v) => {
                    setMode(v as InputMode);
                    setAmbience(null);
                  }}
                >
                  <TabsList aria-label="Testimonial input">
                    <TabsTrigger value="text" disabled={reading}>
                      <Type size={16} /> Text
                    </TabsTrigger>
                    <TabsTrigger value="note" disabled={reading}>
                      <FileImage size={16} /> Note photo
                    </TabsTrigger>
                    <TabsTrigger value="audio" disabled={reading}>
                      <AudioLines size={16} /> Audio
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                {mode === "note" && (
                  <div className="note-input">
                    <UploadZone
                      kind="note"
                      disabled={reading}
                      file={note}
                      onChange={(f) => {
                        setNote(f);
                        setConfirmed(false);
                        setExtraction(null);
                        setScript("");
                      }}
                    />
                    <Button
                      variant="secondary"
                      onClick={() => void readNote()}
                      disabled={!note || reading}
                    >
                      {reading ? (
                        <LoaderCircle size={15} className="spin" />
                      ) : (
                        <Sparkles size={15} />
                      )}{" "}
                      {reading ? "Reading your note…" : "Read note"}
                    </Button>
                  </div>
                )}
                {mode === "audio" ? (
                  <div className="audio-input">
                    <UploadZone kind="audio" file={audio} onChange={setAudio} />
                    {audio && <AudioPreview file={audio} />}
                    <p className="field-hint">
                      Your original voice will be used in the video.
                    </p>
                  </div>
                ) : (
                  <div className="script-wrap">
                    <label htmlFor="testimonial" className="sr-only">
                      Your testimonial
                    </label>
                    <Textarea
                      id="testimonial"
                      disabled={reading}
                      rows={4}
                      maxLength={700}
                      placeholder={
                        mode === "note"
                          ? "Read your note, then review the words here."
                          : language === "hi"
                            ? "अपनी कहानी यहाँ लिखें…"
                            : "Share your experience in your own words…"
                      }
                      value={script}
                      onChange={(e) => {
                        setScript(e.target.value);
                        if (mode === "note") setConfirmed(false);
                      }}
                    />
                    <div className="textarea-footer">
                      <span>
                        {mode === "note"
                          ? "Check the words before continuing."
                          : language === "hi"
                            ? "हिन्दी देवनागरी में लिखें"
                            : "Write in your selected language"}
                      </span>
                      <span
                        className={
                          script.length === 700 ? "text-brand-leaf" : ""
                        }
                      >
                        {script.length}
                        <span> / 700</span>
                      </span>
                    </div>
                  </div>
                )}
                {mode === "note" && script && (
                  <label className="check-line note-confirm">
                    <Checkbox
                      checked={confirmed}
                      onCheckedChange={(v) => setConfirmed(v === true)}
                    />
                    <span>I have checked the extracted text.</span>
                  </label>
                )}
                <div className="language-field">
                  <label htmlFor="language">Language</label>
                  <Select
                    id="language"
                    disabled={reading}
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.native}
                        {l.code === "en" ? "" : ` · ${l.label}`}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="finish-step">
                <div className="story-review">
                  <div>
                    <span>
                      Your story ·{" "}
                      {LANGUAGES.find((l) => l.code === language)?.native}
                    </span>
                    <button type="button" onClick={() => setStep(1)}>
                      Edit
                    </button>
                  </div>
                  <p>{mode === "audio" ? audio?.name : script}</p>
                </div>
                {mode !== "audio" && (
                  <fieldset className="gender-field">
                    <legend>Voice</legend>
                    <div className="gender-toggle">
                      {(["female", "male"] as const).map((g) => (
                        <button
                          type="button"
                          key={g}
                          aria-pressed={gender === g}
                          onClick={() => setGender(g)}
                          className={gender === g ? "selected" : ""}
                        >
                          {g === "female" ? "Female" : "Male"}
                          {gender === g && <Check size={13} />}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                )}

                <AmbienceControl
                  key={mode}
                  enabled={ambience ?? mode !== "audio"}
                  onChange={setAmbience}
                />
                <label className="check-line">
                  <Checkbox
                    checked={consent}
                    onCheckedChange={(v) => setConsent(v === true)}
                    aria-label="Consent to create and publicly share this AI video"
                  />
                  <span>
                    I have permission to create this AI video and share the
                    photo, voice and testimonial in the public gallery.
                  </span>
                </label>
              </div>
            )}
            {state.error && (
              <div role="alert" className="error-banner">
                <AlertCircle size={18} />
                <div>
                  <strong>We couldn’t finish your video</strong>
                  <p>{state.error}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void resume()}
                  >
                    Resume existing request
                  </Button>
                </div>
              </div>
            )}

            <div className="form-actions">
              {step > 0 && (
                <Button
                  variant="ghost"
                  disabled={reading}
                  onClick={() => setStep(step - 1)}
                  className="back-button"
                >
                  <ArrowLeft size={18} /> Back
                </Button>
              )}
              <Button
                type="submit"
                size="lg"
                className="generate-button"
                disabled={
                  reading ||
                  (step === 0 ? !portrait : step === 1 ? !storyReady : !ready)
                }
              >
                {step === 2 ? "Create my video" : "Continue"}
                <ArrowRight size={18} />
              </Button>
            </div>
            <p className="privacy-note">
              <ShieldCheck size={14} />
              {step === 2
                ? "AI-generated · Shared to the public gallery"
                : "No sign-in. Just your story."}
            </p>
          </form>
        </section>
      </div>
      <footer className="studio-footer">
        <span>Stories worth sharing.</span>
        <span>Made with PortraitVoice</span>
      </footer>
    </main>
  );
}

function AudioPreview({ file }: { file: File }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const src = URL.createObjectURL(file);
    setUrl(src);
    return () => URL.revokeObjectURL(src);
  }, [file]);
  return <audio src={url} controls className="audio-preview" />;
}
