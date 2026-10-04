import React, { useEffect, useRef, useState } from "react";
import { Icon, Notice } from "./ui";
let viewerModule;
const loadViewer = () => (viewerModule ||= import("@google/model-viewer"));

export default function Viewer({
  product,
  selected,
  onReserve,
  inspect = false,
  onMaterials,
  onModelLoad,
  onARStart,
}) {
  const ref = useRef();
  const reserveAfterAR = useRef(false);
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [canAR, setCanAR] = useState(false);
  const [error, setError] = useState("");
  const [variantError, setVariantError] = useState("");
  const [arStatus, setARStatus] = useState("");
  useEffect(() => {
    if (!active) return;
    let live = true;
    loadViewer()
      .then(() => {
        if (live) setReady(true);
      })
      .catch(() => {
        viewerModule = null;
        if (live)
          setError(
            "The 3D viewer could not load. Check your connection and reload.",
          );
      });
    return () => {
      live = false;
    };
  }, [active]);
  useEffect(() => {
    if (!ready) return;
    const viewer = ref.current;
    const load = () => {
      setLoaded(true);
      setCanAR(viewer.canActivateAR);
      onModelLoad?.();
      onMaterials?.({
        materials: viewer.model.materials.map((m) => m.name),
        variants: viewer.availableVariants,
      });
    };
    const failed = () => {
      setLoaded(false);
      setError(
        "This model could not be opened. You can still view the product details or contact the store.",
      );
    };
    const status = (e) => {
      setARStatus(e.detail.status);
      if (e.detail.status === "failed")
        setError(
          "AR could not start. Try again on a supported phone in a well-lit room.",
        );
      if (e.detail.status === "not-presenting" && reserveAfterAR.current) {
        reserveAfterAR.current = false;
        onReserve?.();
      }
    };
    viewer.addEventListener("load", load);
    viewer.addEventListener("error", failed);
    viewer.addEventListener("ar-status", status);
    if (viewer.loaded) load();
    return () => {
      viewer.removeEventListener("load", load);
      viewer.removeEventListener("error", failed);
      viewer.removeEventListener("ar-status", status);
    };
  }, [ready, onMaterials]);
  useEffect(() => {
    const viewer = ref.current;
    if (!loaded || !selected || !viewer.model) return;
    setVariantError("");
    if (selected.variantName) {
      if (!viewer.availableVariants.includes(selected.variantName)) {
        setVariantError(
          `The model does not contain the “${selected.variantName}” finish. Ask the store to check its mapping.`,
        );
        return;
      }
      viewer.variantName = selected.variantName;
    } else if (selected.material) {
      viewer.variantName = null;
      const material = viewer.model.materials.find(
        (m) => m.name === selected.material,
      );
      if (!material) {
        setVariantError(
          `Material “${selected.material}” is not in this model.`,
        );
        return;
      }
      material.pbrMetallicRoughness.setBaseColorFactor(selected.color);
    }
  }, [loaded, selected]);
  const startAR = async () => {
    setError("");
    onARStart?.();
    if (!ref.current?.canActivateAR) {
      setError(
        "Room placement requires a supported iOS or Android phone and HTTPS. The 3D preview works here.",
      );
      return;
    }
    try {
      await ref.current.activateAR();
    } catch {
      setError("AR could not open. Please try a supported mobile browser.");
    }
  };
  return (
    <div className="viewer-shell">
      <div className="viewer-topline">
        <span className="live-dot" />
        {product.sample
          ? "Illustrative demo model"
          : "Interactive product preview"}
        <span className="viewer-topline-spacer" />
        <span>Dimensions in cm</span>
      </div>
      <div className="model-stage">
        {ready ? (
          <model-viewer
            ref={ref}
            src={product.model}
            poster={product.image || undefined}
            ios-src={product.usdz || undefined}
            alt={`3D preview of ${product.name}`}
            camera-controls
            touch-action="pan-y"
            shadow-intensity="1"
            exposure="1"
            ar={!inspect}
            ar-modes="webxr scene-viewer quick-look"
            ar-scale="fixed"
            ar-placement="floor"
            camera-orbit="30deg 70deg 110%"
            loading="eager"
            reveal="auto"
          >
            <div slot="ar-button" />
            {!inspect && (
              <button
                type="button"
                slot="exit-webxr-ar-button"
                className="primary-cta ar-lead"
                onClick={() => {
                  reserveAfterAR.current = true;
                }}
              >
                Exit AR & contact the store
              </button>
            )}
          </model-viewer>
        ) : (
          <img
            className="product-poster"
            src={product.image || "/images/sofa.svg"}
            alt={product.name}
            fetchPriority="high"
          />
        )}
        {product.model && !active && (
          <button
            type="button"
            className="load-model"
            onClick={() => setActive(true)}
          >
            <Icon name="box" /> Explore in 3D{" "}
            <small>Load model on demand</small>
          </button>
        )}
        {!product.model && (
          <span className="viewer-badge">3D model not yet available</span>
        )}
        {active && !loaded && !error && (
          <span className="viewer-badge" role="status">
            Loading 3D model…
          </span>
        )}
        {loaded && (
          <span className="viewer-badge">Drag to rotate · pinch to zoom</span>
        )}
        {loaded && !inspect && (
          <button type="button" className="ar-floating" onClick={startAR}>
            <Icon name="box" />
            <span>
              <strong>
                {canAR ? "View in your room" : "Room-view compatibility"}
              </strong>
              <small>
                {canAR
                  ? "Place on the floor at model scale"
                  : "Available on supported phones"}
              </small>
            </span>
            <Icon name="arrow" size={16} />
          </button>
        )}
      </div>
      <Notice error={error || variantError} />
      <div className="viewer-controls">
        <span>
          <Icon name="box" size={15} />{" "}
          {loaded ? "Interactive 3D" : "Lightweight preview"}
        </span>
        <span>
          {product.width} W × {product.depth} D × {product.height} H cm
        </span>
      </div>
      {arStatus === "not-presenting" && (
        <p className="ar-return">
          Like it in your room?{" "}
          <button onClick={onReserve}>Ask the store about this finish →</button>
        </p>
      )}
      {!inspect && (
        <p className="viewer-note">
          Native AR viewers open separately and may show the default finish.
          Return here to send your selected finish to the store. Verify
          clearances with a tape measure.
        </p>
      )}
    </div>
  );
}
