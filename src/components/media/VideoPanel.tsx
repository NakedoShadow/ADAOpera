/**
 * ADA Opera — Video Panel (Browser-Native Video Engine)
 * HTML5 video player with speed/volume controls, filters, and export.
 * State persisted in media-store across view switches.
 */

import { useRef, useCallback, useEffect } from "react";
import { useMediaStore } from "../../stores/media-store";
import { useOperaStore } from "../../stores/opera-store";
import { getPlaybackBus } from "../../engines/playback-bus";
import { useT } from "../../lib/i18n";

export function VideoPanel() {
  const t = useT();
  const store = useMediaStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const operaStore = useOperaStore();

  // Connect video element to PlaybackBus when it mounts (or remounts after view switch)
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !store.videoLoaded) return;

    // Register with the universal PlaybackBus so transport controls this video
    // and all visualizers display its audio signal
    const bus = getPlaybackBus();
    bus.connectMediaElement(v, store.videoFilename);
    operaStore.setSourceType(bus.getState().sourceType);
    operaStore.setMediaTitle(store.videoFilename);
  }, [store.videoLoaded, store.videoFilename]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync playbackRate + volume + filter whenever video element mounts or values change
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !store.videoLoaded) return;
    v.playbackRate = store.videoSpeed;
    v.volume = Math.min(1, store.videoVolume / 100);

    const filterMap: Record<string, string> = {
      grayscale: "grayscale(1)",
      sepia: "sepia(1)",
      blur: "blur(3px)",
      invert: "invert(1)",
    };
    v.style.filter = filterMap[store.videoFilter] ?? "";
  }, [store.videoLoaded, store.videoSpeed, store.videoVolume, store.videoFilter]);

  const loadFile = useCallback((file: File) => {
    // Revoke old URL
    if (store.videoBlobUrl) URL.revokeObjectURL(store.videoBlobUrl);

    const url = URL.createObjectURL(file);
    store.setVideo({
      videoLoaded: true,
      videoFilename: file.name,
      videoBlobUrl: url,
      videoFileSize: file.size,
      videoStatusMsg: `Loaded: ${file.name} (${formatSize(file.size)})`,
      videoFilter: "",
    });
  }, [store]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  }, [loadFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("video/")) loadFile(file);
  }, [loadFile]);

  const handleFilter = useCallback((filter: string) => {
    const next = filter === store.videoFilter ? "" : filter;
    store.setVideo({
      videoFilter: next,
      videoStatusMsg: next ? `Filter: ${next}` : "Filter removed",
    });
  }, [store]);

  const handleExportFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      store.setVideo({ videoStatusMsg: t("video_play_first") });
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `frame_${Math.floor(video.currentTime * 1000)}ms.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      store.setVideo({ videoStatusMsg: `Frame exported at ${video.currentTime.toFixed(2)}s` });
    }, "image/png");
  }, [store]);

  return (
    <div className="media-panel video-panel">
      <div className="panel-header">
        <span className="panel-icon">&#x25B6;</span>
        <span className="panel-title">{t("video_title")}</span>
        <span className="panel-badge">{t("video_badge")}</span>
      </div>
      <div className="panel-body">
        {/* Single always-mounted file input — never unmounted by conditional render */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="dropzone-input"
          style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
          onChange={handleFileSelect}
        />

        {/* Dropzone / Video Player */}
        {!store.videoLoaded ? (
          <div
            className="pix-dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="dropzone-text">{t("video_drop")}</span>
          </div>
        ) : (
          <div className="video-preview">
            <video
              ref={videoRef}
              className="video-player"
              src={store.videoBlobUrl}
              controls
              preload="auto"
            />
            <div className="pix-preview-bar">
              <span className="pix-filename">{store.videoFilename}</span>
              <button className="media-btn" onClick={handleExportFrame}>{t("video_capture")}</button>
              <button className="media-btn pix-new-btn" onClick={() => {
                getPlaybackBus().disconnectMedia();
                operaStore.setSourceType("none");
                operaStore.setMediaTitle("");
                store.resetVideo();
              }}>{t("video_new")}</button>
              <button className="media-btn" onClick={() => fileInputRef.current?.click()}>
                {t("video_change")}
              </button>
            </div>
            {/* Quick nav buttons */}
            <div className="media-nav-buttons">
              <button
                className="media-btn nav-btn dj-nav"
                onClick={() => {
                  // Add current video to DJ crate as audio source
                  if (store.videoBlobUrl) {
                    operaStore.addToCrate({
                      id: `video-${Date.now()}`,
                      url: store.videoBlobUrl,
                      title: store.videoFilename.replace(/\.[^/.]+$/, ""),
                      artist: "Video Engine",
                      artwork: "",
                      duration: 0,
                      bpm: 120,
                      key: "C major",
                      addedAt: Date.now(),
                      analysis: null,
                    });
                  }
                  operaStore.setActiveView("dj");
                }}
                title={t("grab_go_dj")}
              >
                {t("grab_go_dj")}
              </button>
              <button
                className="media-btn nav-btn opera-nav"
                onClick={() => operaStore.setActiveView("orchestra")}
                title={t("grab_go_opera")}
              >
                {t("grab_go_opera")}
              </button>
            </div>
          </div>
        )}

        {/* Status */}
        {store.videoStatusMsg && (
          <div className="grab-status grab-status-done">
            <span className="grab-status-msg">{store.videoStatusMsg}</span>
          </div>
        )}

        {/* Controls */}
        <div className="video-controls">
          <div className="pix-slider-group">
            <label className="pix-label">{t("video_speed")}</label>
            <input
              type="range"
              className="pix-slider"
              min={0.25}
              max={4}
              step={0.25}
              value={store.videoSpeed}
              onChange={(e) => store.setVideo({ videoSpeed: Number(e.target.value) })}
            />
            <span className="slider-value">{store.videoSpeed}x</span>
          </div>
          <div className="pix-slider-group">
            <label className="pix-label">{t("video_volume")}</label>
            <input
              type="range"
              className="pix-slider"
              min={0}
              max={100}
              value={store.videoVolume}
              onChange={(e) => store.setVideo({ videoVolume: Number(e.target.value) })}
            />
            <span className="slider-value">{store.videoVolume}%</span>
          </div>
        </div>

        {/* Actions */}
        <div className="media-actions">
          <button className="media-btn" onClick={handleExportFrame}>{t("video_frames")}</button>
          <button className="media-btn" onClick={() => store.setVideo({ videoStatusMsg: "Audio extraction requires Shadow Convert on :8106" })}>{t("video_extract_audio")}</button>
        </div>

        {/* Filters */}
        <div className="panel-section">
          <div className="section-label">FILTERS</div>
          <div className="media-actions">
            {["grayscale", "sepia", "blur", "invert"].map((f) => (
              <button
                key={f}
                className={`media-btn ${store.videoFilter === f ? "active" : ""}`}
                onClick={() => handleFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
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
