export const demoStore = {
  id: "northline0000001",
  slug: "northline-home",
  name: "Northline Home",
  location: "Brooklyn, New York",
  description: "Thoughtful pieces. A place to feel at home.",
};

export const defaultVariants = [
  { name: "Oat", color: "#d8c9ae", material: "Upholstery", variantName: "Oat" },
  {
    name: "Moss",
    color: "#78816e",
    material: "Upholstery",
    variantName: "Moss",
  },
  { name: "Ink", color: "#252b30", material: "Upholstery", variantName: "Ink" },
];

export const demoProducts = [
  {
    id: "cloudsofa000001",
    name: "The Cloud Sofa",
    category: "Sofa",
    price: 2480,
    width: 215,
    depth: 97,
    height: 80,
    description:
      "A relaxed three-seater for slow mornings and long conversations. Explore the form and finishes with our lightweight demonstration model.",
    model: "/models/cloud-sofa.glb",
    image: "/images/sofa.svg",
    variants: defaultVariants,
  },
  {
    id: "arcchair0000001",
    name: "Arc Lounge Chair",
    category: "Chair",
    price: 890,
    width: 85,
    depth: 85,
    height: 80,
    description:
      "A generous seat with a compact footprint. A quiet corner for a good book, brought to life in an illustrative 3D model.",
    model: "/models/arc-chair.glb",
    image: "/images/chair.svg",
    variants: defaultVariants,
  },
  {
    id: "linetable000001",
    name: "Line Coffee Table",
    category: "Table",
    price: 640,
    width: 110,
    depth: 60,
    height: 42,
    description:
      "Simple proportions and a warm finish. Check the footprint in your room with this lightweight sample model.",
    model: "/models/line-table.glb",
    image: "/images/table.svg",
    variants: [
      { name: "Oak", color: "#b68b60", material: "Wood", variantName: "Oak" },
      {
        name: "Walnut",
        color: "#694532",
        material: "Wood",
        variantName: "Walnut",
      },
    ],
  },
].map((p) => ({
  ...p,
  store: demoStore.id,
  currency: "USD",
  published: true,
  availability: "Made to order",
  sample: true,
  updated: "2026-10-04T00:00:00Z",
  delivery: "Ask the showroom for current delivery times.",
  usdz: "",
}));

export const money = (price, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(price);
export const statuses = ["New", "Contacted", "Reserved", "Won", "Lost"];
export const eventTypes = [
  "product_view",
  "qr_scan",
  "model_load",
  "ar_start",
  "lead_start",
];

export function validateEvent(input) {
  if (!/^[a-zA-Z0-9_-]{10,64}$/.test(input.product || ""))
    throw new Error("Invalid product reference.");
  if (!eventTypes.includes(input.type)) throw new Error("Invalid event type.");
  if (!["qr", "catalog"].includes(input.source))
    throw new Error("Invalid event source.");
  if (!/^[a-zA-Z0-9_-]{16,64}$/.test(input.session || ""))
    throw new Error("Invalid anonymous session.");
  if (!/^[a-zA-Z0-9_:-]{20,180}$/.test(input.eventKey || ""))
    throw new Error("Invalid event key.");
  return input;
}

function analyticsDay(value) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "unknown"
    : date.toISOString().slice(0, 10);
}

