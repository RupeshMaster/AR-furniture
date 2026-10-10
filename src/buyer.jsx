import React, { useEffect, useState } from "react";
import { api, errorMessage, isDemo } from "./api";
import { money } from "./data";
import { Empty, Icon, Logo, Modal, Notice, State } from "./ui";
import Viewer from "./viewer";

function Header({ store }) {
  return (
    <header className="site-header page-width">
      <Logo />
      <nav className="site-nav" aria-label="Storefront">
        <a href="/">Shop all</a>
        <span>{store?.name}</span>
      </nav>
      <a className="seller-link" href="/dashboard">
        For retailers <Icon name="arrow" size={15} />
      </a>
    </header>
  );
}
function Footer({ store }) {
  return (
    <footer className="product-footer page-width">
      <div>
        <Logo />
        <span>Furniture, with a little more certainty.</span>
      </div>
      <div className="store-credit">
        <span>Sold by</span>
        <strong>{store?.name}</strong>
        <small>{store?.location}</small>
      </div>
    </footer>
  );
}

export function Catalog() {
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const s = await api.store();
        const p = await api.products(s.id);
        if (live) {
          setStore(s);
          setProducts(p);
        }
      } catch (e) {
        if (live) setError(errorMessage(e));
      }
    })();
    return () => {
      live = false;
    };
  }, []);
  if (error)
    return (
      <State title="The showroom could not load" message={error}>
        <button className="primary-cta" onClick={() => location.reload()}>
          Try again
        </button>
      </State>
    );
  if (!products) return <State title="Opening the showroom…" />;
  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) &&
      (category === "All" || p.category === category),
  );
  return (
    <div className="buyer-page">
      <Header store={store} />
      <main className="page-width catalog-storefront">
        <section className="catalog-hero">
          <div>
            <p className="eyebrow">{store.name} / Digital showroom</p>
            <h1>
              A little more certain.
              <br />
              <em>A lot more at home.</em>
            </h1>
            <p>
              {store.description ||
                "Find a piece you love. See how it feels in your own space."}
            </p>
            <div className="hero-points">
              <span>
                <Icon name="box" size={17} /> Explore in 3D
              </span>
              <span>
                <Icon name="shield" size={17} /> No app to install
              </span>
            </div>
          </div>
          <img src="/images/sofa.svg" alt="Illustration of a relaxed sofa" />
        </section>
        <div className="catalog-toolbar">
          <div className="search-field">
            <Icon name="search" size={17} />
            <input
              aria-label="Search catalog"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find your next favorite piece"
            />
          </div>
          <div className="category-tabs" aria-label="Categories">
            {["All", ...new Set(products.map((p) => p.category))].map((c) => (
              <button
                aria-pressed={category === c}
                className={category === c ? "active" : ""}
                onClick={() => setCategory(c)}
                key={c}
              >
                {c}
              </button>
            ))}
          </div>
          <span className="catalog-total">{filtered.length} pieces</span>
        </div>
        <div className="catalog-cards">
          {filtered.map((p) => (
            <a className="product-card" href={`/p/${p.id}`} key={p.id}>
              <div className="card-photo">
                <img
                  src={p.image || "/images/sofa.svg"}
                  alt={p.name}
                  loading="lazy"
                />
                {p.model && (
                  <span>
                    <Icon name="box" size={13} /> 3D preview
                  </span>
                )}
              </div>
              <div className="card-details">
                <p className="eyebrow">{p.category}</p>
                <h2>{p.name}</h2>
                <span>{money(p.price, p.currency)}</span>
                <Icon name="arrow" size={19} />
              </div>
              <div className="card-swatches">
                {p.variants.map((v) => (
                  <i
                    key={v.name}
                    style={{ background: v.color }}
                    title={v.name}
                  />
                ))}
                <span>{p.availability}</span>
              </div>
            </a>
          ))}
        </div>
        {!filtered.length && (
          <Empty
            title="No pieces found"
            text="Try another search or category."
          />
        )}
      </main>
      <Footer store={store} />
    </div>
  );
}

