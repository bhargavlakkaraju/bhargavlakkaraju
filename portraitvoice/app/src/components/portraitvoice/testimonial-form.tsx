import { useState } from "react";
import type { ReactNode } from "react";
import { FileAudio as IconAudio, Languages as IconLanguages, NotebookPen as IconNote, Type as IconText, User as IconVoice } from "lucide-react";
import { Checkbox, CheckboxLabel } from "@higgsfield/quanta/checkbox";
import { Icon } from "@higgsfield/quanta/icon";
import { Loader } from "@higgsfield/quanta/loader";
import { Select } from "@higgsfield/quanta/select";
import { Tabs } from "@higgsfield/quanta/tabs";
import { Textarea } from "@higgsfield/quanta/textarea";
import { Typography } from "@higgsfield/quanta/typography";
import { SettingTrigger } from "@/components/setting-trigger";
import { UploadField } from "@/components/upload-field";
import { DropzonePreview } from "@/components/dropzone";
import { estimateSpeechSeconds } from "@/lib/portraitvoice/estimate";
import {
  GENDERS,
  LANGUAGES,
  languageLabel,
  MAX_AUDIO_SECONDS,
  MAX_SCRIPT_CHARS,
  type Gender,
  type InputMode,
  type LanguageCode,
} from "@/lib/portraitvoice/types";

const PICKER_POPUP = {
  size: "picker",
  surface: "solid",
  side: "bottom",
  align: "start",
  sideOffset: 8,
  collisionPadding: 16,
} satisfies Partial<Parameters<typeof Select.Content>[0]>;

const GENDER_LABELS: Record<Gender, string> = { female: "Female voice", male: "Male voice" };

export interface TestimonialFormValue {
  mode: InputMode;
  language: LanguageCode;
  gender: Gender;
  scriptText: string;
  audioFile: File | null;
  audioName: string | null;
  notePreviewUrl: string | null;
  consent: boolean;
}

export const DEFAULT_FORM_VALUE: TestimonialFormValue = {
  mode: "text",
  language: "hi",
  gender: "female",
  scriptText: "",
  audioFile: null,
  audioName: null,
  notePreviewUrl: null,
  consent: false,
};

interface TestimonialFormProps {
  value: TestimonialFormValue;
  onChange: (next: TestimonialFormValue) => void;
  /** Uploads a note photo and returns the OCR text (already trimmed to the limit). */
  onExtractNote: (file: File) => Promise<{ text: string; previewUrl: string }>;
  disabled?: boolean;
  error?: string | null;
}

