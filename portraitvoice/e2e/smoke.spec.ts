import { test, expect } from "@playwright/test";
import path from "node:path";
test("guided creation preserves inputs, gates consent and works on phones", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Make it personal." }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Syngenta", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }).getByRole("link"),
  ).toHaveCount(1);
  await expect(page.locator('header a[href^="/admin"]')).toHaveCount(0);
  const next = page.getByRole("button", { name: "Continue", exact: true });
  const steps = page.getByRole("navigation", { name: "Creation steps" });
  await expect(next).toBeDisabled();
  await expect(steps.getByRole("button", { name: "2 Story" })).toBeDisabled();
  await expect(page.locator(".preview-aside")).toBeVisible();
  await page.getByRole("button", { name: "Watch example" }).click();
  await expect(
    page.getByRole("dialog", { name: "Example testimonial" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByLabel("Hindi example video")
        .evaluate((el) => (el as HTMLVideoElement).currentTime),
    )
    .toBeGreaterThan(0);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Example testimonial" }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Watch example" }),
  ).toBeFocused();
  await page
    .getByLabel("Upload a portrait photo")
    .setInputFiles(path.resolve("e2e/fixtures/example-portrait.png"));
  await next.click();
  await expect(
    page.getByRole("heading", { name: "Tell your story." }),
  ).toBeFocused();
  await expect(next).toBeDisabled();
  await page.getByRole("tab", { name: "Note photo" }).click();
  await expect(page.getByLabel("Upload your handwritten note")).toBeAttached();
  await expect(
    page.getByRole("button", { name: "Read note", exact: true }),
  ).toBeDisabled();
  await page.getByRole("tab", { name: "Audio", exact: true }).click();
  await expect(
    page.getByText("Your original voice will be used in the video."),
  ).toBeVisible();
  await expect(next).toBeDisabled();
  const wav = Buffer.alloc(60);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(52, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24);
  wav.writeUInt32LE(16000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(16, 40);
  await page
    .getByLabel("Upload your voice recording")
    .setInputFiles({ name: "voice.wav", mimeType: "audio/wav", buffer: wav });
  await next.click();
  await expect(
    page.getByRole("button", { name: "Female", exact: true }),
  ).toHaveCount(0);
  const ambience = page.getByRole("switch", { name: "Outdoor ambience" });
  await expect(ambience).not.toBeChecked();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("tab", { name: "Text", exact: true }).click();
  await page
    .getByLabel("Your testimonial")
    .fill("मेरी कहानी मेरी अपनी आवाज़ में।");
  await page.getByLabel("Language", { exact: true }).selectOption("te");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "Your uploaded portrait" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Remove portrait" }).click();
  await expect(next).toBeDisabled();
  await expect(steps.getByRole("button", { name: "3 Finish" })).toBeDisabled();
  await page
    .getByLabel("Upload a portrait photo")
    .setInputFiles(path.resolve("e2e/fixtures/example-portrait.png"));
  await next.click();
  await expect(page.getByLabel("Your testimonial")).toHaveValue(
    "मेरी कहानी मेरी अपनी आवाज़ में।",
  );
  await expect(page.getByLabel("Language", { exact: true })).toHaveValue("te");
  await next.click();
  await expect(
    page.getByRole("heading", { name: "Give it your voice." }),
  ).toBeFocused();
  await expect(ambience).toBeChecked();
  await ambience.click();
  await expect(ambience).not.toBeChecked();
  await ambience.press("Space");
  await expect(ambience).toBeChecked();
  await page.getByRole("button", { name: "Preview outdoor ambience" }).click();
  await expect(
    page.getByRole("button", { name: "Stop ambience preview" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Stop ambience preview" }).click();
  const create = page.getByRole("button", { name: "Create my video" });
  const consent = page.getByRole("checkbox", {
    name: "Consent to create and publicly share this AI video",
  });
  await expect(create).toBeDisabled();
  await consent.check();
  await expect(create).toBeEnabled();
  await page.getByRole("button", { name: "Male", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Male", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await consent.uncheck();
  await expect(create).toBeDisabled();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.screenshot({
    path: info.outputPath("finish.png"),
    fullPage: true,
  });
  await page.reload();
  await page.screenshot({ path: info.outputPath("home.png"), fullPage: true });
  await page.getByRole("link", { name: "Gallery", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Stories from the field." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create a video" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("internal routes and robots", async ({ page, request }) => {
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Testimonial entries" }),
  ).toBeVisible();
  await expect(
    page.getByText(/Accessible to anyone with this URL/),
  ).toBeVisible();
  await page.goto("/admin/usage");
  await expect(page.getByRole("heading", { name: "AI usage" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("Disallow: /admin");
  const missing = await request.get("/api/download/not-an-id");
  expect(missing.status()).toBe(404);
});
