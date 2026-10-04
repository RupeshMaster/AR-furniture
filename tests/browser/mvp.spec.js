import { test, expect } from "@playwright/test";
import jsQR from "jsqr";
import { PNG } from "pngjs";

const photo = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZfoAAAAASUVORK5CYII=",
  "base64",
);
test("catalog → QR product → reservation → persistent merchant lead → CSV", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const requests = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "The Cloud Sofa" }),
  ).toBeVisible();
  expect(
    requests.some(
      (url) => url.endsWith(".glb") || url.includes("model-viewer"),
    ),
  ).toBe(false);
  await page.getByLabel("Search catalog").fill("Arc");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page.goto("/p/cloudsofa000001?source=qr");
  await page.getByRole("button", { name: "Moss", exact: true }).click();
  await page.getByRole("button", { name: "Request a reservation" }).click();
  await page.getByLabel("Full name").fill("Maya Tester");
  await page.getByLabel("Email or phone").fill("maya@example.com");
  await page
    .getByLabel("Message", { exact: false })
    .fill("Will this fit a 3m wall?");
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(
    page.getByRole("heading", { name: "Your request is saved." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Keep exploring" }).click();
  await page.goto("/dashboard");
  await page.getByRole("button", { name: /^Leads/ }).click();
  await expect(page.getByText("maya@example.com")).toBeVisible();
  await expect(page.getByText("Moss · reservation")).toBeVisible();
  await expect(page.getByText("Showroom QR")).toBeVisible();
  await page.getByLabel("Status for Maya Tester").selectOption("Contacted");
  await expect(page.getByRole("status")).toContainText("Lead status updated");
  await page.reload();
  await page.getByRole("button", { name: /^Leads/ }).click();
  await expect(page.getByLabel("Status for Maya Tester")).toHaveValue(
    "Contacted",
  );
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  expect((await download).suggestedFilename()).toBe("roomly-leads.csv");
  await page.getByRole("button", { name: "Analytics", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "What buyers are exploring" }),
  ).toBeVisible();
  await expect(page.getByText("Showroom QR")).toBeVisible();
  await expect(page.getByText("Privacy-friendly by design.")).toBeVisible();
  expect(errors).toEqual([]);
});

test("product editing persists uploads, QR decodes, and unpublishing revokes public route", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Products", exact: true }).click();
  await page.getByRole("button", { name: "Add product", exact: true }).click();
  await page.getByLabel("Product name").fill("Test Reading Chair");
  await page
    .getByRole("combobox", { name: "Category", exact: true })
    .selectOption("Chair");
  await page.getByLabel("Price", { exact: true }).fill("450");
  await page
    .getByLabel("Product photo")
    .setInputFiles({ name: "chair.png", mimeType: "image/png", buffer: photo });
  await page
    .getByLabel("GLB model")
    .setInputFiles("public/models/arc-chair.glb");
  await page.getByLabel("Publish to the public catalog").check();
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByText("Test Reading Chair", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Products", exact: true }).click();
  await page.getByRole("button", { name: "QR for Test Reading Chair" }).click();
  const qr = page.getByRole("img", {
    name: "QR code linking to Test Reading Chair",
  });
  await expect(qr).toBeVisible();
  const png = PNG.sync.read(
    Buffer.from((await qr.getAttribute("src")).split(",")[1], "base64"),
  );
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  expect(decoded.data).toMatch(/\/p\/[a-z0-9]+\?source=qr$/);
  const destination = decoded.data;
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download QR PNG" }).click();
  expect((await download).suggestedFilename()).toMatch(/-qr.png$/);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.goto(destination);
  await expect(
    page.getByRole("heading", { name: "Test Reading Chair" }),
  ).toBeVisible();
  await expect(page.locator(".product-poster")).toHaveAttribute(
    "src",
    /^blob:/,
  );
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Products", exact: true }).click();
  await page.getByRole("button", { name: "Edit Test Reading Chair" }).click();
  await page.getByLabel("Publish to the public catalog").uncheck();
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto(destination);
  await expect(
    page.getByRole("heading", { name: "Product unavailable" }),
  ).toBeVisible();
});

test("3D loads on demand and switches actual material variants", async ({
  page,
}) => {
  await page.goto("/p/cloudsofa000001");
  await page.getByRole("button", { name: /Explore in 3D/ }).click();
  await expect
    .poll(() => page.locator("model-viewer").evaluate((v) => v.loaded), {
      timeout: 45000,
    })
    .toBe(true);
  expect(
    await page.locator("model-viewer").evaluate((v) => v.availableVariants),
  ).toEqual(["Oat", "Moss", "Ink"]);
  await page.getByRole("button", { name: "Moss", exact: true }).click();
  await expect
    .poll(() => page.locator("model-viewer").evaluate((v) => v.variantName))
    .toBe("Moss");
  const dimensions = await page.locator("model-viewer").evaluate((v) => {
    const d = v.getDimensions();
    return [d.x, d.y, d.z];
  });
  expect(dimensions[0]).toBeCloseTo(2.15, 2);
  await page.screenshot({
    path: "test-results/product-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Room-view compatibility" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "supported iOS or Android",
  );
});

test("mobile navigation, form usability, and no horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "The Cloud Sofa" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/catalog-mobile.png",
    fullPage: true,
  });
  await page.goto("/p/cloudsofa000001");
  await page.getByRole("button", { name: "Request a reservation" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Products", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your products" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
});
