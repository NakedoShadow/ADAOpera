/**
 * ADA Opera — FFT Frequency Analyzer
 * Bar graph + peak hold — lightweight Canvas
 */

import { useRef, useEffect, useCallback } from "react";
import { getConductor } from "../../engines/audio-engine";

interface FFTAnalyzerProps {
  width?: number;
  height?: number;
  barColor?: string;
  peakColor?: string;
  barCount?: number;
}

export function FFTAnalyzer({
  width = 400,
  height = 150,
  barColor = "#0055FF",
  peakColor = "#7C3AED",
  barCount = 64,
}: FFTAnalyzerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const peaksRef = useRef<Float32Array>(new Float32Array(barCount));
  const peakDecay = 0.98;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const conductor = getConductor();
    const fftData = conductor.getFFTData();

    ctx.clearRect(0, 0, width, height);

    const barWidth = width / barCount - 1;
    const step = Math.floor(fftData.length / barCount);

    for (let i = 0; i < barCount; i++) {
      // Average bins for this bar
      let sum = 0;
      for (let j = 0; j < step; j++) {
        const idx = i * step + j;
        if (idx < fftData.length) sum += fftData[idx];
      }
      const avg = sum / step;

      // Normalize (-100dB to 0dB -> 0 to height)
      const normalized = Math.max(0, (avg + 100) / 100);
      const barHeight = normalized * height;

      // Peak hold
      if (normalized > peaksRef.current[i]) {
        peaksRef.current[i] = normalized;
      } else {
        peaksRef.current[i] *= peakDecay;
      }

      const x = i * (barWidth + 1);

      // Bar gradient
      const gradient = ctx.createLinearGradient(x, height, x, height - barHeight);
      gradient.addColorStop(0, barColor);
      gradient.addColorStop(0.6, barColor + "CC");
      gradient.addColorStop(1, peakColor);
      ctx.fillStyle = gradient;
      ctx.fillRect(x, height - barHeight, barWidth, barHeight);

      // Peak line
      const peakY = height - peaksRef.current[i] * height;
      ctx.fillStyle = peakColor;
      ctx.fillRect(x, peakY, barWidth, 2);
    }

    animRef.current = requestAnimationFrame(draw);
  }, [width, height, barColor, peakColor, barCount]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="visualizer-canvas fft"
    />
  );
}
