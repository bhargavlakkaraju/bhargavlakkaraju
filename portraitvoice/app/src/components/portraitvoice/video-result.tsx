import { Download as IconDownload, Maximize as IconFullScreen, RotateCcw as IconAgain } from "lucide-react";
import { Button } from "@higgsfield/quanta/button";
import { Icon } from "@higgsfield/quanta/icon";
import { GenerationTile } from "@/components/generation-card";
import type { CardAction } from "@/components/generation-card";
import { downloadMedia } from "@/lib/download-media";

const RESULT_ACTIONS: CardAction[] = [
  { id: "download", label: "Download", icon: IconDownload },
  { id: "fullscreen", label: "Full screen", icon: IconFullScreen },
];

interface VideoResultProps {
  videoUrl: string;
  posterUrl: string | null;
  prompt: string | null;
  onCreateAnother: () => void;
  className?: string;
}

/** The finished 9:16 talking-head video, object-contain, with download and restart. */
export function VideoResult({ videoUrl, posterUrl, prompt, onCreateAnother, className }: VideoResultProps) {
  return (
    <div className={className}>
      <div className="flex h-full min-h-0 flex-col gap-3">
        <GenerationTile
          ratio="portrait"
          className="min-h-0 flex-1"
          alt="Finished testimonial video"
          generation={{
            src: videoUrl,
            mediaType: "video",
            ...(posterUrl ? { poster: posterUrl } : {}),
            aspectRatio: 9 / 16,
            ...(prompt ? { prompt } : {}),
            fileType: "MP4",
          }}
          openLabel="Open the finished video"
          actions={RESULT_ACTIONS}
        />
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="marketingPrimary"
            size="md"
            start={<Icon size="sm" as={IconDownload} />}
            onClick={() => void downloadMedia(videoUrl, "portraitvoice-testimonial.mp4")}
          >
            Download
          </Button>
          <Button variant="tertiary" size="md" start={<Icon size="sm" as={IconAgain} />} onClick={onCreateAnother}>
            Create another
          </Button>
        </div>
      </div>
    </div>
  );
}
