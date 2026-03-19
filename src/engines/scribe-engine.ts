/**
 * ADA Opera — Scribe Engine (Real-Time Audio-to-Partition)
 *
 * The Queen's Scribe: listens to the audio signal via Conductor's FFT analyzer,
 * detects dominant frequencies, maps them to musical notes, and generates
 * a live ABC notation score + exposes active notes for piano key highlighting.
 *
 * Architecture:
 *   Conductor.getFFTData() → peak detection → frequency→note mapping → ABC builder
 *   Output: activeNotes (Set<string>) + live ABC notation string
 */

import { getConductor } from "./audio-engine";

// ─── Constants ────────────────────────────────────────────────────────────────

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const A4_FREQ = 440;
const SAMPLE_RATE = 44100; // Web Audio default
const FFT_SIZE = 2048;
const MIN_DB = -60; // threshold for peak detection
const MAX_SIMULTANEOUS_NOTES = 6; // max polyphony to detect
const NOTE_HOLD_FRAMES = 8; // hold a note for N frames after last detection (smoothing)

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScribeState {
  activeNotes: Set<string>;     // e.g. {"C4", "E4", "G4"}
  abcNotation: string;          // live-generated ABC string
  noteHistory: DetectedNote[];  // rolling buffer of recent notes
  isListening: boolean;
  measureCount: number;
  notesInMeasure: number;
}

interface DetectedNote {
  pitch: string;      // "C4", "F#5"
  frequency: number;
  amplitude: number;  // dB
  time: number;       // timestamp ms
}

interface NoteHold {
  framesLeft: number;
  amplitude: number;
}

type ScribeListener = (notes: Set<string>) => void;

// ─── Scribe Engine ────────────────────────────────────────────────────────────

export class ScribeEngine {
  private state: ScribeState;
  private animFrame: number = 0;
  private noteHolds: Map<string, NoteHold> = new Map();
  private listeners: Set<ScribeListener> = new Set();
  private abcMeasures: string[] = [];
  private currentMeasureNotes: string[] = [];
  private lastNoteTime = 0;
  private beatDuration = 500; // ms per beat at 120 BPM

  constructor() {
    this.state = {
      activeNotes: new Set(),
      abcNotation: this.buildABCHeader(),
      noteHistory: [],
      isListening: false,
      measureCount: 0,
      notesInMeasure: 0,
    };
  }

  // ─── Control ──────────────────────────────────────────────────────────────

  start(): void {
    if (this.state.isListening) return;
    this.state.isListening = true;
    this.abcMeasures = [];
    this.currentMeasureNotes = [];
    this.state.measureCount = 0;
    this.state.notesInMeasure = 0;
    this.analyze();
  }

  stop(): void {
    this.state.isListening = false;
    cancelAnimationFrame(this.animFrame);
    this.state.activeNotes.clear();
    this.noteHolds.clear();
    this.notifyListeners();
  }

  setBPM(bpm: number): void {
    this.beatDuration = 60000 / bpm;
  }

  // ─── Core Analysis Loop ───────────────────────────────────────────────────

  private analyze = (): void => {
    if (!this.state.isListening) return;

    const conductor = getConductor();
    const fftData = conductor.getFFTData(); // Float32Array of dB values

    // Detect peaks in the frequency spectrum
    const peaks = this.detectPeaks(fftData);

    // Map peaks to note names
    const detectedNotes = new Set<string>();
    const now = performance.now();

    for (const peak of peaks) {
      const note = this.frequencyToNote(peak.frequency);
      if (note) {
        detectedNotes.add(note.pitch);
        this.noteHolds.set(note.pitch, {
          framesLeft: NOTE_HOLD_FRAMES,
          amplitude: peak.amplitude,
        });

        // Record to history
        this.state.noteHistory.push({
          pitch: note.pitch,
          frequency: peak.frequency,
          amplitude: peak.amplitude,
          time: now,
        });

        // Keep history bounded
        if (this.state.noteHistory.length > 500) {
          this.state.noteHistory = this.state.noteHistory.slice(-250);
        }
      }
    }

    // Decay held notes
    for (const [pitch, hold] of this.noteHolds) {
      if (detectedNotes.has(pitch)) continue; // freshly detected, skip decay
      hold.framesLeft--;
      if (hold.framesLeft <= 0) {
        this.noteHolds.delete(pitch);
      } else {
        detectedNotes.add(pitch); // still holding
      }
    }

    // Update active notes
    this.state.activeNotes = detectedNotes;

    // Build ABC notation incrementally
    this.updateABC(detectedNotes, now);

    this.notifyListeners();
    this.animFrame = requestAnimationFrame(this.analyze);
  };

  // ─── Peak Detection ───────────────────────────────────────────────────────

  private detectPeaks(fftData: Float32Array): { frequency: number; amplitude: number }[] {
    const peaks: { frequency: number; amplitude: number; bin: number }[] = [];
    const binWidth = SAMPLE_RATE / FFT_SIZE;

    // Skip DC and very low frequencies (bins 0-2 ≈ 0-65Hz)
    for (let i = 3; i < fftData.length - 1; i++) {
      const db = fftData[i];
      if (db < MIN_DB) continue;

      // Local maximum: higher than neighbors
      if (db > fftData[i - 1] && db > fftData[i + 1]) {
        // Parabolic interpolation for better frequency accuracy
        const alpha = fftData[i - 1];
        const beta = db;
        const gamma = fftData[i + 1];
        const p = 0.5 * (alpha - gamma) / (alpha - 2 * beta + gamma);
        const interpolatedBin = i + p;
        const frequency = interpolatedBin * binWidth;

        // Only consider musical range (C1 ~32Hz to C8 ~4186Hz)
        if (frequency >= 30 && frequency <= 4200) {
          peaks.push({ frequency, amplitude: db, bin: i });
        }
      }
    }

    // Sort by amplitude (loudest first) and take top N
    peaks.sort((a, b) => b.amplitude - a.amplitude);
    return peaks.slice(0, MAX_SIMULTANEOUS_NOTES);
  }

