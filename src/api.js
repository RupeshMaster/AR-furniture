import PocketBase from "pocketbase";
import {
  demoProducts,
  demoStore,
  validateLead,
  validateProduct,
  statuses,
  eventTypes,
  validateEvent,
  summarizeAnalytics,
  mergeDemoCatalog,
} from "./data";

export const isDemo = !import.meta.env.VITE_POCKETBASE_URL;
export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || "/");
pb.autoCancellation(false);
export const storeSlug = import.meta.env.VITE_STORE_SLUG || "northline-home";
const randomId = () =>
  globalThis.crypto?.randomUUID?.().replaceAll("-", "") ||
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
let dbPromise;
const urls = new Map();
const openDB = () =>
  (dbPromise ||= new Promise((resolve, reject) => {
    const request = indexedDB.open("roomly-demo-v1", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("data");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        new Error(
          "Browser storage is unavailable. Enable site storage to use the demo.",
        ),
      );
  }));
async function storage(key, value) {
  const db = await openDB();
  const write = value !== undefined;
  return new Promise((resolve, reject) => {
    const tx = db.transaction("data", write ? "readwrite" : "readonly");
    const req = write
      ? tx.objectStore("data").put(value, key)
      : tx.objectStore("data").get(key);
    tx.oncomplete = () => resolve(write ? value : req.result);
    tx.onerror = () =>
      reject(
        new Error("Could not save data. Check available browser storage."),
      );
    tx.onabort = tx.onerror;
  });
}
let initPromise;
function init() {
  return (initPromise ||= openDB()
    .then(
      (db) =>
        new Promise((resolve, reject) => {
          // One transaction also prevents two open tabs from applying the upgrade twice.
          const tx = db.transaction("data", "readwrite");
          const data = tx.objectStore("data");
          const products = data.get("products");
          const seeded = data.get("seededProductIds");
          const leads = data.get("leads");
          const events = data.get("events");
          events.onsuccess = () => {
            const next = mergeDemoCatalog(products.result, seeded.result);
            data.put(next.products, "products");
            data.put(next.seededIds, "seededProductIds");
            if (leads.result === undefined) data.put([], "leads");
            if (events.result === undefined) data.put([], "events");
          };
          tx.oncomplete = resolve;
          tx.onerror = () =>
            reject(
              new Error(
                "Could not update the demo catalog. Check available browser storage.",
              ),
            );
          tx.onabort = tx.onerror;
        }),
    )
    .catch((error) => {
      initPromise = undefined;
      throw error;
    }));
}

function anonymousSession() {
  try {
    const current = localStorage.getItem("roomly-anonymous-session");
    if (current && /^[a-zA-Z0-9_-]{16,64}$/.test(current)) return current;
    const next = randomId().slice(0, 32);
    localStorage.setItem("roomly-anonymous-session", next);
    return next;
  } catch {
    return randomId().slice(0, 32);
  }
}

