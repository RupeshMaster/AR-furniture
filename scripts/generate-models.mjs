import { Document, NodeIO } from "@gltf-transform/core";
import {
  KHRDracoMeshCompression,
  KHRMaterialsVariants,
} from "@gltf-transform/extensions";
import { draco } from "@gltf-transform/functions";
import draco3d from "draco3dgltf";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { demoProducts } from "../src/data.js";

// Original illustrative assets. Every model uses meters, +Y up, +Z forward,
// and rests on y=0. They are intentionally small enough for a mobile pilot.
const io = new NodeIO()
  .registerExtensions([KHRDracoMeshCompression, KHRMaterialsVariants])
  .registerDependencies({
    "draco3d.encoder": await draco3d.createEncoderModule(),
    "draco3d.decoder": await draco3d.createDecoderModule(),
  });

const linear = (hex) =>
  hex.match(/\w\w/g).map((v) => {
    const x = parseInt(v, 16) / 255;
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });

const layouts = {
  "cloud-sofa": { kind: "sofa", seats: 3 },
  "arc-chair": { kind: "sofa", seats: 1 },
  "line-table": { kind: "table" },
  "cove-loveseat": { kind: "sofa", seats: 2 },
  "fold-dining-table": { kind: "table" },
  "linea-sideboard": { kind: "sideboard" },
  "nook-bed": { kind: "bed" },
  "drift-ottoman": { kind: "ottoman" },
  "reed-console": { kind: "sideboard", console: true },
};
// Dimensions and finishes are sourced from the catalog, not a second copy.
const specs = demoProducts.map((p) => {
  const name = p.model.split("/").pop().replace(".glb", "");
  if (!layouts[name]) throw new Error(`Missing geometry layout for ${name}`);
  return {
    name,
    ...layouts[name],
    width: p.width / 100,
    depth: p.depth / 100,
    height: p.height / 100,
    material: p.variants[0].material,
    colors: p.variants.map((v) => [v.variantName, v.color.slice(1)]),
  };
});

