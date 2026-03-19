/**
 * ADA Opera — VU Meter
 * Classic level meter with peak hold — lightweight Canvas
 */

import { useRef, useEffect, useCallback } from "react";
import { getConductor } from "../../engines/audio-engine";

interface VUMeterProps {
  width?: number;
  height?: number;
  orientation?: "horizontal" | "vertical";
  stereo?: boolean;
}

export function VUMeter({ width = 200, height = 24, orientation = "horizontal", stereo = false }: VUMeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const peakRef = useRef(0);
  const peakHoldRef = useRef(0);
  const peakTimerRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const conductor = getConductor();
    const raw = conductor.getMeterLevel();
    const level = typeof raw === "number" ? raw : raw[0];

    // Normalize: -60dB to 0dB -> 0 to 1
    const normalized = Math.max(0, Math.min(1, (level + 60) / 60));

    // Peak hold
    if (normalized > peakHoldRef.current) {
      peakHoldRef.current = normalized;
      peakTimerRef.current = 60; // hold for ~60 frames
    } else if (peakTimerRef.current > 0) {
      peakTimerRef.current--;
    } else {
      peakHoldRef.current *= 0.995;
    }

    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillRect(0, 0, width, height);

    if (orientation === "horizontal") {
      const barWidth = normalized * width;

      // Green -> Yellow -> Red gradient
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, "#22C55E");
      gradient.addColorStop(0.6, "#22C55E");
      gradient.addColorStop(0.8, "#EAB308");
      gradient.addColorStop(0.95, "#EF4444");
      gradient.addColorStop(1, "#EF4444");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 2, barWidth, height - 4);

      // Peak indicator
      const peakX = peakHoldRef.current * width;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(peakX - 1, 0, 2, height);

      // dB markers
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.font = "8px JetBrains Mono, monospace";
      const markers = [-48, -36, -24, -12, -6, -3, 0];
      markers.forEach((db) => {
        const x = ((db + 60) / 60) * width;
        ctx.fillRect(x, 0, 1, 3);
        ctx.fillText(`${db}`, x - 5, height - 1);
      });
    }

    animRef.current = requestAnimationFrame(draw);
  }, [width, height, orientation]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="visualizer-canvas vu-meter"
    />
  );
}
