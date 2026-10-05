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