function fileURL(record, value, field) {
  if (value instanceof Blob) {
    const key = `${record.id}/${field}`;
    const cached = urls.get(key);
    if (cached?.version === record.updated) return cached.url;
    if (cached) URL.revokeObjectURL(cached.url);
    const url = URL.createObjectURL(value);
    urls.set(key, { version: record.updated, url });
    return url;
  }
  if (!value) return "";
  return isDemo || value.startsWith("/")
    ? value
    : pb.files.getURL(
        record,
        value,
        field === "image" ? { thumb: "800x600" } : {},
      );
}
export function normalize(record) {
  return {
    ...record,
    image: fileURL(record, record.photo || record.image, "image"),
    model: fileURL(record, record.glb || record.model, "model"),
    usdz: fileURL(record, record.usdz, "usdz"),
    variants: record.variants || [],
  };
}
const scoped = (store) => pb.filter("store = {:store}", { store });
export const api = {
  async store() {
    if (isDemo) return demoStore;
    return pb
      .collection("stores")
      .getFirstListItem(pb.filter("slug = {:slug}", { slug: storeSlug }));
  },
  async products(store, merchant = false) {
    if (isDemo) {
      await init();
      return (await storage("products"))
        .filter((p) => p.store === store && (merchant || p.published))
        .map(normalize);
    }
    return (
      await pb.collection("products").getFullList({
        filter: scoped(store) + (merchant ? "" : " && published = true"),
        sort: "-updated",
      })
    ).map(normalize);
  },
  async product(id) {
    if (isDemo) {
      await init();
      const p = (await storage("products")).find(
        (p) => p.id === id && p.published,
      );
      if (!p)
        throw new Error("This product is unavailable or has been unpublished.");
      return normalize(p);
    }
    const p = await pb.collection("products").getOne(id);
    if (!p.published) throw new Error("This product is not published.");
    return normalize(p);
  },
  async productStore(id) {
    return isDemo ? demoStore : pb.collection("stores").getOne(id);
  },
  async saveProduct(p, files = {}) {
    validateProduct(p);
    if (isDemo) {
      await init();
      const all = await storage("products");
      const existing = all.find((x) => x.id === p.id);
      const saved = {
        ...existing,
        ...p,
        id:
          existing?.id || crypto.randomUUID().replaceAll("-", "").slice(0, 15),
        updated: new Date().toISOString(),
      };
      // Persist source blobs rather than short-lived object URLs.
      for (const [field, source] of [
        ["glb", "model"],
        ["photo", "image"],
        ["usdz", "usdz"],
      ]) {
        if (files[field]) saved[field] = files[field];
        else if (existing?.[field]) saved[field] = existing[field];
        if (
          typeof saved[source] === "string" &&
          saved[source].startsWith("blob:")
        )
          saved[source] = existing?.[source] || "";
      }
      await storage(
        "products",
        existing
          ? all.map((x) => (x.id === saved.id ? saved : x))
          : [...all, saved],
      );
      return normalize(saved);
    }
    const body = new FormData();
    const fields = [
      "store",
      "name",
      "description",
      "category",
      "price",
      "currency",
      "width",
      "depth",
      "height",
      "availability",
      "delivery",
      "room",
      "sku",
      "material",
      "care",
      "leadTime",
      "sample",
      "published",
      "variants",
    ];
    for (const key of fields)
      body.append(
        key,
        typeof p[key] === "object"
          ? JSON.stringify(p[key])
          : String(p[key] ?? ""),
      );
    for (const [key, file] of Object.entries(files))
      if (file) body.append(key, file);
    return normalize(
      await (p.id
        ? pb.collection("products").update(p.id, body)
        : pb.collection("products").create(body)),
    );
  },
  async deleteProduct(id) {
    if (isDemo)
      return storage(
        "products",
        (await storage("products")).filter((p) => p.id !== id),
      );
    await pb.collection("products").delete(id);
  },
  async lead(input) {
    const data = validateLead(input);
    if (!isDemo)
      return pb.send("/api/roomly/leads", { method: "POST", body: data });
    await init();
    const p = await api.product(data.product);
    if (data.variant && !p.variants.some((v) => v.name === data.variant))
      throw new Error(
        "That finish is no longer available. Reload the product.",
      );
    const leads = await storage("leads");
    const old = leads.find((l) => l.requestKey === data.requestKey);
    if (old) return { id: old.id };
    const record = {
      ...data,
      store: p.store,
      productName: p.name,
      price: p.price,
      currency: p.currency,
      id: crypto.randomUUID(),
      status: "New",
      created: new Date().toISOString(),
    };
    await storage("leads", [record, ...leads]);
    return { id: record.id };
  },
  async leads(store) {
    if (isDemo) {
      await init();
      return (await storage("leads")).filter((l) => l.store === store);
    }
    return pb
      .collection("leads")
      .getFullList({ filter: scoped(store), sort: "-created" });
  },
  async updateLead(id, status) {
    if (!statuses.includes(status)) throw new Error("Invalid lead status.");
    if (isDemo)
      return storage(
        "leads",
        (await storage("leads")).map((l) =>
          l.id === id ? { ...l, status } : l,
        ),
      );
    return pb.collection("leads").update(id, { status });
  },
  async track(input) {
    const session = anonymousSession();
    const date = new Date().toISOString().slice(0, 10);
    const data = validateEvent({
      ...input,
      session,
      eventKey: `${session}:${input.type}:${input.product}:${date}`,
    });
    if (!isDemo) {
      return pb
        .send("/api/roomly/events", { method: "POST", body: data })
        .catch(() => null);
    }
    await init();
    const events = await storage("events");
    if (events.some((event) => event.eventKey === data.eventKey)) return null;
    await storage("events", [
      { ...data, id: randomId(), created: new Date().toISOString() },
      ...events,
    ]);
    return null;
  },
  async analytics(store, days = 30) {
    if (isDemo) {
      await init();
      return summarizeAnalytics(
        (await storage("events")).filter((event) => event.store === store),
        (await storage("leads")).filter((lead) => lead.store === store),
        (await storage("products")).filter(
          (product) => product.store === store,
        ),
        days,
      );
    }
    return pb.send("/api/roomly/analytics", { query: { days } });
  },
  async login(email, password) {
    return pb.collection("merchants").authWithPassword(email, password);
  },
  async session() {
    if (isDemo) return { store: demoStore.id, name: "Demo merchant" };
    if (!pb.authStore.isValid) return null;
    try {
      return (await pb.collection("merchants").authRefresh()).record;
    } catch (e) {
      if (e.status === 401 || e.status === 403) {
        pb.authStore.clear();
        return null;
      }
      throw e;
    }
  },
};

export function errorMessage(error) {
  const fields = Object.values(error?.response?.data || {})
    .map((v) => v.message)
    .filter(Boolean);
  return (
    fields.join(" ") ||
    error?.response?.message ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}
