import { test, expect } from "@playwright/test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
test.use({ trace: "off" });
test("production photo upload is saved without submitting a paid job", async ({
  page,
}) => {
  test.skip(
    process.env.PV_VERIFY_PROVIDER_UPLOAD !== "1",
    "Opt in to the live upload check; paid submissions are blocked.",
  );
  test.setTimeout(90000);
  const files = await readdir("dist/server/assets");
  const built = await readFile(
    "dist/server/assets/" +
      files.find((f) => f.startsWith("fns-") && f.endsWith(".js")),
    "utf8",
  );
  const id = (name: string) => {
    const m = built.match(
      new RegExp('id: "([a-f0-9]+)",\\s+name: "' + name + '"'),
    );
    if (!m?.[1]) throw new Error("Missing server function");
    return m[1];
  };
  const upload = id("uploadMedia"),
    grant = id("prepareMediaUpload"),
    submit = id("submitTestimonialJob");
  let reachedSubmit = false,
    cloudPut = false,
    providerUpload = false;
  page.on("response", (r) => {
    if (r.request().method() === "PUT" && r.ok()) cloudPut = true;
    if (r.url().includes(upload) && r.ok()) providerUpload = true;
  });
  await page.route("**/_serverFn/**", async (route) => {
    const request = route.request();
    if (request.method() !== "POST") return route.continue();
    if (request.url().includes(upload) || request.url().includes(grant))
      return route.continue();
    if (request.url().includes(submit)) reachedSubmit = true;
    await route.abort("blockedbyclient");
  });
  await page.goto("/");
  await expect(page.getByLabel("Upload a portrait photo")).toBeEnabled();
  await page
    .getByLabel("Upload a portrait photo")
    .setInputFiles(path.resolve("e2e/fixtures/example-portrait.png"));
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByLabel("Your testimonial")
    .fill("मेरी कहानी मेरी अपनी आवाज़ में।");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("checkbox", {
      name: "Consent to create and publicly share this AI video",
    })
    .check();
  await page.getByRole("button", { name: "Create my video" }).click();
  await expect
    .poll(
      async () => {
        const alert = page.getByRole("alert");
        if (!reachedSubmit && (await alert.isVisible()))
          throw new Error((await alert.innerText()).slice(0, 300));
        return reachedSubmit;
      },
      { timeout: 70000 },
    )
    .toBe(true);
  expect(cloudPut).toBe(true);
  expect(providerUpload).toBe(true);
});
