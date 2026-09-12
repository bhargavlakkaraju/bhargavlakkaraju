import { useState } from "react";
import { FileAudio, Languages, NotebookPen, Type, User, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { estimateSpeechSeconds } from "@/lib/estimate";
import { GENDERS, LANGUAGES, MAX_AUDIO_SECONDS, MAX_SCRIPT_CHARS, type Gender, type InputMode, type LanguageCode } from "@/lib/types";
import { cn } from "@/lib/utils";

const GENDER_LABELS: Record<Gender, string> = { female: "Female voice", male: "Male voice" };

export interface TestimonialFormValue {
  mode: InputMode;
  language: LanguageCode;
  gender: Gender;
  scriptText: string;
  audioFile: File | null;
  notePreviewUrl: string | null;
  consent: boolean;
}

export const DEFAULT_FORM_VALUE: TestimonialFormValue = {
  mode: "text",
  language: "hi",
  gender: "female",
  scriptText: "",
  audioFile: null,
  notePreviewUrl: null,
  consent: false,
};

interface Props {
  value: TestimonialFormValue;
  onChange: (next: TestimonialFormValue) => void;
  onExtractNote: (file: File) => Promise<string>;
  disabled?: boolean;
}

function FilePicker({ id, accept, onFile, disabled, children, className }: { id: string; accept: string; onFile: (file: File) => void; disabled?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/20 bg-black/20 px-3 py-4 text-center text-sm text-white/70 transition hover:border-brand-green/60 hover:bg-white/5",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <input
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
      {children}
    </label>
  );
}

export function TestimonialForm({ value, onChange, onExtractNote, disabled }: Props) {
  const [extracting, setExtracting] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const seconds = value.mode === "audio" ? null : estimateSpeechSeconds(value.scriptText, value.language);
  const tooLong = seconds != null && seconds > MAX_AUDIO_SECONDS;
  const counter = `${value.scriptText.length}/${MAX_SCRIPT_CHARS} · about ${seconds ?? 0}s`;

  const handleNote = async (file: File) => {
    setNoteError(null);
    setExtracting(true);
    const preview = URL.createObjectURL(file);
    try {
      const text = await onExtractNote(file);
      onChange({ ...value, scriptText: text, notePreviewUrl: preview });
    } catch (cause) {
      setNoteError(cause instanceof Error ? cause.message : "Could not read the note.");
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={value.mode} onValueChange={(mode) => onChange({ ...value, mode: mode as InputMode })}>
        <TabsList>
          <TabsTrigger value="text" disabled={disabled}><Type /> Text</TabsTrigger>
          <TabsTrigger value="note" disabled={disabled}><NotebookPen /> Note photo</TabsTrigger>
          <TabsTrigger value="audio" disabled={disabled}><FileAudio /> Audio</TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="flex flex-col gap-1.5">
          <Label htmlFor="script">Testimonial</Label>
          <Textarea
            id="script"
            rows={4}
            maxLength={MAX_SCRIPT_CHARS}
            placeholder="Type what the farmer wants to say, in any language."
            value={value.scriptText}
            disabled={disabled}
            onChange={(event) => onChange({ ...value, scriptText: event.target.value })}
          />
          <p className={cn("text-xs", tooLong ? "text-red-300" : "text-white/50")}>
            {tooLong ? `Too long for one video (about ${seconds}s). Keep it under ${MAX_AUDIO_SECONDS} seconds.` : counter}
          </p>
        </TabsContent>

        <TabsContent value="note" className="flex flex-col gap-3">
          <FilePicker id="note-file" accept="image/*" onFile={handleNote} disabled={disabled || extracting}>
            {value.notePreviewUrl ? (
              <img src={value.notePreviewUrl} alt="Handwritten note" className="max-h-28 rounded-lg object-contain" />
            ) : (
              <NotebookPen className="size-6 text-brand-green-light" />
            )}
            <span className="font-medium text-white">{extracting ? "Reading the note…" : value.notePreviewUrl ? "Replace note photo" : "Upload note photo"}</span>
            <span className="text-xs text-white/50">Handwritten, any language</span>
          </FilePicker>
          {noteError ? <p className="text-xs text-red-300" role="alert">{noteError}</p> : null}
          <Label htmlFor="note-script">Extracted text (check and edit)</Label>
          <Textarea
            id="note-script"
            rows={4}
            maxLength={MAX_SCRIPT_CHARS}
            placeholder="The transcribed note appears here."
            value={value.scriptText}
            disabled={disabled || extracting}
            onChange={(event) => onChange({ ...value, scriptText: event.target.value })}
          />
          <p className={cn("text-xs", tooLong ? "text-red-300" : "text-white/50")}>
            {tooLong ? `Too long for one video (about ${seconds}s). Keep it under ${MAX_AUDIO_SECONDS} seconds.` : counter}
          </p>
        </TabsContent>

        <TabsContent value="audio" className="flex flex-col gap-2">
          {value.audioFile ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-black/20 px-3 py-3">
              <div className="flex min-w-0 items-center gap-2 text-sm">
                <FileAudio className="size-4 shrink-0 text-brand-green-light" />
                <span className="truncate">{value.audioFile.name}</span>
              </div>
              <button type="button" aria-label="Remove recording" className="rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white" disabled={disabled} onClick={() => onChange({ ...value, audioFile: null })}>
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <FilePicker id="audio-file" accept="audio/*" onFile={(file) => onChange({ ...value, audioFile: file })} disabled={disabled}>
              <FileAudio className="size-6 text-brand-green-light" />
              <span className="font-medium text-white">Upload voice recording</span>
              <span className="text-xs text-white/50">MP3, WAV or M4A · up to {MAX_AUDIO_SECONDS}s · used as-is</span>
            </FilePicker>
          )}
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="language">Language</Label>
          <Select value={value.language} onValueChange={(language) => onChange({ ...value, language: language as LanguageCode })} disabled={disabled}>
            <SelectTrigger id="language" aria-label="Language">
              <span className="flex items-center gap-2"><Languages className="size-4 opacity-60" /><SelectValue /></span>
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.code}>{l.label} · {l.native}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {value.mode !== "audio" ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gender">Voice</Label>
            <Select value={value.gender} onValueChange={(gender) => onChange({ ...value, gender: gender as Gender })} disabled={disabled}>
              <SelectTrigger id="gender" aria-label="Voice">
                <span className="flex items-center gap-2"><User className="size-4 opacity-60" /><SelectValue /></span>
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => (
                  <SelectItem key={g} value={g}>{GENDER_LABELS[g]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <label className="flex cursor-pointer items-start gap-3 text-sm text-white/85">
        <Checkbox checked={value.consent} disabled={disabled} onCheckedChange={(checked) => onChange({ ...value, consent: checked === true })} className="mt-0.5" />
        <span>I have the farmer's consent to create and share this video.</span>
      </label>
    </div>
  );
}
