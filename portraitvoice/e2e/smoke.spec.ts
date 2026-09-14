import { test, expect } from "@playwright/test";
import path from "node:path";
test("home, form modes, consent, responsive layout and gallery", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Create a testimonial video." }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Syngenta", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }).getByRole("link"),
  ).toHaveCount(1);
  await expect(page.locator('header a[href^="/admin"]')).toHaveCount(0);
  const create = page.getByRole("button", { name: "Create my video" });
  await expect(create).toBeDisabled();
  const ambience = page.getByRole("switch", { name: "Outdoor ambience" });
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
  await page.getByRole("tab", { name: "Note photo" }).click();
  await expect(page.getByLabel("Upload your handwritten note")).toBeAttached();
  await expect(
    page.getByRole("button", { name: "Read note", exact: true }),
  ).toBeDisabled();
  await page.getByRole("tab", { name: "Audio", exact: true }).click();
  await expect(
    page.getByText("Your original voice will be used in the video."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Female", exact: true }),
  ).toHaveCount(0);
  await expect(ambience).not.toBeChecked();
  await page.getByRole("tab", { name: "Text", exact: true }).click();
  await expect(ambience).toBeChecked();
  await page
    .getByLabel("Your testimonial")
    .fill("मेरी कहानी मेरी अपनी आवाज़ में।");
  await page.getByLabel("Language", { exact: true }).selectOption("te");
  await expect(page.getByLabel("Language", { exact: true })).toHaveValue("te");
  await page
    .getByLabel("Upload a portrait photo")
    .setInputFiles(path.resolve("e2e/fixtures/example-portrait.png"));
  await expect(create).toBeDisabled();
  await page
    .getByRole("checkbox", {
      name: "Consent to create and publicly share this AI video",
    })
    .click();
  await expect(create).toBeEnabled();
  await page.getByRole("button", { name: "Male", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Male", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("checkbox", {
      name: "Consent to create and publicly share this AI video",
    })
    .click();
  await expect(create).toBeDisabled();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  if (testInfo.project.name === "mobile")
    await expect(page.locator(".preview-aside")).toBeHidden();
  else {
    await expect(page.locator(".preview-aside")).toBeVisible();
  }
  await page.getByRole("button", { name: "Remove portrait" }).click();
  if (testInfo.project.name !== "mobile") {
    await page.getByRole("button", { name: "Watch example" }).click();
    await expect
      .poll(() =>
        page
          .getByLabel("Hindi example video")
          .evaluate((el) => (el as HTMLVideoElement).currentTime),
      )
      .toBeGreaterThan(0);
  }
  await page.reload();
  await page.screenshot({
    path: testInfo.outputPath("home.png"),
    fullPage: true,
    timeout: 15000,
  });
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
  await expect(
    page.getByRole("heading", { name: "AI usage" }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("Disallow: /admin");
  const missing = await request.get("/api/download/not-an-id");
  expect(missing.status()).toBe(404);
});
