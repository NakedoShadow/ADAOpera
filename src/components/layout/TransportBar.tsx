/**
 * ADA Opera — Transport Bar (Universal Conductor)
 * Play/Stop/Record controls the PlaybackBus — whatever is loaded plays.
 * Media signals flow through all views: Orchestra, DJ, Spectrum, etc.
 */

import { useOperaStore, ViewMode } from "../../stores/opera-store";
import { getConductor } from "../../engines/audio-engine";
import { getRituala } from "../../engines/rituala-engine";
import { getPlaybackBus } from "../../engines/playback-bus";
import { getScribe } from "../../engines/scribe-engine";
import { useT, useI18n, LANGUAGES, type Lang } from "../../lib/i18n";
import * as Tone from "tone";

const VIEW_DEFS: { id: ViewMode; i18nKey: string; icon: string }[] = [
  { id: "orchestra", i18nKey: "view_orchestra", icon: "♛" },
  { id: "studio", i18nKey: "view_studio", icon: "≡" },
  { id: "dj", i18nKey: "view_dj", icon: "◉" },
  { id: "partition", i18nKey: "view_partition", icon: "♩" },
  { id: "spectrum", i18nKey: "view_spectrum", icon: "◎" },
  { id: "media", i18nKey: "view_media", icon: "⬇" },
  { id: "ballet", i18nKey: "view_ballet", icon: "✦" },
];

const KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function TransportBar() {
  const store = useOperaStore();
  const conductor = getConductor();
  const rituala = getRituala();
  const bus = getPlaybackBus();
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const setLang = useI18n((s) => s.setLang);

  const scribe = getScribe();

  const handlePlay = async () => {
    if (!store.playing) {
      await Tone.start();
      const sourceType = await bus.play();
      store.setPlaying(true);
      store.setSourceType(sourceType);

      // Start Scribe — real-time note detection feeds all views
      scribe.setBPM(store.bpm);
      scribe.start();
      store.setScribeListening(true);

      // Subscribe to Scribe note updates → push to store for cross-view sync
      scribe.subscribe((notes) => {
        store.setSignalNotes(Array.from(notes));
        store.setScribeABC(scribe.getABCNotation());
      });
    } else {
      bus.pause();
      scribe.stop();
      store.setPlaying(false);
      store.setScribeListening(false);
      store.setSignalNotes([]);
    }
  };

  const handleStop = () => {
    bus.stop();
    scribe.stop();
    store.setPlaying(false);
    store.setScribeListening(false);
    store.setSignalNotes([]);
    store.setSourceType(bus.getState().sourceType);
  };

  const handleRecord = () => {
    store.setRecording(!store.recording);
  };

  const handleBPMChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const bpm = parseFloat(e.target.value);
    store.setBPM(bpm);
    rituala.setBPM(bpm);
    scribe.setBPM(bpm);
  };

  const handleTapTempo = () => {
    const bpm = rituala.tapTempo();
    store.setBPM(bpm);
  };

  // Source indicator label
  const sourceLabel = (): string => {
    const st = store.sourceType;
    if (st === "both") return t("source_media_inst");
    if (st === "media") return t("source_media");
    if (st === "instruments") return t("source_instruments");
    return "";
  };

  return (
    <header className="transport-bar">
      {/* Logo */}
      <div className="transport-logo">
        <span className="logo-crown">♛</span>
        <span className="logo-text">ADA OPERA</span>
      </div>

      {/* Transport controls */}
      <div className="transport-controls">
        <button className={`transport-btn ${store.playing ? "active" : ""}`} onClick={handlePlay}>
          {store.playing ? "⏸" : "▶"}
        </button>
        <button className="transport-btn" onClick={handleStop}>⏹</button>
        <button className={`transport-btn record ${store.recording ? "active" : ""}`} onClick={handleRecord}>
          ●
        </button>
      </div>

      {/* Source indicator + scrolling marquee */}
      {store.playing && store.sourceType !== "none" && (
        <div className="transport-source">
          <span className="source-dot" />
          <span className="source-label">{sourceLabel()}</span>
        </div>
      )}

      {/* Now Playing marquee — always visible when media loaded */}
      {store.mediaTitle && (
        <div className="transport-marquee">
          <div className="marquee-track">
            <span className="marquee-text">
              ♛ {store.mediaTitle} — ADA OPERA ♛ {store.mediaTitle} — ADA OPERA ♛&nbsp;
            </span>
          </div>
        </div>
      )}

      {/* BPM */}
      <div className="transport-bpm">
        <label className="transport-label">{t("transport_bpm")}</label>
        <input
          type="number"
          className="transport-input bpm-input"
          value={store.bpm}
          min={20}
          max={300}
          step={0.1}
          onChange={handleBPMChange}
        />
        <button className="transport-tap" onClick={handleTapTempo}>{t("transport_tap")}</button>
      </div>

      {/* Key */}
      <div className="transport-key">
        <label className="transport-label">{t("transport_key")}</label>
        <select
          className="transport-select"
          value={store.key}
          onChange={(e) => store.setKey(e.target.value)}
        >
          {KEYS.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
        <select
          className="transport-select"
          value={store.mode}
          onChange={(e) => store.setMode(e.target.value as "major" | "minor")}
        >
          <option value="major">{t("transport_major")}</option>
          <option value="minor">{t("transport_minor")}</option>
        </select>
      </div>

      {/* Time Signature */}
      <div className="transport-time-sig">
        <label className="transport-label">{t("transport_time")}</label>
        <span className="time-sig-display">{store.timeSignature[0]}/{store.timeSignature[1]}</span>
      </div>

      {/* CRYSTALLINE mode */}
      <div className="transport-crystalline">
        <label className="transport-label">{t("transport_crystalline")}</label>
        <div className="crystalline-modes">
          {(["REALTIME", "STUDIO", "CRYSTAL"] as const).map((mode) => (
            <button
              key={mode}
              className={`crystalline-btn ${store.crystallineMode === mode ? "active" : ""}`}
              onClick={() => {
                store.setCrystallineMode(mode);
                conductor.setCrystallineMode(mode);
              }}
            >
              {mode === "REALTIME" ? "RT" : mode === "STUDIO" ? "ST" : "CX"}
            </button>
          ))}
        </div>
      </div>

      {/* View switcher */}
      <div className="transport-views">
        {VIEW_DEFS.map((v) => (
          <button
            key={v.id}
            className={`view-btn ${store.activeView === v.id ? "active" : ""}`}
            onClick={() => store.setActiveView(v.id)}
            title={t(v.i18nKey)}
          >
            {v.icon}
          </button>
        ))}
      </div>

      {/* Language selector */}
      <div className="transport-lang">
        <select
          className="transport-select lang-select"
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
          title={t("lang_label")}
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
          ))}
        </select>
      </div>
    </header>
  );
}
