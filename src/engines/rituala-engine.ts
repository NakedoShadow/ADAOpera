/**
 * ADA Opera — Rituala Engine (Beat Control)
 * Named by the Queen: "Rituala" — the sacred rhythm that binds all things.
 *
 * BPM management, beat sync (audio/video/image), metronome, quantize,
 * and subluminal tempo control for the Vivaldi Conductor.
 *
 * Key capability: synchronize image/video with sound even at high BPMs
 */

import * as Tone from "tone";
import { getConductor } from "./audio-engine";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RitualaState {
  bpm: number;
  timeSignature: [number, number];
  beat: number;       // current beat in measure (0-based)
  bar: number;        // current bar number
  tick: number;       // sub-beat tick (0-479 PPQ)
  phase: number;      // 0-1 phase within current beat
  playing: boolean;
  // Sync targets
  audioSync: boolean;
  videoSync: boolean;
  imageSync: boolean;
  midiSync: boolean;
  // Metronome
  metronomeEnabled: boolean;
  metronomeVolume: number;
  subdivisions: number;
  // Quantize
  quantizeEnabled: boolean;
  quantizeResolution: number; // in note values: 4=quarter, 8=eighth, 16=sixteenth
  swing: number;             // 0-100%
  humanize: number;          // 0-100%
}

export type SyncCallback = (state: RitualaState) => void;

// ─── Rituala Engine ──────────────────────────────────────────────────────────

export class RitualaEngine {
  private state: RitualaState;
  private callbacks: Map<string, SyncCallback> = new Map();
  private metronomeSynth: Tone.MembraneSynth | null = null;
  private metronomeAccentSynth: Tone.MetalSynth | null = null;
  private loopId: number | null = null;
  private tapTimes: number[] = [];
  private initialized = false;

  constructor() {
    this.state = {
      bpm: 120,
      timeSignature: [4, 4],
      beat: 0,
      bar: 0,
      tick: 0,
      phase: 0,
      playing: false,
      audioSync: true,
      videoSync: false,
      imageSync: false,
      midiSync: false,
      metronomeEnabled: false,
      metronomeVolume: -12,
      subdivisions: 4,
      quantizeEnabled: false,
      quantizeResolution: 16,
      swing: 0,
      humanize: 0,
    };
  }

  /** Initialize Tone.js synths — call after user gesture */
  private ensureInitialized(): void {
    if (this.initialized) return;
    this.initialized = true;

    this.metronomeSynth = new Tone.MembraneSynth({
      pitchDecay: 0.01,
      octaves: 6,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 },
      volume: this.state.metronomeVolume,
    }).toDestination();

