/**
 * ADA Opera — Waveform Visualizer
 * Lightweight Canvas-based time-domain display
 * Simple, beautiful, functional — not heavy, just representative
 */

import { useRef, useEffect, useCallback } from "react";
import { getConductor } from "../../engines/audio-engine";

interface WaveformProps {
  width?: number;
  height?: number;
  color?: string;
  lineWidth?: number;
}

export function Waveform({ width = 400, height = 120, color = "#0055FF", lineWidth = 1.5 }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const conductor = getConductor();
    const data = conductor.getWaveformData();

    ctx.clearRect(0, 0, width, height);

    // Grid lines (subtle)
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 0.5;
    const centerY = height / 2;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Waveform
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();

    const sliceWidth = width / data.length;
    let x = 0;

    for (let i = 0; i < data.length; i++) {
      const v = (data[i] + 1) / 2;
      const y = v * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }

    ctx.stroke();

    // Glow effect
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    ctx.stroke();
    ctx.shadowBlur = 0;

    animRef.current = requestAnimationFrame(draw);
  }, [width, height, color, lineWidth]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="visualizer-canvas waveform"
    />
  );
}