for (const spec of specs) {
  const doc = new Document();
  doc.getRoot().getAsset().copyright =
    "Roomly demo — original procedural asset, CC0";
  const buffer = doc.createBuffer();
  const scene = doc.createScene();
  const extension = doc.createExtension(KHRMaterialsVariants);
  const materials = spec.colors.map(([name, color], index) =>
    doc
      .createMaterial(index === 0 ? spec.material : name)
      .setBaseColorFactor([...linear(color), 1])
      .setRoughnessFactor(
        spec.kind === "table" || spec.kind === "sideboard" ? 0.62 : 0.88,
      )
      .setMetallicFactor(0),
  );
  const variants = spec.colors.map(([name]) => extension.createVariant(name));
  const fixed = doc
    .createMaterial("Feet")
    .setBaseColorFactor([...linear("745439"), 1])
    .setMetallicFactor(0)
    .setRoughnessFactor(0.7);
  const bedding = doc
    .createMaterial("Mattress")
    .setBaseColorFactor([...linear("eee6d7"), 1])
    .setMetallicFactor(0)
    .setRoughnessFactor(0.95);
  const brass = doc
    .createMaterial("Hardware")
    .setBaseColorFactor([...linear("c3a272"), 1])
    .setMetallicFactor(0.65)
    .setRoughnessFactor(0.35);

  function box(label, size, position, finish = true) {
    const geo = new RoundedBoxGeometry(
      ...size,
      2,
      Math.min(0.045, ...size.map((value) => Math.max(0.008, value / 5))),
    );
    const primitive = doc.createPrimitive();
    for (const [key, semantic, type] of [
      ["position", "POSITION", "VEC3"],
      ["normal", "NORMAL", "VEC3"],
      ["uv", "TEXCOORD_0", "VEC2"],
    ]) {
      primitive.setAttribute(
        semantic,
        doc
          .createAccessor()
          .setType(type)
          .setArray(geo.getAttribute(key).array)
          .setBuffer(buffer),
      );
    }
    primitive.setMaterial(
      finish === true
        ? materials[0]
        : finish === "bedding"
          ? bedding
          : finish === "brass"
            ? brass
            : fixed,
    );
    if (finish === true) {
      const mappings = extension.createMappingList();
      materials.forEach((material, index) =>
        mappings.addMapping(
          extension
            .createMapping()
            .setMaterial(material)
            .addVariant(variants[index]),
        ),
      );
      primitive.setExtension("KHR_materials_variants", mappings);
    }
    scene.addChild(
      doc
        .createNode(label)
        .setTranslation(position)
        .setMesh(doc.createMesh(label).addPrimitive(primitive)),
    );
    geo.dispose();
  }

  function buildSeating() {
    const { width, depth, height, seats } = spec;
    box("Base", [width - 0.06, 0.24, depth - 0.04], [0, 0.25, 0]);
    box(
      "Back",
      [width - 0.12, height - 0.25, 0.18],
      [0, height - 0.275, -depth / 2 + 0.09],
    );
    for (const side of [-1, 1])
      box(
        "Arm",
        [0.14, height - 0.39, depth],
        [side * (width / 2 - 0.07), (height - 0.02) / 2, 0],
      );
    const seatWidth = (width - 0.31) / seats;
    for (let index = 0; index < seats; index++) {
      const x = -width / 2 + 0.155 + seatWidth * (index + 0.5);
      box(
        "Seat cushion",
        [seatWidth - 0.012, 0.13, depth - 0.22],
        [x, 0.415, 0.09],
      );
      const backHeight = height - 0.47;
      box(
        "Back cushion",
        [seatWidth - 0.012, backHeight, 0.15],
        [x, height - backHeight / 2, -depth / 2 + 0.22],
      );
    }
    for (const x of [-1, 1])
      for (const z of [-1, 1])
        box(
          "Leg",
          [0.07, 0.15, 0.07],
          [x * (width / 2 - 0.12), 0.075, z * (depth / 2 - 0.12)],
          false,
        );
  }

  function buildTable() {
    const { width, depth, height } = spec;
    box("Tabletop", [width, 0.08, depth], [0, height - 0.04, 0]);
    const legHeight = height - 0.08;
    for (const x of [-1, 1])
      for (const z of [-1, 1])
        box(
          "Leg",
          [0.07, legHeight, 0.07],
          [x * (width / 2 - 0.12), legHeight / 2, z * (depth / 2 - 0.12)],
          false,
        );
  }

  function buildSideboard() {
    const { width, depth, height } = spec;
    const legs = spec.console ? 0.53 : 0.12;
    const body = height - legs - 0.04;
    box("Cabinet", [width, body, depth - 0.04], [0, legs + body / 2, 0]);
    box("Top", [width, 0.06, depth], [0, height - 0.03, 0]);
    for (const side of [-1, 1]) {
      box(
        spec.console ? "Drawer" : "Door",
        [width / 2 - 0.03, body - 0.04, 0.045],
        [(side * width) / 4, legs + body / 2, depth / 2 - 0.025],
      );
      box(
        "Pull",
        [0.07, 0.013, 0.014],
        [(side * width) / 4, legs + body / 2, depth / 2 - 0.007],
        "brass",
      );
    }
    for (const x of [-1, 1])
      for (const z of [-1, 1])
        box(
          "Leg",
          [0.055, legs, 0.055],
          [x * (width / 2 - 0.12), legs / 2, z * (depth / 2 - 0.1)],
          false,
        );
  }

  function buildBed() {
    const { width, depth, height } = spec;
    box("Bed frame", [width, 0.18, depth], [0, 0.21, 0]);
    box(
      "Mattress",
      [width - 0.16, 0.25, depth - 0.09],
      [0, 0.425, 0.04],
      "bedding",
    );
    box(
      "Headboard",
      [width, height - 0.28, 0.16],
      [0, 0.28 + (height - 0.28) / 2, -depth / 2 + 0.08],
    );
    for (const x of [-1, 1])
      for (const z of [-1, 1])
        box(
          "Foot",
          [0.07, 0.12, 0.07],
          [x * (width / 2 - 0.12), 0.06, z * (depth / 2 - 0.12)],
          false,
        );
  }

  function buildOttoman() {
    const { width, depth, height } = spec;
    box(
      "Cushion",
      [width, height - 0.12, depth],
      [0, 0.12 + (height - 0.12) / 2, 0],
    );
    for (const x of [-1, 1])
      for (const z of [-1, 1])
        box(
          "Foot",
          [0.06, 0.12, 0.06],
          [x * (width / 2 - 0.12), 0.06, z * (depth / 2 - 0.1)],
          false,
        );
  }

  if (spec.kind === "sofa") buildSeating();
  if (spec.kind === "table") buildTable();
  if (spec.kind === "sideboard") buildSideboard();
  if (spec.kind === "bed") buildBed();
  if (spec.kind === "ottoman") buildOttoman();

  await doc.transform(draco());
  await io.write(
    new URL(`../public/models/${spec.name}.glb`, import.meta.url).pathname,
    doc,
  );
  console.log(
    `Generated ${spec.name} — ${spec.width} × ${spec.depth} × ${spec.height} m`,
  );
}
