import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import handler from "./dist/server/server.js";
const app = new Hono();
app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  if (c.req.path.startsWith("/admin"))
    c.header("X-Robots-Tag", "noindex, nofollow");
});
app.use("*", serveStatic({ root: "./dist/client" }));
app.all("*", (c) => handler.fetch(c.req.raw));
serve(
  {
    fetch: app.fetch,
    hostname: process.env.HOST || "127.0.0.1",
    port: Number(process.env.PORT || 3000),
  },
  ({ port }) => console.log(`PortraitVoice listening on port ${port}`),
);
