import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
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
  const ready = Boolean(
    portrait &&
    consent &&
    (mode === "audio"
      ? audio
      : script.trim() &&
        script.length <= 700 &&
        (mode === "text" || (confirmed && extraction))),
  );
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
    return <GenerationScreen state={state} onReset={reset} />;
  return (
    <main className="generator-shell">
      <section className="generator-main">
        <div className="intro">
          <h1>Create a testimonial video.</h1>
          <p>One photo. Your words. Brought to life.</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
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
          className="generator-form"
        >
          <div className="form-section">
            <div className="section-label">
              <span className="step-number">1</span>
              <h2>Your portrait</h2>
            </div>
            <UploadZone
              kind="portrait"
              file={portrait}
              onChange={setPortrait}
              preview={preview}
            />
          </div>
          <div className="form-section">
            <div className="section-label">
              <span className="step-number">2</span>
              <h2>Your story</h2>
            </div>
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
                      : "Write in your selected language"}
                  </span>
                  <span
                    className={script.length === 700 ? "text-brand-leaf" : ""}
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
            <div className="preferences">
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
            </div>
            <AmbienceControl
              key={mode}
              enabled={ambience ?? mode !== "audio"}
              onChange={setAmbience}
            />
          </div>
          <div className="form-bottom">
            <label className="check-line">
              <Checkbox
                checked={consent}
                onCheckedChange={(v) => setConsent(v === true)}
                aria-label="Consent to create and publicly share this AI video"
              />
              <span>
                I have permission to create this AI video and share the photo,
                voice and testimonial in the public gallery.
              </span>
            </label>
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
            <Button
              type="submit"
              size="lg"
              className="generate-button"
              disabled={!ready || reading}
            >
              <Sparkles size={18} /> Create my video <ArrowRight size={19} />
            </Button>
            <p className="privacy-note">
              <ShieldCheck size={13} /> No sign-in needed
            </p>
          </div>
        </form>
      </section>
      <PortraitPreview image={preview} />
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
