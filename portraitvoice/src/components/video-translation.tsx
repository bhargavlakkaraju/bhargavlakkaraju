import { useEffect, useRef, useState } from "react";
import { LANGUAGES, languageLabel } from "@/lib/languages";
import {
  getTranslationCapabilities,
  prepareVideoTranslation,
  readVideoTranslation,
  approveVideoTranslation,
} from "@/server/fns";
import {
  BATCH_STORAGE,
  LanguageOutputs,
  type LanguageOutput,
} from "./language-outputs";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Textarea } from "./ui/textarea";
export function VideoTranslation({ source }: { source: LanguageOutput }) {
  const [open, setOpen] = useState(false),
    [consent, setConsent] = useState(false),
    [targets, setTargets] = useState<string[]>([]);
  const [pending, setPending] = useState<
    Array<{ entryId: string; token: string; language: string }>
  >([]);
  const [access, setAccess] = useState<{
    available: boolean;
    reason: string | null;
  } | null>(null);
  useEffect(() => {
    if (open)
      void getTranslationCapabilities()
        .then(setAccess)
        .catch(() =>
          setAccess({
            available: false,
            reason: "Could not check translation access.",
          }),
        );
  }, [open]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const requests = useRef<Record<string, { requestId: string; token: string }>>(
    {},
  );
  const storage = `portraitvoice.translations.${source.entryId}`;
  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem(storage) ?? "null");
      if (data) {
        setPending(data.pending ?? []);
        requests.current = data.requests ?? {};
      }
    } catch {}
  }, [storage]);
  async function prepare() {
    if (!source.entryId || !consent || busy) return;
    setBusy(true);
    setError("");
    let next = [...pending];
    try {
      for (const language of targets) {
        if (next.some((o) => o.language === language)) continue;
        const request = requests.current[language] ?? {
          requestId: crypto.randomUUID(),
          token: Array.from(crypto.getRandomValues(new Uint8Array(32)), (v) =>
            v.toString(16).padStart(2, "0"),
          ).join(""),
        };
        requests.current[language] = request;
        localStorage.setItem(
          storage,
          JSON.stringify({ pending: next, requests: requests.current }),
        );
        try {
          const output = await prepareVideoTranslation({
            data: {
              sourceId: source.entryId,
              sourceToken: source.token,
              language,
              ...request,
              consent: true,
            },
          });
          next = [...next, output];
          setPending(next);
          localStorage.setItem(
            storage,
            JSON.stringify({ pending: next, requests: requests.current }),
          );
        } catch (e) {
          setError(
            `${languageLabel(language)}: ${e instanceof Error ? e.message : "Could not prepare."}`,
          );
        }
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      {!open ? (
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Translate this video into more languages
        </Button>
      ) : (
        <section className="translation-field">
          <h3>Translate the completed video</h3>
          {!access && <p role="status">Checking translation access…</p>}
          {access?.reason && <p role="alert">{access.reason}</p>}
          <p className="field-hint">
            HeyGen translates the original voice and synchronizes the lips.
            Review the timed subtitles before creating each video. Subtitle
            editing may require Enterprise access; access or billing errors will
            be shown without changing your source video.
          </p>
          <div className="language-choices">
            {LANGUAGES.filter((l) => l.code !== source.language).map((l) => (
              <label key={l.code} className="check-line">
                <Checkbox
                  checked={targets.includes(l.code)}
                  onCheckedChange={(v) =>
                    setTargets((t) =>
                      v ? [...t, l.code] : t.filter((c) => c !== l.code),
                    )
                  }
                />
                <span>{l.label}</span>
              </label>
            ))}
          </div>
          <label className="check-line">
            <Checkbox
              checked={consent}
              onCheckedChange={(v) => setConsent(v === true)}
            />
            <span>
              I have permission to translate this person's video and voice and
              share the translated videos publicly.
            </span>
          </label>
          <Button
            disabled={!access?.available || !consent || !targets.length || busy}
            onClick={() => void prepare()}
          >
            {busy ? "Preparing…" : "Prepare video translations"}
          </Button>
          {error && <p role="alert">{error}</p>}
          {pending.map((o) => (
            <Proofread key={o.entryId} output={o} />
          ))}
        </section>
      )}
    </div>
  );
}
function Proofread({
  output,
}: {
  output: { entryId: string; token: string; language: string };
}) {
  const [text, setText] = useState(""),
    [status, setStatus] = useState("Preparing translated subtitles…"),
    [reviewed, setReviewed] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false),
    [busy, setBusy] = useState(false);
  const storage = `portraitvoice.proofread.${output.entryId}`;
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const result = await readVideoTranslation({ data: output });
        if (cancelled) return;
        if (result.text) {
          setText(result.text);
          setStatus("Review translated subtitles");
        } else timer = setTimeout(poll, 15000);
      } catch (e) {
        if (!cancelled)
          setError(
            e instanceof Error ? e.message : "Could not prepare subtitles.",
          );
      }
    }
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [output]);
  useEffect(() => {
    try {
      if (localStorage.getItem(storage) === "rendering") setDone(true);
    } catch {}
  }, [storage]);
  async function create() {
    if (!reviewed || busy) return;
    setBusy(true);
    try {
      await approveVideoTranslation({
        data: { ...output, text, consent: true },
      });
      localStorage.setItem(storage, "rendering");
      setDone(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not create translation.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (done)
    return (
      <LanguageOutputs
        outputs={[{ ...output, error: null, startedAt: Date.now() }]}
        onReset={() => setDone(false)}
      />
    );
  return (
    <section className="translation-draft">
      <h3>{languageLabel(output.language)}</h3>
      <p role="status">{status}</p>
      {text && (
        <>
          <label htmlFor={`srt-${output.entryId}`}>
            Translated words and subtitle timing ·{" "}
            {languageLabel(output.language)}
          </label>
          <Textarea
            id={`srt-${output.entryId}`}
            rows={8}
            value={text}
            maxLength={30000}
            onChange={(e) => {
              setText(e.target.value);
              setReviewed(false);
            }}
          />
          <label className="check-line">
            <Checkbox
              checked={reviewed}
              onCheckedChange={(v) => setReviewed(v === true)}
            />
            <span>
              I have checked the meaning, names and numbers and preserved
              subtitle timing.
            </span>
          </label>
          <Button disabled={!reviewed || busy} onClick={() => void create()}>
            Create {languageLabel(output.language)} translated video
          </Button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
