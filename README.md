# Roomly — furniture WebAR MVP

A mobile-first React application for a retailer's digital showroom, 3D product
configuration, QR price tags, and buyer inquiries. React + Vite, Google
`<model-viewer>`, PocketBase, and a durable notification hook for n8n.

## Run the interactive demo

Requires Node.js 22.12+ (Node 24 recommended).

```bash
npm ci
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`).

- `/` — searchable catalog with category filters
- `/p/cloudsofa000001` — sample sofa, 3D finishes, room-view launcher, inquiry form
- `/dashboard` — merchant catalog, asset uploads, QR downloads, and lead inbox

With `VITE_POCKETBASE_URL` unset, the app runs a clearly labeled **browser-only
demo**. Products, uploaded files, and leads persist in IndexedDB across reloads.
Submit a sample buyer request, then open Leads in the merchant workspace to see
it. There is no merchant authentication or external notification in demo mode.
Different browsers do not share demo records; QR links for newly added demo
products only work in the browser holding those records. Use live mode for
showroom tags. Clear site storage to reset the demo.

## What is implemented

- Published catalog, search/filter, stable product-ID links, unknown-product state
- Photo-first rendering; 3D library and models load only after user interaction
- Original scale-correct sample sofa, chair, and table GLBs with Draco compression
  and `KHR_materials_variants`; no model reload when changing a finish
- Embedded material variants or runtime hex-color mapping to named materials
- Floor-placement AR with fixed model scale, supported-device fallback messaging
- Inquiry/reservation capture with selected finish and `qr`/`catalog` attribution
- Merchant product creation, editing, deletion, publishing, dimensions and pricing
- Product photo, GLB, and optional USDZ uploads; model/material inspection preview
- Real QR generation, PNG downloads, and selected-finish sharing
- Lead detail, five pipeline statuses, persistent updates, filtered CSV export
- Privacy-friendly funnel analytics for product views, QR scans, 3D opens, AR
  attempts, and inquiries, broken down by product and discovery source
- Live-mode merchant authentication and store-scoped PocketBase access rules
- Validated, idempotent public lead endpoint with atomic notification outbox
- Responsive layouts, keyboard-dismissable/focus-trapped dialogs, error/empty states
- Tests, Nginx/systemd templates, and opt-in GitHub Actions deployment

The visuals and prices in the demo are fictional. The sample GLBs are simple
procedural representations, not photorealistic retailer assets. Asset generation
source is in `scripts/generate-models.mjs` and may be rerun with
`npm run assets:generate`. These original models and illustrations are CC0.

## Live PocketBase setup

Tested with **PocketBase 0.40.4**. Download the executable for your OS from
<https://github.com/pocketbase/pocketbase/releases/tag/v0.40.4> and place it at
`backend/pocketbase` (`pocketbase.exe` on Windows). The binary is gitignored.

From the project root on Linux/macOS/WSL:

```bash
chmod +x backend/pocketbase
./backend/pocketbase serve --http=127.0.0.1:8090 --dir=backend/pb_data --migrationsDir=backend/pb_migrations --hooksDir=backend/pb_hooks --automigrate=false
```

The migrations create `stores`, `merchants`, `products`, `leads`, `events`, and
`notification_outbox`. Follow the initial superuser setup link printed by
PocketBase. Its admin dashboard is `http://127.0.0.1:8090/_/`.

Create a store in that dashboard with slug `northline-home`. Create a **merchants**
auth record with a name, email, password, and that store relation. Merchant
self-registration and store reassignment are disabled. Use that account at
`/dashboard` to add real products.

Alternatively, seed the sample store, merchant, and model drafts:

```bash
export PB_URL=http://127.0.0.1:8090
export PB_ADMIN_EMAIL='your-superuser-email'
export PB_ADMIN_PASSWORD='your-superuser-password'
export MERCHANT_EMAIL='your-merchant-email'
export MERCHANT_PASSWORD='your-merchant-password'
npm run seed
```

The seed is idempotent and does not overwrite existing records. Sample products
start unpublished; add a real photo before publishing. Do not use the sample
model for a different real product.

Create `.env.local` using `.env.example` as a reference:

```dotenv
VITE_POCKETBASE_URL=http://127.0.0.1:8090
VITE_STORE_SLUG=northline-home
```

Restart Vite. The demo banner disappears, `/dashboard` requires merchant login,
and all product and lead operations use PocketBase. A backend failure produces
an error; it never silently switches to demo data. `VITE_*` values are public
build-time configuration—never put credentials in them.

Each frontend deployment selects its catalog store with `VITE_STORE_SLUG`.
Product-ID links resolve the owning store. The database supports isolated
merchant stores; multi-store self-service onboarding is outside this first MVP.

## Model and AR behavior

Models should use meters, +Y up, +Z forward, and the floor at y=0. The demo bounds
are tested against the displayed dimensions. Uploaded asset dimensions are a
retailer's responsibility; changing catalog dimensions does not resize the GLB.
Aim for GLBs under 5 MB; upload limit is 15 MB, photos 5 MB. The application does
not automatically optimize uploaded models. The preview reveals exact material
and embedded variant names to use in the finish editor.

