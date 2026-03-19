/**
 * ADA Opera — DJ Mixer Console
 * Professional mixing table with per-deck EQ, filters, faders, and FX
 *
 * Layout:
 * ┌──────────┬──────────┐
 * │  DECK A  │  DECK B  │
 * │  EQ Hi   │  EQ Hi   │
 * │  EQ Mid  │  EQ Mid  │
 * │  EQ Low  │  EQ Low  │
 * │  Filter  │  Filter  │
 * │  Volume  │  Volume  │
 * │  VU      │  VU      │
 * ├──────────┴──────────┤
 * │    CROSSFADER        │
 * ├──────────────────────┤
 * │   AUTO-MIX | IF      │
 * └──────────────────────┘
 */

import { useEffect, useRef, useCallback, useState, type ChangeEvent } from "react";
import { useOperaStore } from "../../stores/opera-store";
import { getMixEngine } from "../../engines/mix-engine";
import { useT } from "../../lib/i18n";

const AUDIO_ACCEPT = "audio/*,.mp3,.wav,.ogg,.flac,.aac,.m4a,.webm,.wma,.opus,.aiff";

// ─── Knob Component ─────────────────────────────────────────────────────────

interface KnobProps {
  value: number;
  min: number;
  max: number;
  size?: number;
  color?: string;
  label: string;
  unit?: string;
  onChange: (value: number) => void;
  onDoubleClick?: () => void;
}

function Knob({ value, min, max, size = 40, color = "#0055FF", label, unit = "dB", onChange, onDoubleClick }: KnobProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startValue = useRef(0);

  const range = max - min;
  const normalized = (value - min) / range;
  const angle = -135 + normalized * 270; // -135° to 135°

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 4;

    ctx.clearRect(0, 0, size, size);

    // Track arc (background)
    ctx.beginPath();
    ctx.arc(cx, cy, r, ((-135 + 90) * Math.PI) / 180, ((135 + 90) * Math.PI) / 180);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.stroke();

    // Value arc
    ctx.beginPath();
    ctx.arc(cx, cy, r, ((-135 + 90) * Math.PI) / 180, ((angle + 90) * Math.PI) / 180);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fill();

    // Pointer line
    const pointerAngle = ((angle + 90) * Math.PI) / 180;
    const innerR = r * 0.4;
    const outerR = r * 0.8;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(pointerAngle) * innerR, cy + Math.sin(pointerAngle) * innerR);
    ctx.lineTo(cx + Math.cos(pointerAngle) * outerR, cy + Math.sin(pointerAngle) * outerR);
    ctx.strokeStyle = "#E8E8ED";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
  }, [size, value, min, max, color, angle]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    startY.current = e.clientY;
    startValue.current = value;

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const dy = startY.current - ev.clientY;
      const delta = (dy / 150) * range;
      onChange(Math.max(min, Math.min(max, startValue.current + delta)));
    };

    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [value, min, max, range, onChange]);

  return (
    <div className="mixer-knob" onDoubleClick={onDoubleClick}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        onMouseDown={handleMouseDown}
        style={{ cursor: "grab" }}
      />
      <div className="knob-label">{label}</div>
      <div className="knob-value">{value > 0 ? "+" : ""}{value.toFixed(0)}{unit}</div>
    </div>
  );
}

// ─── Vertical Fader ─────────────────────────────────────────────────────────

interface FaderProps {
  value: number;
  min: number;
  max: number;
  height?: number;
  color?: string;
  label: string;
  onChange: (value: number) => void;
}

function Fader({ value, min, max, height = 140, color = "#0055FF", label, onChange }: FaderProps) {
  const range = max - min;
  const normalized = (value - min) / range;

  return (
    <div className="mixer-fader" style={{ height: height + 30 }}>
      <div className="fader-track" style={{ height }}>
        <div className="fader-fill" style={{ height: `${normalized * 100}%`, background: color }} />
        <input
          type="range"
          className="fader-input"
          min={min}
          max={max}
          step={0.5}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ height }}
        />
      </div>
      <div className="fader-label">{label}</div>
      <div className="fader-value">{value > 0 ? "+" : ""}{value.toFixed(1)}</div>
    </div>
  );
}

// ─── Deck VU Meter ──────────────────────────────────────────────────────────

