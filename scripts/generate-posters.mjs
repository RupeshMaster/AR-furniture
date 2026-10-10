import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { demoProducts } from "../src/data.js";

// Raster copies for PocketBase photo uploads. The web demo keeps using the tiny
// original SVGs; these PNGs have no external image or font dependencies.
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 800, height: 600 },
    deviceScaleFactor: 1,
  });
  for (const p of demoProducts) {
    const source = new URL(`../public${p.image}`, import.meta.url);
    const svg = await readFile(source, "utf8");
    await page.setContent(
      `<style>body{margin:0}svg{display:block}</style>${svg}`,
    );
    await page.screenshot({
      path: fileURLToPath(source).replace(/\.svg$/, ".png"),
    });
    console.log(`Rendered ${p.image.replace(/\.svg$/, ".png")}`);
  }
} finally {
  await browser.close();
}