export function summarizeAnalytics(events, leads, products, days = 30) {
  const counts = () => ({
    views: 0,
    qr: 0,
    models: 0,
    ar: 0,
    leadStarts: 0,
    leads: 0,
  });
  const totals = counts();
  const sourceTotals = { qr: 0, catalog: 0 };
  const byProduct = new Map(
    products.map((p) => [
      p.id,
      { id: p.id, name: p.name, category: p.category, ...counts() },
    ]),
  );
  const cutoff = Date.now() - days * 86400000;
  const daily = new Map();
  for (const event of events) {
    if (new Date(event.created).valueOf() < cutoff) continue;
    const row = byProduct.get(event.product) || {
      id: event.product,
      name: "Unpublished product",
      category: "",
      ...counts(),
    };
    const date = analyticsDay(event.created);
    if (!daily.has(date))
      daily.set(date, { date, views: 0, models: 0, ar: 0, leads: 0 });
    const day = daily.get(date);
    if (event.type === "product_view") {
      if (event.source === "qr") sourceTotals.qr += 1;
      else sourceTotals.catalog += 1;
      totals.views += 1;
      row.views += 1;
      day.views += 1;
    }
    if (event.type === "qr_scan") row.qr += 1;
    if (event.type === "model_load") {
      totals.models += 1;
      row.models += 1;
      day.models += 1;
    }
    if (event.type === "ar_start") {
      totals.ar += 1;
      row.ar += 1;
      day.ar += 1;
    }
    if (event.type === "lead_start") row.leadStarts += 1;
  }
  for (const lead of leads) {
    if (new Date(lead.created).valueOf() < cutoff) continue;
    const row = byProduct.get(lead.product) || {
      id: lead.product,
      name: lead.productName || "Unpublished product",
      category: "",
      ...counts(),
    };
    totals.leads += 1;
    row.leads += 1;
    const date = analyticsDay(lead.created);
    if (!daily.has(date))
      daily.set(date, { date, views: 0, models: 0, ar: 0, leads: 0 });
    daily.get(date).leads += 1;
  }
  const productRows = [...byProduct.values()]
    .filter((row) => row.views || row.models || row.ar || row.leads)
    .sort((a, b) => b.views + b.leads * 4 - (a.views + a.leads * 4));
  return {
    days,
    totals,
    sourceTotals,
    funnel: {
      views: totals.views,
      models: totals.models,
      ar: totals.ar,
      leads: totals.leads,
      modelRate: totals.views ? totals.models / totals.views : 0,
      arRate: totals.views ? totals.ar / totals.views : 0,
      leadRate: totals.views ? totals.leads / totals.views : 0,
    },
    products: productRows,
    daily: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export function validateProduct(p) {
  if (!p.name?.trim() || p.name.length > 120)
    throw new Error("Enter a product name of 1–120 characters.");
  if (!Number.isFinite(p.price) || p.price < 0)
    throw new Error("Enter a valid non-negative price.");
  if (!["USD", "INR", "GBP", "EUR"].includes(p.currency))
    throw new Error("Choose a supported currency.");
  for (const key of ["width", "depth", "height"])
    if (!Number.isFinite(p[key]) || p[key] <= 0 || p[key] > 1000)
      throw new Error("Dimensions must be between 0 and 1,000 cm.");
  if (!Array.isArray(p.variants) || p.variants.length > 12)
    throw new Error("Use up to 12 finishes.");
  const names = new Set();
  for (const v of p.variants) {
    if (
      !v.name?.trim() ||
      names.has(v.name) ||
      !/^#[0-9a-f]{6}$/i.test(v.color)
    )
      throw new Error(
        "Each finish needs a unique name and a six-digit hex color.",
      );
    names.add(v.name);
  }
  return p;
}

export function validateLead(input) {
  const name = input.name?.trim() || "";
  const contact = input.contact?.trim() || "";
  if (name.length < 2 || name.length > 100)
    throw new Error("Enter your full name (2–100 characters).");
  if (
    contact.length > 200 ||
    !(
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) ||
      (/^\+?[\d\s().-]{7,30}$/.test(contact) &&
        (contact.match(/\d/g) || []).length >= 7)
    )
  )
    throw new Error("Enter a valid email address or phone number.");
  if ((input.message || "").length > 2000)
    throw new Error("Keep your message under 2,000 characters.");
  return { ...input, name, contact, message: input.message?.trim() || "" };
}

export function csv(rows) {
  const safe = (value) => {
    let text = String(value ?? "");
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return "\uFEFF" + rows.map((row) => row.map(safe).join(",")).join("\r\n");
}
