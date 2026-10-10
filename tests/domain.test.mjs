import test from "node:test";
import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import { NodeIO } from "@gltf-transform/core";
import {
  KHRDracoMeshCompression,
  KHRMaterialsVariants,
} from "@gltf-transform/extensions";
import draco3d from "draco3dgltf";
import { getBounds } from "@gltf-transform/functions";
import {
  csv,
  demoProducts,
  validateLead,
  validateProduct,
} from "../src/data.js";
import { summarizeAnalytics } from "../src/data.js";

test("lead validation accepts contact methods and rejects invalid or oversized inputs", () => {
  assert.equal(
    validateLead({ name: " Maya Patel ", contact: "maya@example.com" }).name,
    "Maya Patel",
  );
  assert.equal(
    validateLead({ name: "Maya Patel", contact: "+91 98765 43210" }).contact,
    "+91 98765 43210",
  );
  assert.throws(() => validateLead({ name: "M", contact: "bad" }));
  assert.throws(() => validateLead({ name: "Maya Patel", contact: "-------" }));
  assert.throws(() =>
    validateLead({ name: "Maya Patel", contact: "not-contact" }),
  );
  assert.throws(() =>
    validateLead({
      name: "Maya Patel",
      contact: "maya@example.com",
      message: "x".repeat(2001),
    }),
  );
});
test("product validation disallows impossible dimensions and ambiguous swatches", () => {
  assert.equal(demoProducts.length, 9);
  assert.deepEqual(
    new Set(demoProducts.map((product) => product.category)),
    new Set(["Sofa", "Chair", "Table", "Storage", "Bed", "Other"]),
  );
  for (const product of demoProducts) {
    assert.ok(
      product.image &&
        product.model &&
        product.sku &&
        product.material &&
        product.care &&
        product.leadTime,
      `${product.name} needs complete catalog metadata`,
    );
  }
  assert.doesNotThrow(() => demoProducts.forEach(validateProduct));
  assert.throws(() => validateProduct({ ...demoProducts[0], width: 0 }));
  assert.throws(() => validateProduct({ ...demoProducts[0], price: -1 }));
  assert.throws(() =>
    validateProduct({
      ...demoProducts[0],
      variants: [demoProducts[0].variants[0], demoProducts[0].variants[0]],
    }),
  );
});
test("CSV export escapes fields and neutralizes spreadsheet formulas", () => {
  assert.equal(
    csv([["=cmd()", 'a"b', "a,b", "line\nbreak"]]),
    '\uFEFF"\'=cmd()","a""b","a,b","line\nbreak"',
  );
});
test("analytics summarizes anonymous funnel events without exposing session data", () => {
  const result = summarizeAnalytics(
    [
      {
        product: demoProducts[0].id,
        type: "product_view",
        source: "qr",
        created: new Date().toISOString(),
      },
      {
        product: demoProducts[0].id,
        type: "model_load",
        source: "qr",
        created: new Date().toISOString(),
      },
      {
        product: demoProducts[0].id,
        type: "ar_start",
        source: "qr",
        created: new Date().toISOString(),
      },
      {
        product: demoProducts[1].id,
        type: "product_view",
        source: "catalog",
        created: new Date().toISOString(),
      },
    ],
    [
      {
        product: demoProducts[0].id,
        productName: demoProducts[0].name,
        created: new Date().toISOString(),
      },
    ],
    demoProducts,
  );
  assert.deepEqual(result.totals, {
    views: 2,
    qr: 0,
    models: 1,
    ar: 1,
    leadStarts: 0,
    leads: 1,
  });
  assert.deepEqual(result.sourceTotals, { qr: 1, catalog: 1 });
  assert.equal(result.products[0].name, demoProducts[0].name);
  assert.equal(result.funnel.leadRate, 0.5);
  assert.equal("session" in result, false);
});
test("sample GLBs are compact, Draco-compressed, floor aligned, and dimensionally accurate", async () => {
  const io = new NodeIO()
    .registerExtensions([KHRDracoMeshCompression, KHRMaterialsVariants])
    .registerDependencies({
      "draco3d.decoder": await draco3d.createDecoderModule(),
    });
  for (const p of demoProducts) {
    const path = new URL(`../public${p.model}`, import.meta.url).pathname;
    assert.ok(
      (await stat(path)).size < 150000,
      `${p.name} must stay under 150 kB`,
    );
    const doc = await io.read(path);
    const extensions = doc
      .getRoot()
      .listExtensionsUsed()
      .map((e) => e.extensionName);
    assert.ok(extensions.includes("KHR_draco_mesh_compression"));
    assert.ok(extensions.includes("KHR_materials_variants"));
    const bounds = getBounds(doc.getRoot().listScenes()[0]);
    assert.ok(Math.abs(bounds.min[1]) < 0.003, `${p.name} rests on floor`);
    for (const [axis, dimension] of [
      [0, "width"],
      [1, "height"],
      [2, "depth"],
    ])
      assert.ok(
        Math.abs(bounds.max[axis] - bounds.min[axis] - p[dimension] / 100) <
          0.003,
        `${p.name}: ${dimension}`,
      );
  }
});
