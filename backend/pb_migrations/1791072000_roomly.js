migrate(
  (app) => {
    const dates = () => [
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ];
    const stores = new Collection({
      name: "stores",
      type: "base",
      listRule: "",
      viewRule: "",
      fields: [
        { name: "name", type: "text", required: true, max: 120 },
        {
          name: "slug",
          type: "text",
          required: true,
          pattern: "^[a-z0-9-]+$",
          max: 80,
        },
        { name: "location", type: "text", max: 200 },
        { name: "description", type: "text", max: 1000 },
        ...dates(),
      ],
      indexes: ["CREATE UNIQUE INDEX idx_store_slug ON stores (slug)"],
    });
    app.save(stores);
    const merchants = new Collection({
      name: "merchants",
      type: "auth",
      listRule: "id = @request.auth.id",
      viewRule: "id = @request.auth.id",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      manageRule: null,
      passwordAuth: { enabled: true, identityFields: ["email"] },
      fields: [
        { name: "name", type: "text", required: true, max: 100 },
        {
          name: "store",
          type: "relation",
          collectionId: stores.id,
          required: true,
          maxSelect: 1,
        },
        ...dates(),
      ],
    });
    app.save(merchants);
    const owner =
      '@request.auth.id != "" && @request.auth.collectionName = "merchants" && store = @request.auth.store';
    const products = new Collection({
      name: "products",
      type: "base",
      listRule: `published = true || (${owner})`,
      viewRule: `published = true || (${owner})`,
      createRule: owner,
      updateRule: `${owner} && @request.body.store:changed = false`,
      deleteRule: owner,
      fields: [
        {
          name: "store",
          type: "relation",
          collectionId: stores.id,
          required: true,
          maxSelect: 1,
        },
        { name: "name", type: "text", required: true, max: 120 },
        { name: "description", type: "text", max: 3000 },
        {
          name: "category",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["Sofa", "Chair", "Table", "Storage", "Bed", "Other"],
        },
        { name: "price", type: "number", min: 0, max: 100000000 },
        {
          name: "currency",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["USD", "INR", "GBP", "EUR"],
        },
        ...["width", "depth", "height"].map((name) => ({
          name,
          type: "number",
          required: true,
          min: 0.1,
          max: 1000,
        })),
        {
          name: "availability",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["In stock", "Made to order", "Out of stock"],
        },
        { name: "delivery", type: "text", max: 1000 },
        { name: "published", type: "bool" },
        { name: "variants", type: "json", maxSize: 20000 },
        {
          name: "photo",
          type: "file",
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ["image/jpeg", "image/png", "image/webp"],
          thumbs: ["800x600"],
        },
        {
          name: "glb",
          type: "file",
          maxSelect: 1,
          maxSize: 15728640,
          mimeTypes: ["model/gltf-binary", "application/octet-stream"],
        },
        {
          name: "usdz",
          type: "file",
          maxSelect: 1,
          maxSize: 15728640,
          mimeTypes: [
            "model/vnd.usdz+zip",
            "application/zip",
            "application/octet-stream",
          ],
        },
        ...dates(),
      ],
      indexes: [
        "CREATE INDEX idx_products_store ON products (store, published)",
      ],
    });
    app.save(products);
    const leads = new Collection({
      name: "leads",
      type: "base",
      listRule: owner,
      viewRule: owner,
      createRule: null,
      updateRule: owner,
      deleteRule: null,
      fields: [
        {
          name: "store",
          type: "relation",
          collectionId: stores.id,
          required: true,
          maxSelect: 1,
        },
        // Snapshot fields preserve a lead even if the original product is deleted.
        { name: "product", type: "text", required: true, max: 15 },
        { name: "productName", type: "text", required: true, max: 120 },
        { name: "price", type: "number", min: 0 },
        { name: "currency", type: "text", required: true, max: 3 },
        { name: "name", type: "text", required: true, min: 2, max: 100 },
        { name: "contact", type: "text", required: true, max: 200 },
        { name: "message", type: "text", max: 2000 },
        { name: "variant", type: "text", max: 60 },
        {
          name: "type",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["reservation", "inquiry"],
        },
        {
          name: "source",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["qr", "catalog"],
        },
        {
          name: "status",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["New", "Contacted", "Reserved", "Won", "Lost"],
        },
        {
          name: "requestKey",
          type: "text",
          required: true,
          max: 64,
          hidden: true,
        },
        ...dates(),
      ],
      indexes: [
        "CREATE INDEX idx_leads_store ON leads (store, created)",
        "CREATE UNIQUE INDEX idx_leads_request ON leads (requestKey)",
      ],
    });
    app.save(leads);
    app.save(
      new Collection({
        name: "notification_outbox",
        type: "base",
        fields: [
          {
            name: "lead",
            type: "relation",
            collectionId: leads.id,
            required: true,
            maxSelect: 1,
            cascadeDelete: true,
          },
          { name: "attempts", type: "number", min: 0 },
          { name: "delivered", type: "bool" },
          { name: "nextAttempt", type: "date" },
          { name: "lastError", type: "text", max: 500 },
          ...dates(),
        ],
        indexes: [
          "CREATE UNIQUE INDEX idx_notification_lead ON notification_outbox (lead)",
        ],
      }),
    );
    const settings = app.settings();
    settings.meta.appName = "Roomly";
    settings.rateLimits.enabled = true;
    settings.rateLimits.rules = [
      { label: "/api/roomly/leads", maxRequests: 10, duration: 60 },
      { label: "*:auth", maxRequests: 10, duration: 60 },
    ];
    app.save(settings);
  },
  (app) => {
    for (const name of [
      "notification_outbox",
      "leads",
      "products",
      "merchants",
      "stores",
    ])
      app.delete(app.findCollectionByNameOrId(name));
  },
);
