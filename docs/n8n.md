# Lead notifications: PocketBase → n8n → Telegram

PocketBase saves a lead and its notification event in a single SQLite transaction.
The server-side worker checks `notification_outbox` every minute. The buyer sees a
successful save even if n8n is temporarily unavailable.

## Configure a pilot store

1. Create a Telegram bot using BotFather, add it to the store's sales group, and
   obtain that group's chat ID. Store the bot token in an n8n Telegram credential.
2. Create an n8n **Webhook** trigger: POST, path `roomly-lead`, Header Auth.
   Configure an HTTP Header Auth credential with header `X-Roomly-Secret`; its
   value must match `N8N_WEBHOOK_SECRET` on the PocketBase server.
3. Set the webhook response mode to **Using Respond to Webhook Node**. Do not
   immediately acknowledge requests before Telegram succeeds.
4. Add a **Switch** node on `{{ $json.body.storeId }}`. Match the pilot store's
   actual PocketBase ID and route it to its sales group's Telegram node. Unknown
   store IDs must return HTTP 422, never fall through to another store's chat.
5. Add a **Telegram / Send Message** node. Use plain text, with parse mode off:

   ```text
   New Roomly request
   {{ $('Webhook').item.json.body.storeName }}
   {{ $('Webhook').item.json.body.lead.name }}
   {{ $('Webhook').item.json.body.lead.contact }}
   {{ $('Webhook').item.json.body.lead.product }} — {{ $('Webhook').item.json.body.lead.variant }}
   {{ $('Webhook').item.json.body.lead.currency }} {{ $('Webhook').item.json.body.lead.price }}
   {{ $('Webhook').item.json.body.lead.type }} via {{ $('Webhook').item.json.body.lead.source }}
   {{ $('Webhook').item.json.body.lead.message }}
   Open your merchant inbox: https://YOUR_DOMAIN/dashboard
   Event: {{ $('Webhook').item.json.body.eventId }}
   ```

6. After successful delivery, use **Respond to Webhook** with status 200 and JSON
   `{ "received": true }`. Route errors to a 503 response. Keep the workflow quick:
   PocketBase uses a five-second HTTP timeout.
7. Activate the workflow. Copy its **production webhook URL** to
   `N8N_WEBHOOK_URL`, set the shared secret, and restart PocketBase. Credentials
   and Telegram group routing stay in n8n, not in public store records.

## Delivery semantics and duplicates

The worker includes both `eventId` and the `Idempotency-Key` header. It makes at
most eight failed attempts, with exponential backoff. Delivery is **at least
once**, not exactly once: if Telegram succeeds but the HTTP response is lost,
PocketBase retries the same event.

For deduplication, maintain a persistent n8n Data Table keyed by `eventId`. Process
the webhook workflow with concurrency one: return 200 for an already-delivered
ID, otherwise send the message and record the ID before responding. This reduces
duplicates but cannot make Telegram and the table update atomic. Include the
event ID in messages so staff can identify a duplicate after a crash.

In the PocketBase superuser dashboard, inspect failed `notification_outbox`
records by `delivered = false`. Fix the integration, reset `attempts` to 0 and
`nextAttempt` to the current time to retry. Retain failed events for diagnosis.
No notification is sent while either server environment variable is missing.

## Test on your own deployment

Submit an inquiry using a published product. Confirm one lead is created, one
outbox event is queued, and the notification arrives in the correct store's group
within about a minute. Stop the n8n workflow temporarily and verify that the lead
remains available and the outbox records the failed attempt. Re-enable it and
check that the retry completes.
