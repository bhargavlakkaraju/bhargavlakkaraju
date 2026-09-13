import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  Link,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import { ArrowUpRight } from "lucide-react";
import styleCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#ffffff" },
    ],
    links: [
      { rel: "stylesheet", href: styleCss },
      { rel: "icon", href: "/favicon.png" },
    ],
  }),
  component: Root,
  errorComponent: ({ error, reset }) => (
    <main className="error-page">
      <h1>Something interrupted this page</h1>
      <p>{error instanceof Error ? error.message : "Please try again."}</p>
      <button onClick={reset}>Try again</button>
      <a href="/">Return to PortraitVoice</a>
    </main>
  ),
});
function Root() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header className="site-header">
          <Link to="/" aria-label="PortraitVoice home" className="brand">
            <span className="logo-plate">
              <img src="/syngenta-logo.png" alt="Syngenta" />
            </span>
            <span className="brand-divider" />
            <span className="product-name">PortraitVoice</span>
          </Link>
          <nav aria-label="Main navigation">
            <Link to="/gallery" activeProps={{ className: "active" }}>
              Gallery <ArrowUpRight size={16} />
            </Link>
          </nav>
        </header>
        <Outlet />
        <Toaster theme="light" position="top-center" richColors />
        <Scripts />
      </body>
    </html>
  );
}
