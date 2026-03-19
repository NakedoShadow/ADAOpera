/**
 * ADA Opera — Spectrogram Visualizer
 * Scrolling frequency×time heatmap — lightweight Canvas
 */

import { useRef, useEffect, useCallback } from "react";
import { getConductor } from "../../engines/audio-engine";

interface SpectrogramProps {
  width?: number;
  height?: number;
  colorScheme?: "purple" | "fire" | "ice" | "rainbow";
}

function getColor(value: number, scheme: string): string {
  const v = Math.max(0, Math.min(1, (value + 100) / 100));
  switch (scheme) {
    case "purple":
      return `hsl(${270 - v * 40}, ${60 + v * 40}%, ${v * 60}%)`;
    case "fire":
      return `hsl(${v * 60}, ${80 + v * 20}%, ${v * 50}%)`;
    case "ice":
      return `hsl(${200 + v * 40}, ${60 + v * 40}%, ${v * 60}%)`;
    case "rainbow":
      return `hsl(${v * 300}, 80%, ${20 + v * 40}%)`;
    default:
      return `hsl(${270 - v * 40}, ${60 + v * 40}%, ${v * 60}%)`;
  }
}

export function Spectrogram({ width = 400, height = 200, colorScheme = "purple" }: SpectrogramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const columnRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const conductor = getConductor();
    const fftData = conductor.getFFTData();

    // Shift existing image left by 1 pixel
    const imageData = ctx.getImageData(1, 0, width - 1, height);
    ctx.putImageData(imageData, 0, 0);

    // Draw new column on the right edge
    const binHeight = height / fftData.length;
    const x = width - 1;

    for (let i = 0; i < fftData.length; i++) {
      const y = height - (i * binHeight) - binHeight;
      ctx.fillStyle = getColor(fftData[i], colorScheme);
      ctx.fillRect(x, y, 1, Math.max(1, binHeight));
    }

    columnRef.current++;
    animRef.current = requestAnimationFrame(draw);
  }, [width, height, colorScheme]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="visualizer-canvas spectrogram"
    />
  );
}
