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
    room: "Living room",
    sku: "NLH-CLD-03",
    material: "Performance linen upholstery · kiln-dried oak frame",
    care: "Spot clean with a soft, damp cloth. Rotate cushions monthly.",
    leadTime: "4–6 weeks",
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
    room: "Living room",
    sku: "NLH-ARC-01",
    material: "Textured cotton blend · solid ash legs",
    care: "Vacuum upholstery gently. Blot spills; do not rub.",
    leadTime: "7–10 working days",
    availability: "In stock",
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
    room: "Living room",
    sku: "NLH-LNE-CT",
    material: "Solid white oak · low-sheen hardwax oil",
    care: "Wipe with a dry cloth. Use coasters for hot or wet items.",
    leadTime: "5–7 working days",
    availability: "In stock",
  },
  {
    id: "covelove0000001",
    name: "Cove Loveseat",
    category: "Sofa",
    price: 1890,
    width: 178,
    depth: 92,
    height: 79,
    description:
      "A softer, smaller companion for apartments and quiet corners. Cove keeps the deep comfort of a full sofa in a more considered footprint.",
    model: "/models/cove-loveseat.glb",
    image: "/images/loveseat.svg",
    variants: [
      {
        name: "Sand",
        color: "#cdbb9e",
        material: "Upholstery",
        variantName: "Sand",
      },
      {
        name: "Fern",
        color: "#68786b",
        material: "Upholstery",
        variantName: "Fern",
      },
      {
        name: "Clay",
        color: "#a96855",
        material: "Upholstery",
        variantName: "Clay",
      },
    ],
    room: "Living room",
    sku: "NLH-COV-02",
    material: "Washed linen blend · solid oak feet",
    care: "Vacuum weekly using the upholstery attachment. Professional clean as needed.",
    leadTime: "4–6 weeks",
  },
  {
    id: "foldtable000001",
    name: "Fold Dining Table",
    category: "Table",
    price: 1420,
    width: 160,
    depth: 90,
    height: 75,
    description:
      "A generous everyday table with a quietly sculpted edge. Sized for four comfortably and six when dinner runs late.",
    model: "/models/fold-dining-table.glb",
    image: "/images/dining-table.svg",
    variants: [
      {
        name: "Natural oak",
        color: "#b98b5d",
        material: "Wood",
        variantName: "Natural oak",
      },
      {
        name: "Smoked oak",
        color: "#715340",
        material: "Wood",
        variantName: "Smoked oak",
      },
      {
        name: "Black",
        color: "#292c29",
        material: "Wood",
        variantName: "Black",
      },
    ],
    room: "Dining room",
    sku: "NLH-FLD-06",
    material: "Solid oak · water-based matte finish",
    care: "Wipe spills promptly. Avoid abrasive cleaners and prolonged moisture.",
    leadTime: "3–5 weeks",
  },
  {
    id: "lineasideboard1",
    name: "Linea Sideboard",
    category: "Storage",
    price: 2190,
    width: 160,
    depth: 45,
    height: 78,
    description:
      "Low, architectural storage for dinnerware, records, or the things you want close but out of sight. Soft-close doors keep the front beautifully quiet.",
    model: "/models/linea-sideboard.glb",
    image: "/images/sideboard.svg",
    variants: [
      {
        name: "Walnut",
        color: "#694532",
        material: "Wood",
        variantName: "Walnut",
      },
      {
        name: "White oak",
        color: "#b68b60",
        material: "Wood",
        variantName: "White oak",
      },
      { name: "Ink", color: "#252b30", material: "Wood", variantName: "Ink" },
    ],
    room: "Dining room",
    sku: "NLH-LIN-SB",
    material: "Wood veneer · solid wood edge band · soft-close doors",
    care: "Dust with a soft cloth. Use a lightly damp cloth for marks.",
    leadTime: "5–7 weeks",
  },
  {
    id: "nookbed00000001",
    name: "Nook Platform Bed",
    category: "Bed",
    price: 2480,
    width: 168,
    depth: 212,
    height: 100,
    description:
      "A calm, low platform with a softly padded headboard. Nook turns the bedroom into a place to land at the end of the day.",
    model: "/models/nook-bed.glb",
    image: "/images/bed.svg",
    variants: defaultVariants,
    room: "Bedroom",
    sku: "NLH-NOK-QN",
    material: "Linen upholstery · solid ash platform",
    care: "Vacuum headboard gently. Wipe platform with a dry cloth.",
    leadTime: "6–8 weeks",
    delivery:
      "Demo estimate: 6–8 weeks. Assembly required. Fits a 152 × 203 cm queen mattress; mattress and bedding are not included.",
  },
  {
    id: "driftottoman001",
    name: "Drift Ottoman",
    category: "Other",
    price: 390,
    width: 76,
    depth: 58,
    height: 42,
    description:
      "A useful extra seat, a place to rest your feet, or a soft landing for a tray. Drift makes itself at home wherever you put it.",
    model: "/models/drift-ottoman.glb",
    image: "/images/ottoman.svg",
    variants: defaultVariants,
    room: "Living room",
    sku: "NLH-DRF-OT",
    material: "Textured cotton blend · beech feet",
    care: "Spot clean only. Rotate to keep the fill even.",
    leadTime: "5–7 working days",
    availability: "In stock",
  },
  {
    id: "reedconsole0001",
    name: "Reed Entry Console",
    category: "Storage",
    price: 980,
    width: 120,
    depth: 36,
    height: 78,
    description:
      "A slim console for the entryway, hallway, or the wall that needs one good line. Two drawers keep daily essentials within reach.",
    model: "/models/reed-console.glb",
    image: "/images/console.svg",
    variants: [
      { name: "Oak", color: "#b68b60", material: "Wood", variantName: "Oak" },
      {
        name: "Walnut",
        color: "#694532",
        material: "Wood",
        variantName: "Walnut",
      },
    ],
    room: "Entryway",
    sku: "NLH-RED-CN",
    material: "Wood veneer · brushed brass pulls",
    care: "Dust with a soft cloth. Avoid placing wet items directly on top.",
    leadTime: "7–10 working days",
    availability: "In stock",
  },
].map((p) => ({
  store: demoStore.id,
  currency: "USD",
  published: true,
  availability: "Made to order",
  sample: true,
  updated: "2026-10-04T00:00:00Z",
  delivery: `Demo estimate: ${p.leadTime}. The showroom will confirm availability, delivery charges, and access requirements before accepting a reservation.`,
  usdz: "",
  ...p,
}));

