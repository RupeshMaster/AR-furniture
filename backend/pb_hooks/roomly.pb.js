routerAdd(
  "POST",
  "/api/roomly/leads",
  (e) => {
    const input = e.requestInfo().body;
    const text = (key) =>
      typeof input[key] === "string" ? input[key].trim() : "";
    const name = text("name"),
      contact = text("contact"),
      message = text("message");
    const key = text("requestKey"),
      variant = text("variant"),
      productId = text("product");
    if (
      name.length < 2 ||
      name.length > 100 ||
      message.length > 2000 ||
      contact.length > 200 ||
      !(
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) ||
        (/^\+?[\d\s().-]{7,30}$/.test(contact) &&
          (contact.match(/\d/g) || []).length >= 7)
      )
    )
      throw new BadRequestError(
        "Enter a valid name and email or phone number.",
      );
    if (!/^[a-zA-Z0-9-]{20,64}$/.test(key))
      throw new BadRequestError("A valid request identifier is required.");
    if (
      !["inquiry", "reservation"].includes(text("type")) ||
      !["qr", "catalog"].includes(text("source"))
    )
      throw new BadRequestError("Invalid request type or source.");
    let leadId;
    e.app.runInTransaction((app) => {
      // Key lookup and insert are in one transaction, so retries cannot duplicate leads.
      const previous = app.findRecordsByFilter(
        "leads",
        "requestKey = {:key}",
        "",
        1,
        0,
        { key },
      );
      if (previous.length) {
        if (
          previous[0].getString("product") !== productId ||
          previous[0].getString("contact") !== contact
        )
          throw new BadRequestError(
            "This request identifier is already in use.",
          );
        leadId = previous[0].id;
        return;
      }
      let product;
      try {
        product = app.findRecordById("products", productId);
      } catch {
        throw new NotFoundError("Product unavailable.");
      }
      if (!product.getBool("published"))
        throw new NotFoundError("Product unavailable.");
      const variants = JSON.parse(product.getString("variants") || "[]") || [];
      if (variant && !variants.some((v) => v.name === variant))
        throw new BadRequestError("That finish is no longer available.");
      const lead = new Record(app.findCollectionByNameOrId("leads"));
      const values = {
        name,
        contact,
        message,
        variant,
        requestKey: key,
        product: product.id,
        store: product.getString("store"),
        productName: product.getString("name"),
        price: product.getFloat("price"),
        currency: product.getString("currency"),
        type: text("type"),
        source: text("source"),
        status: "New",
      };
      for (const field of Object.keys(values)) lead.set(field, values[field]);
      app.save(lead);
      const notification = new Record(
        app.findCollectionByNameOrId("notification_outbox"),
      );
      notification.set("lead", lead.id);
      notification.set("nextAttempt", new Date().toISOString());
      app.save(notification);
      leadId = lead.id;
    });
    return e.json(201, { id: leadId });
  },
  $apis.bodyLimit(8192),
);

onRecordUpdateRequest((e) => {
  if (
    !e.hasSuperuserAuth() &&
    Object.keys(e.requestInfo().body).some((key) => key !== "status")
  )
    throw new BadRequestError("Only the lead status can be changed.");
  return e.next();
}, "leads");

onRecordValidate((e) => {
  const variants = JSON.parse(e.record.getString("variants") || "[]") || [];
  if (!Array.isArray(variants) || variants.length > 12)
    throw new BadRequestError("Use up to 12 finishes.");
  const names = {};
  for (const variant of variants) {
    if (
      typeof variant.name !== "string" ||
      !variant.name.trim() ||
      variant.name.length > 60 ||
      names[variant.name] ||
      !/^#[0-9a-f]{6}$/i.test(variant.color) ||
      typeof variant.material !== "string" ||
      typeof variant.variantName !== "string" ||
      variant.material.length > 100 ||
      variant.variantName.length > 100
    )
      throw new BadRequestError(
        "Invalid finish mapping. Use unique names, hex colors, and material or embedded-variant names.",
      );
    names[variant.name] = true;
  }
  if (e.record.getBool("published") && !e.record.getString("photo"))
    throw new BadRequestError("A published product needs a photo.");
  return e.next();
}, "products");

routerAdd(
  "POST",
  "/api/roomly/events",
  (e) => {
    const input = e.requestInfo().body;
    const text = (key) =>
      typeof input[key] === "string" ? input[key].trim() : "";
    const productId = text("product");
    const type = text("type");
    const source = text("source");
    const session = text("session");
    const eventKey = text("eventKey");
    const eventTypes = [
      "product_view",
      "qr_scan",
      "model_load",
      "ar_start",
      "lead_start",
    ];
    if (
      !/^[a-zA-Z0-9]{15}$/.test(productId) ||
      !eventTypes.includes(type) ||
      !["qr", "catalog"].includes(source) ||
      !/^[a-zA-Z0-9_-]{16,64}$/.test(session) ||
      !/^[a-zA-Z0-9_:-]{20,180}$/.test(eventKey)
    )
      throw new BadRequestError("Invalid analytics event.");
    if (type === "qr_scan" && source !== "qr")
      throw new BadRequestError("QR events must use the QR source.");
    let product;
    try {
      product = e.app.findRecordById("products", productId);
    } catch {
      throw new NotFoundError("Product unavailable.");
    }
    if (!product.getBool("published"))
      throw new NotFoundError("Product unavailable.");
    const previous = e.app.findRecordsByFilter(
      "events",
      "eventKey = {:eventKey}",
      "",
      1,
      0,
      { eventKey },
    );
    if (previous.length)
      return e.json(200, { accepted: true, duplicate: true });
    const event = new Record(e.app.findCollectionByNameOrId("events"));
    event.set("store", product.getString("store"));
    event.set("product", product.id);
    event.set("type", type);
    event.set("source", source);
    event.set("session", session);
    event.set("eventKey", eventKey);
    e.app.save(event);
    return e.json(201, { accepted: true });
  },
  $apis.bodyLimit(4096),
);

