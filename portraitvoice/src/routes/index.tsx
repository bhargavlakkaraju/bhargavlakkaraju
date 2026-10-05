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
  mediaForm,
} from "@/lib/client/pipeline";
import { validateScript } from "@/lib/script";
import { LANGUAGES } from "@/lib/languages";
import type { InputMode, VoiceGender } from "@/lib/types";
import {
  translateScript,
  transcribeAudio,
  createLanguageBatch,
  uploadMedia,
} from "@/server/fns";
import {
  LanguageOutputs,
  BATCH_STORAGE,
  type LanguageOutput,
} from "@/components/language-outputs";
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
  const photoReturnStep = useRef(1);
  const [typedScript, setTypedScript] = useState("");
  const [noteScript, setNoteScript] = useState("");
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  useEffect(() => {
    if (previousStep.current !== step) stepHeading.current?.focus();
    previousStep.current = step;
  }, [step]);
  const [portrait, setPortrait] = useState<File | null>(null),
    [preview, setPreview] = useState<string | null>(null),
    [mode, setMode] = useState<InputMode>("text"),
    [language, setLanguage] = useState("auto"),
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
  const [transcript, setTranscript] = useState("");
  const [otherLanguage, setOtherLanguage] = useState("");
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [detected, setDetected] = useState("");
  const [targets, setTargets] = useState<string[]>(["hi"]);
  const [drafts, setDrafts] = useState<
    Record<string, { text: string; source: string; reviewed: boolean }>
  >({});
  const [outputs, setOutputs] = useState<LanguageOutput[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [translationBusy, setTranslationBusy] = useState<string | null>(null);
  const pendingBatch = useRef<
    Parameters<typeof createLanguageBatch>[0]["data"] | null
  >(null);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(BATCH_STORAGE) ?? "null");
      if (Array.isArray(saved)) setOutputs(saved);
    } catch {}
  }, []);
  const script =
    mode === "audio" ? transcript : mode === "note" ? noteScript : typedScript;
  const sourceLanguage =
    language === "other" ? otherLanguage.trim() || "mixed" : language;
  const sourceKey = JSON.stringify([script, sourceLanguage, mode]);
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("portraitvoice.draft.v1") ?? "null",
      );
      if (saved) {
        setTypedScript(saved.typedScript ?? "");
        setNoteScript(saved.noteScript ?? "");
        setTranscript(saved.transcript ?? "");
        setLanguage(saved.language ?? "auto");
        setOtherLanguage(saved.otherLanguage ?? "");
        setTargets(
          (saved.targets ?? ["hi"]).filter((c: string) =>
            LANGUAGES.some((l) => l.code === c),
          ),
        );
        setDrafts(saved.drafts ?? {});
      }
      const pending = JSON.parse(
        localStorage.getItem("portraitvoice.batch-request.v1") ?? "null",
      );
      if (pending) pendingBatch.current = pending;
    } catch {}
    setDraftLoaded(true);
  }, []);
  useEffect(() => {
    if (draftLoaded)
      try {
        localStorage.setItem(
          "portraitvoice.draft.v1",
          JSON.stringify({
            typedScript,
            noteScript,
            transcript,
            language,
            otherLanguage,
            targets,
            drafts,
          }),
        );
      } catch {}
  }, [
    draftLoaded,
    typedScript,
    noteScript,
    transcript,
    language,
    otherLanguage,
    targets,
    drafts,
  ]);
  useEffect(() => {
    setConsent(false);
  }, [sourceKey, gender, ambience]);
  const translationsReady =
    targets.length > 0 &&
    targets.every((code) => {
      const draft = drafts[code];
      if (!draft || draft.source !== sourceKey || !draft.reviewed) return false;
      try {
        validateScript(draft.text, code);
        return true;
      } catch {
        return false;
      }
    });
  async function prepare(code: string) {
    setTranslationBusy(code);
    const key = sourceKey;
    try {
      const result = await translateScript({
        data: { text: script, sourceLanguage, target: code },
      });
      setDetected(result.detectedLanguage);
      setDrafts((d) => ({
        ...d,
        [code]: { text: result.text, source: key, reviewed: false },
      }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not translate.");
    } finally {
      setTranslationBusy(null);
    }
  }
  async function transcribe() {
    if (!audio) return;
    setReading(true);
    try {
      const form = await mediaForm(audio, "audio");
      form.set("sourceLanguage", sourceLanguage);
      const result = await transcribeAudio({ data: form });
      setTranscript(result.text);
      setDetected(result.detectedLanguage);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not transcribe.");
    } finally {
      setReading(false);
    }
  }
  async function generateBatch() {
    if (!portrait || !consent || !translationsReady || submitting) return;
    setSubmitting(true);
    try {
      if (!pendingBatch.current) {
        const photo = await uploadMedia({
          data: await mediaForm(portrait, "image"),
        });
        const sourceAudio =
          mode === "audio" && audio
            ? await uploadMedia({ data: await mediaForm(audio, "audio") })
            : null;
        pendingBatch.current = {
          batchId: crypto.randomUUID(),
          sourcePortraitId: photo.id,
          sourcePortraitUrl: photo.url,
          sourceLanguage,
          sourceScript: script,
          gender,
          consent: true,
          ambience: ambience ?? mode !== "audio",
          audioUrl: sourceAudio?.url ?? null,
          outputs: targets.map((code) => ({
            language: code,
            text: drafts[code]!.text,
            originalAudio: false,
            requestId: crypto.randomUUID(),
            token: Array.from(crypto.getRandomValues(new Uint8Array(32)), (v) =>
              v.toString(16).padStart(2, "0"),
            ).join(""),
          })),
        };
      }
      localStorage.setItem(
        "portraitvoice.batch-request.v1",
        JSON.stringify(pendingBatch.current),
      );
      const result = await createLanguageBatch({ data: pendingBatch.current });
      if (!result.some((o) => o.entryId))
        throw new Error(result[0]?.error ?? "Could not prepare the videos.");
      const saved = result.map((o) => ({ ...o, startedAt: Date.now() }));
      try {
        localStorage.setItem(BATCH_STORAGE, JSON.stringify(saved));
      } catch {}
      setOutputs(saved);
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Could not create videos. Try again to resume this batch.",
      );
    } finally {
      setSubmitting(false);
    }
  }
  let scriptError = "";
  if (script.trim()) {
    try {
      validateScript(script, language);
    } catch (error) {
      scriptError =
        error instanceof Error ? error.message : "Please check your text.";
    }
  }
  const storyReady = Boolean(
    mode === "audio"
      ? audio && transcript.trim() && !scriptError
      : script.trim() &&
          !scriptError &&
          (mode === "text" || (confirmed && extraction)),
  );
  const ready = Boolean(portrait && consent && storyReady && translationsReady);
  const nextHint = reading
    ? "Reading your note…"
    : step === 2
      ? consent
        ? translationsReady
          ? "Ready to create. This usually takes a few minutes."
          : "Review every selected translation before creating videos."
        : "Confirm permission above to create your video."
      : mode === "audio"
        ? audio
          ? "Your original recording is ready."
          : "Add a recording to continue."
        : scriptError
          ? "Check the highlighted text before continuing."
          : mode === "note" && !extraction
            ? "Upload a note, then select Read note."
            : mode === "note" && !confirmed
              ? "Check the extracted text and confirm it above."
              : !script.trim()
                ? "Add your words to continue."
                : "Next, choose a voice and review your video.";
  function changePhoto() {
    photoReturnStep.current = step || 1;
    setStep(0);
  }
  function choosePortrait(file: File | null) {
    setPortrait(file);
    if (file) {
      setConsent(false);
      setStep(photoReturnStep.current === 2 && storyReady ? 2 : 1);
    }
  }
  function startAgain() {
    reset();
    localStorage.removeItem(BATCH_STORAGE);
    outputs.forEach((o) =>
      localStorage.removeItem(`portraitvoice.output.${o.entryId}`),
    );
    localStorage.removeItem("portraitvoice.batch-request.v1");
    localStorage.removeItem("portraitvoice.draft.v1");
    setOutputs([]);
    pendingBatch.current = null;
    setDrafts({});
    setTranscript("");
    setStep(0);
    setPortrait(null);
    setTypedScript("");
    setNoteScript("");
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
      const result = await extractTextFromNote(note, sourceLanguage);
      setNoteScript(result.text);
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
  if (outputs.length)
    return <LanguageOutputs outputs={outputs} onReset={startAgain} />;
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
          <h1>Create a testimonial.</h1>
          <p className="studio-description">
            Turn a photo and your words into a video.
          </p>
        </div>
        <span className="studio-format">
          Portrait video <span>9:16</span>
        </span>
      </div>
      <div className={`studio-workspace studio-step-${step}`}>
        <PortraitPreview image={preview} onChangePhoto={changePhoto} />
        <section
          className="generator-main"
          aria-label="Create a testimonial video"
        >
          <nav className="creation-steps" aria-label="Creation steps">
            {["Photo", "Story", "Review"].map((label, i) => (
              <button
                key={label}
                type="button"
                aria-current={step === i ? "step" : undefined}
                disabled={
                  reading || (i > 0 && !portrait) || (i === 2 && !storyReady)
                }
                className={i < step ? "step-complete" : ""}
                onClick={() => {
                  if (i === 0) photoReturnStep.current = step || 1;
                  setStep(i);
                }}
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
                if (portrait)
                  setStep(photoReturnStep.current === 2 && storyReady ? 2 : 1);
                return;
              }
              if (step === 1) {
                if (storyReady) setStep(2);
                return;
              }
              if (!ready || !portrait) return;
              void generateBatch();
            }}
          >
            <div className="step-intro">
              <h2 ref={stepHeading} tabIndex={-1}>
                {
                  ["Add your photo.", "Add your story.", "Review your video."][
                    step
                  ]
                }
              </h2>
              <p>
                {
                  [
                    "Choose a clear photo of one person.",
                    "How would you like to add your words?",
                    "Check your story, voice and background sound.",
                  ][step]
                }
              </p>
            </div>
            {step === 0 && (
              <div className="photo-step">
                <UploadZone
                  kind="portrait"
                  file={portrait}
                  onChange={choosePortrait}
                  actionLabel={
                    portrait ? "Choose a different photo" : "Choose photo"
                  }
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
                <div className="language-field">
                  <label htmlFor="language">Input language</label>
                  <Select
                    id="language"
                    disabled={reading}
                    value={language}
                    onChange={(e) => {
                      setLanguage(e.target.value);
                      setConsent(false);
                      pendingBatch.current = null;
                    }}
                  >
                    <option value="auto">Detect automatically</option>
                    <option value="other">Other / mixed languages</option>
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.native}
                        {l.code === "en" ? "" : ` · ${l.label}`}
                      </option>
                    ))}
                  </Select>
                </div>
                {language === "other" && (
                  <label>
                    Source language name
                    <input
                      className="input"
                      maxLength={80}
                      value={otherLanguage}
                      onChange={(e) => setOtherLanguage(e.target.value)}
                      placeholder="For example, Spanish or mixed Hindi and English"
                    />
                  </label>
                )}
                <p className="field-hint">
                  Keep your original words in their source language. Detection
                  is a suggestion; review the text before translating.
                  {detected && ` Detected: ${detected}.`}
                </p>
                <Tabs
                  value={mode}
                  onValueChange={(v) => {
                    setMode(v as InputMode);
                    setAmbience(null);
                  }}
                >
                  <TabsList aria-label="Testimonial input">
                    <TabsTrigger value="text" disabled={reading}>
                      <Type size={16} /> Write text
                    </TabsTrigger>
                    <TabsTrigger value="note" disabled={reading}>
                      <FileImage size={16} /> Photo of text
                    </TabsTrigger>
                    <TabsTrigger value="audio" disabled={reading}>
                      <AudioLines size={16} /> Upload audio
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                {mode === "note" && (
                  <div className="note-input">
                    <p className="input-explanation">
                      Upload a handwritten or printed note. You can edit the
                      text after we read it.
                    </p>
                    <UploadZone
                      kind="note"
                      disabled={reading}
                      file={note}
                      onChange={(f) => {
                        setNote(f);
                        setConfirmed(false);
                        setExtraction(null);
                        setNoteScript("");
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
                    <UploadZone
                      kind="audio"
                      file={audio}
                      onChange={(f) => {
                        setAudio(f);
                        setTranscript("");
                        setConsent(false);
                      }}
                    />
                    {audio && <AudioPreview file={audio} />}
                    <p className="field-hint">
                      Translated videos use the selected AI speaking voice. Your
                      original recording stays unchanged.
                    </p>
                    <Button
                      variant="secondary"
                      disabled={!audio || reading}
                      onClick={() => void transcribe()}
                    >
                      {reading ? "Transcribing…" : "Transcribe recording"}
                    </Button>
                    {scriptError && <p role="alert">{scriptError}</p>}
                    <label htmlFor="transcript">
                      Review original transcript
                    </label>
                    <Textarea
                      id="transcript"
                      value={transcript}
                      maxLength={700}
                      onChange={(e) => setTranscript(e.target.value)}
                    />
                  </div>
                ) : mode === "text" || extraction ? (
                  <div className="script-wrap">
                    <label htmlFor="testimonial" className="editor-label">
                      Your testimonial
                    </label>
                    <Textarea
                      id="testimonial"
                      disabled={reading}
                      aria-invalid={Boolean(scriptError)}
                      aria-describedby={
                        scriptError ? "script-error" : "script-help"
                      }
                      rows={4}
                      maxLength={700}
                      placeholder={
                        mode === "note"
                          ? "Read your note, then review the words here."
                          : language === "hi"
                            ? "अपना नाम, गाँव और अनुभव लिखें…"
                            : "Introduce yourself and share your experience…"
                      }
                      value={script}
                      onChange={(e) => {
                        pendingBatch.current = null;
                        if (mode === "note") setNoteScript(e.target.value);
                        else setTypedScript(e.target.value);
                        if (mode === "note") setConfirmed(false);
                      }}
                    />
                    {scriptError && (
                      <p className="field-error" id="script-error" role="alert">
                        {scriptError}
                      </p>
                    )}
                    <div className="textarea-footer" id="script-help">
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
                ) : null}
                {mode === "note" && script && (
                  <label className="check-line note-confirm">
                    <Checkbox
                      checked={confirmed}
                      onCheckedChange={(v) => setConfirmed(v === true)}
                    />
                    <span>I have checked the extracted text.</span>
                  </label>
                )}
              </div>
            )}
            {step === 2 && (
              <div className="finish-step">
                <div className="story-review">
                  <div>
                    <span>
                      {mode === "audio" ? "Your recording" : "Your story"} ·{" "}
                      {language === "auto"
                        ? detected || "Detect automatically"
                        : language === "other"
                          ? otherLanguage || "Other / mixed languages"
                          : LANGUAGES.find((l) => l.code === language)?.native}
                    </span>
                    <button type="button" onClick={() => setStep(1)}>
                      Edit story
                    </button>
                  </div>
                  <p>{script}</p>
                  {mode === "audio" && audio && (
                    <>
                      <AudioPreview file={audio} />
                      <p className="original-voice-note">
                        Your original recording is preserved. Translated
                        versions use an AI voice.
                      </p>
                    </>
                  )}
                </div>
                {
                  <fieldset className="gender-field">
                    <legend>Speaking voice</legend>
                    <div className="gender-toggle">
                      {(["female", "male"] as const).map((g) => (
                        <button
                          type="button"
                          key={g}
                          aria-pressed={gender === g}
                          onClick={() => {
                            setGender(g);
                            pendingBatch.current = null;
                          }}
                          className={gender === g ? "selected" : ""}
                        >
                          {g === "female" ? "Female" : "Male"}
                          {gender === g && <Check size={13} />}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                }

                <fieldset className="translation-field">
                  <legend>Video output languages</legend>
                  <p className="field-hint">
                    Choose one or more. Each selected language creates a
                    separate video. Review every translation and check that
                    names, numbers and meaning are correct.
                  </p>
                  <div className="language-choices">
                    {LANGUAGES.map((l) => (
                      <label className="check-line" key={l.code}>
                        <Checkbox
                          checked={targets.includes(l.code)}
                          onCheckedChange={(checked) => {
                            setTargets((t) =>
                              checked
                                ? [...t, l.code]
                                : t.filter((c) => c !== l.code),
                            );
                            setConsent(false);
                            pendingBatch.current = null;
                          }}
                        />
                        <span>
                          {l.label} · {l.native}
                        </span>
                      </label>
                    ))}
                  </div>
                  {targets.map((code) => {
                    const draft = drafts[code];
                    const current = draft?.source === sourceKey;
                    let error = "";
                    try {
                      if (draft) validateScript(draft.text, code);
                    } catch (e) {
                      error =
                        e instanceof Error ? e.message : "Check this text";
                    }
                    return (
                      <section className="translation-draft" key={code}>
                        <h3>{LANGUAGES.find((l) => l.code === code)?.label}</h3>
                        <Button
                          variant="secondary"
                          disabled={Boolean(translationBusy)}
                          onClick={() => void prepare(code)}
                        >
                          {translationBusy === code
                            ? "Translating…"
                            : draft
                              ? "Translate again"
                              : "Prepare translation"}
                        </Button>
                        {draft && !current && (
                          <p role="alert">
                            Source changed. Previous draft is preserved below.
                            Translate again or review and use your edited draft.
                          </p>
                        )}
                        <label htmlFor={`translation-${code}`}>
                          Reviewed script ·{" "}
                          {LANGUAGES.find((l) => l.code === code)?.label}
                        </label>
                        <Textarea
                          id={`translation-${code}`}
                          value={draft?.text ?? ""}
                          maxLength={700}
                          onChange={(e) => {
                            setDrafts((d) => ({
                              ...d,
                              [code]: {
                                text: e.target.value,
                                source: sourceKey,
                                reviewed: false,
                              },
                            }));
                            setConsent(false);
                            pendingBatch.current = null;
                          }}
                        />
                        <p className="field-hint">
                          {draft?.text.length ?? 0} / 700 characters
                        </p>
                        {error && <p role="alert">{error}</p>}
                        <label className="check-line">
                          <Checkbox
                            disabled={!draft?.text || Boolean(error)}
                            checked={current && draft?.reviewed}
                            onCheckedChange={(v) => {
                              setDrafts((d) => ({
                                ...d,
                                [code]: {
                                  text: d[code]?.text ?? "",
                                  source: sourceKey,
                                  reviewed: v === true,
                                },
                              }));
                              setConsent(false);
                              pendingBatch.current = null;
                            }}
                          />
                          <span>
                            I have checked the{" "}
                            {LANGUAGES.find((l) => l.code === code)?.label}{" "}
                            translation.
                          </span>
                        </label>
                      </section>
                    );
                  })}
                </fieldset>

                <AmbienceControl
                  key={mode}
                  enabled={ambience ?? mode !== "audio"}
                  onChange={(v) => {
                    setAmbience(v);
                    pendingBatch.current = null;
                  }}
                />
                <label className="check-line">
                  <Checkbox
                    checked={consent}
                    onCheckedChange={(v) => setConsent(v === true)}
                    aria-label="Consent to create and publicly share this AI video"
                  />
                  <span>
                    I have permission to create this AI video and share the
                    photo, voice, testimonial and chosen translations in the
                    public gallery.
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

            {(step > 0 || portrait) && (
              <div className="step-controls">
                <div className="form-actions">
                  {step > 0 && (
                    <Button
                      variant="ghost"
                      disabled={reading}
                      onClick={() => {
                        if (step === 1) photoReturnStep.current = 1;
                        setStep(step - 1);
                      }}
                      className="back-button"
                    >
                      <ArrowLeft size={18} /> Back
                    </Button>
                  )}
                  <Button
                    type="submit"
                    size="lg"
                    className="generate-button"
                    aria-describedby="next-step-hint"
                    disabled={
                      reading ||
                      submitting ||
                      (step === 0
                        ? !portrait
                        : step === 1
                          ? !storyReady
                          : !ready)
                    }
                  >
                    {step === 2
                      ? submitting
                        ? "Preparing videos…"
                        : `Create ${targets.length} ${targets.length === 1 ? "video" : "videos"}`
                      : step === 1
                        ? "Review video"
                        : "Use this photo"}
                    <ArrowRight size={18} />
                  </Button>
                </div>
                <p className="next-step-hint" id="next-step-hint">
                  {step === 0
                    ? photoReturnStep.current === 2 && storyReady
                      ? "Return to your video review."
                      : "Next, add your story."
                    : nextHint}
                </p>
              </div>
            )}
            {step === 0 && !portrait && (
              <p className="privacy-note">
                <ShieldCheck size={14} />
                Choose a photo to go to the next step.
              </p>
            )}
          </form>
        </section>
      </div>
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