export const productMetadataLimits = {
  room: 80,
  sku: 40,
  material: 240,
  care: 500,
  leadTime: 80,
};

// Upgrade an existing browser catalog without replacing edits or resurrecting
// deleted sample products. Remember newly introduced sample IDs after merging.
export function mergeDemoCatalog(existing, seededIds) {
  const legacyIds = ["cloudsofa000001", "arcchair0000001", "linetable000001"];
  const known = new Set(seededIds || (existing ? legacyIds : []));
  const defaults = new Map(demoProducts.map((p) => [p.id, p]));
  const products = (existing || []).map((p) => {
    const seed = defaults.get(p.id);
    if (!seed || !p.sample) return p;
    const missing = Object.fromEntries(
      Object.keys(productMetadataLimits)
        .filter((key) => !Object.hasOwn(p, key))
        .map((key) => [key, seed[key]]),
    );
    return { ...p, ...missing };
  });
  const present = new Set(products.map((p) => p.id));
  for (const p of demoProducts) {
    if (!known.has(p.id) && !present.has(p.id)) products.push(p);
    known.add(p.id);
  }
  return { products, seededIds: [...known] };
}

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
  for (const [key, limit] of Object.entries(productMetadataLimits))
    if (p[key] != null && (typeof p[key] !== "string" || p[key].length > limit))
      throw new Error(`${key} must be text of at most ${limit} characters.`);
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
