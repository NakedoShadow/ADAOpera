/**
 * ADA Opera — DJ Turntable Component
 * 4 skins: Vinyl Classic, CDJ Modern, Old School, Futuristic
 * Canvas-based rotating platter with real-time waveform ring
 */

import { useRef, useEffect, useCallback, useState } from "react";
import { useOperaStore, DJSkin } from "../../stores/opera-store";
import { getMixEngine } from "../../engines/mix-engine";

interface TurntableProps {
  size?: number;
  deckId: "A" | "B";
  skin?: DJSkin;
}

const SKIN_COLORS: Record<DJSkin, { platter: string; label: string; groove: string; tonearm: string; glow: string }> = {
  vinyl: { platter: "#0A0A0F", label: "#1A1A2E", groove: "rgba(255,255,255,0.03)", tonearm: "#C0C0C0", glow: "#0055FF" },
  cdj: { platter: "#0A0A12", label: "#111827", groove: "rgba(0,85,255,0.08)", tonearm: "#404040", glow: "#0055FF" },
  oldschool: { platter: "#1A1508", label: "#2D2510", groove: "rgba(255,200,100,0.05)", tonearm: "#B8860B", glow: "#DAA520" },
  futuristic: { platter: "#050510", label: "#0A0A20", groove: "rgba(124,58,237,0.1)", tonearm: "#7C3AED", glow: "#A855F7" },
};

export function Turntable({ size = 280, deckId, skin: skinProp }: TurntableProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const angleRef = useRef(0);
  const [localPlaying, setLocalPlaying] = useState(false);
  const globalPlaying = useOperaStore((s) => s.playing);
  const djSkin = skinProp ?? useOperaStore((s) => s.djSkin);
  const bpm = useOperaStore((s) => s.bpm);

  // Scratch state
  const scratchingRef = useRef(false);
  const lastAngleRef = useRef(0);
  const lastMouseAngle = useRef(0);

  // Turntable spins when global transport is playing OR local click toggle
  const isPlaying = globalPlaying || localPlaying;

  const colors = SKIN_COLORS[djSkin];
  const center = size / 2;
  const rpm = bpm / 3.6; // approximate turntable RPM from BPM

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);

    // Platter base
    ctx.beginPath();
    ctx.arc(center, center, center - 4, 0, Math.PI * 2);
    ctx.fillStyle = colors.platter;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Outer glow
    ctx.beginPath();
    ctx.arc(center, center, center - 2, 0, Math.PI * 2);
    ctx.strokeStyle = colors.glow + "30";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Grooves (concentric circles rotating)
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(angleRef.current);

    for (let r = 20; r < center - 10; r += 3) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.strokeStyle = colors.groove;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Label area (center circle)
    const labelRadius = center * 0.35;
    ctx.beginPath();
    ctx.arc(0, 0, labelRadius, 0, Math.PI * 2);
    ctx.fillStyle = colors.label;
    ctx.fill();

    // Label text
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = `bold ${Math.floor(size * 0.05)}px Playfair Display, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("ADA OPERA", 0, -8);

    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = `${Math.floor(size * 0.035)}px JetBrains Mono, monospace`;
    ctx.fillText(`DECK ${deckId}`, 0, 10);

    // Spindle
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#C0C0C0";
    ctx.fill();

    // Position marker (rotating dot)
    const markerAngle = 0;
    const markerR = center * 0.7;
    ctx.beginPath();
    ctx.arc(
      Math.cos(markerAngle) * markerR,
      Math.sin(markerAngle) * markerR,
      3,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = colors.glow;
    ctx.fill();
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();

    // Tonearm (static, from top-right)
    if (djSkin === "vinyl" || djSkin === "oldschool") {
      ctx.save();
      ctx.translate(size - 30, 15);
      ctx.rotate(isPlaying && !scratchingRef.current ? 0.4 : isPlaying && scratchingRef.current ? 0.35 : 0.15);
      ctx.strokeStyle = colors.tonearm;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-center * 0.55, center * 0.65);
      ctx.stroke();
      // Headshell
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-center * 0.55, center * 0.65);
      ctx.lineTo(-center * 0.58, center * 0.72);
      ctx.stroke();
      ctx.restore();
    }

    // BPM display
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = `bold ${Math.floor(size * 0.045)}px JetBrains Mono, monospace`;
    ctx.textAlign = "center";
    ctx.fillText(`${bpm.toFixed(1)} BPM`, center, size - 10);

    // Rotate — but NOT while scratching (disc is locked by hand)
    if (isPlaying && !scratchingRef.current) {
      angleRef.current += (rpm * Math.PI * 2) / (60 * 60); // per frame at 60fps
    }

    animRef.current = requestAnimationFrame(draw);
  }, [size, center, colors, djSkin, bpm, rpm, deckId, isPlaying]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  // ─── Scratch handlers ────────────────────────────────────────────────────

  const getMouseAngle = useCallback((e: React.MouseEvent | MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(e.clientY - cy, e.clientX - cx);
  }, []);

  const handleScratchStart = useCallback((e: React.MouseEvent) => {
    // Only scratch when playing — otherwise toggle play
    if (!isPlaying) {
      setLocalPlaying(true);
      return;
    }

    e.preventDefault();
    scratchingRef.current = true;
    lastMouseAngle.current = getMouseAngle(e);
    lastAngleRef.current = angleRef.current;

    // Lock the disc immediately — playback rate = 0
    getMixEngine().startScratch(deckId);

    const onMove = (ev: MouseEvent) => {
      if (!scratchingRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const currentAngle = Math.atan2(
        ev.clientY - (rect.top + size / 2),
        ev.clientX - (rect.left + size / 2)
      );

      // Delta angle → scratch velocity
      let delta = currentAngle - lastMouseAngle.current;
      // Normalize to [-PI, PI]
      if (delta > Math.PI) delta -= 2 * Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;

      // Apply rotation to vinyl visual
      angleRef.current += delta;
      lastMouseAngle.current = currentAngle;

      // Convert angular velocity to playback rate (-3 to +3)
      // When user drags, scratch sound plays; when held still, disc is locked (rate stays 0)
      const rate = delta * 15;
      getMixEngine().setScratchRate(deckId, Math.max(-3, Math.min(3, rate)));
    };

    const onUp = () => {
      scratchingRef.current = false;
      // Release = disc resumes normal playback
      getMixEngine().endScratch(deckId);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [isPlaying, deckId, size, getMouseAngle]);

  return (
    <div className="turntable-container" style={{ position: "relative", display: "inline-block" }}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ cursor: scratchingRef.current ? "grabbing" : "grab", borderRadius: "50%" }}
        onMouseDown={handleScratchStart}
        onDoubleClick={() => setLocalPlaying(!localPlaying)}
      />
      {/* Status indicator */}
      <div
        style={{
          position: "absolute",
          bottom: "24px",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "10px",
          fontFamily: "JetBrains Mono, monospace",
          color: "rgba(255,255,255,0.25)",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
        }}
      >
        {scratchingRef.current ? "SCRATCH" : isPlaying ? "PLAYING" : "STOPPED"}
      </div>
    </div>
  );
}
