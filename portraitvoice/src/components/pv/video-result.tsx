import { Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  videoUrl: string;
  posterUrl: string | null;
  onCreateAnother: () => void;
  className?: string;
}

/** The finished 9:16 video, object-contain, with download and restart. */
export function VideoResult({ videoUrl, posterUrl, onCreateAnother, className }: Props) {
  return (
    <div className={className}>
      <div className="flex h-full flex-col gap-3">
        <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl border border-line bg-black shadow-glow">
          <video src={videoUrl} poster={posterUrl ?? undefined} controls autoPlay playsInline className="h-full w-full object-contain" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button asChild>
            <a href={videoUrl} download="portraitvoice-testimonial.mp4"><Download /> Download</a>
          </Button>
          <Button variant="secondary" onClick={onCreateAnother}><RotateCcw /> Create another</Button>
        </div>
      </div>
    </div>
  );
}
