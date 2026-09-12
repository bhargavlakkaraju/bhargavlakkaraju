import { Link } from "@tanstack/react-router";
import { Images as IconGallery } from "lucide-react";
import { Button } from "@higgsfield/quanta/button";
import { Icon } from "@higgsfield/quanta/icon";

/**
 * Inline brand row for the work area (the Higgsfield host owns the
 * global header, so this is a content-area row, not an app bar). Admin routes
 * are intentionally not linked: they are internal, direct-URL screens.
 */
export function BrandBar({ active }: { active: "home" | "gallery" }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Link to="/" aria-label="PortraitVoice home" className="flex min-w-0 items-center gap-3">
        <img
          src="/assets/brand/portraitvoice-logo.svg"
          alt="PortraitVoice"
          width={176}
          height={44}
          className="h-9 w-auto rounded-q-300"
        />
        <span className="truncate text-q-label-lg-semi-bold text-q-text-secondary">Farmer testimonials</span>
      </Link>
      <Button
        variant={active === "gallery" ? "brandSoft" : "tertiary"}
        size="md"
        as="a"
        href="/gallery"
        aria-current={active === "gallery" ? "page" : undefined}
        start={<Icon size="sm" as={IconGallery} />}
      >
        Gallery
      </Button>
    </div>
  );
}
