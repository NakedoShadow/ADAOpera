/**
 * ADA Opera — DJ Crate (Bac à Disques)
 * Session-based record collection with visual album art selection.
 *
 * Killer Vision:
 * - Records displayed as vinyl sleeves in a horizontal crate
 * - Selected record rises vertically from the crate (animation)
 * - Black banner on top: Artist + Title (white text, shadow border)
 * - Drag & drop to load onto Deck A or Deck B
 * - All session selections stored and accessible in real-time
 */

import { useRef, useCallback, useState } from "react";
import { useOperaStore } from "../../stores/opera-store";
import { getMixEngine, analyzeTrack } from "../../engines/mix-engine";
import { useT } from "../../lib/i18n";
import type { CrateTrack } from "../../engines/mix-engine";

// ─── Default artwork (gradient placeholder) ─────────────────────────────────

function generateArtworkGradient(title: string): string {
  // Generate a consistent color from title string
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash % 360);
  const h2 = (h1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${h1}, 70%, 25%), hsl(${h2}, 60%, 15%))`;
}

// ─── Crate Record (single disc in the bac) ──────────────────────────────────

interface CrateRecordProps {
  track: CrateTrack;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onLoadDeck: (deckId: "A" | "B") => void;
  onAddToQueue: () => void;
}

function CrateRecord({ track, index, isSelected, onSelect, onLoadDeck, onAddToQueue }: CrateRecordProps) {
  const [dragTarget, setDragTarget] = useState<"A" | "B" | null>(null);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ crateIndex: index }));
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      className={`crate-record ${isSelected ? "selected" : ""}`}
      onClick={onSelect}
      draggable
      onDragStart={handleDragStart}
    >
      {/* Vinyl sleeve / artwork */}
      <div
        className="crate-sleeve"
        style={{
          background: track.artwork
            ? `url(${track.artwork}) center/cover`
            : generateArtworkGradient(track.title),
        }}
      >
        {/* Vinyl disc peeking from sleeve */}
        <div className="crate-vinyl-peek" />
      </div>

      {/* Banner overlay: Artist + Title (the killer vision) */}
      <div className="crate-banner">
        <span className="crate-artist">{track.artist}</span>
        <span className="crate-title">{track.title}</span>
      </div>

      {/* BPM / Key badges */}
      <div className="crate-badges">
        <span className="crate-badge bpm">{track.bpm.toFixed(0)}</span>
        <span className="crate-badge key">{track.key}</span>
      </div>

      {/* Quick load buttons (visible on hover / selected) */}
      {isSelected && (
        <div className="crate-load-buttons">
          <button className="crate-load-btn deck-a" onClick={(e) => { e.stopPropagation(); onLoadDeck("A"); }}>
            DECK A
          </button>
          <button className="crate-load-btn deck-b" onClick={(e) => { e.stopPropagation(); onLoadDeck("B"); }}>
            DECK B
          </button>
          <button className="crate-load-btn queue-btn" onClick={(e) => { e.stopPropagation(); onAddToQueue(); }}>
            QUEUE ▶
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Audio File Ingestion ────────────────────────────────────────────────────

const AUDIO_EXTENSIONS = /\.(mp3|wav|ogg|flac|aac|m4a|webm|wma|opus|aiff?)$/i;

function isAudioFile(f: File): boolean {
  return f.type.startsWith("audio/") || AUDIO_EXTENSIONS.test(f.name);
}

async function ingestAudioFiles(
  files: File[],
  addToCrate: (track: CrateTrack) => void
): Promise<void> {
  const audioFiles = files.filter(isAudioFile);
  if (audioFiles.length === 0) return;

  for (const file of audioFiles) {
    try {
      const ctx = new AudioContext();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const analysis = analyzeTrack(audioBuffer);
      ctx.close();

      const track: CrateTrack = {
        id: `crate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        url: URL.createObjectURL(file),
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: "Unknown Artist",
        artwork: "",
        duration: audioBuffer.duration,
        bpm: analysis.bpm,
        key: analysis.key,
        addedAt: Date.now(),
        analysis,
      };

      addToCrate(track);
    } catch (err) {
      console.warn("[DJCrate] Failed to analyze file:", file.name, err);
    }
  }
}

// ─── File Drop Zone (small inline card) ─────────────────────────────────────

function CrateDropZone({ onBrowse }: { onBrowse: () => void }) {
  const t = useT();
  const addToCrate = useOperaStore((s) => s.addToCrate);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    await ingestAudioFiles(Array.from(e.dataTransfer.files), addToCrate);
  }, [addToCrate]);

  return (
    <div
      className={`crate-dropzone ${isDragOver ? "drag-over" : ""}`}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={onBrowse}
      title={t("crate_browse")}
    >
      <span className="dropzone-icon">+</span>
      <span className="dropzone-text">{t("crate_drop_files").split("\n").map((l, i) => <span key={i}>{l}<br/></span>)}</span>
    </div>
  );
}

// ─── Main DJ Crate ──────────────────────────────────────────────────────────