export function LanguageSelect({ value, onChange, disabled }: { value: LanguageCode; onChange: (v: LanguageCode) => void; disabled?: boolean }) {
  return (
    <Select.Root value={value} onValueChange={(next) => onChange(String(next) as LanguageCode)} disabled={disabled}>
      <Select.Trigger bare render={<SettingTrigger label="Language" start={<Icon size="sm" as={IconLanguages} />} />}>
        <Select.Value placeholder="Language">{languageLabel(value)}</Select.Value>
      </Select.Trigger>
      <Select.Content {...PICKER_POPUP}>
        {LANGUAGES.map((language) => (
          <Select.Item key={language.code} value={language.code}>
            <Select.ItemContent>
              <Select.ItemText>{language.label}</Select.ItemText>
              <Select.ItemDescription>{language.native}</Select.ItemDescription>
            </Select.ItemContent>
            <Select.ItemIndicator />
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}

export function GenderSelect({ value, onChange, disabled }: { value: Gender; onChange: (v: Gender) => void; disabled?: boolean }) {
  return (
    <Select.Root value={value} onValueChange={(next) => onChange(String(next) as Gender)} disabled={disabled}>
      <Select.Trigger bare render={<SettingTrigger label="Voice" start={<Icon size="sm" as={IconVoice} />} />}>
        <Select.Value placeholder="Voice">{GENDER_LABELS[value]}</Select.Value>
      </Select.Trigger>
      <Select.Content {...PICKER_POPUP}>
        {GENDERS.map((gender) => (
          <Select.Item key={gender} value={gender}>
            <Select.ItemText>{GENDER_LABELS[gender]}</Select.ItemText>
            <Select.ItemIndicator />
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}

function FileTrigger({ accept, onFile, disabled, children }: { accept: string; onFile: (file: File) => void; disabled?: boolean; children: ReactNode }) {
  return (
    <label className="block cursor-pointer">
      <input
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

export function TestimonialForm({ value, onChange, onExtractNote, disabled, error }: TestimonialFormProps) {
  const [extracting, setExtracting] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const seconds = value.mode === "audio" ? null : estimateSpeechSeconds(value.scriptText, value.language);
  const tooLong = seconds != null && seconds > MAX_AUDIO_SECONDS;

  const handleNote = async (file: File) => {
    setNoteError(null);
    setExtracting(true);
    try {
      const result = await onExtractNote(file);
      onChange({ ...value, scriptText: result.text, notePreviewUrl: result.previewUrl });
    } catch (cause) {
      setNoteError(cause instanceof Error ? cause.message : "Could not read the note.");
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Tabs.Root
        variant="segmented"
        value={value.mode}
        onValueChange={(next) => onChange({ ...value, mode: String(next) as InputMode })}
        className="flex! w-full flex-col gap-3"
      >
        <Tabs.List
          fullWidth
          items={[
            { value: "text", label: "Text", start: <Icon size="sm" as={IconText} /> },
            { value: "note", label: "Note photo", start: <Icon size="sm" as={IconNote} /> },
            { value: "audio", label: "Audio", start: <Icon size="sm" as={IconAudio} /> },
          ]}
        />

        <Tabs.Panel value="text" className="pt-0">
          <Textarea
            label="Testimonial"
            rows={4}
            maxLength={MAX_SCRIPT_CHARS}
            placeholder="Type what the farmer wants to say, in any language."
            value={value.scriptText}
            disabled={disabled}
            onChange={(event) => onChange({ ...value, scriptText: event.target.value })}
            description={`${value.scriptText.length}/${MAX_SCRIPT_CHARS} characters · about ${seconds ?? 0}s spoken`}
            error={tooLong ? `Too long for one clip (about ${seconds}s). Keep it under ${MAX_AUDIO_SECONDS} seconds.` : undefined}
          />
        </Tabs.Panel>

        <Tabs.Panel value="note" className="pt-0">
          <div className="flex flex-col gap-3">
            <FileTrigger accept="image/*" onFile={handleNote} disabled={disabled || extracting}>
              <UploadField
                render={<span />}
                icon={IconNote}
                title={extracting ? "Reading the note…" : "Upload note photo"}
                subtitle="Handwritten in any language"
                preview={
                  extracting ? (
                    <span className="flex h-full w-full items-center justify-center"><Loader size="sm" color="neutral" aria-label="Reading the note" /></span>
                  ) : value.notePreviewUrl ? (
                    <DropzonePreview src={value.notePreviewUrl} alt="Handwritten note" label="Note photo" icon={IconNote} />
                  ) : undefined
                }
              />
            </FileTrigger>
            {noteError ? (
              <Typography as="p" variant="caption-sm-regular" color="danger" role="alert">{noteError}</Typography>
            ) : null}
            <Textarea
              label="Extracted text"
              rows={4}
              maxLength={MAX_SCRIPT_CHARS}
              placeholder="The transcribed note appears here. Check and edit it before generating."
              value={value.scriptText}
              disabled={disabled}
              onChange={(event) => onChange({ ...value, scriptText: event.target.value })}
              description={`${value.scriptText.length}/${MAX_SCRIPT_CHARS} characters · about ${seconds ?? 0}s spoken`}
              error={tooLong ? `Too long for one clip (about ${seconds}s). Keep it under ${MAX_AUDIO_SECONDS} seconds.` : undefined}
            />
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="audio" className="pt-0">
          <div className="flex flex-col gap-2">
            <FileTrigger
              accept="audio/*"
              disabled={disabled}
              onFile={(file) => onChange({ ...value, audioFile: file, audioName: file.name })}
            >
              <UploadField
                render={<span />}
                icon={IconAudio}
                title={value.audioName ?? "Upload voice recording"}
                subtitle={value.audioName ? "Tap to replace" : `MP3, WAV or M4A · up to ${MAX_AUDIO_SECONDS}s`}
                {...(value.audioName ? { onRemove: () => onChange({ ...value, audioFile: null, audioName: null }) } : {})}
              />
            </FileTrigger>
            <Typography as="p" variant="caption-sm-regular" color="tertiary">
              The recording is used as-is and drives the lip-sync.
            </Typography>
          </div>
        </Tabs.Panel>
      </Tabs.Root>

      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2">
        <div className="min-w-0">
          <LanguageSelect value={value.language} onChange={(language) => onChange({ ...value, language })} disabled={disabled} />
        </div>
        {value.mode !== "audio" ? (
          <div className="min-w-0">
            <GenderSelect value={value.gender} onChange={(gender) => onChange({ ...value, gender })} disabled={disabled} />
          </div>
        ) : null}
      </div>

      <CheckboxLabel
        label="I have the farmer's consent to create and share this video."
        size="sm"
        checkboxProps={{
          checked: value.consent,
          disabled,
          onCheckedChange: (checked: boolean) => onChange({ ...value, consent: checked }),
        }}
      />
      {value.consent ? null : <Checkbox className="hidden" aria-hidden />}

      {error ? (
        <Typography as="p" variant="caption-sm-regular" color="danger" role="alert">{error}</Typography>
      ) : null}
    </div>
  );
}
