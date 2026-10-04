import test from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import PocketBase from "pocketbase";
import { createServer } from "node:http";

test(
  "PocketBase: authentication, tenant isolation, lead idempotency, uploads, and durable outbox",
  { skip: !process.env.PB_BINARY, timeout: 85000 },
  async () => {
    const dir = await mkdtemp(join(tmpdir(), "roomly-integration-"));
    const binary = process.env.PB_BINARY;
    const flags = [
      `--dir=${dir}`,
      `--migrationsDir=${resolve("backend/pb_migrations")}`,
      `--hooksDir=${resolve("backend/pb_hooks")}`,
      "--dev=false",
      "--automigrate=false",
    ];
    const password = crypto.randomUUID();
    const adminEmail = "operator@example.test";
    const init = spawnSync(
      binary,
      ["superuser", "create", adminEmail, password, ...flags],
      { encoding: "utf8" },
    );
    assert.equal(init.status, 0, init.stderr);
    const url = "http://127.0.0.1:18090";
    const notifications = [];
    const receiver = createServer(async (req, res) => {
      let body = "";
      for await (const chunk of req) body += chunk;
      notifications.push({ headers: req.headers, body: JSON.parse(body) });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end('{"received":true}');
    });
    await new Promise((r) => receiver.listen(18091, "127.0.0.1", r));
    const server = spawn(
      binary,
      ["serve", "--http=127.0.0.1:18090", ...flags],
      {
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          N8N_WEBHOOK_URL: "http://127.0.0.1:18091",
          N8N_WEBHOOK_SECRET: password,
        },
      },
    );
    let logs = "";
    server.stdout.on("data", (d) => (logs += d));
    server.stderr.on("data", (d) => (logs += d));
    try {
      let online = false;
      for (let i = 0; i < 80; i++) {
        try {
          if ((await fetch(url + "/api/health")).ok) {
            online = true;
            break;
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 100));
      }
      assert.ok(online, logs);
      const admin = new PocketBase(url),
        visitor = new PocketBase(url),
        merchant = new PocketBase(url),
        other = new PocketBase(url);
      for (const client of [admin, visitor, merchant, other])
        client.autoCancellation(false);
      await admin
        .collection("_superusers")
        .authWithPassword(adminEmail, password);
      const s1 = await admin
        .collection("stores")
        .create({ name: "Store One", slug: "one" });
      const s2 = await admin
        .collection("stores")
        .create({ name: "Store Two", slug: "two" });
      for (const [email, store] of [
        ["one@example.test", s1.id],
        ["two@example.test", s2.id],
      ])
        await admin.collection("merchants").create({
          name: "Owner",
          email,
          password,
          passwordConfirm: password,
          store,
        });
      await merchant
        .collection("merchants")
        .authWithPassword("one@example.test", password);
      await other
        .collection("merchants")
        .authWithPassword("two@example.test", password);
      const body = new FormData();
      const product = {
        store: s1.id,
        name: "Pilot sofa",
        price: 450,
        currency: "USD",
        category: "Sofa",
        width: 215,
        depth: 97,
        height: 80,
        availability: "In stock",
        published: false,
      };
      for (const [k, v] of Object.entries(product)) body.set(k, v);
      body.set(
        "variants",
        JSON.stringify([
          {
            name: "Moss",
            color: "#78816e",
            material: "Upholstery",
            variantName: "Moss",
          },
        ]),
      );
      body.set(
        "photo",
        new Blob(
          [
            Buffer.from(
              "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZfoAAAAASUVORK5CYII=",
              "base64",
            ),
          ],
          { type: "image/png" },
        ),
        "photo.png",
      );
      body.set(
        "glb",
        new Blob([await readFile("public/models/cloud-sofa.glb")], {
          type: "model/gltf-binary",
        }),
        "sofa.glb",
      );
      let p;
      try {
        p = await merchant.collection("products").create(body);
      } catch (e) {
        throw new Error(JSON.stringify(e.response) + "\n" + logs);
      }
      assert.ok(p.glb);
      assert.equal(
        (await visitor.collection("products").getList(1, 50)).items.length,
        0,
      );
      await assert.rejects(
        visitor.collection("products").getOne(p.id),
        (e) => e.status === 404,
      );
      await assert.rejects(
        other.collection("products").getOne(p.id),
        (e) => e.status === 404,
      );
      await assert.rejects(
        other.collection("products").update(p.id, { name: "Hijacked" }),
        (e) => e.status === 404,
      );
      await assert.rejects(
        merchant.collection("products").update(p.id, { store: s2.id }),
        (e) => e.status === 404,
      );
      await assert.rejects(
        merchant
          .collection("merchants")
          .update(merchant.authStore.record.id, { store: s2.id }),
        (e) => e.status === 403,
      );
      await assert.rejects(
        visitor.collection("products").create(product),
        (e) => e.status === 400 || e.status === 403,
      );
      const request = {
        name: "Test Buyer",
        contact: "buyer@example.test",
        product: p.id,
        variant: "Moss",
        type: "reservation",
        source: "qr",
        requestKey: crypto.randomUUID(),
        store: s2.id,
        status: "Won",
        price: 1,
      };
      await assert.rejects(
        visitor.send("/api/roomly/leads", { method: "POST", body: request }),
        (e) => e.status === 404,
      );
      await merchant.collection("products").update(p.id, { published: true });
      assert.equal(
        (await visitor.collection("products").getList(1, 50)).items.length,
        1,
      );
      const event = {
        product: p.id,
        type: "product_view",
        source: "qr",
        session: "session-abcdefghij",
        eventKey: `session-abcdefghij:product_view:${p.id}:2026-10-04`,
      };
      await assert.rejects(
        visitor.send("/api/roomly/events", {
          method: "POST",
          body: { ...event, type: "not-an-event" },
        }),
        (e) => e.status === 400,
      );
      const firstEvent = await visitor.send("/api/roomly/events", {
        method: "POST",
        body: event,
      });
      const duplicateEvent = await visitor.send("/api/roomly/events", {
        method: "POST",
        body: event,
      });
      assert.equal(firstEvent.accepted, true);
      assert.equal(duplicateEvent.duplicate, true);
      assert.equal(
        (await visitor.collection("events").getFullList()).length,
        0,
      );
      const merchantAnalytics = await merchant.send("/api/roomly/analytics", {
        query: { days: 30 },
      });
      assert.equal(merchantAnalytics.totals.views, 1);
      assert.equal(merchantAnalytics.sourceTotals.qr, 1);
      assert.equal(merchantAnalytics.products[0].id, p.id);
      await assert.rejects(
        visitor.send("/api/roomly/analytics", { query: { days: 30 } }),
        (e) => e.status === 401,
      );
      const otherAnalytics = await other.send("/api/roomly/analytics", {
        query: { days: 30 },
      });
      assert.equal(otherAnalytics.totals.views, 0);
      await assert.rejects(
        visitor.send("/api/roomly/leads", {
          method: "POST",
          body: { ...request, contact: "invalid" },
        }),
        (e) => e.status === 400,
      );
      await assert.rejects(
        visitor.send("/api/roomly/leads", {
          method: "POST",
          body: { ...request, variant: "Not real" },
        }),
        (e) => e.status === 400,
      );
      let response;
      try {
        response = await Promise.all(
          [0, 1].map(() =>
            visitor.send("/api/roomly/leads", {
              method: "POST",
              body: request,
            }),
          ),
        );
      } catch (e) {
        throw new Error(JSON.stringify(e.response) + "\n" + logs);
      }
      assert.equal(response[0].id, response[1].id);
      const leads = await merchant.collection("leads").getFullList();
      assert.equal(leads.length, 1);
      assert.equal(leads[0].store, s1.id);
      assert.equal(leads[0].price, 450);
      assert.equal(leads[0].status, "New");
      assert.equal((await visitor.collection("leads").getFullList()).length, 0);
      assert.equal((await other.collection("leads").getFullList()).length, 0);
      await assert.rejects(
        other.collection("leads").update(leads[0].id, { status: "Won" }),
        (e) => e.status === 404,
      );
      await assert.rejects(
        merchant.collection("leads").update(leads[0].id, { store: s2.id }),
        (e) => e.status === 400,
      );
      await merchant
        .collection("leads")
        .update(leads[0].id, { status: "Contacted" });
      assert.equal(
        (await merchant.collection("leads").getOne(leads[0].id)).status,
        "Contacted",
      );
      const outbox = await admin
        .collection("notification_outbox")
        .getFullList();
      assert.equal(outbox.length, 1);
      assert.equal(outbox[0].lead, leads[0].id);
      // The scheduled worker may already have delivered at a minute boundary.
      assert.equal(typeof outbox[0].delivered, "boolean");
      await assert.rejects(
        merchant.collection("notification_outbox").getFullList(),
        (e) => e.status === 403,
      );
      for (let i = 0; i < 65 && !notifications.length; i++)
        await new Promise((r) => setTimeout(r, 1000));
      assert.equal(
        notifications.length,
        1,
        "Queued event must reach the webhook within one minute. " + logs,
      );
      assert.equal(notifications[0].headers["x-roomly-secret"], password);
      assert.equal(notifications[0].headers["idempotency-key"], outbox[0].id);
      assert.equal(notifications[0].body.storeId, s1.id);
      assert.equal(notifications[0].body.lead.product, "Pilot sofa");
      for (let i = 0; i < 10; i++) {
        if (
          (await admin.collection("notification_outbox").getOne(outbox[0].id))
            .delivered
        )
          break;
        await new Promise((r) => setTimeout(r, 100));
      }
      assert.equal(
        (await admin.collection("notification_outbox").getOne(outbox[0].id))
          .delivered,
        true,
      );
      await merchant.collection("products").delete(p.id);
      assert.equal(
        (await merchant.collection("leads").getOne(leads[0].id)).productName,
        "Pilot sofa",
      );
    } finally {
      server.kill("SIGTERM");
      await new Promise((r) => server.once("exit", r));
      await new Promise((r) => receiver.close(r));
      await rm(dir, { recursive: true, force: true });
    }
  },
);
