import { useEffect, useRef, useState } from "react";
import { LANGUAGES, languageLabel } from "@/lib/languages";
import {
  getTranslationCapabilities,
  prepareVideoTranslation,
} from "@/server/fns";
import { LanguageOutputs, type LanguageOutput } from "./language-outputs";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
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
    [errors, setErrors] = useState<Record<string, string>>({});
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
    setErrors({});
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
          setErrors((previous) => ({
            ...previous,
            [language]: e instanceof Error ? e.message : "Could not prepare.",
          }));
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
            Creates a separate video for each language using paid precision
            lip-sync translation. Review the generated video for meaning, names,
            numbers and pronunciation before sharing. Your original video stays
            available. Each selected language is charged separately.
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
            {busy ? "Starting…" : "Create translated videos"}
          </Button>
          {Object.entries(errors).map(([language, message]) => (
            <p key={language} role="alert">
              {languageLabel(language)}: {message}
            </p>
          ))}
          {pending.length > 0 && (
            <LanguageOutputs
              embedded
              outputs={pending.map((o) => ({
                ...o,
                error: null,
                startedAt: Date.now(),
              }))}
              onReset={() => setOpen(false)}
            />
          )}
        </section>
      )}
    </div>
  );
}
