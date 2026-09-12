import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  // Expose .env values to server functions in dev (Vite only exposes VITE_* to the client).
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return {
    server: { port: 3000 },
    // Nitro picks the Vercel preset automatically when it builds on Vercel.
    plugins: [tsconfigPaths(), tailwindcss(), tanstackStart(), nitro(), viteReact()],
  };
});
