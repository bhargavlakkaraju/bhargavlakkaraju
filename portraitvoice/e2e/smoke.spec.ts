import { test, expect } from "@playwright/test";
import path from "node:path";
test("language creation preserves drafts, gates each review and works on phones", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/_serverFn/**", async (route) => {
    if (route.request().method() === "POST")
      await route.abort("blockedbyclient");
    else await route.continue();
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(
    page.getByRole("heading", { name: "Create a testimonial." }),
  ).toBeVisible();
  await page
    .getByLabel("Upload a portrait photo")
    .setInputFiles(path.resolve("e2e/fixtures/example-portrait.png"));
  await page.getByLabel("Input language", { exact: true }).selectOption("en");
  await page
    .getByLabel("Your testimonial")
    .fill("My name is Asha. These are my own words.");
  await page.getByRole("button", { name: "Review video", exact: true }).click();
  const consent = page.getByRole("checkbox", {
    name: "Consent to create and publicly share this AI video",
  });
  const create = page.getByRole("button", {
    name: "Create 1 video",
    exact: true,
  });
  await consent.check();
  await expect(create).toBeDisabled();
  await page
    .getByLabel("Reviewed script · Hindi")
    .fill("मेरा नाम आशा है। ये मेरे अपने शब्द हैं।");
  await page
    .getByRole("checkbox", { name: "I have checked the Hindi translation." })
    .check();
  await consent.check();
  await expect(create).toBeEnabled();
  await page.getByRole("checkbox", { name: "Telugu · తెలుగు" }).check();
  await page
    .getByLabel("Reviewed script · Telugu")
    .fill("నా పేరు ఆశా. ఇవి నా స్వంత మాటలు.");
  await page
    .getByRole("checkbox", { name: "I have checked the Telugu translation." })
    .check();
  await consent.check();
  await expect(
    page.getByRole("button", { name: "Create 2 videos", exact: true }),
  ).toBeEnabled();
  await page.screenshot({
    path: info.outputPath("multilingual-review.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Edit story", exact: true }).click();
  await page
    .getByLabel("Your testimonial")
    .fill("My name is Asha. My source has changed.");
  await page.getByRole("button", { name: "Review video", exact: true }).click();
  await expect(page.getByText("Source changed.", { exact: false })).toHaveCount(
    2,
  );
  await expect(page.getByLabel("Reviewed script · Telugu")).toHaveValue(
    "నా పేరు ఆశా. ఇవి నా స్వంత మాటలు.",
  );
  await consent.check();
  await expect(
    page.getByRole("button", { name: "Create 2 videos", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("checkbox", { name: "I have checked the Hindi translation." })
    .check();
  await page
    .getByRole("checkbox", { name: "I have checked the Telugu translation." })
    .check();
  await consent.check();
  await expect(
    page.getByRole("button", { name: "Create 2 videos", exact: true }),
  ).toBeEnabled();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page
    .getByLabel("Upload a portrait photo")
    .setInputFiles(path.resolve("e2e/fixtures/example-portrait.png"));
  await expect(page.getByLabel("Your testimonial")).toHaveValue(
    "My name is Asha. My source has changed.",
  );
  await page.getByRole("tab", { name: "Upload audio", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Transcribe recording" }),
  ).toBeDisabled();
  await expect(page.getByLabel("Review original transcript")).toBeVisible();
  await page.getByRole("link", { name: "Gallery", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Stories from the field." }),
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

test("completed video uses consented self-serve translation and preserves partial outputs", async ({
  page,
}, info) => {
  const { fromJSON } = await import("seroval");
  const sourceId = "11111111-1111-4111-8111-111111111111";
  const outputId = "22222222-2222-4222-8222-222222222222";
  const token = "a".repeat(64);
  const source = {
    id: sourceId,
    language: "en",
    status: "completed",
    input_mode: "text",
    portrait_url: "/example-portrait.png",
    video_url: "/demo-ugc.mp4",
    audio_url: null,
  };
  let preparations = 0;
  await page.addInitScript(
    ({ sourceId, token }) => {
      localStorage.setItem(
        "portraitvoice.batch.v1",
        JSON.stringify([
          {
            entryId: sourceId,
            language: "en",
            token,
            error: null,
            startedAt: Date.now(),
          },
        ]),
      );
    },
    { sourceId, token },
  );
  await page.route("**/_serverFn/**", async (route) => {
    const encoded = new URL(route.request().url()).pathname.split("/").pop()!;
    const productionNames: Record<string, string> = {
      e29f7c0d32757aedd345a2c1a4d07f1495399feeabc25d20aa8238d7b9144cee:
        "getTranslationCapabilities",
      "32d5eb466f335fe2c365e11fd2048dfde21e538691338b0e37a343871f989865":
        "resumeTestimonial",
      "8fa11d4a78547a17755d8acbd75bcca306ef0d698178de86d10f805caa2a8e1c":
        "prepareVideoTranslation",
    };
    let id = productionNames[encoded];
    if (!id) {
      try {
        id = JSON.parse(
          Buffer.from(encoded, "base64url").toString(),
        ).export.split("_createServerFn")[0];
      } catch {}
    }
    const respond = (result: unknown) =>
      route.fulfill({ json: { result, context: {} } });
    if (id === "getTranslationCapabilities")
      return respond({ available: true, reason: null });
    if (id === "resumeTestimonial") {
      const payload = fromJSON(route.request().postDataJSON()) as {
        data: { entryId: string };
      };
      return respond({
        entry:
          payload.data.entryId === sourceId
            ? source
            : { ...source, id: outputId, language: "hi" },
        jobs: [],
        audioDuration: null,
      });
    }
    if (id === "prepareVideoTranslation") {
      preparations++;
      const payload = fromJSON(route.request().postDataJSON()) as {
        data: { language: string; consent: boolean; token: string };
      };
      expect(payload.data.consent).toBe(true);
      if (payload.data.language === "te")
        return route.fulfill({
          json: { error: { message: "Mock Telugu failure" } },
        });
      return respond({
        entryId: outputId,
        token: payload.data.token,
        language: "hi",
      });
    }
    if (route.request().method() === "POST")
      return route.abort("blockedbyclient");
    return route.continue();
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Translate this video into more languages" })
    .click();
  const create = page.getByRole("button", {
    name: "Create translated videos",
    exact: true,
  });
  await page.getByRole("checkbox", { name: "Hindi", exact: true }).check();
  await page.getByRole("checkbox", { name: "Telugu", exact: true }).check();
  await expect(create).toBeDisabled();
  await page
    .getByRole("checkbox", {
      name: /I have permission to translate this person's video/,
    })
    .check();
  await expect(create).toBeEnabled();
  await expect(
    page.getByText(/Review the generated video for meaning/),
  ).toBeVisible();
  await create.click();
  await expect(page.getByRole("alert")).toContainText("Telugu");
  await expect(
    page.getByRole("link", { name: "Download Hindi video", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Download English video", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: /subtitle/i })).toHaveCount(0);
  expect(preparations).toBe(2);
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await expect
    .poll(() =>
      page
        .locator(".language-output video, .language-output button")
        .evaluateAll((elements) =>
          elements.every((element) => {
            const box = element.getBoundingClientRect();
            return box.left >= 0 && box.right <= innerWidth;
          }),
        ),
    )
    .toBe(true);
  await page.screenshot({
    path: info.outputPath("completed-video-translation.png"),
    fullPage: true,
  });
});