export function ProductPage({ id, onToast }) {
  const [product, setProduct] = useState(null);
  const [store, setStore] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [lead, setLead] = useState(null);
  const [tab, setTab] = useState("Details");
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const p = await api.product(id);
        const s = await api.productStore(p.store);
        const requested = new URLSearchParams(location.search).get("finish");
        if (live) {
          setProduct(p);
          setStore(s);
          setSelected(
            p.variants.find((v) => v.name === requested) ||
              p.variants[0] ||
              null,
          );
          document.title = `${p.name} — ${s.name} | Roomly`;
          const source =
            new URLSearchParams(location.search).get("source") === "qr"
              ? "qr"
              : "catalog";
          api.track({
            store: p.store,
            product: p.id,
            type: "product_view",
            source,
          });
          if (source === "qr")
            api.track({
              store: p.store,
              product: p.id,
              type: "qr_scan",
              source,
            });
        }
      } catch (e) {
        if (live) setError(errorMessage(e));
      }
    })();
    return () => {
      live = false;
    };
  }, [id]);
  const beginLead = (type) => {
    api.track({
      store: product.store,
      product: product.id,
      type: "lead_start",
      source:
        new URLSearchParams(location.search).get("source") === "qr"
          ? "qr"
          : "catalog",
    });
    setLead(type);
  };
  const share = async () => {
    const url = new URL(`/p/${id}`, location.origin);
    if (selected) url.searchParams.set("finish", selected.name);
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, url: url.href });
      } else {
        await navigator.clipboard.writeText(url.href);
        onToast("Product link copied, including the selected finish.");
      }
    } catch (e) {
      if (e.name !== "AbortError")
        setError(
          "The link could not be copied. You can copy the address from your browser.",
        );
    }
  };
  if (!product)
    return (
      <State
        title={error ? "Product unavailable" : "Finding your piece…"}
        message={error}
      >
        <a href="/">Back to the catalog</a>
      </State>
    );
  return (
    <div className="buyer-page">
      <Header store={store} />
      <main className="product-layout page-width">
        <section className="product-visual-column">
          <div className="crumbs">
            <a href="/">Catalog</a>
            <Icon name="chevron" size={13} />
            <span>{product.category}</span>
          </div>
          <Viewer
            product={product}
            selected={selected}
            onReserve={() => beginLead("inquiry")}
            onModelLoad={() =>
              api.track({
                store: product.store,
                product: product.id,
                type: "model_load",
                source:
                  new URLSearchParams(location.search).get("source") === "qr"
                    ? "qr"
                    : "catalog",
              })
            }
            onARStart={() =>
              api.track({
                store: product.store,
                product: product.id,
                type: "ar_start",
                source:
                  new URLSearchParams(location.search).get("source") === "qr"
                    ? "qr"
                    : "catalog",
              })
            }
          />
          <div className="visual-footnote">
            <span>
              <Icon name="shield" size={15} /> No room photos are uploaded by
              Roomly
            </span>
          </div>
        </section>
        <section className="product-info-column">
          <div className="product-heading">
            <div>
              <p className="eyebrow">
                {product.category} / {store.name}
              </p>
              <h1>{product.name}</h1>
            </div>
            <button
              className="save-button"
              aria-label="Share product"
              onClick={share}
            >
              <Icon name="share" />
            </button>
          </div>
          <Notice error={error} />
          <p className="product-description">{product.description}</p>
          <div className="price-line">
            <strong>{money(product.price, product.currency)}</strong>
            <span>{product.availability}</span>
          </div>
          <div className="info-divider" />
          {selected && (
            <div className="variant-block">
              <div className="section-label">
                <span>Choose a finish</span>
                <strong>{selected.name}</strong>
              </div>
              <div className="swatches">
                {product.variants.map((v) => (
                  <button
                    key={v.name}
                    className={`swatch ${v.name === selected.name ? "selected" : ""}`}
                    style={{ "--swatch": v.color }}
                    onClick={() => {
                      setSelected(v);
                      const url = new URL(location.href);
                      url.searchParams.set("finish", v.name);
                      history.replaceState({}, "", url);
                    }}
                    aria-label={v.name}
                    aria-pressed={v.name === selected.name}
                  >
                    <span />
                    <small>{v.name}</small>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="delivery-card">
            <div className="delivery-icon">
              <Icon name="box" />
            </div>
            <div>
              <strong>Make sure it feels right.</strong>
              <span>
                {product.leadTime
                  ? `${product.availability} · ${product.leadTime} · The showroom can confirm delivery.`
                  : "The showroom can help with finishes, sizing, and delivery."}
              </span>
            </div>
          </div>
          <div className="product-ctas">
            <button
              className="primary-cta"
              onClick={() => beginLead("reservation")}
            >
              Request a reservation <Icon name="arrow" size={17} />
            </button>
            <button
              className="secondary-cta"
              onClick={() => beginLead("inquiry")}
            >
              <Icon name="message" size={18} /> Ask the showroom
            </button>
          </div>
          <div className="trust-row">
            <span>
              <Icon name="check" size={14} /> No payment required
            </span>
            <span>
              <Icon name="check" size={14} /> Store confirmation needed
            </span>
          </div>
          <div className="details-tabs">
            <div
              className="tab-list"
              role="tablist"
              aria-label="Product information"
            >
              {["Details", "Dimensions", "Delivery"].map((t) => (
                <button
                  role="tab"
                  aria-selected={tab === t}
                  className={tab === t ? "active" : ""}
                  key={t}
                  onClick={() => setTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="tab-content" role="tabpanel">
              {tab === "Details" && (
                <>
                  <p>{product.description}</p>
                  <div className="spec-grid product-specs">
                    <span>
                      <small>Room</small>
                      <strong>{product.room || product.category}</strong>
                    </span>
                    <span>
                      <small>Materials</small>
                      <strong>{product.material || "Ask the showroom"}</strong>
                    </span>
                    <span>
                      <small>Care</small>
                      <strong>{product.care || "Ask the showroom"}</strong>
                    </span>
                    <span>
                      <small>SKU</small>
                      <strong>{product.sku || "Available from store"}</strong>
                    </span>
                  </div>
                  {product.sample && (
                    <p className="sample-note">
                      This is a demonstration listing with an original,
                      simplified 3D model. It is not a real sale offer.
                    </p>
                  )}
                </>
              )}
              {tab === "Dimensions" && (
                <div className="full-specs">
                  {["width", "depth", "height"].map((k) => (
                    <span key={k}>
                      <small>{k}</small>
                      <strong>{product[k]} cm</strong>
                    </span>
                  ))}
                </div>
              )}
              {tab === "Delivery" && (
                <>
                  <p className="delivery-estimate">
                    {product.leadTime &&
                      `Estimated lead time: ${product.leadTime}`}
                  </p>
                  <p>
                    {product.delivery ||
                      "Contact the showroom to confirm delivery pricing and lead times."}
                  </p>
                </>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer store={store} />
      {lead && (
        <LeadModal
          product={product}
          store={store}
          selected={selected}
          type={lead}
          onClose={() => setLead(null)}
        />
      )}
    </div>
  );
}

function LeadModal({ product, store, selected, type, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [requestKey] = useState(() => crypto.randomUUID());
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api.lead({
        name: form.get("name"),
        contact: form.get("contact"),
        message: form.get("message"),
        product: product.id,
        variant: selected?.name || "",
        type,
        source:
          new URLSearchParams(location.search).get("source") === "qr"
            ? "qr"
            : "catalog",
        requestKey,
      });
      setDone(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={
        done
          ? "Your request is saved."
          : type === "reservation"
            ? "Let’s make room for it."
            : "Ask the showroom."
      }
      onClose={onClose}
    >
      {done ? (
        <div className="success-state">
          <span className="success-circle">
            <Icon name="check" size={28} />
          </span>
          <p>
            {isDemo
              ? "This demo request is now visible in the merchant lead inbox on this browser. No message was sent to a real store."
              : `Your request is with ${store.name}. The store will confirm availability and the next steps.`}
          </p>
          <button className="primary-cta" onClick={onClose}>
            Keep exploring
          </button>
        </div>
      ) : (
        <>
          <p className="modal-intro">
            {isDemo
              ? "Try the complete flow using sample contact information."
              : `Leave your details and ${store.name} can help you choose.`}
          </p>
          <div className="modal-product">
            <img src={product.image || "/images/sofa.svg"} alt="" />
            <span>
              <strong>{product.name}</strong>
              <small>
                {selected?.name} · {money(product.price, product.currency)}
              </small>
            </span>
          </div>
          <form onSubmit={submit}>
            <label>
              Full name
              <input
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
                placeholder="Your name"
              />
            </label>
            <label>
              Email or phone
              <input
                name="contact"
                autoComplete="email"
                required
                maxLength={200}
                placeholder="How should we reach you?"
              />
            </label>
            <label>
              Message <span>Optional</span>
              <textarea
                name="message"
                maxLength={2000}
                rows={3}
                placeholder="Questions, dimensions, or timing…"
              />
            </label>
            <Notice error={error} />
            <button className="primary-cta full-width" disabled={busy}>
              {busy ? "Sending…" : "Send request"}
              <Icon name="arrow" size={17} />
            </button>
            <small className="form-note">
              By submitting, you agree to be contacted about this item. A
              reservation request is not a confirmed stock hold.
            </small>
          </form>
        </>
      )}
    </Modal>
  );
}