  // ─── Frequency → Note Mapping ─────────────────────────────────────────────

  private frequencyToNote(freq: number): { pitch: string; cents: number } | null {
    if (freq <= 0) return null;

    // MIDI note number from frequency
    const midiNote = 12 * Math.log2(freq / A4_FREQ) + 69;
    const roundedMidi = Math.round(midiNote);
    const cents = Math.round((midiNote - roundedMidi) * 100);

    // Only accept if within 40 cents of a note (reasonably in tune)
    if (Math.abs(cents) > 40) return null;

    const octave = Math.floor(roundedMidi / 12) - 1;
    const noteIndex = ((roundedMidi % 12) + 12) % 12;
    const noteName = NOTE_NAMES[noteIndex];

    if (octave < 0 || octave > 8) return null;

    return { pitch: `${noteName}${octave}`, cents };
  }

  // ─── ABC Notation Builder ─────────────────────────────────────────────────

  private buildABCHeader(): string {
    return [
      "X:1",
      "T:Live Scribe",
      "C:ADA Opera",
      "M:4/4",
      "L:1/4",
      "Q:120",
      "K:C",
      "",
    ].join("\n");
  }

  private updateABC(notes: Set<string>, now: number): void {
    if (notes.size === 0) return;

    // Only add a note every ~beat interval to avoid flooding
    if (now - this.lastNoteTime < this.beatDuration * 0.4) return;
    this.lastNoteTime = now;

    // Convert detected notes to ABC notation
    const sortedNotes = Array.from(notes).sort();
    let abcChunk: string;

    if (sortedNotes.length === 1) {
      abcChunk = this.noteToABC(sortedNotes[0]);
    } else {
      // Chord: [CEG]
      abcChunk = "[" + sortedNotes.map((n) => this.noteToABC(n)).join("") + "]";
    }

    this.currentMeasureNotes.push(abcChunk);
    this.state.notesInMeasure++;

    // 4 beats per measure (4/4 time)
    if (this.state.notesInMeasure >= 4) {
      this.abcMeasures.push(this.currentMeasureNotes.join(" "));
      this.currentMeasureNotes = [];
      this.state.notesInMeasure = 0;
      this.state.measureCount++;
    }

    // Rebuild ABC string
    this.rebuildABC();
  }

  private noteToABC(pitch: string): string {
    const match = pitch.match(/^([A-G][#b]?)(\d)$/);
    if (!match) return "C";

    let noteName = match[1];
    const octave = parseInt(match[2]);

    // ABC notation: C D E F G A B = octave 4
    // Lowercase c d e f g a b = octave 5
    // C, D, = octave 3  |  c' d' = octave 6

    // Handle sharps/flats for ABC
    let prefix = "";
    if (noteName.includes("#")) {
      prefix = "^";
      noteName = noteName[0];
    } else if (noteName.includes("b")) {
      prefix = "_";
      noteName = noteName[0];
    }

    if (octave <= 4) {
      // Uppercase letter
      let abc = prefix + noteName;
      // Octave markers: C, = oct 3, C,, = oct 2
      const commas = 4 - octave;
      abc += ",".repeat(commas);
      return abc;
    } else {
      // Lowercase letter
      let abc = prefix + noteName.toLowerCase();
      // Octave markers: c' = oct 6, c'' = oct 7
      const primes = octave - 5;
      abc += "'".repeat(primes);
      return abc;
    }
  }

  private rebuildABC(): void {
    const header = this.buildABCHeader();
    const measures = [...this.abcMeasures];

    // Add current incomplete measure
    if (this.currentMeasureNotes.length > 0) {
      measures.push(this.currentMeasureNotes.join(" "));
    }

    // Format: 4 measures per line, separated by |
    const lines: string[] = [];
    for (let i = 0; i < measures.length; i += 4) {
      const chunk = measures.slice(i, i + 4);
      lines.push(chunk.join(" | ") + " |");
    }

    // Keep last 14 lines (56 measures) before reset — gives DJ time to read ahead
    const recentLines = lines.slice(-14);
    this.state.abcNotation = header + recentLines.join("\n");
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  getState(): ScribeState {
    return this.state;
  }

  getActiveNotes(): Set<string> {
    return this.state.activeNotes;
  }

  getABCNotation(): string {
    return this.state.abcNotation;
  }

  isListening(): boolean {
    return this.state.isListening;
  }

  // ─── Listeners ────────────────────────────────────────────────────────────

  subscribe(listener: ScribeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const notes = this.state.activeNotes;
    this.listeners.forEach((fn) => {
      try { fn(notes); } catch { /* silenced */ }
    });
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  dispose(): void {
    this.stop();
    this.listeners.clear();
    this.state.noteHistory = [];
    this.abcMeasures = [];
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let scribeInstance: ScribeEngine | null = null;

export function getScribe(): ScribeEngine {
  if (!scribeInstance) {
    scribeInstance = new ScribeEngine();
  }
  return scribeInstance;
}
