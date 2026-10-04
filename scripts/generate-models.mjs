import { Document, NodeIO } from "@gltf-transform/core";
import {
  KHRDracoMeshCompression,
  KHRMaterialsVariants,
} from "@gltf-transform/extensions";
import { draco } from "@gltf-transform/functions";
import draco3d from "draco3dgltf";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

// Original illustrative assets; meters, floor at y=0, front toward +z.
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

for (const [name, width, depth, table] of [
  ["cloud-sofa", 2.15, 0.97, false],
  ["arc-chair", 0.85, 0.85, false],
  ["line-table", 1.1, 0.6, true],
]) {
  const doc = new Document();
  doc.getRoot().getAsset().copyright =
    "Roomly demo — original procedural asset, CC0";
  const buffer = doc.createBuffer();
  const scene = doc.createScene();
  const ext = doc.createExtension(KHRMaterialsVariants);
  const colors = table
    ? [
        ["Oak", "b68b60"],
        ["Walnut", "694532"],
      ]
    : [
        ["Oat", "d8c9ae"],
        ["Moss", "78816e"],
        ["Ink", "252b30"],
      ];
  const materials = colors.map(([n, color]) =>
    doc
      .createMaterial(n === colors[0][0] ? (table ? "Wood" : "Upholstery") : n)
      .setBaseColorFactor([...linear(color), 1])
      .setRoughnessFactor(0.88)
      .setMetallicFactor(0),
  );
  const variants = colors.map(([n]) => ext.createVariant(n));
  const wood = doc
    .createMaterial("Feet")
    .setBaseColorFactor([...linear("745439"), 1])
    .setMetallicFactor(0)
    .setRoughnessFactor(0.7);
  function box(label, size, position, fabric = true) {
    const geo = new RoundedBoxGeometry(
      ...size,
      2,
      Math.min(0.045, ...size.map((n) => n / 5)),
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
    primitive.setMaterial(fabric ? materials[0] : wood);
    if (fabric) {
      const list = ext.createMappingList();
      materials.forEach((mat, i) =>
        list.addMapping(
          ext.createMapping().setMaterial(mat).addVariant(variants[i]),
        ),
      );
      primitive.setExtension("KHR_materials_variants", list);
    }
    scene.addChild(
      doc
        .createNode(label)
        .setTranslation(position)
        .setMesh(doc.createMesh(label).addPrimitive(primitive)),
    );
    geo.dispose();
  }
  const height = table ? 0.42 : 0.8;
  if (table) box("Top", [width, 0.08, depth], [0, height - 0.04, 0]);
  else {
    box("Base", [width - 0.06, 0.24, depth - 0.04], [0, 0.25, 0]);
    box("Back", [width - 0.12, 0.55, 0.18], [0, 0.525, -depth / 2 + 0.09]);
    for (const x of [-1, 1])
      box("Arm", [0.14, 0.41, depth], [x * (width / 2 - 0.07), 0.39, 0]);
    const seats = width > 1 ? 3 : 1;
    const seatWidth = (width - 0.31) / seats;
    for (let i = 0; i < seats; i++) {
      const x = -width / 2 + 0.155 + seatWidth * (i + 0.5);
      box(
        "Seat cushion",
        [seatWidth - 0.012, 0.13, depth - 0.22],
        [x, 0.415, 0.09],
      );
      box(
        "Back cushion",
        [seatWidth - 0.012, 0.33, 0.15],
        [x, 0.63, -depth / 2 + 0.22],
      );
    }
  }
  for (const x of [-1, 1])
    for (const z of [-1, 1]) {
      const legHeight = table ? 0.35 : 0.15;
      box(
        "Leg",
        [0.07, legHeight, 0.07],
        [x * (width / 2 - 0.12), legHeight / 2, z * (depth / 2 - 0.12)],
        table,
      );
    }
  await doc.transform(draco());
  await io.write(
    new URL(`../public/models/${name}.glb`, import.meta.url).pathname,
    doc,
  );
  console.log(
    `Generated ${name} — ${width} × ${depth} × ${height} m, Draco + material variants`,
  );
}
