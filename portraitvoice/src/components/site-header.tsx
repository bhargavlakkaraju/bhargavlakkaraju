import { Link } from "@tanstack/react-router";

/** Syngenta header: logo plus the single public nav link. Admin screens are deliberately unlinked. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3" aria-label="PortraitVoice home">
          <img src="/syngenta-logo.svg" alt="Syngenta" className="h-9 w-auto rounded-md" width={220} height={56} />
          <span className="hidden text-sm font-semibold tracking-wide text-white/70 sm:inline">PortraitVoice</span>
        </Link>
        <nav>
          <Link
            to="/gallery"
            className="rounded-lg px-3 py-2 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
            activeProps={{ className: "text-brand-green-light" }}
          >
            Gallery
          </Link>
        </nav>
      </div>
    </header>
  );
}
