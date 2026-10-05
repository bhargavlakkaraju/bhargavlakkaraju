import { useEffect, useState } from "react";
import { useTestimonialPipeline } from "@/lib/client/pipeline";
import { languageLabel } from "@/lib/languages";
import { createLanguageBatch, retryLanguageVideo } from "@/server/fns";
import { VideoTranslation } from "./video-translation";
import { Button } from "./ui/button";
export interface LanguageOutput {
  language: string;
  entryId: string | null;
  token: string;
  error: string | null;
  startedAt: number;
}
export const BATCH_STORAGE = "portraitvoice.batch.v1";
export function LanguageOutputs({
  outputs,
  onReset,
}: {
  outputs: LanguageOutput[];
  onReset: () => void;
}) {
  return (
    <main className="studio-shell">
      <h1>Your language videos</h1>
      <p>
        Each language has its own video and progress. Completed videos remain
        available if another language fails.
      </p>
      <div className="language-output-grid">
        {outputs.map((o) => (
          <Output key={o.language} output={o} />
        ))}
      </div>
      <Button variant="secondary" onClick={onReset}>
        Create another testimonial
      </Button>
    </main>
  );
}
function Output({ output: initial }: { output: LanguageOutput }) {
  const [output, setOutput] = useState(initial);
  const [busy, setBusy] = useState(false);
  async function retryPreparation() {
    setBusy(true);
    try {
      const request = JSON.parse(
        localStorage.getItem("portraitvoice.batch-request.v1") ?? "null",
      );
      if (!request)
        throw new Error(
          "Original batch details are unavailable. Please create a new testimonial.",
        );
      const result = await createLanguageBatch({
        data: {
          ...request,
          outputs: request.outputs.filter(
            (o: { language: string }) => o.language === output.language,
          ),
        },
      });
      const next = { ...result[0]!, startedAt: output.startedAt };
      setOutput(next);
      const saved: LanguageOutput[] = JSON.parse(
        localStorage.getItem(BATCH_STORAGE) ?? "[]",
      );
      localStorage.setItem(
        BATCH_STORAGE,
        JSON.stringify(
          saved.map((o) => (o.language === next.language ? next : o)),
        ),
      );
    } catch (e) {
      setOutput((o) => ({
        ...o,
        error: e instanceof Error ? e.message : "Could not retry.",
      }));
    } finally {
      setBusy(false);
    }
  }

  const storage = `portraitvoice.output.${output.entryId}`;
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (output.entryId) localStorage.setItem(storage, JSON.stringify(output));
    setInitialized(true);
  }, [storage, output]);
  return (
    <section className="language-output">
      <h2>{languageLabel(output.language)}</h2>
      {output.error ? (
        <>
          <p role="alert">{output.error}</p>
          <Button disabled={busy} onClick={() => void retryPreparation()}>
            Retry failed {languageLabel(output.language)} preparation
          </Button>
        </>
      ) : initialized ? (
        <OutputProgress storage={storage} output={output} />
      ) : (
        <p>Preparing…</p>
      )}
    </section>
  );
}
function OutputProgress({
  storage,
  output,
}: {
  storage: string;
  output: LanguageOutput;
}) {
  const { state, resume } = useTestimonialPipeline(
    storage,
    output.entryId ? { ...output, entryId: output.entryId } : undefined,
  );
  const [retryError, setRetryError] = useState("");
  const [busy, setBusy] = useState(false);
  async function retry() {
    if (!output.entryId || busy) return;
    setBusy(true);
    setRetryError("");
    try {
      await retryLanguageVideo({
        data: { entryId: output.entryId, token: output.token },
      });
      await resume();
    } catch (e) {
      setRetryError(e instanceof Error ? e.message : "Could not retry.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p role="status">
        {state.phase === "done"
          ? "Completed"
          : state.phase === "error"
            ? "Needs attention"
            : (state.statusNote ?? "Creating video…")}
      </p>
      {state.videoUrl && (
        <>
          <video
            src={state.videoUrl}
            controls
            playsInline
            aria-label={`${languageLabel(output.language)} video`}
          />
          <a className="download-link" href={`/api/download/${output.entryId}`}>
            Download {languageLabel(output.language)} video
          </a>
          <VideoTranslation source={output} />
        </>
      )}
      {state.error && (
        <>
          <p role="alert">{state.error}</p>
          <Button variant="secondary" onClick={() => void resume()}>
            Resume {languageLabel(output.language)}
          </Button>
          {state.entry?.status === "failed" && (
            <Button
              disabled={busy}
              variant="secondary"
              onClick={() => void retry()}
            >
              Retry failed {languageLabel(output.language)} video
            </Button>
          )}
        </>
      )}
      {retryError && <p role="alert">{retryError}</p>}
    </>
  );
}
