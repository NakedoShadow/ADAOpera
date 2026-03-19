/**
 * ADA Opera — Phase Scope (Lissajous / Vectorscope)
 * Stereo phase correlation display — lightweight Canvas
 */

import { useRef, useEffect, useCallback } from "react";
import { getConductor } from "../../engines/audio-engine";

interface PhaseScopeProps {
  size?: number;
  dotColor?: string;
  trailLength?: number;
}

export function PhaseScope({ size = 150, dotColor = "#7C3AED", trailLength = 4 }: PhaseScopeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const conductor = getConductor();
    const data = conductor.getWaveformData();

    // Fade trail
    ctx.fillStyle = `rgba(0, 0, 0, ${1 / trailLength})`;
    ctx.fillRect(0, 0, size, size);

    // Cross-hair
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(size / 2, size);
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size, size / 2);
    ctx.stroke();

    // Circle border
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.stroke();

    // Plot phase (simulated stereo from mono waveform with offset)
    ctx.fillStyle = dotColor;
    const half = Math.floor(data.length / 2);
    for (let i = 0; i < half; i += 2) {
      const l = data[i];
      const r = data[i + half] ?? data[i];

      // Mid-Side to X-Y
      const x = ((l + r) / 2 + 1) / 2 * size;
      const y = ((l - r) / 2 + 1) / 2 * size;

      ctx.fillRect(x, y, 1.5, 1.5);
    }

    animRef.current = requestAnimationFrame(draw);
  }, [size, dotColor, trailLength]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="visualizer-canvas phase-scope"
    />
  );
}