routerAdd(
  "GET",
  "/api/roomly/analytics",
  (e) => {
    const days = Math.min(
      90,
      Math.max(1, Number(e.request.url.query().get("days") || 30)),
    );
    const storeId = e.auth.getString("store");
    const cutoff = Date.now() - days * 86400000;
    const events = e.app.findRecordsByFilter(
      "events",
      "store = {:store}",
      "-created",
      10000,
      0,
      { store: storeId },
    );
    const leads = e.app.findRecordsByFilter(
      "leads",
      "store = {:store}",
      "-created",
      10000,
      0,
      { store: storeId },
    );
    const products = e.app.findRecordsByFilter(
      "products",
      "store = {:store}",
      "name",
      1000,
      0,
      { store: storeId },
    );
    const productNames = {};
    products.forEach((product) => {
      productNames[product.id] = {
        id: product.id,
        name: product.getString("name"),
        category: product.getString("category"),
      };
    });
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
    const byProduct = {};
    const daily = {};
    const ensureProduct = (id, fallback = "Unpublished product") => {
      if (!byProduct[id])
        byProduct[id] = {
          ...(productNames[id] || { id, name: fallback, category: "" }),
          ...counts(),
        };
      return byProduct[id];
    };
    const inRange = (record) => {
      const value = new Date(record.getString("created")).valueOf();
      return !Number.isNaN(value) && value >= cutoff;
    };
    const ensureDay = (value) => {
      const date = new Date(value).toISOString().slice(0, 10);
      if (!daily[date])
        daily[date] = { date, views: 0, models: 0, ar: 0, leads: 0 };
      return daily[date];
    };
    events.filter(inRange).forEach((event) => {
      const type = event.getString("type");
      const source = event.getString("source");
      const row = ensureProduct(event.getString("product"));
      const day = ensureDay(event.getString("created"));
      if (type === "product_view") {
        sourceTotals[source] = (sourceTotals[source] || 0) + 1;
        totals.views++;
        row.views++;
        day.views++;
      }
      if (type === "qr_scan") row.qr++;
      if (type === "model_load") {
        totals.models++;
        row.models++;
        day.models++;
      }
      if (type === "ar_start") {
        totals.ar++;
        row.ar++;
        day.ar++;
      }
      if (type === "lead_start") row.leadStarts++;
    });
    leads.filter(inRange).forEach((lead) => {
      const row = ensureProduct(
        lead.getString("product"),
        lead.getString("productName"),
      );
      totals.leads++;
      row.leads++;
      ensureDay(lead.getString("created")).leads++;
    });
    const productsResult = Object.values(byProduct)
      .filter((row) => row.views || row.models || row.ar || row.leads)
      .sort((a, b) => b.views + b.leads * 4 - (a.views + a.leads * 4));
    return e.json(200, {
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
      products: productsResult,
      daily: Object.values(daily).sort((a, b) => a.date.localeCompare(b.date)),
    });
  },
  $apis.requireAuth("merchants"),
);

// Durable outbox: notification failures never discard buyer requests.
// Dispatch occurs at most one minute after submission; retries use exponential backoff.
cronAdd("roomly-notifications", "* * * * *", () => {
  const url = $os.getenv("N8N_WEBHOOK_URL");
  const secret = $os.getenv("N8N_WEBHOOK_SECRET");
  if (!url || !secret) return;
  const pending = $app.findRecordsByFilter(
    "notification_outbox",
    "delivered = false && attempts < 8 && nextAttempt <= {:now}",
    "created",
    20,
    0,
    { now: new Date().toISOString().replace("T", " ") },
  );
  for (const event of pending) {
    try {
      const lead = $app.findRecordById("leads", event.getString("lead"));
      const store = $app.findRecordById("stores", lead.getString("store"));
      const payload = {
        eventId: event.id,
        event: "lead.created",
        storeId: store.id,
        storeName: store.getString("name"),
        lead: {
          id: lead.id,
          name: lead.getString("name"),
          contact: lead.getString("contact"),
          message: lead.getString("message"),
          product: lead.getString("productName"),
          variant: lead.getString("variant"),
          source: lead.getString("source"),
          type: lead.getString("type"),
          price: lead.getFloat("price"),
          currency: lead.getString("currency"),
          created: lead.getString("created"),
        },
      };
      const response = $http.send({
        url,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Roomly-Secret": secret,
          "Idempotency-Key": event.id,
        },
        body: JSON.stringify(payload),
        timeout: 5,
      });
      if (response.statusCode < 200 || response.statusCode >= 300)
        throw new Error("Webhook returned HTTP " + response.statusCode);
      event.set("delivered", true);
      event.set("lastError", "");
    } catch (err) {
      const attempt = event.getInt("attempts") + 1;
      event.set("attempts", attempt);
      event.set(
        "nextAttempt",
        new Date(Date.now() + Math.pow(2, attempt) * 60000).toISOString(),
      );
      event.set("lastError", String(err).slice(0, 500));
      $app
        .logger()
        .error(
          "Roomly notification failed",
          "eventId",
          event.id,
          "attempt",
          attempt,
        );
    }
    $app.save(event);
  }
});
