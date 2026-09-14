import { test, expect } from "@playwright/test";
import path from "node:path";
test.use({ trace: "off" });
test("live note photo is transcribed in Hindi and remains editable before consent", async ({
  page,
}, info) => {
  test.skip(
    process.env.PV_VERIFY_NOTE_OCR !== "1" || info.project.name !== "desktop",
    "Opt in to a live Gemini OCR request.",
  );
  test.setTimeout(150000);
  await page.goto("/");
  await page.getByRole("tab", { name: "Note photo" }).click();
  await page
    .getByLabel("Upload your handwritten note")
    .setInputFiles(path.resolve("e2e/fixtures/hindi-note.png"));
  await page.getByRole("button", { name: "Read note", exact: true }).click();
  await expect(page.getByLabel("Your testimonial")).toHaveValue(/नमस्ते/, {
    timeout: 120000,
  });
  await expect(page.getByLabel("Your testimonial")).toHaveValue(/मौसम/);
  await expect(
    page.getByText("I have checked the extracted text."),
  ).toBeVisible();
  await page
    .getByLabel("Your testimonial")
    .fill("नमस्ते। मैंने अपने शब्द जाँच लिए हैं।");
  await expect(
    page.getByRole("button", { name: "Create my video" }),
  ).toBeDisabled();
});
