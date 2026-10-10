migrate(
  (app) => {
    const products = app.findCollectionByNameOrId("products");
    const fields = [
      ["room", 80],
      ["sku", 40],
      ["material", 240],
      ["care", 500],
      ["leadTime", 80],
    ];
    for (const [name, max] of fields) {
      if (!products.fields.getByName(name))
        products.fields.add(new TextField({ name, max }));
    }
    if (!products.fields.getByName("sample"))
      products.fields.add(new BoolField({ name: "sample" }));
    app.save(products);
  },
  (app) => {
    const products = app.findCollectionByNameOrId("products");
    for (const name of [
      "room",
      "sku",
      "material",
      "care",
      "leadTime",
      "sample",
    ]) {
      const field = products.fields.getByName(name);
      if (field) products.fields.removeById(field.id);
    }
    app.save(products);
  },
);
