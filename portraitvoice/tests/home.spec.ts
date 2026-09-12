import { expect, test } from "@playwright/test";

test.describe("PortraitVoice home", () => {
  for (const [name, viewport] of [
    ["mobile", { width: 390, height: 844 }],
    ["desktop", { width: 1366, height: 900 }],
  ] as const) {
    test(`renders the generator on ${name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(String(error)));
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Create a testimonial video");
      await expect(page.getByRole("tab", { name: /Note photo/ })).toBeVisible();
      await expect(page.getByText("farmer's consent")).toBeVisible();
      await expect(page.getByRole("link", { name: "Gallery" })).toBeVisible();
      await expect(page.getByRole("button", { name: /Generate video/ })).toBeDisabled();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      expect(overflow).toBe(false);
      expect(errors).toEqual([]);
    });
  }

  test("robots.txt keeps admin out of search", async ({ request }) => {
    const body = await (await request.get("/robots.txt")).text();
    expect(body).toContain("Disallow: /admin");
  });

  test("gallery and admin pages render even without a database", async ({ page }) => {
    for (const path of ["/gallery", "/admin", "/admin/usage"]) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });
});
