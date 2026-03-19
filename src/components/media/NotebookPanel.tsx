/**
 * ADA Opera — NotebookLM Panel
 * "Sortie de Pot" — Content generation via Google NotebookLM.
 * Generates podcasts, videos, shorts, reports, infographics from any source.
 */

import { useState, useCallback } from "react";
import {
  checkStatus,
  quickPodcast,
  quickVideo,
  quickShorts,
  runPipeline,
  type ArtifactType,
  type AudioFormat,
  type VideoStyle,
  type NotebookSource,
} from "../../engines/notebook-engine";

type PanelMode = "quick" | "pipeline" | "empire";
type QuickAction = "podcast" | "video" | "shorts";

export function NotebookPanel() {
  const [mode, setMode] = useState<PanelMode>("quick");
  const [status, setStatus] = useState<string>("");
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Quick mode
  const [quickAction, setQuickAction] = useState<QuickAction>("podcast");
  const [sourceInput, setSourceInput] = useState("");
  const [sourceType, setSourceType] = useState<"url" | "youtube" | "text">("url");
  const [audioFormat, setAudioFormat] = useState<AudioFormat>("deep-dive");
  const [videoStyle, setVideoStyle] = useState<VideoStyle>("whiteboard");
  const [language, setLanguage] = useState("fr");

  // Pipeline mode
  const [pipelineName, setPipelineName] = useState("");
  const [pipelineSources, setPipelineSources] = useState("");
  const [selectedArtifacts, setSelectedArtifacts] = useState<ArtifactType[]>(["audio", "report"]);

  // Results
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [lastResult, setLastResult] = useState<Record<string, any> | null>(null);

  const handleCheckStatus = useCallback(async () => {
    setStatus("Checking connection...");
    const result = await checkStatus();
    setIsConnected(result.ok);
    setStatus(result.ok ? `Connected (${result.mode} mode)` : result.error || "Offline");
  }, []);

  const handleQuickAction = useCallback(async () => {
    if (!sourceInput.trim()) {
      setStatus("Enter a source (URL, YouTube link, or text)");
      return;
    }
    setIsRunning(true);
    setStatus(`Generating ${quickAction}...`);

    let result: Record<string, unknown>;
    switch (quickAction) {
      case "podcast":
        result = await quickPodcast(sourceInput, sourceType, audioFormat, language);
        break;
      case "video":
        result = await quickVideo(sourceInput, sourceType, videoStyle);
        break;
      case "shorts":
        result = await quickShorts(sourceInput, sourceInput.length > 200 ? sourceInput : "");
        break;
    }

    setLastResult(result);
    setIsRunning(false);
    setStatus(result.ok ? `Done! ${String(result.local_path || "")}` : `Error: ${String(result.error)}`);
  }, [sourceInput, sourceType, quickAction, audioFormat, videoStyle, language]);

  const handlePipeline = useCallback(async () => {
    if (!pipelineName.trim()) {
      setStatus("Enter a notebook name");
      return;
    }
    setIsRunning(true);
    setStatus("Running pipeline...");

    const sources: NotebookSource[] = pipelineSources
      .split("\n")
      .filter((l) => l.trim())
      .map((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("http")) {
          const isYT = trimmed.includes("youtube.com") || trimmed.includes("youtu.be");
          return { type: isYT ? "youtube" : "url", value: trimmed, title: "" } as NotebookSource;
        }
        return { type: "text" as const, value: trimmed, title: "" };
      });

    const result = await runPipeline(
      {
        name: pipelineName,
        sources,
        language,
        audioFormat,
        videoStyle,
      },
      selectedArtifacts,
    );

    setLastResult(result);
    setIsRunning(false);
    setStatus(result.ok ? "Pipeline complete!" : `Error: ${String(result.error)}`);
  }, [pipelineName, pipelineSources, selectedArtifacts, language, audioFormat, videoStyle]);

  const toggleArtifact = (art: ArtifactType) => {
    setSelectedArtifacts((prev) =>
      prev.includes(art) ? prev.filter((a) => a !== art) : [...prev, art],
    );
  };

  return (
    <div className="media-panel notebook-panel">
      <div className="panel-header">
        <span className="panel-icon">&#x1F4D3;</span>
        <span className="panel-title">NotebookLM</span>
        <span className="panel-badge">PREMIUM</span>
        <button
          className="media-btn"
          onClick={handleCheckStatus}
          style={{ marginLeft: "auto", fontSize: "10px" }}
        >
          {isConnected === null ? "CHECK" : isConnected ? "ONLINE" : "OFFLINE"}
        </button>
      </div>

      <div className="panel-body">
        {/* Mode Tabs */}
        <div className="media-actions" style={{ marginBottom: 8 }}>
          {(["quick", "pipeline"] as PanelMode[]).map((m) => (
            <button
              key={m}
              className={`media-btn ${mode === m ? "active" : ""}`}
              onClick={() => setMode(m)}
            >
              {m === "quick" ? "Quick" : "Pipeline"}
            </button>
          ))}
        </div>

        {/* ── Quick Mode ─────────────────────────── */}
        {mode === "quick" && (
          <>
            {/* Action selector */}
            <div className="media-actions" style={{ marginBottom: 8 }}>
              {(["podcast", "video", "shorts"] as QuickAction[]).map((a) => (
                <button
                  key={a}
                  className={`media-btn ${quickAction === a ? "active" : ""}`}
                  onClick={() => setQuickAction(a)}
                >
                  {a === "podcast" ? "Podcast" : a === "video" ? "Video" : "Shorts"}
                </button>
              ))}
            </div>

            {/* Source input */}
            <div className="panel-section">
              <div className="section-label">SOURCE</div>
              <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                {(["url", "youtube", "text"] as const).map((st) => (
                  <button
                    key={st}
                    className={`media-btn ${sourceType === st ? "active" : ""}`}
                    onClick={() => setSourceType(st)}
                    style={{ fontSize: 9 }}
                  >
                    {st.toUpperCase()}
                  </button>
                ))}
              </div>
              <textarea
                className="notebook-input"
                placeholder={
                  sourceType === "url"
                    ? "https://example.com/article..."
                    : sourceType === "youtube"
                      ? "https://youtube.com/watch?v=..."
                      : "Paste text content here..."
                }
                value={sourceInput}
                onChange={(e) => setSourceInput(e.target.value)}
                rows={3}
              />
            </div>

            {/* Options */}
            <div className="panel-section">
              <div className="section-label">OPTIONS</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {quickAction === "podcast" && (
                  <select
                    className="notebook-select"
                    value={audioFormat}
                    onChange={(e) => setAudioFormat(e.target.value as AudioFormat)}
                  >
                    <option value="deep-dive">Deep Dive</option>
                    <option value="brief">Brief</option>
                    <option value="critique">Critique</option>
                    <option value="debate">Debate</option>
                  </select>
                )}
                {(quickAction === "video" || quickAction === "shorts") && (
                  <select
                    className="notebook-select"
                    value={videoStyle}
                    onChange={(e) => setVideoStyle(e.target.value as VideoStyle)}
                  >
                    <option value="whiteboard">Whiteboard</option>
                    <option value="anime">Anime</option>
                    <option value="kawaii">Kawaii</option>
                    <option value="cinematic">Cinematic</option>
                    <option value="cinematic-documentary">Cinematic Documentary</option>
                    <option value="cinematic-explainer">Cinematic Explainer</option>
                    <option value="minimal">Minimal</option>
                  </select>
                )}
                <select
                  className="notebook-select"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="fr">Francais</option>
                  <option value="en">English</option>
                  <option value="es">Espanol</option>
                  <option value="de">Deutsch</option>
                  <option value="ja">Japanese</option>
                </select>
              </div>
            </div>

            {/* Generate button */}
            <button
              className="media-btn generate-btn"
              onClick={handleQuickAction}
              disabled={isRunning}
              style={{ width: "100%", marginTop: 8 }}
            >
              {isRunning ? "Generating..." : `Generate ${quickAction.charAt(0).toUpperCase() + quickAction.slice(1)}`}
            </button>
          </>
        )}

        {/* ── Pipeline Mode ──────────────────────── */}
        {mode === "pipeline" && (
          <>
            <div className="panel-section">
              <div className="section-label">NOTEBOOK NAME</div>
              <input
                className="notebook-input"
                type="text"
                placeholder="Shadow Research — Topic..."
                value={pipelineName}
                onChange={(e) => setPipelineName(e.target.value)}
              />
            </div>

            <div className="panel-section">
              <div className="section-label">SOURCES (one per line)</div>
              <textarea
                className="notebook-input"
                placeholder={"https://example.com/article\nhttps://youtube.com/watch?v=...\nPaste text here..."}
                value={pipelineSources}
                onChange={(e) => setPipelineSources(e.target.value)}
                rows={4}
              />
            </div>

            <div className="panel-section">
              <div className="section-label">ARTIFACTS</div>
              <div className="media-actions" style={{ flexWrap: "wrap" }}>
                {(
                  [
                    ["audio", "Podcast"],
                    ["video", "Video"],
                    ["cinematic_video", "Cinematic"],
                    ["report", "Report"],
                    ["infographic", "Infographic"],
                    ["slides", "Slides"],
                    ["quiz", "Quiz"],
                    ["flashcards", "Flashcards"],
                    ["mind_map", "Mind Map"],
                  ] as [ArtifactType, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    className={`media-btn ${selectedArtifacts.includes(key) ? "active" : ""}`}
                    onClick={() => toggleArtifact(key)}
                    style={{ fontSize: 9 }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="media-btn generate-btn"
              onClick={handlePipeline}
              disabled={isRunning}
              style={{ width: "100%", marginTop: 8 }}
            >
              {isRunning ? "Running Pipeline..." : "Run Pipeline"}
            </button>
          </>
        )}

        {/* Status */}
        {status && (
          <div
            className={`grab-status ${
              status.includes("Error") || status.includes("Offline")
                ? "grab-status-error"
                : status.includes("Done") || status.includes("Connected") || status.includes("complete")
                  ? "grab-status-done"
                  : ""
            }`}
            style={{ marginTop: 8 }}
          >
            <span className="grab-status-msg">{status}</span>
          </div>
        )}

        {/* Result preview */}
        {lastResult?.ok && (
          <div className="panel-section" style={{ marginTop: 8 }}>
            <div className="section-label">OUTPUT</div>
            <div style={{ fontSize: 10, opacity: 0.7, wordBreak: "break-all" }}>
              {lastResult.local_path && <div>File: {String(lastResult.local_path)}</div>}
              {lastResult.drive_folder && <div>Drive: {String(lastResult.drive_folder)}</div>}
              {lastResult.notebook_id && <div>Notebook: {String(lastResult.notebook_id)}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
