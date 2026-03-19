/**
 * ADA Opera — Piano Keyboard (1st Operator)
 * Interactive 88-key piano with velocity, MIDI support, and visual feedback
 * Discrete synthesis — each key = one precise note (Clarity)
 */

import { useRef, useEffect, useCallback, useState } from "react";
import { getConductor } from "../../engines/audio-engine";
import { useOperaStore } from "../../stores/opera-store";

interface PianoKeyboardProps {
  octaves?: number;
  startOctave?: number;
  width?: number;
  height?: number;
  instrumentId?: string;
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const BLACK_KEYS = new Set([1, 3, 6, 8, 10]); // C#, D#, F#, G#, A#

export function PianoKeyboard({
  octaves = 4,
  startOctave = 3,
  width = 800,
  height = 160,
  instrumentId = "piano",
}: PianoKeyboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const signalNotes = useOperaStore((s) => s.signalNotes);
  const conductor = getConductor();

  // Merge user-played keys with signal-detected notes
  const allActiveKeys = new Set([...activeKeys, ...signalNotes]);

  const totalWhiteKeys = octaves * 7;
  const whiteKeyWidth = width / totalWhiteKeys;
  const blackKeyWidth = whiteKeyWidth * 0.6;
  const blackKeyHeight = height * 0.6;

  const getKeyAtPosition = useCallback(
    (x: number, y: number): string | null => {
      // Check black keys first (they're on top)
      for (let oct = 0; oct < octaves; oct++) {
        for (let note = 0; note < 12; note++) {
          if (!BLACK_KEYS.has(note)) continue;

          const whiteIndex = getWhiteKeyIndex(oct, note);
          const bx = whiteIndex * whiteKeyWidth - blackKeyWidth / 2;

          if (x >= bx && x <= bx + blackKeyWidth && y <= blackKeyHeight) {
            return `${NOTE_NAMES[note]}${startOctave + oct}`;
          }
        }
      }

      // Check white keys
      const whiteKeyIndex = Math.floor(x / whiteKeyWidth);
      if (whiteKeyIndex >= 0 && whiteKeyIndex < totalWhiteKeys) {
        const oct = Math.floor(whiteKeyIndex / 7);
        const noteInOctave = whiteKeyIndex % 7;
        const noteMap = [0, 2, 4, 5, 7, 9, 11]; // C D E F G A B
        const note = noteMap[noteInOctave];
        return `${NOTE_NAMES[note]}${startOctave + oct}`;
      }

      return null;
    },
    [octaves, startOctave, whiteKeyWidth, blackKeyWidth, blackKeyHeight, totalWhiteKeys]
  );

  function getWhiteKeyIndex(oct: number, note: number): number {
    const whiteKeysBefore = [0, 0.5, 1, 1.5, 2, 3, 3.5, 4, 4.5, 5, 5.5, 6];
    return oct * 7 + whiteKeysBefore[note];
  }

  const drawKeyboard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Draw white keys
    for (let i = 0; i < totalWhiteKeys; i++) {
      const x = i * whiteKeyWidth;
      const oct = Math.floor(i / 7);
      const noteInOctave = i % 7;
      const noteMap = [0, 2, 4, 5, 7, 9, 11];
      const noteName = `${NOTE_NAMES[noteMap[noteInOctave]]}${startOctave + oct}`;
      const isUserKey = activeKeys.has(noteName);
      const isSignalKey = signalNotes.includes(noteName);
      const isActive = isUserKey || isSignalKey;

      // Key body — blue for user, purple for signal, blended for both
      ctx.fillStyle = isActive
        ? (isUserKey ? "#0055FF" : "#7C3AED")
        : "#E8E8ED";
      ctx.fillRect(x + 0.5, 0, whiteKeyWidth - 1, height - 1);

      // Bottom label (C notes only)
      if (noteInOctave === 0) {
        ctx.fillStyle = isActive ? "#FFFFFF" : "rgba(0,0,0,0.3)";
        ctx.font = "9px JetBrains Mono, monospace";
        ctx.fillText(`C${startOctave + oct}`, x + 2, height - 4);
      }

      // Border
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x + 0.5, 0, whiteKeyWidth - 1, height - 1);
    }

