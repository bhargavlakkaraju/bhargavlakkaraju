import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  server: {
    watch: {
      ignored: ["**/.data/**", "**/test-results/**", "**/playwright-report/**"],
    },
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  plugins: [
    tailwindcss(),
    tanstackStart(),
    ...(process.env.VERCEL || process.env.PV_CLOUD_BUILD
      ? [
          nitro({
            preset: "vercel",
            serverEntry: false,
            traceDeps: ["ffmpeg-static*"],
            routeRules: {
              "/**": {
                headers: {
                  "X-Content-Type-Options": "nosniff",
                  "Referrer-Policy": "strict-origin-when-cross-origin",
                },
              },
              "/admin/**": { headers: { "X-Robots-Tag": "noindex, nofollow" } },
            },
            vercel: {
              functions: { maxDuration: 300, memory: 2048, regions: ["bom1"] },
            },
            modules: [
              (nitro) => {
                nitro.hooks.hook("compiled", async () => {
                  const { createRequire } = await import("node:module");
                  const { execFileSync } = await import("node:child_process");
                  const binary = createRequire(import.meta.url)(
                    "ffmpeg-static",
                  );
                  execFileSync(binary, ["-version"], {
                    stdio: "ignore",
                    timeout: 10000,
                  });
                  console.log(
                    "FFmpeg runtime verified for " +
                      process.platform +
                      "-" +
                      process.arch,
                  );
                  const { mkdir, copyFile } = await import("node:fs/promises");
                  const { join } = await import("node:path");
                  const target = join(
                    nitro.options.output.serverDir,
                    "public/audio",
                  );
                  await mkdir(target, { recursive: true });
                  await copyFile(
                    "public/audio/outdoor-ambience.mp3",
                    join(target, "outdoor-ambience.mp3"),
                  );
                });
              },
            ],
          }),
        ]
      : []),
    viteReact(),
  ],
});
