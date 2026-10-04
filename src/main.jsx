import React, { Suspense, lazy, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Catalog, ProductPage } from "./buyer";
import { Icon, State, Toast } from "./ui";
import { isDemo } from "./api";
import "./styles.css";
import "./mvp.css";

const Dashboard = lazy(() => import("./merchant"));
function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [toast, setToast] = useState("");
  useEffect(() => {
    const changed = () => {
      setPath(location.pathname);
      window.scrollTo(0, 0);
    };
    const link = (event) => {
      const anchor = event.target.closest("a");
      if (
        !anchor ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        anchor.target ||
        anchor.download
      )
        return;
      const url = new URL(anchor.href);
      if (url.origin !== location.origin || url.hash) return;
      event.preventDefault();
      history.pushState({}, "", url);
      changed();
    };
    addEventListener("popstate", changed);
    document.addEventListener("click", link);
    return () => {
      removeEventListener("popstate", changed);
      document.removeEventListener("click", link);
    };
  }, []);
  let content;
  if (path.startsWith("/dashboard")) content = <Dashboard onToast={setToast} />;
  else if (/^\/p\/[a-zA-Z0-9_-]+\/?$/.test(path))
    content = (
      <ProductPage key={path} id={path.split("/")[2]} onToast={setToast} />
    );
  else if (path === "/") content = <Catalog />;
  else
    content = (
      <State
        title="Page not found"
        message="This link does not point to a Roomly page."
      >
        <a className="primary-cta" href="/">
          Explore the catalog
        </a>
      </State>
    );
  return (
    <>
      {isDemo && (
        <div className="demo-banner">
          <Icon name="spark" size={14} />
          <strong>Interactive demo</strong>
          <span>Data stays in this browser. Sample models and pricing.</span>
          <a href="/dashboard">Merchant workspace →</a>
        </div>
      )}
      <Suspense fallback={<State title="Loading workspace…" />}>
        {content}
      </Suspense>
      {toast && (
        <Toast key={toast} message={toast} onClose={() => setToast("")} />
      )}
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