    this.metronomeAccentSynth = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.05, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 16,
      resonance: 2000,
      octaves: 0.5,
      volume: this.state.metronomeVolume + 3,
    }).toDestination();
  }

  // ─── BPM Control ────────────────────────────────────────────────────────

  setBPM(bpm: number): void {
    this.state.bpm = Math.max(20, Math.min(300, bpm));
    Tone.getTransport().bpm.value = this.state.bpm;
    getConductor().setBPM(this.state.bpm);
  }

  getBPM(): number {
    return this.state.bpm;
  }

  tapTempo(): number {
    const now = performance.now();
    this.tapTimes.push(now);
    if (this.tapTimes.length > 8) this.tapTimes.shift();
    if (this.tapTimes.length < 2) return this.state.bpm;

    const intervals = [];
    for (let i = 1; i < this.tapTimes.length; i++) {
      intervals.push(this.tapTimes[i] - this.tapTimes[i - 1]);
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const bpm = Math.round(60000 / avgInterval);
    this.setBPM(bpm);
    return bpm;
  }

  // ─── Tempo Ramp (smooth transition) ─────────────────────────────────────

  rampTempo(targetBPM: number, bars: number = 8): void {
    const duration = (bars * this.state.timeSignature[0] * 60) / this.state.bpm;
    Tone.getTransport().bpm.rampTo(targetBPM, duration);
    this.state.bpm = targetBPM;
  }

  // ─── Transport ──────────────────────────────────────────────────────────

  start(): void {
    this.ensureInitialized();
    this.state.playing = true;
    this.startBeatLoop();
    Tone.getTransport().start();
  }

  stop(): void {
    this.state.playing = false;
    this.state.beat = 0;
    this.state.bar = 0;
    this.state.tick = 0;
    this.state.phase = 0;
    this.stopBeatLoop();
    Tone.getTransport().stop();
  }

  pause(): void {
    this.state.playing = false;
    Tone.getTransport().pause();
  }

  // ─── Beat Loop (subluminal precision) ───────────────────────────────────

  private startBeatLoop(): void {
    const scheduleMetronome = () => {
      const beatsPerBar = this.state.timeSignature[0];

      Tone.getTransport().scheduleRepeat((time) => {
        this.state.beat = (this.state.beat + 1) % beatsPerBar;
        if (this.state.beat === 0) this.state.bar++;

        // Metronome click
        if (this.state.metronomeEnabled) {
          if (this.state.beat === 0) {
            this.metronomeAccentSynth?.triggerAttackRelease("C4", "32n", time);
          } else {
            this.metronomeSynth?.triggerAttackRelease("C5", "32n", time);
          }
        }

        // Fire sync callbacks at subluminal speed
        const snapshot = this.getState();
        this.callbacks.forEach((cb) => {
          try { cb(snapshot); } catch { /* sync callback error silenced */ }
        });
      }, `${this.state.timeSignature[1]}n`);
    };

    scheduleMetronome();
  }

  private stopBeatLoop(): void {
    Tone.getTransport().cancel();
  }

  // ─── Phase calculation (for smooth sync) ────────────────────────────────

  getPhase(): number {
    const pos = Tone.getTransport().position;
    if (typeof pos === "string") {
      const parts = pos.split(":");
      if (parts.length >= 3) {
        const beatFraction = parseFloat(parts[2]) / this.state.timeSignature[1];
        return Math.min(1, Math.max(0, beatFraction));
      }
    }
    return 0;
  }

  // ─── Sync Registration ─────────────────────────────────────────────────

  registerSync(id: string, callback: SyncCallback): void {
    this.callbacks.set(id, callback);
  }

  unregisterSync(id: string): void {
    this.callbacks.delete(id);
  }

  // ─── Sync Toggles ──────────────────────────────────────────────────────

  setAudioSync(enabled: boolean): void { this.state.audioSync = enabled; }
  setVideoSync(enabled: boolean): void { this.state.videoSync = enabled; }
  setImageSync(enabled: boolean): void { this.state.imageSync = enabled; }
  setMIDISync(enabled: boolean): void { this.state.midiSync = enabled; }

  // ─── Metronome ──────────────────────────────────────────────────────────

  setMetronomeEnabled(enabled: boolean): void { this.state.metronomeEnabled = enabled; }
  setMetronomeVolume(db: number): void {
    this.state.metronomeVolume = db;
    if (this.metronomeSynth) this.metronomeSynth.volume.value = db;
    if (this.metronomeAccentSynth) this.metronomeAccentSynth.volume.value = db + 3;
  }
  setSubdivisions(sub: number): void { this.state.subdivisions = Math.max(1, Math.min(8, sub)); }

  // ─── Quantize ───────────────────────────────────────────────────────────

  setQuantizeEnabled(enabled: boolean): void { this.state.quantizeEnabled = enabled; }
  setQuantizeResolution(resolution: number): void { this.state.quantizeResolution = resolution; }
  setSwing(swing: number): void { this.state.swing = Math.max(0, Math.min(100, swing)); }
  setHumanize(humanize: number): void { this.state.humanize = Math.max(0, Math.min(100, humanize)); }

  quantizeTime(timeInSeconds: number): number {
    if (!this.state.quantizeEnabled) return timeInSeconds;
    const beatDuration = 60 / this.state.bpm;
    const gridSize = beatDuration / (this.state.quantizeResolution / 4);
    let quantized = Math.round(timeInSeconds / gridSize) * gridSize;

    // Apply swing on even subdivisions
    if (this.state.swing > 0) {
      const gridIndex = Math.round(timeInSeconds / gridSize);
      if (gridIndex % 2 === 1) {
        quantized += gridSize * (this.state.swing / 200);
      }
    }

    // Apply humanize (random micro-timing)
    if (this.state.humanize > 0) {
      const maxOffset = gridSize * (this.state.humanize / 400);
      quantized += (Math.random() * 2 - 1) * maxOffset;
    }

    return Math.max(0, quantized);
  }

  // ─── State ──────────────────────────────────────────────────────────────

  getState(): RitualaState {
    return { ...this.state, phase: this.getPhase() };
  }

  // ─── Cleanup ────────────────────────────────────────────────────────────

  dispose(): void {
    this.stopBeatLoop();
    this.callbacks.clear();
    this.metronomeSynth?.dispose();
    this.metronomeAccentSynth?.dispose();
    this.initialized = false;
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let ritualaInstance: RitualaEngine | null = null;

export function getRituala(): RitualaEngine {
  if (!ritualaInstance) {
    ritualaInstance = new RitualaEngine();
  }
  return ritualaInstance;
}
