/**
 * ADA Opera — La Voix de la Reine
 * Main Application Shell
 *
 * CRYSTALLINE (Clarity) + VIVALDI (Fluidity) = Absolute Digital Clarity
 * 12 Features × 4 SubSkills × 4 DeepSkills = 256 nodes
 * 32 instruments | Rituala Engine | DJ Turntables | Galaxy of Visualizers
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useOperaStore, type ViewMode } from "./stores/opera-store";
import { getConductor } from "./engines/audio-engine";
import { getPlaybackBus } from "./engines/playback-bus";
import { getScribe } from "./engines/scribe-engine";
import { TransportBar } from "./components/layout/TransportBar";
import { Sidebar } from "./components/layout/Sidebar";
import { PianoKeyboard } from "./components/instruments/PianoKeyboard";
import { Turntable } from "./components/turntable/Turntable";
import { Waveform } from "./components/visualizers/Waveform";
import { FFTAnalyzer } from "./components/visualizers/FFTAnalyzer";
import { Spectrogram } from "./components/visualizers/Spectrogram";
import { VUMeter } from "./components/visualizers/VUMeter";
import { PhaseScope } from "./components/visualizers/PhaseScope";
import { MixerChannel } from "./components/mixer/MixerChannel";
import { DJMixer } from "./components/dj/DJMixer";
import { DJCrate } from "./components/dj/DJCrate";
import { ORCHESTRA_REGISTRY } from "./engines/orchestra-registry";
import { countNodes } from "./lib/feature-tree";
import { ScoreViewer } from "./components/partition/ScoreViewer";
import { getMixEngine } from "./engines/mix-engine";
import { getRegisteredCount } from "./engines/deepskill-handler";
import { GrabPanel } from "./components/media/GrabPanel";
import { PixPanel } from "./components/media/PixPanel";
import { VideoPanel } from "./components/media/VideoPanel";
import { NotebookPanel } from "./components/media/NotebookPanel";
import { BalletVisualizer } from "./components/visualizers/BalletVisualizer";
import { useT } from "./lib/i18n";
import "./App.css";

// ─── View Components ─────────────────────────────────────────────────────────

function InstrumentCard({ inst }: { inst: typeof ORCHESTRA_REGISTRY[0] }) {
  const conductor = getConductor();
  const t = useT();
  const [playing, setPlaying] = useState(false);

  const handleClick = () => {
    if (playing) {
      conductor.triggerRelease(inst.id, inst.range.low);
      setPlaying(false);
    } else {
      conductor.triggerAttack(inst.id, inst.range.low, 0.7);
      setPlaying(true);
      setTimeout(() => {
        conductor.triggerRelease(inst.id, inst.range.low);
        setPlaying(false);
      }, 1500);
    }
  };

  return (
    <div
      className={`instrument-card ${playing ? "inst-playing" : ""}`}
      onClick={handleClick}
      title={t("click_to_play", { name: inst.nameFr })}
    >
      <span className="inst-name">{inst.nameFr}</span>
      <span className="inst-range">{inst.range.low}-{inst.range.high}</span>
      <span className="inst-play-icon">{playing ? "♫" : "▶"}</span>
    </div>
  );
}

const SECTION_I18N: Record<string, string> = {
  strings: "section_strings", woodwinds: "section_woodwinds", brass: "section_brass",
  percussion: "section_percussion", keyboard: "section_keyboard",
};

function OrchestraView() {
  const t = useT();
  return (
    <div className="view orchestra-view">
      <div className="view-header">
        <h2 className="view-title">{t("orchestra_title")}</h2>
        <span className="view-subtitle">{t("orchestra_subtitle", { count: ORCHESTRA_REGISTRY.length, sections: 4 })}</span>
      </div>

      {/* Orchestra sections */}
      <div className="orchestra-sections">
        {["strings", "woodwinds", "brass", "percussion", "keyboard"].map((section) => {
          const instruments = ORCHESTRA_REGISTRY.filter((i) => i.section === section || (section === "keyboard" && i.section === "continuo"));
          return (
            <div key={section} className="orchestra-section">
              <div className="section-label">{t(SECTION_I18N[section])}</div>
              <div className="section-instruments">
                {instruments.map((inst) => (
                  <InstrumentCard key={inst.id} inst={inst} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Piano keyboard */}
      <div className="piano-section">
        <div className="section-label">{t("orchestra_piano")}</div>
        <PianoKeyboard octaves={4} startOctave={3} width={800} height={140} />
      </div>

      {/* Visualizers */}
      <div className="viz-row">
        <div className="viz-card">
          <div className="viz-label">{t("viz_waveform")}</div>
          <Waveform width={380} height={100} />
        </div>
        <div className="viz-card">
          <div className="viz-label">{t("viz_vu")}</div>
          <VUMeter width={380} height={24} />
        </div>
      </div>
    </div>
  );
}

function StudioView() {
  const t = useT();
  const activeInstruments = useOperaStore((s) => s.activeInstruments);
  return (
    <div className="view studio-view">
      <div className="view-header">
        <h2 className="view-title">{t("studio_title")}</h2>
        <span className="view-subtitle">{t("studio_subtitle")}</span>
      </div>

      {/* Mixer channels */}
      <div className="mixer-panel">
        {activeInstruments.map((id) => {
          const def = ORCHESTRA_REGISTRY.find((i) => i.id === id);
          return (
            <MixerChannel
              key={id}
              instrumentId={id}
              name={def?.nameFr ?? id}
              color="#0055FF"
            />
          );
        })}
        <MixerChannel instrumentId="master" name="MASTER" color="#7C3AED" />
      </div>

      {/* Visualizers */}
      <div className="viz-row">
        <div className="viz-card">
          <div className="viz-label">{t("viz_fft")}</div>
          <FFTAnalyzer width={500} height={180} barCount={64} />
        </div>
        <div className="viz-card">
          <div className="viz-label">{t("viz_phase")}</div>
          <PhaseScope size={180} />
        </div>
      </div>
    </div>
  );
}

function KaraokeFullscreen({ lyrics, currentLine, onClose }: {
  lyrics: string[];
  currentLine: number;
  onClose: () => void;
}) {
  const t = useT();
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const visibleLines = lyrics.length > 0
    ? lyrics.slice(Math.max(0, currentLine - 2), currentLine + 4)
    : [];
  const currentOffset = Math.min(2, currentLine);

  return (
    <div className="karaoke-fullscreen" onClick={onClose}>
      <div className="karaoke-fs-close" title="ESC to close">×</div>
      <div className="karaoke-fs-content" onClick={(e) => e.stopPropagation()}>
        {visibleLines.length > 0 ? (
          visibleLines.map((line, i) => {
            const isCurrent = i === currentOffset;
            const isPrev = i < currentOffset;
            return (
              <div
                key={`${currentLine}-${i}`}
                className={`karaoke-fs-line ${isCurrent ? "current" : isPrev ? "previous" : "next"}`}
              >
                {line}
              </div>
            );
          })
        ) : (
          <div className="karaoke-fs-waiting">
            {t("karaoke_waiting")}
          </div>
        )}
      </div>
      <div className="karaoke-fs-badge">{t("karaoke_badge")}</div>
    </div>
  );
}

const DJ_SKIN_I18N: Record<string, string> = {
  vinyl: "dj_skin_vinyl", cdj: "dj_skin_cdj", oldschool: "dj_skin_oldschool", futuristic: "dj_skin_futuristic",
};
const DJ_MODE_I18N: Record<string, string> = {
  manual: "dj_manual", auto: "dj_auto", karaoke: "dj_karaoke", remix: "dj_remix",
};

function DJView() {
  const t = useT();
  const djSkin = useOperaStore((s) => s.djSkin);
  const setDJSkin = useOperaStore((s) => s.setDJSkin);
  const mixMode = useOperaStore((s) => s.mixMode);
  const setMixMode = useOperaStore((s) => s.setMixMode);
  const karaokeActive = useOperaStore((s) => s.karaokeActive);
  const setKaraokeActive = useOperaStore((s) => s.setKaraokeActive);
  const karaokeFullscreen = useOperaStore((s) => s.karaokeFullscreen);
  const setKaraokeFullscreen = useOperaStore((s) => s.setKaraokeFullscreen);
  const karaokeLyrics = useOperaStore((s) => s.karaokeLyrics);
  const karaokeCurrentLine = useOperaStore((s) => s.karaokeCurrentLine);
  const remixStyle = useOperaStore((s) => s.remixStyle);
  const setRemixStyle = useOperaStore((s) => s.setRemixStyle);

  return (
    <div className="view dj-view">
      {/* Header with skin selector + mode selector */}
      <div className="view-header">
        <h2 className="view-title">{t("dj_title")}</h2>
        <div className="dj-mode-controls">
          <div className="dj-skin-selector">
            {(["vinyl", "cdj", "oldschool", "futuristic"] as const).map((skin) => (
              <button
                key={skin}
                className={`skin-btn ${djSkin === skin ? "active" : ""}`}
                onClick={() => setDJSkin(skin)}
              >
                {t(DJ_SKIN_I18N[skin])}
              </button>
            ))}
          </div>
          <div className="dj-mode-selector">
            {(["manual", "auto", "karaoke", "remix"] as const).map((mode) => (
              <button
                key={mode}
                className={`mode-btn ${mixMode === mode ? "active" : ""}`}
                onClick={() => setMixMode(mode)}
              >
                {t(DJ_MODE_I18N[mode])}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main DJ layout: Turntables + Mixer */}
      <div className="dj-main-layout">
        {/* Deck A: Turntable */}
        <div className="dj-deck-section">
          <Turntable size={220} deckId="A" />
          <div className="deck-waveform">
            <div className="viz-label">DECK A</div>
            <Waveform width={220} height={60} color="#0055FF" />
          </div>
        </div>

        {/* Center: Mixer Console */}
        <DJMixer />

        {/* Deck B: Turntable */}
        <div className="dj-deck-section">
          <Turntable size={220} deckId="B" />
          <div className="deck-waveform">
            <div className="viz-label">DECK B</div>
            <Waveform width={220} height={60} color="#7C3AED" />
          </div>
        </div>
      </div>

      {/* Karaoke mode overlay */}
      {mixMode === "karaoke" && (
        <div className="karaoke-panel">
          <div className="karaoke-header">
            <span className="section-label">{t("karaoke_title")}</span>
            <div className="karaoke-controls">
              <button
                className={`deck-btn ${karaokeActive ? "active" : ""}`}
                onClick={() => setKaraokeActive(!karaokeActive)}
              >
                {karaokeActive ? t("karaoke_stop") : t("karaoke_start")}
              </button>
              <button
                className="deck-btn karaoke-fs-btn"
                onClick={() => setKaraokeFullscreen(true)}
                title={t("karaoke_fullscreen")}
              >
                {t("karaoke_fullscreen")}
              </button>
            </div>
          </div>
          <div className="karaoke-lyrics">
            {karaokeLyrics.length > 0 ? (
              karaokeLyrics.slice(Math.max(0, karaokeCurrentLine - 1), karaokeCurrentLine + 3).map((line, i) => (
                <div
                  key={i}
                  className={`karaoke-line ${i === 1 ? "current" : i === 0 ? "previous" : "next"}`}
                >
                  {line}
                </div>
              ))
            ) : (
              <div className="karaoke-placeholder">
                {t("karaoke_placeholder")}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Karaoke fullscreen overlay */}
      {karaokeFullscreen && (
        <KaraokeFullscreen
          lyrics={karaokeLyrics}
          currentLine={karaokeCurrentLine}
          onClose={() => setKaraokeFullscreen(false)}
        />
      )}

      {/* Remix mode panel */}
      {mixMode === "remix" && (
        <div className="remix-panel">
          <div className="remix-header">
            <span className="section-label">{t("remix_title")}</span>
          </div>
          <div className="remix-styles">
            {(["original", "trap", "house", "dnb", "lofi", "reggaeton", "dubstep", "ambient"] as const).map((style) => (
              <button
                key={style}
                className={`remix-style-btn ${remixStyle === style ? "active" : ""}`}
                onClick={() => setRemixStyle(style)}
              >
                {style.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bac à Disques */}
      <DJCrate />

      {/* DJ Queue — playlist anticipation */}
      <DJQueue />
    </div>
  );
}

// ─── DJ Queue (Playlist Anticipation) ────────────────────────────────────────

function DJQueue() {
  const t = useT();
  const djQueue = useOperaStore((s) => s.djQueue);
  const queueOpen = useOperaStore((s) => s.queueOpen);
  const toggleQueue = useOperaStore((s) => s.toggleQueue);
  const removeFromQueue = useOperaStore((s) => s.removeFromQueue);
  const reorderQueue = useOperaStore((s) => s.reorderQueue);
  const addToQueue = useOperaStore((s) => s.addToQueue);
  const djCrate = useOperaStore((s) => s.djCrate);

  // Drag reorder state
  const dragIndexRef = useRef<number>(-1);

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (toIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const fromIndex = dragIndexRef.current;
    if (fromIndex >= 0 && fromIndex !== toIndex) {
      reorderQueue(fromIndex, toIndex);
    }
    dragIndexRef.current = -1;
  };

  // Drop zone: accept tracks from crate
  const handleExternalDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (typeof data.crateIndex === "number" && djCrate[data.crateIndex]) {
        addToQueue(djCrate[data.crateIndex]);
      }
    } catch { /* not a crate drag */ }
  };

  return (
    <div className={`dj-queue ${queueOpen ? "open" : "collapsed"}`}>
      <div className="queue-header" onClick={toggleQueue}>
        <span className="queue-icon">▶</span>
        <span className="section-label">{t("queue_title")}</span>
        <span className="crate-count">{t("queue_tracks", { count: djQueue.length })}</span>
        <span className="crate-toggle">{queueOpen ? "▼" : "▲"}</span>
      </div>

      {queueOpen && (
        <div
          className="queue-list"
          onDragOver={handleDragOver}
          onDrop={handleExternalDrop}
        >
          {djQueue.length === 0 ? (
            <div className="queue-empty">
              {t("queue_title")}
            </div>
          ) : (
            djQueue.map((track, i) => (
              <div
                key={track.id}
                className="queue-item"
                draggable
                onDragStart={handleDragStart(i)}
                onDragOver={handleDragOver}
                onDrop={handleDrop(i)}
              >
                <span className="queue-index">{i + 1}</span>
                <span className="queue-grip">⠿</span>
                <div className="queue-info">
                  <span className="queue-title">{track.title}</span>
                  <span className="queue-artist">{track.artist}</span>
                </div>
                <span className="queue-meta">
                  {track.bpm.toFixed(0)} BPM • {track.key}
                </span>
                <button
                  className="queue-remove"
                  onClick={(e) => { e.stopPropagation(); removeFromQueue(track.id); }}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function PartitionView() {
  const t = useT();
  return (
    <div className="view partition-view">
      <div className="view-header">
        <h2 className="view-title">{t("partition_title")}</h2>
        <span className="view-subtitle">{t("partition_subtitle")}</span>
      </div>

      {/* Score viewer with ABC parser */}
      <ScoreViewer width={800} height={300} />

      {/* Piano for partition playback */}
      <div className="piano-section">
        <PianoKeyboard octaves={5} startOctave={2} width={900} height={120} />
      </div>
    </div>
  );
}

function SpectrumView() {
  const t = useT();
  return (
    <div className="view spectrum-view">
      <div className="view-header">
        <h2 className="view-title">{t("spectrum_title")}</h2>
        <span className="view-subtitle">{t("spectrum_subtitle")}</span>
      </div>

      <div className="viz-galaxy">
        <div className="viz-card large">
          <div className="viz-label">{t("viz_spectrogram")}</div>
          <Spectrogram width={700} height={250} colorScheme="purple" />
        </div>
        <div className="viz-card">
          <div className="viz-label">{t("viz_fft")}</div>
          <FFTAnalyzer width={350} height={150} barCount={48} />
        </div>
        <div className="viz-card">
          <div className="viz-label">{t("viz_waveform")}</div>
          <Waveform width={350} height={120} color="#A855F7" />
        </div>
        <div className="viz-card">
          <div className="viz-label">{t("viz_phase")}</div>
          <PhaseScope size={150} dotColor="#0055FF" />
        </div>
        <div className="viz-card">
          <div className="viz-label">{t("viz_vu_l")}</div>
          <VUMeter width={350} height={20} />
        </div>
        <div className="viz-card">
          <div className="viz-label">{t("viz_vu_r")}</div>
          <VUMeter width={350} height={20} />
        </div>
      </div>
    </div>
  );
}

function BalletView() {
  const t = useT();
  const balletFullscreen = useOperaStore((s) => s.balletFullscreen);
  const setBalletFullscreen = useOperaStore((s) => s.setBalletFullscreen);

  return (
    <div className="view ballet-view">
      <div className="view-header">
        <h2 className="view-title">{t("ballet_title")}</h2>
        <span className="view-subtitle">{t("ballet_subtitle")}</span>
        <button
          className="ballet-fs-toggle"
          onClick={() => setBalletFullscreen(true)}
          title={t("ballet_fullscreen")}
        >
          {t("ballet_fullscreen")}
        </button>
      </div>

      {/* Windowed visualizer */}
      <div className="ballet-canvas-wrap">
        <BalletVisualizer width={900} height={480} />
      </div>

      {/* Fullscreen overlay */}
      {balletFullscreen && (
        <BalletVisualizer
          fullscreen
          onClose={() => setBalletFullscreen(false)}
        />
      )}
    </div>
  );
}

function MediaView() {
  const t = useT();
  return (
    <div className="view media-view">
      <div className="view-header">
        <h2 className="view-title">{t("media_title")}</h2>
        <span className="view-subtitle">{t("media_subtitle")}</span>
      </div>
      <div className="media-panels">
        <GrabPanel />
        <PixPanel />
        <VideoPanel />
        <NotebookPanel />
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

// ─── View index for keyboard shortcuts ────────────────────────────────────

const VIEW_KEYS: ViewMode[] = ["orchestra", "studio", "dj", "partition", "spectrum", "media", "ballet"];

export default function App() {
  const t = useT();
  const activeView = useOperaStore((s) => s.activeView);
  const setActiveView = useOperaStore((s) => s.setActiveView);
  const playing = useOperaStore((s) => s.playing);
  const setPlaying = useOperaStore((s) => s.setPlaying);

  // Register default instruments on first user interaction (avoids AudioContext warnings)
  useEffect(() => {
    let initialized = false;
    const initOnGesture = () => {
      if (initialized) return;
      initialized = true;
      const conductor = getConductor();
      conductor.registerInstrument("piano", "Grand Piano", "keyboard", "poly");
      conductor.registerInstrument("violin-1", "Violin I", "strings", "mono");
      document.removeEventListener("click", initOnGesture);
      document.removeEventListener("keydown", initOnGesture);
    };
    document.addEventListener("click", initOnGesture);
    document.addEventListener("keydown", initOnGesture);

    return () => {
      document.removeEventListener("click", initOnGesture);
      document.removeEventListener("keydown", initOnGesture);
      getScribe().dispose();
      getPlaybackBus().dispose();
      getMixEngine().dispose();
      getConductor().dispose();
    };
  }, []);

  // ─── Global Keyboard Shortcuts ──────────────────────────────────────────
  useEffect(() => {
    const handleGlobalKeys = async (e: KeyboardEvent) => {
      // Ignore when typing in input/select/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

      // Space — Play/Pause toggle
      if (e.code === "Space") {
        e.preventDefault();
        const bus = getPlaybackBus();
        const scribe = getScribe();
        const store = useOperaStore.getState();
        if (!store.playing) {
          const Tone = await import("tone");
          await Tone.start();
          const sourceType = await bus.play();
          useOperaStore.setState({ playing: true, sourceType });
          scribe.setBPM(store.bpm);
          scribe.start();
          useOperaStore.setState({ scribeListening: true });
          scribe.subscribe((notes) => {
            useOperaStore.setState({
              signalNotes: Array.from(notes),
              scribeABC: scribe.getABCNotation(),
            });
          });
        } else {
          bus.pause();
          scribe.stop();
          useOperaStore.setState({ playing: false, scribeListening: false, signalNotes: [] });
        }
        return;
      }

      // Escape — Stop
      if (e.code === "Escape") {
        e.preventDefault();
        const bus = getPlaybackBus();
        const scribe = getScribe();
        bus.stop();
        scribe.stop();
        useOperaStore.setState({
          playing: false,
          scribeListening: false,
          signalNotes: [],
          sourceType: bus.getState().sourceType,
        });
        return;
      }

      // 1-7 — Switch views
      const num = parseInt(e.key);
      if (num >= 1 && num <= 7 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        setActiveView(VIEW_KEYS[num - 1]);
        return;
      }
    };

    window.addEventListener("keydown", handleGlobalKeys);
    return () => window.removeEventListener("keydown", handleGlobalKeys);
  }, [setActiveView]);

  const stats = countNodes();

  const renderView = () => {
    switch (activeView) {
      case "orchestra": return <OrchestraView />;
      case "studio": return <StudioView />;
      case "dj": return <DJView />;
      case "partition": return <PartitionView />;
      case "spectrum": return <SpectrumView />;
      case "media": return <MediaView />;
      case "ballet": return <BalletView />;
      default: return <OrchestraView />;
    }
  };

  return (
    <div className="app">
      <TransportBar />
      <div className="app-body">
        <Sidebar />
        <main className="main-content">
          {renderView()}
        </main>
      </div>
      <footer className="app-footer">
        <span className="footer-text">{t("footer_text")}</span>
        <span className="footer-stats">{stats.total} features | {ORCHESTRA_REGISTRY.length} instruments | {getRegisteredCount()} handlers | CRYSTALLINE + VIVALDI</span>
      </footer>
    </div>
  );
}
