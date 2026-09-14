import { test, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
test.use({ trace: "off" });
test("live HeyGen Hindi render completes, resumes, plays, and downloads", async ({
  page,
  request,
}, info) => {
  test.skip(
    process.env.PV_VERIFY_HEYGEN_RENDER !== "1" ||
      info.project.name !== "desktop",
    "Explicit opt-in: spends HeyGen API balance once.",
  );
  test.setTimeout(20 * 60 * 1000);
  const statePath = ".data/heygen-live.json";
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  if (existsSync(statePath)) {
    const saved = JSON.parse(await readFile(statePath, "utf8")) as {
      entryId: string;
      token: string;
      startedAt: number;
    };
    await page.addInitScript(
      (value) =>
        localStorage.setItem("portraitvoice.active.v1", JSON.stringify(value)),
      saved,
    );
    await page.goto("/");
  } else {
    await page.goto("/");
    await expect(page.getByLabel("Upload a portrait photo")).toBeEnabled();
    await page
      .getByLabel("Upload a portrait photo")
      .setInputFiles(path.resolve("e2e/fixtures/example-portrait.png"));
    await page
      .getByLabel("Your testimonial")
      .fill(
        "नमस्ते। यह हमारी नई वीडियो सेवा का एक छोटा-सा परीक्षण है। आज मौसम बहुत अच्छा है।",
      );
    await page
      .getByRole("button", { name: "Review video", exact: true })
      .click();
    await page
      .getByRole("checkbox", {
        name: "Consent to create and publicly share this AI video",
      })
      .check();
    await page.getByRole("button", { name: "Create my video" }).click();
    await expect
      .poll(
        async () => {
          const saved = await page.evaluate(() =>
            localStorage.getItem("portraitvoice.active.v1"),
          );
          if (saved) {
            await writeFile(statePath, saved, { mode: 0o600 });
            return true;
          }
          const alert = page.getByRole("alert");
          if (await alert.isVisible()) throw new Error(await alert.innerText());
          return false;
        },
        { timeout: 100000 },
      )
      .toBe(true);
  }
  await expect
    .poll(
      async () => {
        if (
          await page
            .getByRole("heading", { name: "Your story is ready." })
            .isVisible()
        )
          return true;
        const alert = page.getByRole("alert");
        if (await alert.isVisible()) throw new Error(await alert.innerText());
        return false;
      },
      { timeout: 17 * 60 * 1000, intervals: [6000] },
    )
    .toBe(true);
  const saved = JSON.parse(await readFile(statePath, "utf8")) as {
    entryId: string;
  };
  const video = page.locator("video.result-video");
  await expect
    .poll(() => video.evaluate((el) => (el as HTMLVideoElement).readyState), {
      timeout: 30000,
    })
    .toBeGreaterThanOrEqual(1);
  const meta = await video.evaluate((el) => {
    const v = el as HTMLVideoElement;
    return {
      width: v.videoWidth,
      height: v.videoHeight,
      duration: v.duration,
      url: v.currentSrc,
    };
  });
  expect(meta.width).toBe(1080);
  expect(meta.height).toBe(1920);
  expect(meta.duration).toBeGreaterThan(4);
  expect(meta.url).toContain("/api/media/");
  await video.evaluate(async (el) => {
    const v = el as HTMLVideoElement;
    v.muted = true;
    await v.play();
  });
  await expect
    .poll(() => video.evaluate((el) => (el as HTMLVideoElement).currentTime))
    .toBeGreaterThan(0);
  const download = await request.get(`/api/download/${saved.entryId}`);
  expect(download.ok()).toBe(true);
  expect(download.headers()["content-disposition"]).toContain("attachment");
  await writeFile("work/heygen-live.mp4", await download.body());
  const range = await request.get(meta.url, {
    headers: { Range: "bytes=0-1023" },
  });
  expect(range.status()).toBe(206);
  expect((await range.body()).length).toBe(1024);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your story is ready." }),
  ).toBeVisible();
  await writeFile(
    "work/heygen-live-result.json",
    JSON.stringify({ entryId: saved.entryId, ...meta }, null, 2),
  );
  expect(errors).toEqual([]);
});
