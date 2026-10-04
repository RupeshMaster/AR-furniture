import React, { useEffect, useId, useRef } from "react";

export function Icon({ name, size = 20 }) {
  const paths = {
    arrow: "M5 12h14m-6-6 6 6-6 6",
    chevron: "m9 6 6 6-6 6",
    check: "m5 12 4 4L19 6",
    close: "m6 6 12 12M18 6 6 18",
    box: "m12 3 9 5-9 5-9-5 9-5ZM3 8v8l9 5 9-5V8m-9 5v8",
    chart: "M4 19V5m0 14h16M7 15l3-4 3 2 5-7",
    refresh:
      "M20 11a8 8 0 0 0-14.9-3M4 5v4h4m-4 4a8 8 0 0 0 14.9 3M20 19v-4h-4",
    grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
    message:
      "M20 15a3 3 0 0 1-3 3H9l-5 3v-6a3 3 0 0 1-1-2.2V7a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3v8Z",
    spark: "m12 3-2 6-6 2 6 2 2 6 2-6 6-2-6-2-2-6Z",
    menu: "M4 7h16M4 12h16M4 17h16",
    plus: "M12 5v14M5 12h14",
    qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v6h-6v-2",
    download: "M12 3v12m-5-5 5 5 5-5M5 18v3h14v-3",
    shield: "m12 3-7 3v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Zm-3 9 2 2 4-4",
    search: "M20 20l-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
    share: "M12 15V3m-4 4 4-4 4 4M5 11v10h14V11",
    eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
    edit: "m14 4 6 6M4 20l5-1L21 7l-4-4L5 15l-1 5Z",
    logout: "M9 4H4v16h5m5-12 4 4-4 4m-5-4h12",
    trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.spark} />
    </svg>
  );
}
export function Logo({ dark }) {
  return (
    <a
      href="/"
      aria-label="Roomly catalog"
      className={`brand ${dark ? "brand-dark" : ""}`}
    >
      <span className="brand-mark">
        <span />
      </span>
      <span>roomly</span>
    </a>
  );
}
export function State({ title, message, children }) {
  return (
    <main className="state-page">
      <Icon name="box" size={35} />
      <h1>{title}</h1>
      {message && <p role="status">{message}</p>}
      {children}
    </main>
  );
}
export function Notice({ error }) {
  return error ? (
    <p className="error-notice" role="alert">
      {error}
    </p>
  ) : null;
}
export function Empty({ title, text }) {
  return (
    <div className="empty-state">
      <Icon name="box" size={28} />
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}
export function Toast({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div className="toast" role="status">
      <Icon name="check" size={18} />
      <span>{message}</span>
      <button aria-label="Dismiss notification" onClick={onClose}>
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}
export function Modal({ title, onClose, children, wide = false }) {
  const dialog = useRef();
  const id = useId();
  useEffect(() => {
    const node = dialog.current;
    node.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      node.close();
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`native-modal ${wide ? "wide" : ""}`}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = dialog.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <button
        className="modal-close"
        aria-label="Close dialog"
        onClick={onClose}
      >
        <Icon name="close" />
      </button>
      <h2 id={id}>{title}</h2>
      {children}
    </dialog>
  );
}
export function downloadFile(content, name, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(
    content instanceof Blob ? content : new Blob([content], { type }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
