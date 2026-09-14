import { useEffect, useId, useRef, useState } from "react";
import {
  Upload,
  ImagePlus,
  Check,
  FileAudio,
  FileImage,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
interface Props {
  kind: "portrait" | "note" | "audio";
  file: File | null;
  onChange: (file: File | null) => void;
  preview?: string | null;
  disabled?: boolean;
  actionLabel?: string;
}
export function UploadZone({
  kind,
  file,
  onChange,
  preview,
  disabled,
  actionLabel,
}: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const unavailable = disabled || !hydrated;
  const id = useId(),
    input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const accept =
    kind === "audio"
      ? "audio/*,.mp3,.wav,.m4a,.ogg,.webm,.aac,.flac"
      : "image/jpeg,image/png,image/webp";
  function choose(file?: File) {
    if (!file) return;
    setError("");
    const max = kind === "audio" ? 30 : 15;
    if (file.size > max * 1024 * 1024) {
      setError(`Please choose a file under ${max} MB.`);
      return;
    }
    if (
      kind !== "audio" &&
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      setError("Please choose a JPG, PNG or WebP photo.");
      return;
    }
    if (
      kind === "audio" &&
      !file.type.startsWith("audio/") &&
      !/\.(mp3|wav|m4a|ogg|webm|aac|flac)$/i.test(file.name)
    ) {
      setError("Please choose an audio recording, such as MP3, WAV or M4A.");
      return;
    }
    onChange(file);
  }
  const title =
    kind === "portrait"
      ? "Upload a portrait photo"
      : kind === "note"
        ? "Upload your handwritten note"
        : "Upload your voice recording";
  return (
    <div
      className={cn(
        "upload-zone",
        dragging && "dragging",
        error && "upload-error",
        file && "has-file",
        kind === "portrait" && "portrait-upload",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        if (!unavailable) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!unavailable) choose(e.dataTransfer.files[0]);
      }}
    >
      <input
        ref={input}
        id={id}
        aria-label={title}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        type="file"
        accept={accept}
        disabled={unavailable}
        onChange={(e) => choose(e.target.files?.[0])}
        className="file-input"
      />
      <label htmlFor={id} className="upload-label">
        {preview ? (
          <img
            src={preview}
            alt="Your uploaded portrait"
            className="upload-thumb"
          />
        ) : (
          <span className="upload-icon">
            {kind === "portrait" ? (
              <ImagePlus size={23} />
            ) : kind === "audio" ? (
              <FileAudio size={23} />
            ) : (
              <FileImage size={23} />
            )}
          </span>
        )}
        <span className="upload-copy">
          <strong>{file ? file.name : title}</strong>
          <span>
            {file
              ? "Added · Click to change"
              : kind === "portrait"
                ? "Choose a clear, front-facing photo"
                : kind === "note"
                  ? "Keep the whole note in focus."
                  : "MP3, WAV, M4A · Up to 3 minutes"}
          </span>
          <small>
            {file ? (
              <>
                <Check size={12} /> {Math.max(1, Math.round(file.size / 1024))}{" "}
                KB
              </>
            ) : kind === "audio" ? (
              "Maximum 30 MB"
            ) : (
              "JPG, PNG or WebP · 15 MB max"
            )}
          </small>
        </span>
        {!file && <Upload size={17} className="upload-arrow" />}
      </label>
      {actionLabel && (
        <button
          type="button"
          className="upload-choose ui-button ui-button-primary"
          disabled={unavailable}
          onClick={() => input.current?.click()}
        >
          {actionLabel}
          <Upload size={16} />
        </button>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="upload-error-message">
          {error}
        </p>
      )}
      {file && (
        <button
          type="button"
          className="remove-upload"
          disabled={unavailable}
          aria-label={`Remove ${kind}`}
          onClick={() => {
            setError("");
            onChange(null);
            if (input.current) input.current.value = "";
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