- **WebXR** uses the current rendered finish and offers an “Exit AR & contact the
  store” overlay when DOM overlays are supported.
- **Android Scene Viewer** opens an external app and may use the GLB's default
  finish. Browser-only material changes are not exported to Scene Viewer.
- **iOS Quick Look** can generate USDZ from the current scene when no explicit
  USDZ is supplied. A supplied USDZ is static and must be prepared consistently.
- Native viewers cannot display the React lead form. Buyers return to the product
  page; the chosen finish is preserved in the URL.
- AR requires a supported phone, camera permissions, and HTTPS (localhost is a
  development exception). Desktop tests verify 3D and fallback behavior, not
  physical tracking. Test actual iOS/Android devices before a retailer pilot.

The first MVP supports hex mapping and materials/textures already embedded in
GLB variants. An independent texture-image uploader, automated model processing,
payments, stock holds, and billing are not implemented. Analytics intentionally
stores anonymous action counts only: a random browser session key is used solely
to deduplicate the same action once per product per day. No IP address, room
photo, contact detail, cookie advertising ID, or cross-store profile is collected.
Merchant analytics can be opened from **Dashboard → Analytics** and shows a
30-day funnel by default. QR traffic is attributed when the product URL contains
`source=qr`.

## Notifications

Configure `N8N_WEBHOOK_URL` and `N8N_WEBHOOK_SECRET` in the **PocketBase server's**
environment. The outbox dispatches every minute, with up to eight failed attempts
and exponential backoff. See [docs/n8n.md](docs/n8n.md) for the store-specific
Telegram workflow, authentication, and duplicate handling. Actual Telegram
delivery needs your n8n instance and bot credentials.

## Verify

```bash
npm test
PB_BINARY="$(pwd)/backend/pocketbase" npm run test:backend
npx playwright install --with-deps chromium
npm run test:e2e
npm run build
```

The backend integration test starts an isolated temporary database, uses generated
test credentials, and verifies cross-store denial, draft visibility, uploads,
lead ownership, duplicate prevention, and outbox creation. It is skipped if
`PB_BINARY` is absent. Browser tests exercise persistent buyer-to-merchant leads,
product editing, uploads, QR decoding, publishing, actual 3D variants, and mobile
overflow/navigation. Tests should run in demo mode with no live `VITE_POCKETBASE_URL`.

## Deploy on a VPS

The React build is static; it does not require a Node runtime on the VPS. Build
with the final HTTPS PocketBase URL, e.g. `https://roomly.example.com` when Nginx
proxies `/api/` on the same domain. Use `npm run build`; output is `dist/`.

The supplied templates use this layout:

```text
/srv/roomly/bin/pocketbase
/srv/roomly/shared/pb_data/                 # persistent SQLite and uploads
/srv/roomly/releases/<release>/dist/
/srv/roomly/releases/<release>/backend/pb_hooks/
/srv/roomly/releases/<release>/backend/pb_migrations/
/srv/roomly/current -> releases/<release>
/etc/roomly/pocketbase.env                  # n8n configuration, mode 0600
```

Create the `roomly` system user and directories, install PocketBase 0.40.4, copy a
release, and create the `current` symlink. Adapt `deploy/roomly-pocketbase.service`
and `deploy/nginx.conf` for your domain and TLS certificate. Give `roomly` ownership
of the database and release directories. Nginx needs read access to `dist/`.
Enable the service and reverse proxy. Allow only local access to port 8090; use an
SSH tunnel for the superuser dashboard.

In PocketBase Settings configure the trusted proxy header as `X-Real-IP` because
Nginx overwrites it; this makes lead rate limits apply per client instead of per
proxy. Product files use public URLs (including draft asset URLs if known), so
upload only distributable catalog assets. Leads and notification records remain
private. Configure scheduled PocketBase backups and keep a copy off the VPS;
test restoring both SQLite and uploaded assets before a pilot.

### GitHub Actions

`.github/workflows/ci.yml` runs domain, backend, and browser checks. Deployment
is opt-in after successful checks on `main`:

- Repository variables: `DEPLOY_ENABLED=true`, `POCKETBASE_PUBLIC_URL` (HTTPS
  origin), and `STORE_SLUG`.
- Secrets: `DEPLOY_TARGET` (`user@host`), `DEPLOY_SSH_KEY`, and
  `DEPLOY_KNOWN_HOSTS` (verified host key).
- The deployment account needs write access to `/srv/roomly/releases` and the
  `current` symlink plus passwordless permission for **only**
  `systemctl restart roomly-pocketbase`.

It uploads an immutable release, swaps the symlink, restarts PocketBase to apply
migrations, and checks API health. Retain previous releases. A failed health
check fails the workflow; rollback is operator-driven because database migration
rollback may require a backup restore. No live service is deployed by this repo
until the VPS and GitHub configuration are supplied.