export function DJCrate() {
  const t = useT();
  const djCrate = useOperaStore((s) => s.djCrate);
  const selectedIndex = useOperaStore((s) => s.selectedCrateIndex);
  const crateOpen = useOperaStore((s) => s.crateOpen);
  const selectTrack = useOperaStore((s) => s.selectCrateTrack);
  const toggleCrate = useOperaStore((s) => s.toggleCrate);
  const removeFromCrate = useOperaStore((s) => s.removeFromCrate);
  const addToQueue = useOperaStore((s) => s.addToQueue);
  const addToCrate = useOperaStore((s) => s.addToCrate);
  const crateRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [containerDragOver, setContainerDragOver] = useState(false);

  const handleLoadDeck = useCallback(async (deckId: "A" | "B", index: number) => {
    const track = djCrate[index];
    if (!track) return;

    try {
      await getMixEngine().loadTrackFromCrate(deckId, track);
    } catch (err) {
      console.warn("[DJCrate] Failed to load track to deck:", err);
    }
  }, [djCrate]);

  // Handle drop on deck areas (from crate record drag)
  const handleDeckDrop = useCallback((deckId: "A" | "B") => (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (typeof data.crateIndex === "number") {
        handleLoadDeck(deckId, data.crateIndex);
      }
    } catch { /* invalid drop */ }
  }, [handleLoadDeck]);

  // Handle file drop on entire crate container (the big catch-all)
  const handleContainerDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setContainerDragOver(false);

    // Only process if actual files are being dropped (not internal crate drag)
    if (e.dataTransfer.files.length > 0) {
      await ingestAudioFiles(Array.from(e.dataTransfer.files), addToCrate);
    }
  }, [addToCrate]);

  const handleContainerDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Only show overlay for file drags, not internal record drags
    if (e.dataTransfer.types.includes("Files")) {
      setContainerDragOver(true);
    }
  }, []);

  // Hidden file input for click-to-browse fallback
  const openFileBrowser = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await ingestAudioFiles(Array.from(files), addToCrate);
    // Reset so the same file can be re-selected
    e.target.value = "";
  }, [addToCrate]);

  return (
    <div
      className={`dj-crate ${crateOpen ? "open" : "collapsed"} ${containerDragOver ? "file-drag-over" : ""}`}
      onDragOver={handleContainerDragOver}
      onDragLeave={(e) => {
        // Only clear if leaving the container itself (not entering a child)
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setContainerDragOver(false);
        }
      }}
      onDrop={handleContainerDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.flac,.aac,.m4a,.webm,.wma,.opus,.aiff"
        multiple
        style={{ display: "none" }}
        onChange={handleFileInputChange}
      />

      {/* File drag overlay (covers entire crate when dragging files from OS) */}
      {containerDragOver && (
        <div className="crate-file-overlay">
          <div className="crate-file-overlay-content">
            <span className="overlay-icon">♫</span>
            <span className="overlay-text">{t("crate_drop_overlay")}</span>
          </div>
        </div>
      )}

      {/* Crate header */}
      <div className="crate-header" onClick={toggleCrate}>
        <span className="crate-icon">◉</span>
        <span className="section-label">{t("crate_title")}</span>
        <span className="crate-count">{t("crate_discs", { count: djCrate.length })}</span>
        <span className="crate-toggle">{crateOpen ? "▼" : "▲"}</span>
      </div>

      {crateOpen && (
        <>
          {/* Deck drop targets */}
          <div className="crate-deck-targets">
            <div
              className="crate-deck-target deck-a"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDeckDrop("A")}
            >
              {t("crate_drop_deck_a")}
            </div>
            <div
              className="crate-deck-target deck-b"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDeckDrop("B")}
            >
              {t("crate_drop_deck_b")}
            </div>
          </div>

          {/* Record crate (horizontal scrollable) */}
          <div className="crate-records" ref={crateRef}>
            {djCrate.map((track, i) => (
              <CrateRecord
                key={track.id}
                track={track}
                index={i}
                isSelected={i === selectedIndex}
                onSelect={() => selectTrack(i === selectedIndex ? -1 : i)}
                onLoadDeck={(deckId) => handleLoadDeck(deckId, i)}
                onAddToQueue={() => addToQueue(track)}
              />
            ))}

            {/* Drop zone card + click-to-browse */}
            <CrateDropZone onBrowse={openFileBrowser} />
          </div>

          {/* Selected track detail panel */}
          {selectedIndex >= 0 && selectedIndex < djCrate.length && (
            <div className="crate-detail">
              <div className="crate-detail-art"
                style={{
                  background: djCrate[selectedIndex].artwork
                    ? `url(${djCrate[selectedIndex].artwork}) center/cover`
                    : generateArtworkGradient(djCrate[selectedIndex].title),
                }}
              />
              <div className="crate-detail-info">
                <div className="crate-detail-artist">{djCrate[selectedIndex].artist}</div>
                <div className="crate-detail-title">{djCrate[selectedIndex].title}</div>
                <div className="crate-detail-meta">
                  <span>{djCrate[selectedIndex].bpm.toFixed(0)} BPM</span>
                  <span>{djCrate[selectedIndex].key}</span>
                  <span>{formatDuration(djCrate[selectedIndex].duration)}</span>
                </div>
              </div>
              <button
                className="crate-remove-btn"
                onClick={() => removeFromCrate(djCrate[selectedIndex].id)}
                title={t("crate_remove")}
              >
                ×
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
