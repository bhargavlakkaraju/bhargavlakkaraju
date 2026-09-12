import { HeadContent, Link, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/toaster";
import appCss from "@/styles/app.css?url";

export const SITE_URL = "https://portraitvoice.vercel.app";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "PortraitVoice by Syngenta" },
      { name: "description", content: "Turn one portrait photo and a testimonial into a vertical, lip-synced talking-head video for farmers." },
      { name: "theme-color", content: "#06080d" },
      { property: "og:site_name", content: "PortraitVoice" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: `${SITE_URL}/assets/hero-preview.jpg` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <>
      <SiteHeader />
      <Outlet />
      <Toaster />
    </>
  );
}

function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-sm text-white/60">The page you're looking for doesn't exist.</p>
      <Link to="/" className="text-brand-green-light underline-offset-4 hover:underline">Go home</Link>
    </main>
  );
}