function DeckVU({ deckId, width = 12, height = 140 }: { deckId: "A" | "B"; width?: number; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);

  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const level = getMixEngine().getDeckLevel(deckId);
      const normalized = Math.max(0, Math.min(1, (level + 60) / 60));

      ctx.clearRect(0, 0, width, height);

      // Background
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      ctx.fillRect(0, 0, width, height);

      // Level bar (bottom up)
      const barHeight = normalized * height;
      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, "#22C55E");
      gradient.addColorStop(0.6, "#EAB308");
      gradient.addColorStop(0.85, "#EF4444");
      gradient.addColorStop(1, "#FF0000");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, height - barHeight, width, barHeight);

      // Segment lines
      for (let i = 0; i < height; i += 4) {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, i, width, 1);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [deckId, width, height]);

  return <canvas ref={canvasRef} width={width} height={height} className="deck-vu" />;
}

// ─── Deck Channel Strip ─────────────────────────────────────────────────────

interface DeckChannelProps {
  deckId: "A" | "B";
  color: string;
}

function DeckChannel({ deckId, color }: DeckChannelProps) {
  const t = useT();
  const engine = getMixEngine();
  const [deckState, setDeckState] = useState(engine.getDeckState(deckId));
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return engine.subscribe(() => setDeckState(engine.getDeckState(deckId)));
  }, [deckId]);

  const handlePlay = () => {
    if (deckState.playing) engine.pauseDeck(deckId);
    else engine.playDeck(deckId);
  };

  const handleLoadFile = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await engine.loadTrack(deckId, file);
    } catch (err) {
      console.warn("[DJMixer] Failed to load file:", err);
    }
    e.target.value = "";
  }, [deckId, engine]);

  return (
    <div className="deck-channel">
      {/* Hidden file input for deck load */}
      <input
        ref={fileInputRef}
        type="file"
        accept={AUDIO_ACCEPT}
        style={{ display: "none" }}
        onChange={handleLoadFile}
      />

      {/* Deck header */}
      <div className="deck-channel-header">
        <span className="deck-id" style={{ color }}>{deckId}</span>
        <span className="deck-track-name">{deckState.trackTitle || "—"}</span>
        <button
          className="deck-load-btn"
          onClick={() => fileInputRef.current?.click()}
          title={t("mixer_load_tooltip", { deck: deckId })}
          style={{ marginLeft: "auto", fontSize: "8px", padding: "2px 6px", cursor: "pointer",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "3px", color: "rgba(255,255,255,0.4)", fontFamily: "JetBrains Mono, monospace",
            letterSpacing: "0.05em" }}
        >
          {t("mixer_load")}
        </button>
      </div>

      {/* Track info */}
      {deckState.analysis && (
        <div className="deck-analysis">
          <span className="deck-bpm">{deckState.analysis.bpm.toFixed(1)}</span>
          <span className="deck-key">{deckState.analysis.key}</span>
        </div>
      )}

      {/* EQ knobs */}
      <div className="deck-eq">
        <Knob
          value={deckState.eqHigh} min={-24} max={6}
          color={color} label="HI" size={36}
          onChange={(v) => engine.setDeckEQ(deckId, "high", v)}
          onDoubleClick={() => engine.setDeckEQ(deckId, "high", 0)}
        />
        <Knob
          value={deckState.eqMid} min={-24} max={6}
          color={color} label="MID" size={36}
          onChange={(v) => engine.setDeckEQ(deckId, "mid", v)}
          onDoubleClick={() => engine.setDeckEQ(deckId, "mid", 0)}
        />
        <Knob
          value={deckState.eqLow} min={-24} max={6}
          color={color} label="LOW" size={36}
          onChange={(v) => engine.setDeckEQ(deckId, "low", v)}
          onDoubleClick={() => engine.setDeckEQ(deckId, "low", 0)}
        />
      </div>

      {/* Filter knob */}
      <Knob
        value={Math.round((deckState.filter - 0.5) * 200)}
        min={-100} max={100}
        color="#A855F7" label="FILTER" unit="%" size={36}
        onChange={(v) => engine.setDeckFilter(deckId, v / 200 + 0.5)}
        onDoubleClick={() => engine.setDeckFilter(deckId, 0.5)}
      />

      {/* Volume fader + VU */}
      <div className="deck-fader-section">
        <DeckVU deckId={deckId} />
        <Fader
          value={deckState.volume}
          min={-60} max={6}
          color={color}
          label="VOL"
          height={120}
          onChange={(v) => engine.setDeckVolume(deckId, v)}
        />
      </div>

      {/* Transport buttons */}
      <div className="deck-transport">
        <button
          className={`deck-btn ${deckState.playing ? "active" : ""}`}
          onClick={handlePlay}
          title={deckState.playing ? t("mixer_pause") : t("mixer_play")}
        >
          {deckState.playing ? "❚❚" : "▶"}
        </button>
        <button
          className="deck-btn"
          onClick={() => engine.goToCue(deckId)}
          title={t("mixer_cue")}
        >
          {t("mixer_cue")}
        </button>
        <button
          className={`deck-btn ${deckState.sync ? "active" : ""}`}
          onClick={() => {/* sync toggle */}}
          title={t("mixer_beat_sync")}
        >
          {t("mixer_sync")}
        </button>
      </div>

      {/* Position display */}
      <div className="deck-position">
        <span>{formatTime(deckState.position)}</span>
        <span className="deck-remaining">-{formatTime(deckState.duration - deckState.position)}</span>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Auto-Mix Panel ─────────────────────────────────────────────────────────

function AutoMixPanel() {
  const t = useT();
  const engine = getMixEngine();
  const autoMixActive = useOperaStore((s) => s.autoMixActive);
  const transitionPlan = useOperaStore((s) => s.transitionPlan);
  const transitionProgress = useOperaStore((s) => s.transitionProgress);
  const setAutoMixActive = useOperaStore((s) => s.setAutoMixActive);
  const setTransitionPlan = useOperaStore((s) => s.setTransitionPlan);

  const handleComputeMix = () => {
    const plan = engine.computeAutoMix();
    if (plan) setTransitionPlan(plan);
  };

  const handleStartAutoMix = () => {
    engine.startAutoMix();
    setAutoMixActive(true);
  };

  const handleStopAutoMix = () => {
    engine.stopAutoMix();
    setAutoMixActive(false);
  };

  return (
    <div className="automix-panel">
      <div className="automix-header">
        <span className="section-label">{t("automix_title")}</span>
        <span className="automix-if">
          IF: {transitionPlan ? (transitionPlan.fluidityScore * 100).toFixed(0) + "%" : "—"}
        </span>
      </div>

      {transitionPlan && (
        <div className="automix-info">
          <span className="automix-type">{transitionPlan.type.toUpperCase()}</span>
          <span className="automix-duration">{transitionPlan.duration.toFixed(1)}s</span>
          <span className="automix-bpm">
            {transitionPlan.bpmAdjustment > 0 ? "+" : ""}{transitionPlan.bpmAdjustment.toFixed(1)} BPM
          </span>
        </div>
      )}

      {autoMixActive && (
        <div className="automix-progress">
          <div className="automix-bar">
            <div className="automix-fill" style={{ width: `${transitionProgress * 100}%` }} />
          </div>
        </div>
      )}

      <div className="automix-controls">
        <button className="deck-btn" onClick={handleComputeMix}>{t("automix_compute")}</button>
        <button
          className={`deck-btn ${autoMixActive ? "active" : ""}`}
          onClick={autoMixActive ? handleStopAutoMix : handleStartAutoMix}
        >
          {autoMixActive ? t("automix_stop") : t("automix_mix")}
        </button>
      </div>
    </div>
  );
}

// ─── Main DJ Mixer ──────────────────────────────────────────────────────────

export function DJMixer() {
  const engine = getMixEngine();
  const crossfader = useOperaStore((s) => s.crossfader);
  const setCrossfader = useOperaStore((s) => s.setCrossfader);

  const handleCrossfaderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setCrossfader(value);
    engine.setCrossfader(value / 100);
  };

  return (
    <div className="dj-mixer">
      <div className="mixer-channels">
        <DeckChannel deckId="A" color="#0055FF" />
        <div className="mixer-center">
          {/* Crossfader */}
          <div className="mixer-crossfader">
            <span className="xfade-label">A</span>
            <input
              type="range"
              className="crossfader-slider mixer-xfade"
              min={0} max={100} step={1}
              value={crossfader}
              onChange={handleCrossfaderChange}
            />
            <span className="xfade-label">B</span>
          </div>
          {/* Auto-Mix */}
          <AutoMixPanel />
        </div>
        <DeckChannel deckId="B" color="#7C3AED" />
      </div>
    </div>
  );
}
