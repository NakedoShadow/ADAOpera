/**
 * ADA Opera — Score Viewer Component
 * Renders parsed sheet music with measure highlighting and playback control
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { parseABC, getScorePlayer, EXAMPLE_SCORES, type ParsedScore, type ParsedMeasure } from "../../engines/partition-parser";
import { useOperaStore } from "../../stores/opera-store";

interface ScoreViewerProps {
  width?: number;
  height?: number;
}

export function ScoreViewer({ width = 800, height = 400 }: ScoreViewerProps) {
  const [score, setScore] = useState<ParsedScore | null>(null);
  const [abcInput, setAbcInput] = useState("");
  const [activeMeasure, setActiveMeasure] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const scribeABC = useOperaStore((s) => s.scribeABC);
  const scribeListening = useOperaStore((s) => s.scribeListening);
  const player = getScorePlayer();

  // Auto-update score from Scribe when live-listening
  useEffect(() => {
    if (!scribeListening || !scribeABC) return;
    const parsed = parseABC(scribeABC);
    if (parsed.measures.length > 0) {
      setScore(parsed);
      // Highlight the last measure
      setActiveMeasure(Math.max(0, parsed.measures.length - 1));
    }
  }, [scribeABC, scribeListening]);

  const handleParse = useCallback(() => {
    if (!abcInput.trim()) return;
    const parsed = parseABC(abcInput);
    setScore(parsed);
    player.loadScore(parsed);
    setActiveMeasure(-1);
  }, [abcInput]);

  const handlePlay = useCallback(() => {
    if (!score) return;
    if (isPlaying) {
      player.stop();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  }, [score, isPlaying]);

  const handleLoadExample = useCallback((key: keyof typeof EXAMPLE_SCORES) => {
    setAbcInput(EXAMPLE_SCORES[key]);
  }, []);

  // Draw score on canvas
  useEffect(() => {
    if (!score || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Staff rendering
    const staffTop = 30;
    const lineSpacing = 8;
    const measureWidth = (width - 60) / Math.min(4, score.measures.length || 1);
    const staffHeight = lineSpacing * 4;

    // Title
    ctx.fillStyle = "#E8E8ED";
    ctx.font = "bold 14px 'Playfair Display', serif";
    ctx.textAlign = "center";
    ctx.fillText(score.title, width / 2, 18);

    // Render measures in rows of 4
    const measuresPerRow = 4;
    let rowIndex = 0;

    for (let mi = 0; mi < score.measures.length; mi++) {
      const measure = score.measures[mi];
      const col = mi % measuresPerRow;
      if (mi > 0 && col === 0) rowIndex++;

      const x = 30 + col * measureWidth;
      const y = staffTop + rowIndex * (staffHeight + 50);

      if (y + staffHeight > height) break; // don't overflow

      // Draw staff lines
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      for (let line = 0; line < 5; line++) {
        ctx.beginPath();
        ctx.moveTo(x, y + line * lineSpacing);
        ctx.lineTo(x + measureWidth - 10, y + line * lineSpacing);
        ctx.stroke();
      }

      // Active measure highlight
      if (mi === activeMeasure) {
        ctx.fillStyle = "rgba(0, 85, 255, 0.1)";
        ctx.fillRect(x - 2, y - 5, measureWidth - 6, staffHeight + 10);
      }

      // Measure number
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(`${mi + 1}`, x, y - 4);

      // Draw notes
      const noteWidth = (measureWidth - 20) / Math.max(measure.notes.length, 1);
      measure.notes.forEach((note, ni) => {
        const nx = x + 8 + ni * noteWidth;

        if (note.rest) {
          // Rest symbol
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.font = "12px 'JetBrains Mono', monospace";
          ctx.fillText("𝄾", nx, y + staffHeight / 2 + 4);
        } else {
          // Note head position (map pitch to staff)
          const pitchY = pitchToStaffY(note.pitch, y, lineSpacing);

          // Ledger lines if needed
          ctx.strokeStyle = "rgba(255,255,255,0.15)";
          if (pitchY < y) {
            for (let ly = y - lineSpacing; ly >= pitchY; ly -= lineSpacing) {
              ctx.beginPath();
              ctx.moveTo(nx - 4, ly);
              ctx.lineTo(nx + 8, ly);
              ctx.stroke();
            }
          }
          if (pitchY > y + staffHeight) {
            for (let ly = y + staffHeight + lineSpacing; ly <= pitchY; ly += lineSpacing) {
              ctx.beginPath();
              ctx.moveTo(nx - 4, ly);
              ctx.lineTo(nx + 8, ly);
              ctx.stroke();
            }
          }

          // Note head
          ctx.fillStyle = note.duration === "2n" || note.duration === "1n"
            ? "transparent"
            : "#0055FF";
          ctx.strokeStyle = "#0055FF";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(nx + 3, pitchY, 4, 3, -0.2, 0, Math.PI * 2);
          if (note.duration === "2n" || note.duration === "1n") {
            ctx.stroke();
          } else {
            ctx.fill();
          }

          // Stem (except whole notes)
          if (note.duration !== "1n") {
            ctx.beginPath();
            const stemUp = pitchY > y + staffHeight / 2;
            if (stemUp) {
              ctx.moveTo(nx + 7, pitchY);
              ctx.lineTo(nx + 7, pitchY - 24);
            } else {
              ctx.moveTo(nx - 1, pitchY);
              ctx.lineTo(nx - 1, pitchY + 24);
            }
            ctx.stroke();
          }

          // Note name below staff
          ctx.fillStyle = "rgba(255,255,255,0.3)";
          ctx.font = "8px 'JetBrains Mono', monospace";
          ctx.textAlign = "center";
          ctx.fillText(note.pitch.replace(/\d/, ""), nx + 3, y + staffHeight + 16);
        }
      });

      // Bar line
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + measureWidth - 10, y);
      ctx.lineTo(x + measureWidth - 10, y + staffHeight);
      ctx.stroke();
    }
  }, [score, activeMeasure, width, height]);

  return (
    <div className="score-viewer">
      {/* ABC Input */}
      <div className="score-input">
        <textarea
          className="abc-textarea"
          placeholder="Paste ABC notation here...&#10;&#10;X:1&#10;T:My Song&#10;M:4/4&#10;L:1/4&#10;Q:120&#10;K:C&#10;C D E F | G A B c |"
          value={abcInput}
          onChange={(e) => setAbcInput(e.target.value)}
          rows={6}
        />
        <div className="score-actions">
          <button className="score-btn primary" onClick={handleParse}>Parse</button>
          <button className="score-btn" onClick={handlePlay} disabled={!score}>
            {isPlaying ? "Stop" : "Play"}
          </button>
          <div className="example-btns">
            <button className="score-btn small" onClick={() => handleLoadExample("twinkle")}>Twinkle</button>
            <button className="score-btn small" onClick={() => handleLoadExample("odetojoy")}>Ode to Joy</button>
            <button className="score-btn small" onClick={() => handleLoadExample("spring")}>Vivaldi Spring</button>
            <button className="score-btn small" onClick={() => handleLoadExample("furElise")}>Fur Elise</button>
          </div>
          {scribeListening && (
            <div className="scribe-indicator">
              <span className="scribe-dot" />
              <span className="scribe-label">LIVE SCRIBE</span>
            </div>
          )}
        </div>
      </div>

      {/* Score info */}
      {score && (
        <div className="score-info">
          <span className="score-stat">{score.title}</span>
          <span className="score-stat">{score.composer}</span>
          <span className="score-stat">{score.key} {score.mode}</span>
          <span className="score-stat">{score.tempo} BPM</span>
          <span className="score-stat">{score.noteCount} notes</span>
          <span className="score-stat">{score.measures.length} measures</span>
        </div>
      )}

      {/* Canvas score display */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="score-canvas"
      />
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function pitchToStaffY(pitch: string, staffTop: number, lineSpacing: number): number {
  // Map pitch name to staff position (treble clef, middle C = first ledger line below)
  const match = pitch.match(/^([A-G][#b]?)(\d)$/);
  if (!match) return staffTop + lineSpacing * 2;

  const noteName = match[1][0];
  const octave = parseInt(match[2]);

  // Staff positions relative to middle line (B4)
  const notePositions: Record<string, number> = {
    C: 5, D: 4.5, E: 4, F: 3.5, G: 3, A: 2.5, B: 2,
  };

  const basePosition = notePositions[noteName] ?? 3;
  const octaveOffset = (4 - octave) * 3.5;

  return staffTop + (basePosition + octaveOffset) * lineSpacing;
}
