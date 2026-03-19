/**
 * ADA Opera — Pix Panel (ShadowPix Image Editor)
 * Live canvas preview, slider controls, filter buttons.
 * State persisted in media-store across view switches.
 */

import { useRef, useCallback, useEffect } from "react";
import { useMediaStore } from "../../stores/media-store";
import { getPixEngine } from "../../engines/pix-engine";
import { useT } from "../../lib/i18n";

export function PixPanel() {
  const t = useT();
  const store = useMediaStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restore preview from engine when component remounts
  useEffect(() => {
    if (store.pixLoaded) {
      refreshPreview();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshPreview = useCallback(async () => {
    const engine = getPixEngine();
    if (!engine.isLoaded() || !canvasRef.current) return;

    const blob = await engine.toBlob();
    if (!blob) return;

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) { URL.revokeObjectURL(img.src); return; }
      const ctx = canvas.getContext("2d")!;
      const maxW = 480;
      const scale = Math.min(1, maxW / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(blob);
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const engine = getPixEngine();
    const ok = await engine.loadFromFile(file);
    if (ok) {
      const state = engine.getState();
      store.setPix({
        pixLoaded: true,
        pixFilename: file.name,
        pixBrightness: 0,
        pixContrast: 0,
        pixSaturation: 0,
        pixStatusMsg: `Loaded: ${file.name} (${state.width}x${state.height})`,
      });
      await refreshPreview();
    } else {
      store.setPix({ pixStatusMsg: "Failed to load image" });
    }
    // Reset input so same file can be re-selected
    e.target.value = "";
  }, [store, refreshPreview]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith("image/")) return;

    const engine = getPixEngine();
    const ok = await engine.loadFromFile(file);
    if (ok) {
      store.setPix({
        pixLoaded: true,
        pixFilename: file.name,
        pixBrightness: 0,
        pixContrast: 0,
        pixSaturation: 0,
        pixStatusMsg: `Loaded: ${file.name}`,
      });
      await refreshPreview();
    }
  }, [store, refreshPreview]);

  const applyAdjustment = useCallback(async (type: string, value: number) => {
    const engine = getPixEngine();
    if (!engine.isLoaded()) return;

    switch (type) {
      case "brightness": engine.applyBrightness(value); break;
      case "contrast": engine.applyContrast(value); break;
      case "saturation": engine.applySaturation(value); break;
    }
    await refreshPreview();
  }, [refreshPreview]);

  const handleFilter = useCallback(async (filter: string) => {
    const engine = getPixEngine();
    if (!engine.isLoaded()) {
      store.setPix({ pixStatusMsg: "Load an image first" });
      return;
    }

    switch (filter) {
      case "grayscale": engine.applyGrayscale(); break;
      case "sepia": engine.applySepia(); break;
      case "invert": engine.applyInvert(); break;
      case "autoenhance": engine.autoEnhance(); break;
      case "crop": {
        const s = engine.getState();
        const m = Math.floor(Math.min(s.width, s.height) * 0.1);
        engine.crop(m, m, s.width - m * 2, s.height - m * 2);
        break;
      }
      case "rotate": engine.rotate(90); break;
      case "flip": engine.flip(true); break;
      case "resize": {
        const s = engine.getState();
        engine.resize(Math.floor(s.width / 2), Math.floor(s.height / 2));
        break;
      }
    }
    store.setPix({ pixStatusMsg: `Applied: ${filter}` });
    await refreshPreview();
  }, [store, refreshPreview]);

  const handleUndo = useCallback(async () => {
    const ok = getPixEngine().undo();
    if (ok) {
      store.setPix({ pixStatusMsg: "Undo" });
      await refreshPreview();
    }
  }, [store, refreshPreview]);

  const handleExport = useCallback(async () => {
    const engine = getPixEngine();
    if (!engine.isLoaded()) return;

    const blob = await engine.toBlob();
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = store.pixFilename.replace(/\.[^.]+$/, "") + "_edited.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    store.setPix({ pixStatusMsg: "Exported!" });
  }, [store]);

  const handleNew = useCallback(() => {
    getPixEngine().dispose();
    store.resetPix();
  }, [store]);

  return (
    <div className="media-panel pix-panel">
      <div className="panel-header">
        <span className="panel-icon">&#x25C8;</span>
        <span className="panel-title">{t("pix_title")}</span>
        <span className="panel-badge">{t("pix_badge")}</span>
      </div>
      <div className="panel-body">
        {/* Single always-mounted file input — never unmounted by conditional render */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="dropzone-input"
          style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
          onChange={handleFileSelect}
        />

        {/* Dropzone / Preview */}
        {!store.pixLoaded ? (
          <div
            className="pix-dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="dropzone-text">{t("pix_drop")}</span>
          </div>
        ) : (
          <div className="pix-preview">
            <canvas ref={canvasRef} className="pix-canvas" />
            <div className="pix-preview-bar">
              <span className="pix-filename">{store.pixFilename}</span>
              <button className="media-btn pix-undo-btn" onClick={handleUndo}>{t("pix_undo")}</button>
              <button className="media-btn primary pix-export-btn" onClick={handleExport}>{t("pix_export")}</button>
              <button className="media-btn pix-new-btn" onClick={handleNew}>{t("pix_new")}</button>
            </div>
          </div>
        )}

        {/* Status */}
        {store.pixStatusMsg && (
          <div className="grab-status grab-status-done">
            <span className="grab-status-msg">{store.pixStatusMsg}</span>
          </div>
        )}

        {/* Adjustments */}
        <div className="pix-controls">
          <div className="pix-slider-group">
            <label className="pix-label">{t("pix_brightness")}</label>
            <input
              type="range"
              className="pix-slider"
              min={-100}
              max={100}
              value={store.pixBrightness}
              onChange={(e) => {
                const v = Number(e.target.value);
                store.setPix({ pixBrightness: v });
                applyAdjustment("brightness", v);
              }}
            />
            <span className="slider-value">{store.pixBrightness}</span>
          </div>
          <div className="pix-slider-group">
            <label className="pix-label">{t("pix_contrast")}</label>
            <input
              type="range"
              className="pix-slider"
              min={-100}
              max={100}
              value={store.pixContrast}
              onChange={(e) => {
                const v = Number(e.target.value);
                store.setPix({ pixContrast: v });
                applyAdjustment("contrast", v);
              }}
            />
            <span className="slider-value">{store.pixContrast}</span>
          </div>
          <div className="pix-slider-group">
            <label className="pix-label">{t("pix_saturation")}</label>
            <input
              type="range"
              className="pix-slider"
              min={-100}
              max={100}
              value={store.pixSaturation}
              onChange={(e) => {
                const v = Number(e.target.value);
                store.setPix({ pixSaturation: v });
                applyAdjustment("saturation", v);
              }}
            />
            <span className="slider-value">{store.pixSaturation}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="media-actions">
          <button className="media-btn" onClick={() => handleFilter("grayscale")}>{t("pix_grayscale")}</button>
          <button className="media-btn" onClick={() => handleFilter("sepia")}>{t("pix_sepia")}</button>
          <button className="media-btn" onClick={() => handleFilter("invert")}>{t("pix_invert")}</button>
          <button className="media-btn primary" onClick={() => handleFilter("autoenhance")}>{t("pix_auto")}</button>
        </div>
        <div className="media-actions">
          <button className="media-btn" onClick={() => handleFilter("crop")}>{t("pix_crop")}</button>
          <button className="media-btn" onClick={() => handleFilter("rotate")}>{t("pix_rotate")}</button>
          <button className="media-btn" onClick={() => handleFilter("flip")}>{t("pix_flip")}</button>
          <button className="media-btn" onClick={() => handleFilter("resize")}>{t("pix_resize")}</button>
        </div>
      </div>
    </div>
  );
}