    // Draw black keys
    for (let oct = 0; oct < octaves; oct++) {
      for (let note = 0; note < 12; note++) {
        if (!BLACK_KEYS.has(note)) continue;

        const whiteIdx = getWhiteKeyIndex(oct, note);
        const x = whiteIdx * whiteKeyWidth - blackKeyWidth / 2;
        const noteName = `${NOTE_NAMES[note]}${startOctave + oct}`;
        const isUserKey = activeKeys.has(noteName);
        const isSignalKey = signalNotes.includes(noteName);
        const isActive = isUserKey || isSignalKey;

        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(x + 1, 1, blackKeyWidth, blackKeyHeight + 2);

        // Key body — purple for user, blue-glow for signal
        const gradient = ctx.createLinearGradient(x, 0, x, blackKeyHeight);
        if (isActive) {
          gradient.addColorStop(0, isSignalKey && !isUserKey ? "#0055FF" : "#7C3AED");
          gradient.addColorStop(1, isSignalKey && !isUserKey ? "#003DBB" : "#5B21B6");
        } else {
          gradient.addColorStop(0, "#1A1A2E");
          gradient.addColorStop(1, "#0A0A0F");
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(x, 0, blackKeyWidth, blackKeyHeight);

        // Highlight
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.fillRect(x + 1, 1, blackKeyWidth - 2, 3);
      }
    }
  }, [activeKeys, signalNotes, width, height, octaves, startOctave, whiteKeyWidth, blackKeyWidth, blackKeyHeight, totalWhiteKeys]);

  useEffect(() => {
    drawKeyboard();
  }, [drawKeyboard]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const note = getKeyAtPosition(x, y);
      if (note) {
        conductor.triggerAttack(instrumentId, note, 0.8);
        setActiveKeys((prev) => new Set(prev).add(note));
      }
    },
    [conductor, instrumentId, getKeyAtPosition]
  );

  const handleMouseUp = useCallback(() => {
    activeKeys.forEach((note) => {
      conductor.triggerRelease(instrumentId, note);
    });
    setActiveKeys(new Set());
  }, [activeKeys, conductor, instrumentId]);

  // Computer keyboard mapping (2 octaves)
  useEffect(() => {
    const keyMap: Record<string, string> = {
      a: `C${startOctave + 1}`, w: `C#${startOctave + 1}`, s: `D${startOctave + 1}`,
      e: `D#${startOctave + 1}`, d: `E${startOctave + 1}`, f: `F${startOctave + 1}`,
      t: `F#${startOctave + 1}`, g: `G${startOctave + 1}`, y: `G#${startOctave + 1}`,
      h: `A${startOctave + 1}`, u: `A#${startOctave + 1}`, j: `B${startOctave + 1}`,
      k: `C${startOctave + 2}`, o: `C#${startOctave + 2}`, l: `D${startOctave + 2}`,
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      // Ignore when Space/Escape (global shortcuts) or typing in inputs
      if (e.code === "Space" || e.code === "Escape") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      const note = keyMap[e.key.toLowerCase()];
      if (note) {
        conductor.triggerAttack(instrumentId, note, 0.8);
        setActiveKeys((prev) => new Set(prev).add(note));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const note = keyMap[e.key.toLowerCase()];
      if (note) {
        conductor.triggerRelease(instrumentId, note);
        setActiveKeys((prev) => {
          const next = new Set(prev);
          next.delete(note);
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [conductor, instrumentId, startOctave]);

  // ─── Web MIDI API — external MIDI controller support ─────────────────────
  useEffect(() => {
    if (!navigator.requestMIDIAccess) return; // browser doesn't support Web MIDI

    let midiAccess: MIDIAccess | null = null;

    const midiNoteToName = (midiNote: number): string => {
      const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
      const octave = Math.floor(midiNote / 12) - 1;
      const name = names[midiNote % 12];
      return `${name}${octave}`;
    };

    const handleMIDIMessage = (e: MIDIMessageEvent) => {
      const [status, note, velocity] = e.data ?? [];
      const command = status & 0xf0;

      if (command === 0x90 && velocity > 0) {
        // Note ON
        const noteName = midiNoteToName(note);
        const vel = velocity / 127;
        conductor.triggerAttack(instrumentId, noteName, vel);
        setActiveKeys((prev) => new Set(prev).add(noteName));
      } else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
        // Note OFF
        const noteName = midiNoteToName(note);
        conductor.triggerRelease(instrumentId, noteName);
        setActiveKeys((prev) => {
          const next = new Set(prev);
          next.delete(noteName);
          return next;
        });
      }
    };

    const connectMIDI = (access: MIDIAccess) => {
      midiAccess = access;
      for (const input of access.inputs.values()) {
        input.onmidimessage = handleMIDIMessage;
      }
      // Handle hot-plug: new devices connected while running
      access.onstatechange = () => {
        for (const input of access.inputs.values()) {
          input.onmidimessage = handleMIDIMessage;
        }
      };
    };

    navigator.requestMIDIAccess({ sysex: false })
      .then(connectMIDI)
      .catch(() => { /* Web MIDI not available — silent fallback */ });

    return () => {
      if (midiAccess) {
        for (const input of midiAccess.inputs.values()) {
          input.onmidimessage = null;
        }
      }
    };
  }, [conductor, instrumentId]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="piano-keyboard"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: "pointer", borderRadius: "4px" }}
    />
  );
}
