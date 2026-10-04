import React, { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { api, errorMessage, isDemo, pb } from "./api";
import { csv, money, statuses } from "./data";
import { downloadFile, Empty, Icon, Logo, Modal, Notice, State } from "./ui";
import Viewer from "./viewer";

export default function Dashboard({ onToast }) {
  const [session, setSession] = useState(undefined);
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState("Overview");
  const [error, setError] = useState("");
  const [mobile, setMobile] = useState(false);
  const [editor, setEditor] = useState(null);
  const [qr, setQR] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsBusy, setAnalyticsBusy] = useState(false);
  useEffect(() => {
    api
      .session()
      .then(setSession)
      .catch((e) => setError(errorMessage(e)));
  }, []);
  const reload = useCallback(async () => {
    if (!session) return;
    const [s, p, l] = await Promise.all([
      api.productStore(session.store),
      api.products(session.store, true),
      api.leads(session.store),
    ]);
    setStore(s);
    setProducts(p);
    setLeads(l);
    setLoaded(true);
  }, [session]);
  useEffect(() => {
    reload().catch((e) => setError(errorMessage(e)));
  }, [reload]);
  const loadAnalytics = useCallback(async () => {
    if (!session || !store) return;
    setAnalyticsBusy(true);
    try {
      setAnalytics(await api.analytics(store.id));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setAnalyticsBusy(false);
    }
  }, [session, store]);
  useEffect(() => {
    if (page === "Analytics" && store) loadAnalytics();
  }, [page, store, loadAnalytics]);
  async function changeLead(id, status) {
    await api.updateLead(id, status);
    await reload();
    onToast("Lead status updated.");
  }
  async function remove() {
    setBusy(true);
    try {
      await api.deleteProduct(deleting.id);
      setDeleting(null);
      await reload();
      onToast("Product deleted. Existing lead details are retained.");
    } catch (e) {
      setError(errorMessage(e));
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  }
  if (session === undefined)
    return (
      <State
        title={error ? "Could not verify your session" : "Opening workspace…"}
        message={error}
      >
        {error && <button onClick={() => location.reload()}>Retry</button>}
      </State>
    );
  if (session === null) return <Login onLogin={setSession} />;
  if (!loaded)
    return (
      <State
        title={error ? "Workspace unavailable" : "Loading your store…"}
        message={error}
      >
        {error && (
          <>
            <button
              onClick={() => reload().catch((e) => setError(errorMessage(e)))}
            >
              Retry
            </button>
            <button
              onClick={() => {
                pb.authStore.clear();
                setSession(null);
              }}
            >
              Sign out
            </button>
          </>
        )}
      </State>
    );
  return (
    <div className="dashboard-shell">
      <aside className={`dashboard-sidebar ${mobile ? "mobile-open" : ""}`}>
        <div className="dashboard-brand-row">
          <Logo dark />
          <button
            className="sidebar-close"
            aria-label="Close navigation"
            onClick={() => setMobile(false)}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="store-switcher">
          <span className="store-avatar">{store.name[0]}</span>
          <span>
            <strong>{store.name}</strong>
            <small>{store.location}</small>
          </span>
        </div>
        <nav className="dashboard-nav" aria-label="Merchant navigation">
          {[
            ["Overview", "grid"],
            ["Products", "box"],
            ["Leads", "message"],
            ["Analytics", "chart"],
          ].map(([label, icon]) => (
            <button
              className={page === label ? "active" : ""}
              aria-current={page === label ? "page" : undefined}
              key={label}
              onClick={() => {
                setPage(label);
                setMobile(false);
              }}
            >
              <Icon name={icon} size={18} />
              <span>{label}</span>
              {label === "Leads" &&
                !!leads.filter((l) => l.status === "New").length && (
                  <b>{leads.filter((l) => l.status === "New").length}</b>
                )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <a href="/">
            View public catalog <Icon name="arrow" size={16} />
          </a>
          <div className="profile-row">
            <span className="profile-avatar">
              {session.name?.slice(0, 2).toUpperCase() || "ME"}
            </span>
            <span>
              <strong>{session.name || "Merchant"}</strong>
              <small>{isDemo ? "Browser-only demo" : session.email}</small>
            </span>
            {!isDemo && (
              <button
                aria-label="Sign out"
                onClick={() => {
                  pb.authStore.clear();
                  setSession(null);
                }}
              >
                <Icon name="logout" size={17} />
              </button>
            )}
          </div>
        </div>
      </aside>
      <main className="dashboard-main">
        <header className="dashboard-header">
          <button
            className="mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMobile(true)}
          >
            <Icon name="menu" />
          </button>
          <div>
            <p className="dashboard-kicker">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <h1>{page === "Overview" ? "Your digital showroom" : page}</h1>
          </div>
          <a className="view-store" href="/">
            View storefront <Icon name="arrow" size={15} />
          </a>
        </header>
        <div className="dashboard-content">
          <Notice error={error} />
          {page === "Overview" && (
            <Overview
              products={products}
              leads={leads}
              onProducts={() => setPage("Products")}
              onLeads={() => setPage("Leads")}
            />
          )}
          {page === "Products" && (
            <Products
              products={products}
              onEdit={setEditor}
              onQR={setQR}
              onDelete={setDeleting}
            />
          )}
          {page === "Leads" && (
            <Leads leads={leads} onChange={changeLead} onRefresh={reload} />
          )}
          {page === "Analytics" && (
            <Analytics
              data={analytics}
              busy={analyticsBusy}
              onRefresh={loadAnalytics}
            />
          )}
        </div>
      </main>
      {editor && (
        <ProductEditor
          initial={editor}
          store={store.id}
          onClose={() => setEditor(null)}
          onSaved={async () => {
            setEditor(null);
            await reload();
            onToast("Product saved.");
          }}
        />
      )}
      {qr && (
        <QRModal product={qr} onClose={() => setQR(null)} onToast={onToast} />
      )}
      {deleting && (
        <Modal
          title={`Delete ${deleting.name}?`}
          onClose={() => !busy && setDeleting(null)}
        >
          <p className="modal-intro">
            The product link and QR code will show an unavailable page. Lead
            history is kept. You can unpublish the product instead by editing
            it.
          </p>
          <div className="dialog-actions">
            <button
              className="secondary-cta"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              Cancel
            </button>
            <button className="danger-button" disabled={busy} onClick={remove}>
              {busy ? "Deleting…" : "Delete product"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Login({ onLogin }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      onLogin((await api.login(f.get("email"), f.get("password"))).record);
    } catch {
      setError("Sign-in failed. Check your email, password, and connection.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="login-page">
      <Logo />
      <section className="login-card">
        <p className="eyebrow">Merchant workspace</p>
        <h1>Welcome back.</h1>
        <p>Your catalog and conversations, all in one place.</p>
        <form onSubmit={submit}>
          <label>
            Email
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <Notice error={error} />
          <button className="primary-cta full-width" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"} <Icon name="arrow" size={17} />
          </button>
        </form>
        <small>Accounts are provisioned by the platform operator.</small>
      </section>
      <a href="/">← Back to the showroom</a>
    </main>
  );
}

function Overview({ products, leads, onProducts, onLeads }) {
  const live = products.filter((p) => p.published).length;
  const stats = [
    ["Published pieces", live, "box", "mint"],
    ["3D assets", products.filter((p) => p.model).length, "grid", "lavender"],
    [
      "New inquiries",
      leads.filter((l) => l.status === "New").length,
      "message",
      "peach",
    ],
    [
      "Reserved or won",
      leads.filter((l) => ["Reserved", "Won"].includes(l.status)).length,
      "check",
      "yellow",
    ],
  ];
  return (
    <>
      <div className="dashboard-intro">
        <div>
          <p className="intro-line">
            <span className="status-pulse" /> A clearer path from browsing to
            buying
          </p>
          <p className="intro-copy">Live counts from your catalog and inbox.</p>
        </div>
      </div>
      <div className="stats-grid">
        {stats.map(([label, value, icon, tone]) => (
          <div className="stat-card" key={label}>
            <div className={`stat-icon ${tone}`}>
              <Icon name={icon} size={19} />
            </div>
            <div className="stat-label">{label}</div>
            <strong className="stat-value">{value}</strong>
          </div>
        ))}
      </div>
      <div className="overview-grid">
        <section className="panel performance-panel">
          <div className="panel-heading">
            <div>
              <p className="dashboard-kicker">Your next steps</p>
              <h3>A showroom that works for you.</h3>
            </div>
          </div>
          <ol className="onboarding-list">
            <li>
              <span>01</span>
              <div>
                <strong>Make your catalog yours</strong>
                <p>Add pricing, dimensions, and a product photo.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Bring a piece to life</strong>
                <p>
                  Upload a GLB in meters, preview its materials, and map your
                  finishes.
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Connect the showroom to home</strong>
                <p>
                  Publish a product and download its QR code for a price tag.
                </p>
              </div>
            </li>
          </ol>
          <button className="primary-cta" onClick={onProducts}>
            Manage products <Icon name="arrow" size={17} />
          </button>
        </section>
        <section className="panel leads-panel">
          <div className="panel-heading">
            <div>
              <p className="dashboard-kicker">Conversations</p>
              <h3>Latest requests</h3>
            </div>
            <button className="text-button" onClick={onLeads}>
              View all <Icon name="arrow" size={14} />
            </button>
          </div>
          {!leads.length ? (
            <Empty
              title="Your inbox is ready"
              text="New reservations and inquiries will appear here."
            />
          ) : (
            <div className="lead-list">
              {leads.slice(0, 5).map((l) => (
                <button className="lead-row" onClick={onLeads} key={l.id}>
                  <span className="lead-avatar green">
                    {l.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="lead-main">
                    <strong>{l.name}</strong>
                    <small>
                      {l.productName} · {l.variant}
                    </small>
                  </span>
                  <span className={`status-pill ${l.status.toLowerCase()}`}>
                    {l.status}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function Analytics({ data, busy, onRefresh }) {
  if (!data)
    return (
      <State
        title={
          busy ? "Gathering your showroom signals…" : "Analytics unavailable"
        }
        message={
          busy
            ? "No personal profiles are created. Roomly is only counting product actions."
            : "Try refreshing the analytics view."
        }
      >
        {!busy && (
          <button className="primary-cta" onClick={onRefresh}>
            Try again <Icon name="arrow" size={16} />
          </button>
        )}
      </State>
    );
  const { totals, funnel, sourceTotals, products, daily } = data;
  const maxDaily = Math.max(1, ...daily.map((row) => row.views));
  const maxProduct = Math.max(1, ...products.map((row) => row.views));
  const percent = (value) =>
    `${(value * 100).toFixed(value && value < 0.1 ? 1 : 0)}%`;
  return (
    <>
      <div className="section-header analytics-header">
        <div>
          <p className="dashboard-kicker">Last {data.days} days</p>
          <h2>What buyers are exploring</h2>
        </div>
        <button className="outline-button" onClick={onRefresh} disabled={busy}>
          <Icon name="refresh" size={16} /> {busy ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <div className="analytics-privacy">
        <Icon name="shield" size={17} />
        <span>
          <strong>Privacy-friendly by design.</strong> Roomly counts product
          actions, not people. No names, room photos, IP addresses, or
          advertising profiles are stored.
        </span>
      </div>
      <div className="stats-grid analytics-stats">
        <div className="stat-card">
          <div className="stat-icon lavender">
            <Icon name="eye" size={19} />
          </div>
          <div className="stat-label">Product views</div>
          <strong className="stat-value">{totals.views}</strong>
          <small className="stat-caption">{sourceTotals.qr} from QR tags</small>
        </div>
        <div className="stat-card">
          <div className="stat-icon mint">
            <Icon name="box" size={19} />
          </div>
          <div className="stat-label">3D opens</div>
          <strong className="stat-value">{totals.models}</strong>
          <small className="stat-caption">
            {percent(funnel.modelRate)} of product views
          </small>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow">
            <Icon name="spark" size={19} />
          </div>
          <div className="stat-label">Room-view attempts</div>
          <strong className="stat-value">{totals.ar}</strong>
          <small className="stat-caption">
            {percent(funnel.arRate)} of product views
          </small>
        </div>
        <div className="stat-card">
          <div className="stat-icon peach">
            <Icon name="message" size={19} />
          </div>
          <div className="stat-label">Buyer inquiries</div>
          <strong className="stat-value">{totals.leads}</strong>
          <small className="stat-caption">
            {percent(funnel.leadRate)} of product views
          </small>
        </div>
      </div>
      <div className="analytics-workspace">
        <section className="panel analytics-funnel">
          <div className="panel-heading">
            <div>
              <p className="dashboard-kicker">Intent funnel</p>
              <h3>Show, then ask.</h3>
            </div>
          </div>
          <div className="funnel-steps">
            {[
              ["Views", funnel.views, "#a39bd8"],
              ["3D", funnel.models, "#7bbf9a"],
              ["Room view", funnel.ar, "#dfbd62"],
              ["Inquiries", funnel.leads, "#d99b7c"],
            ].map(([label, value, color], index) => (
              <div className="funnel-step" key={label}>
                <div className="funnel-label">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
                <div className="funnel-track">
                  <i
                    style={{
                      width: `${funnel.views ? Math.max(value ? 5 : 0, (value / funnel.views) * 100) : 0}%`,
                      background: color,
                    }}
                  />
                </div>
                {index > 0 && (
                  <small>
                    {funnel.views ? percent(value / funnel.views) : "0%"} of
                    views
                  </small>
                )}
              </div>
            ))}
          </div>
          <p className="analytics-footnote">
            A room-view attempt means a buyer tapped the AR action. Native AR
            may open in another viewer; this count measures intent, not camera
            tracking success.
          </p>
        </section>
        <section className="panel source-panel">
          <div className="panel-heading">
            <div>
              <p className="dashboard-kicker">Discovery</p>
              <h3>Where interest starts</h3>
            </div>
          </div>
          <div
            className="source-donut"
            style={{
              "--qr": `${(sourceTotals.qr / Math.max(1, sourceTotals.qr + sourceTotals.catalog)) * 100}%`,
            }}
          >
            <div>
              <strong>{sourceTotals.qr + sourceTotals.catalog}</strong>
              <small>actions</small>
            </div>
          </div>
          <div className="source-legend">
            <span>
              <i className="source-dot qr" /> Showroom QR{" "}
              <strong>{sourceTotals.qr}</strong>
            </span>
            <span>
              <i className="source-dot catalog" /> Online catalog{" "}
              <strong>{sourceTotals.catalog}</strong>
            </span>
          </div>
        </section>
      </div>
      <section className="panel analytics-products">
        <div className="panel-heading">
          <div>
            <p className="dashboard-kicker">Product performance</p>
            <h3>Which pieces are moving?</h3>
          </div>
        </div>
        {products.length ? (
          <div className="analytics-product-list">
            {products.map((row) => (
              <div className="analytics-product-row" key={row.id}>
                <span className="analytics-rank">
                  {String(products.indexOf(row) + 1).padStart(2, "0")}
                </span>
                <span className="analytics-product-name">
                  <strong>{row.name}</strong>
                  <small>{row.category || "Product"}</small>
                </span>
                <div className="analytics-product-track">
                  <i
                    style={{
                      width: `${Math.max(row.views ? 5 : 0, (row.views / maxProduct) * 100)}%`,
                    }}
                  />
                </div>
                <span className="analytics-number">
                  <strong>{row.views}</strong>
                  <small>views</small>
                </span>
                <span className="analytics-number">
                  <strong>{row.ar}</strong>
                  <small>room</small>
                </span>
                <span className="analytics-number">
                  <strong>{row.leads}</strong>
                  <small>leads</small>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title="Your first signal is waiting"
            text="Publish a product and share its QR code to start measuring interest."
          />
        )}
      </section>
      <section className="panel daily-panel">
        <div className="panel-heading">
          <div>
            <p className="dashboard-kicker">Activity</p>
            <h3>Daily product views</h3>
          </div>
          <span className="panel-note">
            {daily.length
              ? `${daily[0].date} → ${daily[daily.length - 1].date}`
              : "No activity yet"}
          </span>
        </div>
        <div className="daily-bars">
          {daily.length ? (
            daily.slice(-14).map((row) => (
              <div
                className="daily-bar"
                key={row.date}
                title={`${row.date}: ${row.views} views`}
              >
                <i
                  style={{
                    height: `${Math.max(row.views ? 8 : 2, (row.views / maxDaily) * 100)}%`,
                  }}
                />
                <small>{row.date.slice(5)}</small>
              </div>
            ))
          ) : (
            <Empty
              title="No activity yet"
              text="Views will appear here after buyers open your product pages."
            />
          )}
        </div>
      </section>
    </>
  );
}

function Products({ products, onEdit, onQR, onDelete }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const visible = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) &&
      (filter === "all" || p.published === (filter === "live")),
  );
  return (
    <>
      <div className="section-header">
        <div>
          <p className="dashboard-kicker">Catalog</p>
          <h2>Your products</h2>
        </div>
        <button className="primary-cta" onClick={() => onEdit({})}>
          <Icon name="plus" size={17} /> Add product
        </button>
      </div>
      <div className="catalog-toolbar">
        <div className="search-field">
          <Icon name="search" size={17} />
          <input
            aria-label="Search products"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products"
          />
        </div>
        <select
          className="filter-select"
          aria-label="Product status"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All products</option>
          <option value="live">Published</option>
          <option value="draft">Drafts</option>
        </select>
      </div>
      <div className="panel merchant-products">
        {visible.map((p) => (
          <div className="merchant-product-row" key={p.id}>
            <div className="catalog-product">
              <img src={p.image || "/images/sofa.svg"} alt="" loading="lazy" />
              <span>
                <strong>{p.name}</strong>
                <small>
                  {p.category} · {money(p.price, p.currency)}
                </small>
              </span>
            </div>
            <span className={`status-pill ${p.published ? "live" : "draft"}`}>
              {p.published ? "Published" : "Draft"}
            </span>
            <span className="asset-status">
              {p.model ? "3D attached" : "Photo only"}
            </span>
            <div className="row-actions">
              <button
                title="Edit product"
                aria-label={`Edit ${p.name}`}
                onClick={() => onEdit(p)}
              >
                <Icon name="edit" size={17} />
              </button>
              <button
                title="Product QR code"
                aria-label={`QR for ${p.name}`}
                disabled={!p.published}
                onClick={() => onQR(p)}
              >
                <Icon name="qr" size={17} />
              </button>
              {p.published && (
                <a
                  title="Open product"
                  aria-label={`View ${p.name}`}
                  href={`/p/${p.id}`}
                >
                  <Icon name="eye" size={17} />
                </a>
              )}
              <button
                title="Delete product"
                aria-label={`Delete ${p.name}`}
                onClick={() => onDelete(p)}
              >
                <Icon name="trash" size={17} />
              </button>
            </div>
          </div>
        ))}
        {!visible.length && (
          <Empty
            title="No products here yet"
            text="Add a product or adjust your search."
          />
        )}
      </div>
    </>
  );
}

function Leads({ leads, onChange, onRefresh }) {
  const [filter, setFilter] = useState("All");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [detail, setDetail] = useState(null);
  const visible = leads.filter((l) => filter === "All" || l.status === filter);
  const change = async (id, status) => {
    setBusy(id);
    setError("");
    try {
      await onChange(id, status);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy("");
    }
  };
  const exportCSV = () =>
    downloadFile(
      csv([
        [
          "Name",
          "Contact",
          "Product",
          "Finish",
          "Type",
          "Source",
          "Status",
          "Message",
          "Received",
        ],
        ...visible.map((l) => [
          l.name,
          l.contact,
          l.productName,
          l.variant,
          l.type,
          l.source,
          l.status,
          l.message,
          l.created,
        ]),
      ]),
      "roomly-leads.csv",
    );
  return (
    <>
      <div className="section-header">
        <div>
          <p className="dashboard-kicker">Inbox</p>
          <h2>Customer conversations</h2>
        </div>
        <button className="outline-button" onClick={exportCSV}>
          <Icon name="download" size={16} /> Export CSV
        </button>
      </div>
      <div className="catalog-toolbar">
        <select
          className="filter-select"
          aria-label="Filter leads by status"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {["All", ...statuses].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <button
          className="outline-button"
          onClick={() => onRefresh().catch((e) => setError(errorMessage(e)))}
        >
          Refresh inbox
        </button>
        <span className="catalog-total">{visible.length} requests</span>
      </div>
      <Notice error={error} />
      <div className="panel merchant-leads">
        {visible.map((l) => (
          <div className="merchant-lead-row" key={l.id}>
            <button className="lead-contact" onClick={() => setDetail(l)}>
              <strong>{l.name}</strong>
              <span>{l.contact}</span>
            </button>
            <div>
              <strong>{l.productName}</strong>
              <small>
                {l.variant || "Standard finish"} · {l.type}
              </small>
            </div>
            <div>
              <small>{new Date(l.created).toLocaleDateString()}</small>
              <small>{l.source === "qr" ? "Showroom QR" : "Catalog"}</small>
            </div>
            <select
              aria-label={`Status for ${l.name}`}
              value={l.status}
              disabled={busy === l.id}
              onChange={(e) => change(l.id, e.target.value)}
            >
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <button
              aria-label={`Details for ${l.name}`}
              onClick={() => setDetail(l)}
            >
              <Icon name="chevron" size={17} />
            </button>
          </div>
        ))}
        {!visible.length && (
          <Empty
            title="No requests yet"
            text="Buyer inquiries and reservation requests appear here."
          />
        )}
      </div>
      {detail && (
        <Modal
          title={`Request from ${detail.name}`}
          onClose={() => setDetail(null)}
        >
          <dl className="lead-details">
            <dt>Contact</dt>
            <dd>
              <a
                href={
                  detail.contact.includes("@")
                    ? `mailto:${detail.contact}`
                    : `tel:${detail.contact.replace(/[^+\d]/g, "")}`
                }
              >
                {detail.contact}
              </a>
            </dd>
            <dt>Product</dt>
            <dd>
              {detail.productName} · {detail.variant}
            </dd>
            <dt>Request</dt>
            <dd>
              {detail.type} via {detail.source}
            </dd>
            <dt>Price at request</dt>
            <dd>{money(detail.price, detail.currency)}</dd>
            <dt>Received</dt>
            <dd>{new Date(detail.created).toLocaleString()}</dd>
            <dt>Message</dt>
            <dd>{detail.message || "No additional message."}</dd>
          </dl>
        </Modal>
      )}
    </>
  );
}

function ProductEditor({ initial, store, onClose, onSaved }) {
  const [draft, setDraft] = useState({
    store,
    name: "",
    category: "Sofa",
    description: "",
    price: 0,
    currency: "USD",
    width: 100,
    depth: 60,
    height: 80,
    availability: "Made to order",
    delivery: "",
    published: false,
    variants: [],
    ...initial,
  });
  const [files, setFiles] = useState({});
  const [previews, setPreviews] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState({ materials: [], variants: [] });
  const inspect = useCallback((data) => setInfo(data), []);
  useEffect(() => {
    const urls = {};
    for (const [key, file] of Object.entries(files))
      urls[key] = URL.createObjectURL(file);
    setPreviews(urls);
    return () => Object.values(urls).forEach(URL.revokeObjectURL);
  }, [files]);
  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const selectFile = async (key, file) => {
    if (!file) return;
    try {
      const limit = key === "photo" ? 5 : 15;
      if (file.size > limit * 1024 * 1024)
        throw new Error(
          `Use a ${key === "photo" ? "photo" : "model"} under ${limit} MB.`,
        );
      if (
        key === "glb" &&
        new DataView(await file.slice(0, 4).arrayBuffer()).getUint32(
          0,
          true,
        ) !== 0x46546c67
      )
        throw new Error("Choose a binary glTF (.glb) file.");
      if (key === "usdz" && !/\.usdz$/i.test(file.name))
        throw new Error("Choose a .usdz file for iOS.");
      if (
        key === "photo" &&
        !["image/jpeg", "image/png", "image/webp"].includes(file.type)
      )
        throw new Error("Choose a JPG, PNG, or WebP photo.");
      setFiles((f) => ({ ...f, [key]: file }));
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  const save = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (draft.published && !draft.image && !files.photo)
        throw new Error("Add a product photo before publishing.");
      await api.saveProduct(draft, files);
      await onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const editVariant = (index, field, value) =>
    set(
      "variants",
      draft.variants.map((v, i) =>
        i === index ? { ...v, [field]: value } : v,
      ),
    );
  const preview = {
    ...draft,
    model: previews.glb || draft.model,
    image: previews.photo || draft.image,
    usdz: previews.usdz || draft.usdz,
  };
  return (
    <Modal
      title={draft.id ? "Make it yours." : "Add a new piece."}
      onClose={() => !busy && onClose()}
      wide
    >
      <p className="modal-intro">
        Product information, a lightweight 3D asset, and finishes your customers
        can explore.
      </p>
      <form onSubmit={save}>
        <div className="editor-grid">
          <section>
            <h3>Product basics</h3>
            <label>
              Product name
              <input
                value={draft.name}
                onChange={(e) => set("name", e.target.value)}
                required
                maxLength={120}
              />
            </label>
            <div className="form-two-col">
              <label>
                Category
                <select
                  value={draft.category}
                  onChange={(e) => set("category", e.target.value)}
                >
                  {["Sofa", "Chair", "Table", "Storage", "Bed", "Other"].map(
                    (c) => (
                      <option key={c}>{c}</option>
                    ),
                  )}
                </select>
              </label>
              <label>
                Currency
                <select
                  value={draft.currency}
                  onChange={(e) => set("currency", e.target.value)}
                >
                  {["USD", "INR", "GBP", "EUR"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Price
              <input
                type="number"
                min="0"
                step="0.01"
                value={draft.price}
                onChange={(e) => set("price", e.target.valueAsNumber)}
                required
              />
            </label>
            <label>
              Description
              <textarea
                value={draft.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                maxLength={3000}
              />
            </label>
            <div className="dimension-inputs">
              {["width", "depth", "height"].map((k) => (
                <label key={k}>
                  {k} (cm)
                  <input
                    type="number"
                    min="0.1"
                    max="1000"
                    step="0.1"
                    value={draft[k]}
                    onChange={(e) => set(k, e.target.valueAsNumber)}
                    required
                  />
                </label>
              ))}
            </div>
            <label>
              Availability
              <select
                value={draft.availability}
                onChange={(e) => set("availability", e.target.value)}
              >
                {["In stock", "Made to order", "Out of stock"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Delivery information
              <textarea
                value={draft.delivery}
                onChange={(e) => set("delivery", e.target.value)}
                rows={2}
                maxLength={1000}
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={draft.published}
                onChange={(e) => set("published", e.target.checked)}
              />{" "}
              Publish to the public catalog
            </label>
          </section>
          <section>
            <h3>Images & 3D</h3>
            <p className="editor-hint">
              GLB units must be meters, with the floor at y = 0. Dimensions
              describe the item; they do not rescale an uploaded model.
            </p>
            <label>
              Product photo · up to 5 MB
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => selectFile("photo", e.target.files[0])}
              />
            </label>
            <label>
              GLB model · up to 15 MB
              <input
                type="file"
                accept=".glb"
                onChange={(e) => selectFile("glb", e.target.files[0])}
              />
            </label>
            <label>
              USDZ for iOS · optional, up to 15 MB
              <input
                type="file"
                accept=".usdz"
                onChange={(e) => selectFile("usdz", e.target.files[0])}
              />
            </label>
            {preview.model && (
              <div className="editor-preview">
                <Viewer
                  key={preview.model}
                  product={preview}
                  selected={draft.variants[0]}
                  inspect
                  onMaterials={inspect}
                />
              </div>
            )}
            <p className="editor-hint">
              Load the preview to inspect material names. Prefer embedded GLB
              variants for native AR consistency. A separate USDZ must be kept
              in sync with the selected finish.
            </p>
            {!!info.materials.length && (
              <div className="asset-inspection">
                <strong>Materials</strong>
                <p>{info.materials.join(", ")}</p>
                <strong>Embedded variants</strong>
                <p>
                  {info.variants.join(", ") || "None; use hex color mapping."}
                </p>
              </div>
            )}
          </section>
        </div>
        <section className="variants-editor">
          <h3>Finishes</h3>
          <p className="editor-hint">
            Choose an embedded variant, or leave it empty and map a hex color to
            a material name. The mesh stays the same.
          </p>
          {draft.variants.map((v, i) => (
            <div className="variant-editor-row" key={i}>
              <label>
                Finish name
                <input
                  value={v.name}
                  onChange={(e) => editVariant(i, "name", e.target.value)}
                  required
                  maxLength={60}
                />
              </label>
              <label>
                Swatch
                <input
                  type="color"
                  value={v.color}
                  onChange={(e) => editVariant(i, "color", e.target.value)}
                />
              </label>
              <label>
                Material name
                <input
                  list="model-materials"
                  value={v.material}
                  onChange={(e) => editVariant(i, "material", e.target.value)}
                />
              </label>
              <label>
                Embedded variant
                <input
                  list="model-variants"
                  value={v.variantName}
                  onChange={(e) =>
                    editVariant(i, "variantName", e.target.value)
                  }
                />
              </label>
              <button
                type="button"
                aria-label={`Remove finish ${i + 1}`}
                onClick={() =>
                  set(
                    "variants",
                    draft.variants.filter((_, n) => n !== i),
                  )
                }
              >
                <Icon name="trash" size={17} />
              </button>
            </div>
          ))}
          <datalist id="model-materials">
            {info.materials.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <datalist id="model-variants">
            {info.variants.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <button
            type="button"
            className="outline-button"
            disabled={draft.variants.length >= 12}
            onClick={() =>
              set("variants", [
                ...draft.variants,
                { name: "", color: "#d8c9ae", material: "", variantName: "" },
              ])
            }
          >
            <Icon name="plus" size={16} /> Add finish
          </button>
        </section>
        <Notice error={error} />
        <div className="dialog-actions">
          <button
            type="button"
            className="secondary-cta"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="primary-cta" disabled={busy}>
            {busy ? "Saving…" : "Save product"}
            <Icon name="check" size={17} />
          </button>
        </div>
      </form>
    </Modal>
  );
}

function QRModal({ product, onClose, onToast }) {
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  const url = new URL(`/p/${product.id}?source=qr`, location.origin).href;
  useEffect(() => {
    QRCode.toDataURL(url, {
      width: 768,
      margin: 4,
      errorCorrectionLevel: "M",
      color: { dark: "#21332b", light: "#ffffff" },
    })
      .then(setImage)
      .catch(() => setError("QR generation failed. Please reopen the dialog."));
  }, [url]);
  const download = async () => {
    try {
      const blob = await (await fetch(image)).blob();
      downloadFile(blob, `${product.id}-qr.png`);
    } catch {
      setError("Could not download the QR image. Try again.");
    }
  };
  return (
    <Modal title={product.name} onClose={onClose}>
      <p className="modal-intro">
        A real, scannable product QR code. Download it for a showroom price tag.
      </p>
      {image && (
        <img
          className="real-qr"
          src={image}
          alt={`QR code linking to ${product.name}`}
        />
      )}
      <div className="qr-link">
        <span>{url}</span>
        <button
          aria-label="Copy QR destination"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              onToast("Product URL copied.");
            } catch {
              setError("Copy failed. Select and copy the URL above.");
            }
          }}
        >
          <Icon name="share" size={17} />
        </button>
      </div>
      {["localhost", "127.0.0.1"].includes(location.hostname) && (
        <p className="editor-hint">
          This code currently points to your local computer. Use your deployed
          HTTPS address to print tags for customers.
        </p>
      )}
      <Notice error={error} />
      <button
        className="primary-cta full-width"
        disabled={!image}
        onClick={download}
      >
        <Icon name="download" size={17} /> Download QR PNG
      </button>
    </Modal>
  );
}
