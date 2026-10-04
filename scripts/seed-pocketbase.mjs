import PocketBase from "pocketbase";
import { readFile } from "node:fs/promises";
import { demoProducts, demoStore } from "../src/data.js";

const {
  PB_URL = "http://127.0.0.1:8090",
  PB_ADMIN_EMAIL,
  PB_ADMIN_PASSWORD,
  MERCHANT_EMAIL,
  MERCHANT_PASSWORD,
} = process.env;
if (
  !PB_ADMIN_EMAIL ||
  !PB_ADMIN_PASSWORD ||
  !MERCHANT_EMAIL ||
  !MERCHANT_PASSWORD
)
  throw new Error(
    "Set PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD, MERCHANT_EMAIL and MERCHANT_PASSWORD in your shell.",
  );
const pb = new PocketBase(PB_URL);
await pb
  .collection("_superusers")
  .authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
async function existing(collection, id) {
  try {
    return await pb.collection(collection).getOne(id);
  } catch (e) {
    if (e.status !== 404) throw e;
    return null;
  }
}
const store =
  (await existing("stores", demoStore.id)) ||
  (await pb.collection("stores").create(demoStore));
const users = await pb
  .collection("merchants")
  .getFullList({
    filter: pb.filter("email = {:email}", { email: MERCHANT_EMAIL }),
  });
if (!users.length)
  await pb
    .collection("merchants")
    .create({
      email: MERCHANT_EMAIL,
      password: MERCHANT_PASSWORD,
      passwordConfirm: MERCHANT_PASSWORD,
      name: "Store owner",
      store: store.id,
    });
for (const p of demoProducts) {
  if (await existing("products", p.id)) continue;
  const body = new FormData();
  for (const key of [
    "id",
    "name",
    "category",
    "description",
    "price",
    "currency",
    "width",
    "depth",
    "height",
    "availability",
    "delivery",
  ])
    body.set(key, p[key]);
  body.set("store", store.id);
  body.set("variants", JSON.stringify(p.variants));
  // The sample seed remains draft until the merchant adds a product photo.
  body.set("published", "false");
  body.set(
    "glb",
    new Blob(
      [await readFile(new URL(`../public${p.model}`, import.meta.url))],
      { type: "model/gltf-binary" },
    ),
    `${p.id}.glb`,
  );
  await pb.collection("products").create(body);
}
console.log(
  "Store and merchant provisioned. Three sample drafts are ready; upload photos and review them before publishing.",
);
