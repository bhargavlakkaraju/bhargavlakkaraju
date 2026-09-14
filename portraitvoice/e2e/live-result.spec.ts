import { test, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
test("completed live job resumes, plays and downloads without another charge", async ({
  page,
  request,
}) => {
  test.skip(
    !existsSync(".data/live-result.json"),
    "Run the opt-in live acceptance check first.",
  );
  const saved = JSON.parse(
    await readFile(".data/live-acceptance.json", "utf8"),
  ) as { entryId: string; token: string };
  const before = JSON.parse(await readFile(".data/db.json", "utf8")) as {
    usage: unknown[];
  };
  await page.addInitScript(
    (value) =>
      localStorage.setItem(
        "portraitvoice.active.v1",
        JSON.stringify({ ...value, startedAt: Date.now() - 300000 }),
      ),
    saved,
  );
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Your story is ready." }),
  ).toBeVisible();
  const video = page.locator("video");
  await expect(video).toHaveAttribute("controls", "");
  await expect
    .poll(() => video.evaluate((el) => (el as HTMLVideoElement).readyState), {
      timeout: 20000,
    })
    .toBeGreaterThanOrEqual(1);
  const geometry = await video.evaluate((el) => {
    const v = el as HTMLVideoElement;
    return { width: v.videoWidth, height: v.videoHeight, duration: v.duration };
  });
  expect(geometry.width / geometry.height).toBeCloseTo(9 / 16, 2);
  expect(geometry.duration).toBeGreaterThan(3);
  expect(geometry.duration).toBeLessThan(6);
  await video.evaluate(async (el) => {
    const v = el as HTMLVideoElement;
    v.muted = true;
    await v.play();
  });
  await expect
    .poll(() => video.evaluate((el) => (el as HTMLVideoElement).currentTime))
    .toBeGreaterThan(0);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Your story is ready." }),
  ).toBeVisible();
  const response = await request.get("/api/download/" + saved.entryId);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-disposition"]).toContain("attachment;");
  expect(response.headers()["content-type"]).toBe("video/mp4");
  const after = JSON.parse(await readFile(".data/db.json", "utf8")) as {
    usage: unknown[];
  };
  expect(after.usage.length).toBe(before.usage.length);
  await page.getByRole("button", { name: "Create another" }).click();
  await expect(
    page.getByRole("heading", { name: "Make it personal." }),
  ).toBeVisible();
});
