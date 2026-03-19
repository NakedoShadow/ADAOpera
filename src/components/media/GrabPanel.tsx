/**
 * ADA Opera — Grab Panel (Shadow Grab + Shadow Convert)
 * Fully wired download/convert panel with status feedback.
 * State persisted in media-store across view switches.
 */

import { useRef, useCallback } from "react";
import { useMediaStore } from "../../stores/media-store";
import { useOperaStore } from "../../stores/opera-store";
import { getGrabEngine, GRAB_FORMATS } from "../../engines/grab-engine";
import { useT } from "../../lib/i18n";
import type { DownloadRequest, ConvertResult } from "../../engines/grab-engine";

type DownloadFormat = DownloadRequest["format"];
type DownloadQuality = DownloadRequest["quality"];

export function GrabPanel() {
  const t = useT();
  const store = useMediaStore();
  const opera = useOperaStore();
  const convertInputRef = useRef<HTMLInputElement>(null);

  const handleDownload = useCallback(async () => {
    const trimmed = store.grabUrl.trim();
    if (!trimmed) {
      store.setGrab({ grabStatus: "error", grabStatusMsg: "Paste a URL first" });
      return;
    }

    const engine = getGrabEngine();
    if (!engine.canDownload(trimmed)) {
      store.setGrab({ grabStatus: "error", grabStatusMsg: "URL not supported" });
      return;
    }

    let hostname = trimmed;
    try { hostname = new URL(trimmed).hostname; } catch { /* keep raw */ }

    store.setGrab({
      grabStatus: "downloading",
      grabStatusMsg: `Downloading from ${hostname}...`,
      grabLastFilename: "",
      grabLastPath: "",
      grabLastSize: 0,
    });

    const result = await engine.download({
      url: trimmed,
      format: store.grabFormat,
      quality: store.grabQuality,
      sealEnabled: store.grabSealQR || store.grabSealSnowflake,
    });

    if (result.ok) {
      store.setGrab({
        grabStatus: "done",
        grabStatusMsg: `${result.filename} (${formatSize(result.size)})`,
        grabLastFilename: result.filename,
        grabLastPath: result.path,
        grabLastSize: result.size,
      });
    } else {
      store.setGrab({
        grabStatus: "error",
        grabStatusMsg: "Download failed — is Shadow Grab running on :8106?",
      });
    }
  }, [store]);

  const handleConvert = useCallback((targetFormat: string) => {
    const input = convertInputRef.current;
    if (!input) return;
    input.dataset.targetFormat = targetFormat;
    input.click();
  }, []);

  const handleConvertFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = convertInputRef.current?.dataset.targetFormat;
    if (!file || !target) return;

    store.setGrab({
      grabStatus: "converting",
      grabStatusMsg: `Converting ${file.name} to ${target.toUpperCase()}...`,
    });

    const engine = getGrabEngine();
    const result: ConvertResult = await engine.convert({
      sourcePath: file.name,
      targetFormat: target,
    });

    if (result.ok) {
      store.setGrab({ grabStatus: "done", grabStatusMsg: `Converted: ${result.filename}` });
      if (result.path) triggerBrowserDownload(result.path, result.filename);
    } else {
      store.setGrab({ grabStatus: "error", grabStatusMsg: "Conversion failed — is Shadow Convert running on :8106?" });
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  }, [store]);

  const handleMergePDF = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf";
    input.multiple = true;
    input.onchange = async () => {
      const files = Array.from(input.files ?? []);
      if (files.length < 2) {
        store.setGrab({ grabStatus: "error", grabStatusMsg: "Select at least 2 PDFs to merge" });
        return;
      }
      store.setGrab({ grabStatus: "converting", grabStatusMsg: `Merging ${files.length} PDFs...` });
      const result = await getGrabEngine().mergePDFs(files);
      if (result.ok) {
        store.setGrab({ grabStatus: "done", grabStatusMsg: `Merged: ${result.filename}` });
        if (result.path) triggerBrowserDownload(result.path, result.filename);
      } else {
        store.setGrab({ grabStatus: "error", grabStatusMsg: "Merge failed — is Shadow Convert running?" });
      }
    };
    input.click();
  }, [store]);

  const handleResultDownload = useCallback(() => {
    if (!store.grabLastPath) return;
    const base = "http://localhost:8106";
    triggerBrowserDownload(`${base}${store.grabLastPath}`, store.grabLastFilename);
  }, [store]);

  const isWorking = store.grabStatus === "downloading" || store.grabStatus === "converting";

  return (
    <div className="media-panel grab-panel">
      <div className="panel-header">
        <span className="panel-icon">&#x2B07;</span>
        <span className="panel-title">{t("grab_title")}</span>
        <span className="panel-badge">{t("grab_sites")}</span>
      </div>
      <div className="panel-body">
        <input
          className="media-input"
          type="text"
          placeholder={t("grab_placeholder")}
          spellCheck={false}
          value={store.grabUrl}
          onChange={(e) => store.setGrab({ grabUrl: e.target.value, grabStatus: "idle" })}
          onKeyDown={(e) => e.key === "Enter" && handleDownload()}
        />
        <div className="media-actions">
          <button
            className={`media-btn primary ${isWorking ? "loading" : ""}`}
            onClick={handleDownload}
            disabled={isWorking}
          >
            {store.grabStatus === "downloading" ? t("grab_downloading") : t("grab_download")}
          </button>
          <select
            className="media-select"
            value={store.grabFormat}
            onChange={(e) => store.setGrab({ grabFormat: e.target.value as DownloadFormat })}
          >
            <option value="mp4">MP4</option>
            <option value="mp3">MP3</option>
            <option value="gif">GIF</option>
            <option value="webm">WebM</option>
            <option value="best">Best</option>
          </select>
          <select
            className="media-select"
            value={store.grabQuality}
            onChange={(e) => store.setGrab({ grabQuality: e.target.value as DownloadQuality })}
          >
            <option value="1080p">1080p</option>
            <option value="720p">720p</option>
            <option value="480p">480p</option>
            <option value="best">Best</option>
          </select>
        </div>

        {/* Status feedback */}
        {store.grabStatus !== "idle" && (
          <div className={`grab-status grab-status-${store.grabStatus}`}>
            <span className="grab-status-icon">
              {isWorking ? "..." : store.grabStatus === "done" ? "OK" : "!"}
            </span>
            <span className="grab-status-msg">{store.grabStatusMsg}</span>
            {store.grabStatus === "done" && store.grabLastPath && (
              <button className="media-btn grab-save-btn" onClick={handleResultDownload}>
                {t("grab_save")}
              </button>
            )}
          </div>
        )}

        <div className="format-tags">
          {GRAB_FORMATS.sources.slice(0, 8).map((s) => (
            <span key={s} className="format-tag">{s}</span>
          ))}
        </div>

        {/* Quick navigation + drag-to-DJ */}
        {store.grabStatus === "done" && store.grabLastPath && (
          <div className="media-nav-buttons">
            <button
              className="media-btn nav-btn dj-nav"
              onClick={() => {
                // Add downloaded file to DJ crate as a track reference
                opera.addToCrate({
                  id: `grab-${Date.now()}`,
                  url: `http://localhost:8106${store.grabLastPath}`,
                  title: store.grabLastFilename.replace(/\.[^/.]+$/, ""),
                  artist: "Shadow Grab",
                  artwork: "",
                  duration: 0,
                  bpm: 120,
                  key: "C major",
                  addedAt: Date.now(),
                  analysis: null,
                });
                opera.setActiveView("dj");
              }}
              title="Send to DJ Crate and switch to DJ view"
            >
              {t("grab_go_dj")}
            </button>
            <button
              className="media-btn nav-btn opera-nav"
              onClick={() => opera.setActiveView("orchestra")}
              title={t("grab_go_opera")}
            >
              {t("grab_go_opera")}
            </button>
          </div>
        )}
      </div>

      <div className="panel-section">
        <div className="section-label">{t("grab_seal")}</div>
        <div className="seal-options">
          <label className="seal-toggle">
            <input
              type="checkbox"
              checked={store.grabSealQR}
              onChange={(e) => store.setGrab({ grabSealQR: e.target.checked })}
            /> {t("grab_qr")}
          </label>
          <label className="seal-toggle">
            <input
              type="checkbox"
              checked={store.grabSealSnowflake}
              onChange={(e) => store.setGrab({ grabSealSnowflake: e.target.checked })}
            /> {t("grab_snowflake")}
          </label>
        </div>
      </div>

      <div className="panel-section">
        <div className="section-label">{t("grab_convert")}</div>
        <input
          ref={convertInputRef}
          type="file"
          className="dropzone-input"
          style={{ display: "none" }}
          onChange={handleConvertFileChange}
        />
        <div className="media-actions">
          <button className="media-btn" onClick={() => handleConvert("pdf")} disabled={isWorking}>PDF</button>
          <button className="media-btn" onClick={() => handleConvert("docx")} disabled={isWorking}>DOCX</button>
          <button className="media-btn" onClick={() => handleConvert("png")} disabled={isWorking}>Image</button>
          <button className="media-btn" onClick={handleMergePDF} disabled={isWorking}>Merge PDF</button>
        </div>
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function triggerBrowserDownload(url: string, filename: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
