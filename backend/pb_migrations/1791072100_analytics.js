migrate(
  (app) => {
    const stores = app.findCollectionByNameOrId("stores");
    const owner =
      '@request.auth.id != "" && @request.auth.collectionName = "merchants" && store = @request.auth.store';
    const events = new Collection({
      name: "events",
      type: "base",
      listRule: owner,
      viewRule: owner,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: "store",
          type: "relation",
          collectionId: stores.id,
          required: true,
          maxSelect: 1,
        },
        { name: "product", type: "text", required: true, max: 15 },
        {
          name: "type",
          type: "select",
          required: true,
          maxSelect: 1,
          values: [
            "product_view",
            "qr_scan",
            "model_load",
            "ar_start",
            "lead_start",
          ],
        },
        {
          name: "source",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["qr", "catalog"],
        },
        {
          name: "session",
          type: "text",
          required: true,
          max: 64,
          hidden: true,
        },
        {
          name: "eventKey",
          type: "text",
          required: true,
          max: 180,
          hidden: true,
        },
        { name: "created", type: "autodate", onCreate: true },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_events_event_key ON events (eventKey)",
        "CREATE INDEX idx_events_store_created ON events (store, created)",
        "CREATE INDEX idx_events_product_type ON events (product, type)",
      ],
    });
    app.save(events);
    const settings = app.settings();
    settings.rateLimits.rules = [
      ...settings.rateLimits.rules,
      { label: "/api/roomly/events", maxRequests: 120, duration: 60 },
      { label: "/api/roomly/analytics", maxRequests: 30, duration: 60 },
    ];
    app.save(settings);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId("events"));
  },
);
