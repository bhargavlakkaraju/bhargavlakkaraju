import { useCallback, useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { LandingSections } from "@higgsfield/app-landing";
import {
  costQueryOptions,
  flattenFeedPages,
  jobsFeedQueryOptions,
  useFnfJobClient,
  useFnfMediaClient,
  useFnfScopeKey,
  useLiveFeedGenerations,
} from "@higgsfield/fnf-react";
import { ImagePlus as IconAddPhoto } from "lucide-react";
import { Folder as IconMyGenerations } from "lucide-react";
import { Newspaper as IconHowItWorks } from "lucide-react";
import Sparkles from "@/assets/icon-sparkles-soft.svg?react";
import { Button } from "@higgsfield/quanta/button";
import { Card } from "@higgsfield/quanta/card";
import { Icon } from "@higgsfield/quanta/icon";
import { Loader } from "@higgsfield/quanta/loader";
import { Media } from "@higgsfield/quanta/media";
import { Tabs } from "@higgsfield/quanta/tabs";
import { Typography } from "@higgsfield/quanta/typography";
import { AssetLibraryModal } from "@/components/asset-library";
import type { AssetLibraryItem, AssetLibraryPagination, AssetSelection } from "@/components/asset-library";
import { DropzonePreview } from "@/components/dropzone";
import { GenerationTile } from "@/components/generation-card";
import { UploadField } from "@/components/upload-field";
import { UserGenerations } from "@/components/user-generations";
import { ScreenEmptyState } from "@/components/screen-empty-state";
import { SignInModal } from "@/components/sign-in-modal";
import { BrandBar } from "@/components/portraitvoice/brand-bar";
import { DEFAULT_FORM_VALUE, TestimonialForm } from "@/components/portraitvoice/testimonial-form";
import type { TestimonialFormValue } from "@/components/portraitvoice/testimonial-form";
import { VideoResult } from "@/components/portraitvoice/video-result";
import { WaitingScreen } from "@/components/portraitvoice/waiting-screen";
import { APP_DETAIL_JOBS, getSignInUrl, uploadAsset } from "@/lib/fnf.browser";
import { flattenMediaPages, getNextCursor } from "@/lib/cursor-pages";
import {
  generationToAssetItem,
  generationToGalleryItem,
  mediaRefToAssetItem,
} from "@/lib/higgsfield-generation-results";
import { landingContent } from "@/landing-content";
import { clipSeconds, pickVideoEngine } from "@/lib/portraitvoice/estimate";
import { extractNoteText } from "@/lib/portraitvoice/pipeline.functions";
import { MAX_AUDIO_SECONDS } from "@/lib/portraitvoice/types";
import {
  buildAvatarInput,
  buildPortraitInput,
  plannedSeconds,
  usePipeline,
} from "@/lib/portraitvoice/use-pipeline";

/**
 * PortraitVoice home — the shipped App Detail layout adapted in place: a
 * two-column generator hero (portrait + testimonial inputs on the left, a
 * 9:16 preview / waiting screen / finished video on the right) followed by the
 * "how it works" and personal history tabs. No app header: the Higgsfield host
 * owns the chrome; the brand row lives inside the work area.
 */
const HERO_PREVIEW = "/assets/landing/hero-preview.jpg";
const EMPTY_STATE_IMAGES = [
  "/assets/landing/showcase-village.jpg",
  "/assets/landing/showcase-field.jpg",
  "/assets/landing/step-result.jpg",
] as const;

const HISTORY_QUERY = { type: "video" as const, size: 40 };

function useRequiredFnfScopeKey(): string {
  const scopeKey = useFnfScopeKey();
  if (scopeKey == null) throw new Error("PortraitVoice requires a user/workspace cache scope.");
  return scopeKey;
}

interface HeroProps {
  libraryItems: AssetLibraryItem[];
  libraryPagination: AssetLibraryPagination;
  onUpload: (file: File) => Promise<AssetSelection>;
}

/** The generator hero — the whole three-stage pipeline runs from this card. */
function Hero({ libraryItems, libraryPagination, onUpload }: HeroProps) {
  const jobClient = useFnfJobClient<typeof APP_DETAIL_JOBS>();
  const scopeKey = useRequiredFnfScopeKey();
  const pipeline = usePipeline();
  const [portrait, setPortrait] = useState<AssetSelection | null>(null);
  const [form, setForm] = useState<TestimonialFormValue>(DEFAULT_FORM_VALUE);
  const [pendingSignInUrl, setPendingSignInUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const portraitRef = portrait?.ref;
  const hasTestimonial =
    form.mode === "audio" ? form.audioFile != null : form.scriptText.trim().length > 0;
  const seconds = plannedSeconds(form, null);
  const engine = form.mode === "audio" ? "grok_video_v15" : pickVideoEngine(seconds);
  const canGenerate =
    portraitRef != null && hasTestimonial && form.consent && engine != null && pipeline.phase.kind !== "running";

  // Credit preview: portrait re-frame + the talking-head clip. The audio clip
  // length is only known after upload, so audio mode previews a 15 s Grok clip.
  const portraitInput = useMemo(() => (portraitRef ? buildPortraitInput(portraitRef) : null), [portraitRef]);
  const avatarInput = useMemo(() => {
    if (!portraitRef || !engine) return null;
    return buildAvatarInput({
      engine,
      portraitJobRef: portraitRef,
      audioRef: null,
      seconds: form.mode === "audio" ? 15 : clipSeconds(engine, seconds),
      mode: form.mode,
      script: form.mode === "audio" ? null : form.scriptText || "Testimonial",
      language: form.language,
      gender: form.mode === "audio" ? null : form.gender,
    });
  }, [engine, form.gender, form.language, form.mode, form.scriptText, portraitRef, seconds]);
  const portraitCost = useQuery({
    ...costQueryOptions(jobClient, portraitInput ?? buildPortraitInput({ id: "preview", type: "media_input" }), {
      enabled: portraitInput != null,
      scopeKey,
    }),
    refetchOnWindowFocus: false,
  });
  const avatarCost = useQuery({
    ...costQueryOptions(
      jobClient,
      avatarInput ??
        buildAvatarInput({
          engine: "grok_video_v15",
          portraitJobRef: { id: "preview", type: "media_input" },
          audioRef: null,
          seconds: 6,
          mode: "text",
          script: "Testimonial",
          language: "hi",
          gender: "female",
        }),
      { enabled: avatarInput != null, scopeKey },
    ),
    refetchOnWindowFocus: false,
  });
  const credits =
    portraitCost.data && avatarCost.data
      ? Math.round((portraitCost.data.credits + avatarCost.data.credits) * 10) / 10
      : null;

  const handleExtractNote = useCallback(
    async (file: File) => {
      const signInUrl = getSignInUrl(scopeKey, `${window.location.pathname}${window.location.search}`);
      if (signInUrl != null) {
        setPendingSignInUrl(signInUrl);
        throw new Error("Sign in with Higgsfield to read a handwritten note.");
      }
      const uploaded = await onUpload(file);
      const result = await extractNoteText({ data: { imageUrl: uploaded.src } });
      if (!result.ok) throw new Error(result.error.message);
      return { text: result.value.text, previewUrl: uploaded.src };
    },
    [onUpload, scopeKey],
  );

  const handleGenerate = () => {
    setFormError(null);
    if (!portraitRef || !portrait) {
      setFormError("Upload a portrait photo first.");
      return;
    }
    if (!hasTestimonial) {
      setFormError(form.mode === "audio" ? "Upload a voice recording." : "Add the testimonial text.");
      return;
    }
    if (!form.consent) {
      setFormError("Please confirm the farmer's consent.");
      return;
    }
    if (!engine) {
      setFormError(`The testimonial is too long for one clip. Keep it under ${MAX_AUDIO_SECONDS} seconds.`);
      return;
    }
    const signInUrl = getSignInUrl(scopeKey, `${window.location.pathname}${window.location.search}${window.location.hash}`);
    if (signInUrl != null) {
      setPendingSignInUrl(signInUrl);
      return;
    }
    void pipeline.start({
      portrait: { ref: portraitRef, url: portrait.src },
      mode: form.mode,
      language: form.language,
      gender: form.gender,
      scriptText: form.scriptText.trim(),
      audioFile: form.audioFile,
    });
  };

  const phase = pipeline.phase;
  const busy = phase.kind === "running";

  return (
    <Card
      surface="solid"
      className="flex flex-col gap-2 rounded-q-600 border border-q-border-subtle p-2 lg:h-[720px] lg:flex-row"
    >
      <SignInModal
        open={pendingSignInUrl != null}
        signInUrl={pendingSignInUrl}
        onOpenChange={(open) => {
          if (!open) setPendingSignInUrl(null);
        }}
      />

      {/* Input pane. On phones the waiting screen / result takes the whole card. */}
      <div
        className={
          busy || phase.kind === "done"
            ? "relative hidden min-h-0 flex-1 flex-col overflow-hidden bg-q-background-secondary px-4 py-5 lg:flex lg:h-full"
            : "relative flex min-h-0 flex-1 flex-col overflow-hidden bg-q-background-secondary px-4 py-5 lg:h-full"
        }
      >
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-1 sm:gap-6 lg:pb-32 lg:scroll-pb-32">
          <div className="flex min-w-0 flex-col gap-1">
            <Typography as="h1" variant="accent-xl-bold" color="primary" className="lg:truncate">
              Create a testimonial video
            </Typography>
            <Typography as="p" variant="body-md-regular" color="secondary" className="lg:truncate">
              One photo and a testimonial become a vertical talking-head video.
            </Typography>
          </div>

          <div className="flex flex-col gap-4">
            <AssetLibraryModal
              imageOnly
              items={libraryItems}
              pagination={libraryPagination}
              onUpload={onUpload}
              onSelect={setPortrait}
              trigger={
                <UploadField
                  render={<button type="button" disabled={busy} />}
                  icon={IconAddPhoto}
                  title="Upload portrait"
                  subtitle="Clear, front-facing photo of the farmer"
                  preview={
                    portrait != null ? <DropzonePreview src={portrait.src} alt={portrait.name} /> : undefined
                  }
                />
              }
            />

            <TestimonialForm
              value={form}
              onChange={setForm}
              onExtractNote={handleExtractNote}
              disabled={busy}
              error={formError ?? (phase.kind === "failed" ? phase.message : null)}
            />
          </div>
        </div>

        <div className="relative shrink-0 pt-4 lg:pointer-events-none lg:absolute lg:inset-x-4 lg:bottom-5 lg:pt-10">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 hidden lg:block"
            style={{
              backgroundImage:
                "linear-gradient(to bottom, transparent 0%, var(--hf-color-background-secondary) 48%)",
            }}
          />
          <Button
            variant="marketingPrimary"
            size="lg"
            className="pointer-events-auto relative w-full"
            disabled={!canGenerate}
            onClick={handleGenerate}
            end={
              <span className="flex items-center gap-2">
                {busy ? (
                  <Loader size="xs" color="neutral" />
                ) : (
                  <>
                    <Sparkles width={18} height={18} />
                    <span className="text-q-body-lg-semi-bold">{credits ?? "—"}</span>
                  </>
                )}
              </span>
            }
          >
            {busy ? "Creating" : "Generate video"}
          </Button>
        </div>
      </div>

      {/* Preview pane: idle 9:16 example (desktop only), waiting screen, failure, or the finished video. */}
      <div
        className={
          phase.kind === "idle"
            ? "relative hidden shrink-0 lg:flex lg:h-full lg:w-[396px] lg:flex-none lg:items-center lg:justify-center"
            : "relative mx-auto w-full max-w-[480px] shrink-0 lg:mx-0 lg:flex lg:h-full lg:w-[396px] lg:max-w-none lg:flex-none lg:items-stretch"
        }
      >
        {phase.kind === "running" ? (
          <WaitingScreen state={phase} className="lg:h-full lg:w-full" />
        ) : phase.kind === "done" ? (
          <VideoResult
            videoUrl={phase.videoUrl}
            posterUrl={phase.portraitUrl}
            prompt={phase.scriptText}
            onCreateAnother={() => {
              pipeline.reset();
              setForm(DEFAULT_FORM_VALUE);
              setPortrait(null);
            }}
            className="h-full w-full"
          />
        ) : phase.kind === "failed" ? (
          <div className="flex h-full w-full flex-col gap-3">
            <GenerationTile state="failed" failureLabel={phase.message} ratio="portrait" className="min-h-0 flex-1" />
            <Button variant="tertiary" size="md" onClick={pipeline.reset}>
              Try again
            </Button>
          </div>
        ) : (
          <Media ratio={9 / 16} rounded="md" className="max-h-full w-full">
            <Media.Image src={HERO_PREVIEW} alt="Example vertical farmer testimonial frame" />
          </Media>
        )}
      </div>
    </Card>
  );
}

export function AppDetailTemplate() {
  const jobClient = useFnfJobClient<typeof APP_DETAIL_JOBS>();
  const mediaClient = useFnfMediaClient();
  const scopeKey = useRequiredFnfScopeKey();
  const [localUploads, setLocalUploads] = useState<AssetLibraryItem[]>([]);
  const [activeTab, setActiveTab] = useState("how-it-works");
  const [pendingSignInUrl, setPendingSignInUrl] = useState<string | null>(null);
  const handleTabChange = (tab: string) => {
    if (tab === "my-generations") {
      const signInUrl = getSignInUrl(
        scopeKey,
        `${window.location.pathname}${window.location.search}${window.location.hash}`,
      );
      if (signInUrl != null) {
        setPendingSignInUrl(signInUrl);
        return;
      }
    }
    setActiveTab(tab);
  };
  const history = useInfiniteQuery({
    ...jobsFeedQueryOptions(jobClient, HISTORY_QUERY, { scopeKey }),
    getNextPageParam: getNextCursor,
    select: flattenFeedPages,
  });
  const persistedUploads = useInfiniteQuery({
    queryKey: ["fnf", "scope", scopeKey, "media", "image"],
    queryFn: ({ pageParam }) =>
      mediaClient.list({
        type: "image",
        size: 40,
        ...(pageParam !== undefined ? { cursor: pageParam } : {}),
      }),
    initialPageParam: undefined as string | number | undefined,
    getNextPageParam: getNextCursor,
    select: flattenMediaPages,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const historySnapshots = useMemo(() => history.data ?? [], [history.data]);
  useLiveFeedGenerations(jobClient, historySnapshots, { scopeKey });
  const generations = historySnapshots;
  const historyItems = useMemo(() => generations.map(generationToGalleryItem), [generations]);
  const libraryItems = useMemo(() => {
    const localIds = new Set(localUploads.map((item) => item.ref?.id));
    return [
      ...localUploads,
      ...(persistedUploads.data ?? [])
        .filter((ref) => !localIds.has(ref.id))
        .map(mediaRefToAssetItem)
        .filter((item): item is AssetLibraryItem => item != null),
      ...generations
        .map(generationToAssetItem)
        .filter((item): item is AssetLibraryItem => item != null),
    ];
  }, [generations, localUploads, persistedUploads.data]);
  const loadMoreUploads =
    persistedUploads.data == null ||
    (persistedUploads.error != null && !persistedUploads.isFetchNextPageError)
      ? persistedUploads.refetch
      : persistedUploads.fetchNextPage;
  const loadMoreHistory =
    history.data == null || (history.error != null && !history.isFetchNextPageError)
      ? history.refetch
      : history.fetchNextPage;
  const libraryPagination = useMemo<AssetLibraryPagination>(
    () => ({
      uploads: {
        hasMore: persistedUploads.hasNextPage === true,
        loading: persistedUploads.isPending || persistedUploads.isFetchingNextPage,
        ...(persistedUploads.error instanceof Error
          ? { error: persistedUploads.error.message }
          : {}),
        onLoadMore: loadMoreUploads,
      },
      video: {
        hasMore: history.hasNextPage === true,
        loading: history.isPending || history.isFetchingNextPage,
        ...(history.error instanceof Error ? { error: history.error.message } : {}),
        onLoadMore: loadMoreHistory,
      },
    }),
    [
      history.error,
      history.hasNextPage,
      history.isFetchingNextPage,
      history.isPending,
      loadMoreHistory,
      loadMoreUploads,
      persistedUploads.error,
      persistedUploads.hasNextPage,
      persistedUploads.isFetchingNextPage,
      persistedUploads.isPending,
    ],
  );

  const handleUpload = useCallback(async (file: File): Promise<AssetSelection> => {
    const uploaded = await uploadAsset(file);
    const item = { ...uploaded, kind: "upload" as const, personal: true };
    setLocalUploads((current) => [
      item,
      ...current.filter((candidate) => candidate.ref?.id !== uploaded.ref?.id),
    ]);
    return item;
  }, []);

  const historyError = history.error instanceof Error ? history.error.message : undefined;

  return (
    <div className="min-h-dvh bg-q-background-primary">
      <SignInModal
        open={pendingSignInUrl != null}
        signInUrl={pendingSignInUrl}
        onOpenChange={(open) => {
          if (!open) setPendingSignInUrl(null);
        }}
      />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 md:gap-10 md:px-8 md:py-8">
        <BrandBar active="home" />
        <div id="app">
          <Hero
            libraryItems={libraryItems}
            libraryPagination={libraryPagination}
            onUpload={handleUpload}
          />
        </div>
        <Tabs.Root
          variant="segmented"
          value={activeTab}
          onValueChange={(value) => handleTabChange(String(value))}
          className="flex! min-h-0 w-full flex-col gap-5"
        >
          <Tabs.List
            className="self-start"
            items={[
              {
                value: "how-it-works",
                label: "How it works",
                start: <Icon size="sm" as={IconHowItWorks} />,
              },
              {
                value: "my-generations",
                label: "My generations",
                start: <Icon size="sm" as={IconMyGenerations} />,
              },
            ]}
          />

          <Tabs.Panel value="how-it-works" className="pt-0">
            <LandingSections content={landingContent} className="pb-4 pt-2 md:pt-4" />
          </Tabs.Panel>

          <Tabs.Panel value="my-generations" className="pt-0">
            <section className="flex h-[calc(100dvh-8rem)] min-h-[480px] max-h-[640px] flex-col gap-5 md:h-[640px]">
              {history.isPending ? (
                <div className="flex flex-1 items-center justify-center">
                  <Loader size="md" color="neutral" aria-label="Loading generation history" />
                </div>
              ) : historyError != null && historyItems.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                  <Typography as="p" variant="body-sm-regular" color="danger">
                    {historyError}
                  </Typography>
                  <Button variant="tertiary" size="sm" onClick={() => void loadMoreHistory()}>
                    Retry
                  </Button>
                </div>
              ) : (
                <>
                  {historyError != null ? (
                    <div className="flex items-center justify-between gap-3 rounded-q-300 bg-q-transparent-light-05 px-3 py-2">
                      <Typography as="p" variant="caption-sm-regular" color="danger">
                        {historyError}
                      </Typography>
                      <Button variant="tertiary" size="xs" onClick={() => void loadMoreHistory()}>
                        Retry
                      </Button>
                    </div>
                  ) : null}
                  {historyItems.length === 0 && history.hasNextPage !== true ? (
                    <ScreenEmptyState
                      images={[EMPTY_STATE_IMAGES[0], EMPTY_STATE_IMAGES[1], EMPTY_STATE_IMAGES[2]]}
                      title="No videos yet"
                      description="Your finished testimonial videos will appear here."
                    />
                  ) : (
                    <UserGenerations
                      items={historyItems}
                      hasMore={history.error == null && history.hasNextPage === true}
                      loadingMore={history.isFetchingNextPage}
                      onLoadMore={loadMoreHistory}
                    />
                  )}
                </>
              )}
            </section>
          </Tabs.Panel>
        </Tabs.Root>
      </div>
    </div>
  );
}
