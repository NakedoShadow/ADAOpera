/**
 * ADA Opera — DJ Mix Engine
 * Mathematical Sound Decomposition + Perfect Auto-Mix Algorithm
 *
 * Architecture: Web Audio API dual-deck routing with spectral analysis
 * Core Innovation: Two sounds are equations — our algorithm computes
 * the perfect transition between any two tracks.
 *
 * DeepFlow Taxonomy integration: 12 musical styles × 4 subgroups × 4 variants
 * CRYSTALLINE IF (Fluidity Index) applied to transitions
 */

import * as Tone from "tone";
import { getConductor } from "./audio-engine";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TrackAnalysis {
  bpm: number;
  key: string;
  energy: number;           // 0-1 overall energy level
  spectralCentroid: number; // frequency center of mass
  spectralFlux: number;     // rate of spectral change
  rmsProfile: Float32Array; // loudness envelope over time
  beatGrid: number[];       // beat positions in seconds
  sections: TrackSection[]; // structural segments (intro, verse, chorus, outro)
  duration: number;
  sampleRate: number;
}

export interface TrackSection {
  start: number;   // seconds
  end: number;
  type: "intro" | "verse" | "chorus" | "bridge" | "breakdown" | "outro" | "unknown";
  energy: number;  // average energy in section
}

export interface TransitionPlan {
  type: "crossfade" | "cut" | "echo-out" | "filter-sweep" | "harmonic-blend" | "spectral-morph";
  startTime: number;       // when to start on outgoing track
  duration: number;        // transition length in seconds
  bpmAdjustment: number;   // BPM delta to sync
  keyShift: number;        // semitones to shift for harmonic compatibility
  eqCurves: {
    outLow: number[];      // EQ automation: outgoing track bass
    outMid: number[];
    outHigh: number[];
    inLow: number[];       // EQ automation: incoming track bass
    inMid: number[];
    inHigh: number[];
  };
  crossfadeCurve: Float32Array;  // custom fade shape
  fluidityScore: number;   // predicted IF (Fluidity Index) 0-1
}

export interface DeckState {
  id: "A" | "B";
  trackUrl: string;
  trackTitle: string;
  trackArtist: string;
  trackArtwork: string;
  loaded: boolean;
  playing: boolean;
  position: number;      // current playback position in seconds
  duration: number;
  volume: number;        // -60 to +6 dB
  eqLow: number;        // -24 to +6 dB
  eqMid: number;
  eqHigh: number;
  filter: number;        // 0-1: 0=full LPF, 0.5=bypass, 1=full HPF
  cuePoint: number;      // saved cue position
  loopStart: number;
  loopEnd: number;
  loopActive: boolean;
  sync: boolean;         // beat-sync enabled
  analysis: TrackAnalysis | null;
  audioBuffer: AudioBuffer | null;
  sourceNode: AudioBufferSourceNode | null;
  gainNode: GainNode | null;
  eqNodes: { low: BiquadFilterNode; mid: BiquadFilterNode; high: BiquadFilterNode } | null;
  filterNode: BiquadFilterNode | null;
  analyserNode: AnalyserNode | null;
}

export interface CrateTrack {
  id: string;
  url: string;
  title: string;
  artist: string;
  artwork: string;
  duration: number;
  bpm: number;
  key: string;
  addedAt: number;       // timestamp
  analysis: TrackAnalysis | null;
}

export type MixMode = "manual" | "auto" | "karaoke" | "remix";
export type RemixStyle = "trap" | "house" | "dnb" | "lofi" | "reggaeton" | "dubstep" | "ambient" | "original";

// ─── Harmonic Mixing: Camelot Wheel ─────────────────────────────────────────

const CAMELOT_WHEEL: Record<string, number> = {
  "Ab minor": 1, "B major": 1,
  "Eb minor": 2, "Gb major": 2,
  "Bb minor": 3, "Db major": 3,
  "F minor": 4, "Ab major": 4,
  "C minor": 5, "Eb major": 5,
  "G minor": 6, "Bb major": 6,
  "D minor": 7, "F major": 7,
  "A minor": 8, "C major": 8,
  "E minor": 9, "G major": 9,
  "B minor": 10, "D major": 10,
  "F# minor": 11, "A major": 11,
  "Db minor": 12, "E major": 12,
};

function camelotDistance(keyA: string, keyB: string): number {
  const a = CAMELOT_WHEEL[keyA] ?? 8;
  const b = CAMELOT_WHEEL[keyB] ?? 8;
  const diff = Math.abs(a - b);
  return Math.min(diff, 12 - diff);
}

function isHarmonicCompatible(keyA: string, keyB: string): boolean {
  return camelotDistance(keyA, keyB) <= 1;
}

// ─── BPM Detection (autocorrelation) ────────────────────────────────────────

function detectBPM(audioBuffer: AudioBuffer): number {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;

  // Downsample for speed
  const downFactor = 4;
  const len = Math.floor(channelData.length / downFactor);
  const downsampled = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    downsampled[i] = Math.abs(channelData[i * downFactor]);
  }

  // Onset detection: compute energy in windows
  const windowSize = Math.floor(sampleRate / downFactor / 10); // ~100ms windows
  const numWindows = Math.floor(len / windowSize);
  const energies = new Float32Array(numWindows);
  for (let w = 0; w < numWindows; w++) {
    let sum = 0;
    const start = w * windowSize;
    for (let i = 0; i < windowSize; i++) {
      sum += downsampled[start + i] * downsampled[start + i];
    }
    energies[w] = sum / windowSize;
  }

  // Onset flux (difference between consecutive windows)
  const flux = new Float32Array(numWindows - 1);
  for (let i = 0; i < flux.length; i++) {
    flux[i] = Math.max(0, energies[i + 1] - energies[i]);
  }

  // Autocorrelation to find periodicity
  const minBPM = 60, maxBPM = 200;
  const windowsPerSec = sampleRate / downFactor / windowSize;
  const minLag = Math.floor(windowsPerSec * 60 / maxBPM);
  const maxLag = Math.floor(windowsPerSec * 60 / minBPM);

  let bestLag = minLag;
  let bestCorr = -Infinity;

  for (let lag = minLag; lag <= Math.min(maxLag, flux.length - 1); lag++) {
    let corr = 0;
    const n = flux.length - lag;
    for (let i = 0; i < n; i++) {
      corr += flux[i] * flux[i + lag];
    }
    corr /= n;
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  const bpm = (windowsPerSec * 60) / bestLag;
  // Round to common BPM values
  return Math.round(bpm * 2) / 2;
}

// ─── Key Detection (chroma-based) ───────────────────────────────────────────

const KEY_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

// Krumhansl-Kessler key profiles
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

function detectKey(audioBuffer: AudioBuffer): string {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const fftSize = 4096;

  // Take a section from the middle of the track for stability
  const midPoint = Math.floor(channelData.length / 2);
  const analysisLength = Math.min(fftSize * 32, channelData.length);
  const startSample = Math.max(0, midPoint - analysisLength / 2);

  // Compute chroma vector (simplified: bin frequencies to pitch classes)
  const chroma = new Float32Array(12);
  const windowCount = Math.floor(analysisLength / fftSize);

  for (let w = 0; w < windowCount; w++) {
    const offset = startSample + w * fftSize;
    // Simple spectral energy per pitch class using frequency binning
    for (let i = 1; i < fftSize / 2; i++) {
      const freq = (i * sampleRate) / fftSize;
      if (freq < 65 || freq > 2000) continue; // Musical range
      const midiNote = 12 * Math.log2(freq / 440) + 69;
      const pitchClass = Math.round(midiNote) % 12;
      if (pitchClass >= 0 && pitchClass < 12) {
        const sample = channelData[offset + i] ?? 0;
        chroma[pitchClass] += sample * sample;
      }
    }
  }

  // Normalize chroma
  const maxChroma = Math.max(...chroma);
  if (maxChroma > 0) {
    for (let i = 0; i < 12; i++) chroma[i] /= maxChroma;
  }

  // Correlate with key profiles
  let bestKey = "C major";
  let bestCorr = -Infinity;

  for (let shift = 0; shift < 12; shift++) {
    // Major correlation
    let corrMaj = 0;
    for (let i = 0; i < 12; i++) {
      corrMaj += chroma[(i + shift) % 12] * MAJOR_PROFILE[i];
    }
    if (corrMaj > bestCorr) {
      bestCorr = corrMaj;
      bestKey = `${KEY_NAMES[shift]} major`;
    }

    // Minor correlation
    let corrMin = 0;
    for (let i = 0; i < 12; i++) {
      corrMin += chroma[(i + shift) % 12] * MINOR_PROFILE[i];
    }
    if (corrMin > bestCorr) {
      bestCorr = corrMin;
      bestKey = `${KEY_NAMES[shift]} minor`;
    }
  }

  return bestKey;
}

// ─── Spectral Analysis ──────────────────────────────────────────────────────

function computeSpectralCentroid(audioBuffer: AudioBuffer): number {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const fftSize = 2048;
  const midPoint = Math.floor(channelData.length / 2);

  let weightedSum = 0;
  let totalEnergy = 0;

  for (let i = 1; i < fftSize / 2; i++) {
    const sample = channelData[midPoint + i] ?? 0;
    const energy = sample * sample;
    const freq = (i * sampleRate) / fftSize;
    weightedSum += freq * energy;
    totalEnergy += energy;
  }

  return totalEnergy > 0 ? weightedSum / totalEnergy : 1000;
}

function computeRMSProfile(audioBuffer: AudioBuffer, windowMs: number = 50): Float32Array {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const windowSamples = Math.floor(sampleRate * windowMs / 1000);
  const numWindows = Math.floor(channelData.length / windowSamples);
  const rms = new Float32Array(numWindows);

  for (let w = 0; w < numWindows; w++) {
    let sum = 0;
    const start = w * windowSamples;
    for (let i = 0; i < windowSamples; i++) {
      const s = channelData[start + i];
      sum += s * s;
    }
    rms[w] = Math.sqrt(sum / windowSamples);
  }

  return rms;
}

function computeBeatGrid(audioBuffer: AudioBuffer, bpm: number): number[] {
  const beatInterval = 60 / bpm;
  const duration = audioBuffer.duration;
  const beats: number[] = [];

  // Simple grid based on detected BPM — first beat at estimated downbeat
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const beatSamples = Math.floor(sampleRate * beatInterval);

  // Find first strong onset (downbeat estimation)
  let firstBeat = 0;
  const threshold = 0.05;
  for (let i = 0; i < Math.min(channelData.length, sampleRate * 5); i++) {
    if (Math.abs(channelData[i]) > threshold) {
      firstBeat = i / sampleRate;
      break;
    }
  }

  for (let t = firstBeat; t < duration; t += beatInterval) {
    beats.push(t);
  }

  return beats;
}

// ─── Track Analysis ─────────────────────────────────────────────────────────

export function analyzeTrack(audioBuffer: AudioBuffer): TrackAnalysis {
  const bpm = detectBPM(audioBuffer);
  const key = detectKey(audioBuffer);
  const spectralCentroid = computeSpectralCentroid(audioBuffer);
  const rmsProfile = computeRMSProfile(audioBuffer);
  const beatGrid = computeBeatGrid(audioBuffer, bpm);

  // Compute overall energy
  const channelData = audioBuffer.getChannelData(0);
  let totalEnergy = 0;
  for (let i = 0; i < channelData.length; i += 64) {
    totalEnergy += channelData[i] * channelData[i];
  }
  const energy = Math.min(1, Math.sqrt(totalEnergy / (channelData.length / 64)) * 5);

  // Simple section detection based on energy profile
  const sections = detectSections(rmsProfile, audioBuffer.duration);

  return {
    bpm,
    key,
    energy,
    spectralCentroid,
    spectralFlux: 0, // computed during playback
    rmsProfile,
    beatGrid,
    sections,
    duration: audioBuffer.duration,
    sampleRate: audioBuffer.sampleRate,
  };
}

function detectSections(rmsProfile: Float32Array, duration: number): TrackSection[] {
  const numWindows = rmsProfile.length;
  if (numWindows === 0) return [];

  const sectionLength = Math.floor(numWindows / 8); // ~8 sections
  const sections: TrackSection[] = [];
  const windowDuration = duration / numWindows;

  for (let s = 0; s < 8; s++) {
    const start = s * sectionLength;
    const end = Math.min((s + 1) * sectionLength, numWindows);
    let avgEnergy = 0;
    for (let i = start; i < end; i++) {
      avgEnergy += rmsProfile[i];
    }
    avgEnergy /= (end - start);

    // Classify section type by position and energy
    let type: TrackSection["type"] = "unknown";
    if (s === 0) type = "intro";
    else if (s === 7) type = "outro";
    else if (avgEnergy > 0.6) type = "chorus";
    else if (avgEnergy > 0.3) type = "verse";
    else type = "breakdown";

    sections.push({
      start: start * windowDuration,
      end: end * windowDuration,
      type,
      energy: avgEnergy,
    });
  }

  return sections;
}

// ─── Auto-Mix: Transition Computation ───────────────────────────────────────
// The killer algorithm: two sounds are mathematical equations.
// Between any two equations, we compute the optimal transition.

export function computeTransition(
  outgoing: TrackAnalysis,
  incoming: TrackAnalysis,
  transitionBars: number = 16
): TransitionPlan {
  // 1. BPM alignment
  const bpmDelta = incoming.bpm - outgoing.bpm;
  const bpmRatio = incoming.bpm / outgoing.bpm;

  // 2. Key compatibility (Camelot wheel)
  const keyDist = camelotDistance(outgoing.key, incoming.key);
  const keyShift = keyDist > 1 ? (keyDist > 6 ? -(12 - keyDist) : keyDist) : 0;

  // 3. Transition duration based on BPM
  const avgBPM = (outgoing.bpm + incoming.bpm) / 2;
  const beatsPerBar = 4; // assuming 4/4
  const transitionDuration = (transitionBars * beatsPerBar * 60) / avgBPM;

  // 4. Choose transition type based on track characteristics
  let type: TransitionPlan["type"] = "crossfade";

  if (Math.abs(bpmDelta) < 3 && keyDist <= 1) {
    // Perfect harmonic match — use spectral morph (smoothest)
    type = "spectral-morph";
  } else if (Math.abs(bpmDelta) < 5) {
    // Close BPM — harmonic blend with EQ
    type = "harmonic-blend";
  } else if (Math.abs(bpmDelta) < 10) {
    // Moderate BPM difference — filter sweep
    type = "filter-sweep";
  } else if (Math.abs(bpmDelta) >= 10) {
    // Large BPM gap — echo out + cut
    type = "echo-out";
  }

  // 5. Generate EQ automation curves (the secret sauce)
  const curveLength = 64; // 64 steps over transition
  const eqCurves = generateEQCurves(type, curveLength, outgoing, incoming);

  // 6. Generate crossfade curve
  const crossfadeCurve = generateCrossfadeCurve(type, curveLength);

  // 7. Find optimal start time on outgoing track
  // Prefer starting at the beginning of an outro section
  let startTime = outgoing.duration - transitionDuration - 4;
  const outroSection = outgoing.sections.find(s => s.type === "outro");
  if (outroSection) {
    startTime = outroSection.start;
  }

  // 8. Compute predicted fluidity score
  const fluidityScore = computeFluidityScore(outgoing, incoming, type, bpmDelta, keyDist);

  return {
    type,
    startTime: Math.max(0, startTime),
    duration: transitionDuration,
    bpmAdjustment: bpmDelta,
    keyShift,
    eqCurves,
    crossfadeCurve,
    fluidityScore,
  };
}

function generateEQCurves(
  type: TransitionPlan["type"],
  length: number,
  outgoing: TrackAnalysis,
  incoming: TrackAnalysis
): TransitionPlan["eqCurves"] {
  const outLow = new Array(length).fill(0);
  const outMid = new Array(length).fill(0);
  const outHigh = new Array(length).fill(0);
  const inLow = new Array(length).fill(0);
  const inMid = new Array(length).fill(0);
  const inHigh = new Array(length).fill(0);

  for (let i = 0; i < length; i++) {
    const t = i / (length - 1); // 0 → 1

    switch (type) {
      case "spectral-morph":
        // Smooth sine-based crossover on each band
        outLow[i] = Math.cos(t * Math.PI / 2);
        outMid[i] = Math.cos(t * Math.PI / 2);
        outHigh[i] = Math.cos(t * Math.PI / 2);
        inLow[i] = Math.sin(t * Math.PI / 2);
        inMid[i] = Math.sin(t * Math.PI / 2);
        inHigh[i] = Math.sin(t * Math.PI / 2);
        break;

      case "harmonic-blend":
        // Bass swap at 50%, mids/highs gradual
        outLow[i] = t < 0.5 ? 1 : Math.cos((t - 0.5) * Math.PI);
        outMid[i] = Math.cos(t * Math.PI / 2);
        outHigh[i] = Math.cos(t * Math.PI / 2);
        inLow[i] = t < 0.5 ? 0 : Math.sin((t - 0.5) * Math.PI);
        inMid[i] = Math.sin(t * Math.PI / 2);
        inHigh[i] = Math.sin(t * Math.PI / 2);
        break;

      case "filter-sweep":
        // Outgoing: progressive LPF (kill highs first, then mids)
        outLow[i] = 1 - t * 0.7;
        outMid[i] = Math.max(0, 1 - t * 1.5);
        outHigh[i] = Math.max(0, 1 - t * 2);
        // Incoming: progressive HPF reveal
        inLow[i] = Math.min(1, t * 2);
        inMid[i] = Math.min(1, t * 1.5);
        inHigh[i] = t;
        break;

      case "echo-out":
        // Quick fade out with echo tail, quick fade in
        outLow[i] = Math.max(0, 1 - t * 2);
        outMid[i] = Math.max(0, 1 - t * 2);
        outHigh[i] = Math.max(0, 1 - t * 2.5);
        inLow[i] = Math.min(1, Math.max(0, (t - 0.3) * 1.5));
        inMid[i] = Math.min(1, Math.max(0, (t - 0.3) * 1.5));
        inHigh[i] = Math.min(1, Math.max(0, (t - 0.2) * 1.5));
        break;

      default: // crossfade
        outLow[i] = 1 - t;
        outMid[i] = 1 - t;
        outHigh[i] = 1 - t;
        inLow[i] = t;
        inMid[i] = t;
        inHigh[i] = t;
    }
  }

  return { outLow, outMid, outHigh, inLow, inMid, inHigh };
}

function generateCrossfadeCurve(type: TransitionPlan["type"], length: number): Float32Array {
  const curve = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    const t = i / (length - 1);

    switch (type) {
      case "spectral-morph":
      case "harmonic-blend":
        // Equal-power crossfade (sine/cosine)
        curve[i] = Math.sin(t * Math.PI / 2);
        break;
      case "filter-sweep":
        // S-curve (smooth sigmoid)
        curve[i] = t * t * (3 - 2 * t);
        break;
      case "echo-out":
        // Quick cut with overlap
        curve[i] = t < 0.3 ? 0 : Math.min(1, (t - 0.3) / 0.4);
        break;
      default:
        // Linear
        curve[i] = t;
    }
  }

  return curve;
}

/**
 * Compute predicted Fluidity Index (IF) for a transition.
 * Based on CRYSTALLINE v2.0 IF formula:
 * IF = alpha * H(S) + beta * C(T) + gamma * F(D)
 *
 * Adapted for DJ transitions:
 * H(S) = spectral compatibility (how similar the frequency profiles are)
 * C(T) = temporal compatibility (BPM closeness)
 * F(D) = dynamic fluidity (energy curve smoothness)
 */
function computeFluidityScore(
  outgoing: TrackAnalysis,
  incoming: TrackAnalysis,
  type: TransitionPlan["type"],
  bpmDelta: number,
  keyDist: number
): number {
  const alpha = 0.25;
  const beta = 0.25;
  const gamma = 0.50;

  // H(S) — Spectral compatibility: similar centroid = compatible frequency profiles
  const centroidRatio = Math.min(outgoing.spectralCentroid, incoming.spectralCentroid) /
    Math.max(outgoing.spectralCentroid, incoming.spectralCentroid);
  const spectralCompat = centroidRatio * (1 - keyDist / 12);

  // C(T) — Temporal compatibility: BPM closeness
  const bpmCompat = Math.max(0, 1 - Math.abs(bpmDelta) / 30);

  // F(D) — Dynamic fluidity: energy similarity + transition smoothness bonus
  const energyDiff = Math.abs(outgoing.energy - incoming.energy);
  const transitionBonus = type === "spectral-morph" ? 0.15 : type === "harmonic-blend" ? 0.1 : 0;
  const dynamicFluidity = Math.max(0, Math.min(1, (1 - energyDiff) + transitionBonus));

  const score = alpha * spectralCompat + beta * bpmCompat + gamma * dynamicFluidity;
  return Math.max(0, Math.min(1, score));
}

// ─── DJ Mix Engine (Singleton) ──────────────────────────────────────────────

export class DJMixEngine {
  private audioContext: AudioContext | null = null;
  private deckA: DeckState;
  private deckB: DeckState;
  private crossfaderValue = 0.5; // 0=A, 1=B
  private masterGain: GainNode | null = null;
  private autoMixActive = false;
  private transitionPlan: TransitionPlan | null = null;
  private transitionProgress = 0;
  private animFrame = 0;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.deckA = this.createEmptyDeck("A");
    this.deckB = this.createEmptyDeck("B");
  }

  private createEmptyDeck(id: "A" | "B"): DeckState {
    return {
      id,
      trackUrl: "",
      trackTitle: "",
      trackArtist: "",
      trackArtwork: "",
      loaded: false,
      playing: false,
      position: 0,
      duration: 0,
      volume: 0,
      eqLow: 0,
      eqMid: 0,
      eqHigh: 0,
      filter: 0.5,
      cuePoint: 0,
      loopStart: 0,
      loopEnd: 0,
      loopActive: false,
      sync: false,
      analysis: null,
      audioBuffer: null,
      sourceNode: null,
      gainNode: null,
      eqNodes: null,
      filterNode: null,
      analyserNode: null,
    };
  }

  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      const rawCtx = Tone.getContext().rawContext;
      if (rawCtx instanceof AudioContext) {
        this.audioContext = rawCtx;
      } else {
        this.audioContext = new AudioContext();
      }
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);

      // Connect to Conductor for visualizers
      const conductor = getConductor();
      conductor.connectExternalSource(this.masterGain);
    }
    return this.audioContext;
  }

  // ─── Track Loading ──────────────────────────────────────────────────────

  async loadTrack(deckId: "A" | "B", file: File): Promise<TrackAnalysis> {
    const ctx = this.ensureContext();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    const analysis = analyzeTrack(audioBuffer);

    const deck = deckId === "A" ? this.deckA : this.deckB;
    deck.trackUrl = URL.createObjectURL(file);
    deck.trackTitle = file.name.replace(/\.[^/.]+$/, "");
    deck.trackArtist = "Unknown Artist";
    deck.trackArtwork = "";
    deck.loaded = true;
    deck.duration = audioBuffer.duration;
    deck.audioBuffer = audioBuffer;
    deck.analysis = analysis;
    deck.position = 0;
    deck.cuePoint = 0;

    // Setup audio nodes chain: Source → EQ → Filter → Gain → Master
    this.setupDeckNodes(deck);

    this.notify();
    return analysis;
  }

  async loadTrackFromCrate(deckId: "A" | "B", track: CrateTrack): Promise<void> {
    const ctx = this.ensureContext();

    const response = await fetch(track.url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    const deck = deckId === "A" ? this.deckA : this.deckB;
    deck.trackUrl = track.url;
    deck.trackTitle = track.title;
    deck.trackArtist = track.artist;
    deck.trackArtwork = track.artwork;
    deck.loaded = true;
    deck.duration = audioBuffer.duration;
    deck.audioBuffer = audioBuffer;
    deck.analysis = track.analysis ?? analyzeTrack(audioBuffer);
    deck.position = 0;
    deck.cuePoint = 0;

    this.setupDeckNodes(deck);
    this.notify();
  }

  private setupDeckNodes(deck: DeckState): void {
    const ctx = this.ensureContext();

    // Cleanup previous nodes
    deck.sourceNode?.disconnect();
    deck.gainNode?.disconnect();
    deck.eqNodes?.low.disconnect();
    deck.eqNodes?.mid.disconnect();
    deck.eqNodes?.high.disconnect();
    deck.filterNode?.disconnect();
    deck.analyserNode?.disconnect();

    // EQ: 3-band (low shelf, peaking mid, high shelf)
    const eqLow = ctx.createBiquadFilter();
    eqLow.type = "lowshelf";
    eqLow.frequency.value = 250;
    eqLow.gain.value = deck.eqLow;

    const eqMid = ctx.createBiquadFilter();
    eqMid.type = "peaking";
    eqMid.frequency.value = 1000;
    eqMid.Q.value = 1.0;
    eqMid.gain.value = deck.eqMid;

    const eqHigh = ctx.createBiquadFilter();
    eqHigh.type = "highshelf";
    eqHigh.frequency.value = 3500;
    eqHigh.gain.value = deck.eqHigh;

    // Filter (HPF/LPF sweep)
    const filterNode = ctx.createBiquadFilter();
    filterNode.type = deck.filter > 0.5 ? "highpass" : "lowpass";
    filterNode.frequency.value = this.filterValueToFreq(deck.filter);
    filterNode.Q.value = 2;

    // Gain
    const gainNode = ctx.createGain();
    gainNode.gain.value = this.dbToLinear(deck.volume);

    // Analyser
    const analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = 2048;

    // Chain: EQ → Filter → Gain → Analyser → Master
    eqLow.connect(eqMid);
    eqMid.connect(eqHigh);
    eqHigh.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(analyserNode);
    if (this.masterGain) analyserNode.connect(this.masterGain);

    deck.eqNodes = { low: eqLow, mid: eqMid, high: eqHigh };
    deck.filterNode = filterNode;
    deck.gainNode = gainNode;
    deck.analyserNode = analyserNode;
  }

  // ─── Deck Control ───────────────────────────────────────────────────────

  playDeck(deckId: "A" | "B"): void {
    const ctx = this.ensureContext();
    const deck = deckId === "A" ? this.deckA : this.deckB;

    if (!deck.audioBuffer || !deck.eqNodes) return;

    // Stop previous source
    if (deck.sourceNode) {
      try { deck.sourceNode.stop(); } catch { /* already stopped */ }
      deck.sourceNode.disconnect();
    }

    // Create new source node
    const source = ctx.createBufferSource();
    source.buffer = deck.audioBuffer;
    source.connect(deck.eqNodes.low);
    source.start(0, deck.position);
    deck.sourceNode = source;
    deck.playing = true;

    // Track position
    const startTime = ctx.currentTime;
    const startPos = deck.position;
    const updatePosition = () => {
      if (!deck.playing) return;
      deck.position = startPos + (ctx.currentTime - startTime);
      if (deck.position >= deck.duration) {
        deck.playing = false;
        deck.position = 0;
      }
      if (deck.playing) requestAnimationFrame(updatePosition);
    };
    requestAnimationFrame(updatePosition);

    source.onended = () => {
      deck.playing = false;
      this.notify();
    };

    this.notify();
  }

  pauseDeck(deckId: "A" | "B"): void {
    const deck = deckId === "A" ? this.deckA : this.deckB;
    if (deck.sourceNode && deck.playing) {
      try { deck.sourceNode.stop(); } catch { /* */ }
      deck.playing = false;
      this.notify();
    }
  }

  stopDeck(deckId: "A" | "B"): void {
    const deck = deckId === "A" ? this.deckA : this.deckB;
    if (deck.sourceNode) {
      try { deck.sourceNode.stop(); } catch { /* */ }
    }
    deck.playing = false;
    deck.position = 0;
    this.notify();
  }

  seekDeck(deckId: "A" | "B", position: number): void {
    const deck = deckId === "A" ? this.deckA : this.deckB;
    const wasPlaying = deck.playing;
    if (wasPlaying) this.pauseDeck(deckId);
    deck.position = Math.max(0, Math.min(position, deck.duration));
    if (wasPlaying) this.playDeck(deckId);
    this.notify();
  }

  setCuePoint(deckId: "A" | "B"): void {
    const deck = deckId === "A" ? this.deckA : this.deckB;
    deck.cuePoint = deck.position;
    this.notify();
  }

  goToCue(deckId: "A" | "B"): void {
    this.seekDeck(deckId, (deckId === "A" ? this.deckA : this.deckB).cuePoint);
  }

  // ─── Mixer Controls ─────────────────────────────────────────────────────

  setDeckVolume(deckId: "A" | "B", db: number): void {
    const deck = deckId === "A" ? this.deckA : this.deckB;
    deck.volume = Math.max(-60, Math.min(6, db));
    if (deck.gainNode) deck.gainNode.gain.value = this.dbToLinear(deck.volume);
    this.notify();
  }

  setDeckEQ(deckId: "A" | "B", band: "low" | "mid" | "high", db: number): void {
    const deck = deckId === "A" ? this.deckA : this.deckB;
    const value = Math.max(-24, Math.min(6, db));

    if (band === "low") { deck.eqLow = value; if (deck.eqNodes) deck.eqNodes.low.gain.value = value; }
    if (band === "mid") { deck.eqMid = value; if (deck.eqNodes) deck.eqNodes.mid.gain.value = value; }
    if (band === "high") { deck.eqHigh = value; if (deck.eqNodes) deck.eqNodes.high.gain.value = value; }

    this.notify();
  }

  setDeckFilter(deckId: "A" | "B", value: number): void {
    const deck = deckId === "A" ? this.deckA : this.deckB;
    deck.filter = Math.max(0, Math.min(1, value));

    if (deck.filterNode) {
      if (Math.abs(value - 0.5) < 0.05) {
        // Bypass: set to very wide range
        deck.filterNode.type = "lowpass";
        deck.filterNode.frequency.value = 20000;
      } else {
        deck.filterNode.type = value > 0.5 ? "highpass" : "lowpass";
        deck.filterNode.frequency.value = this.filterValueToFreq(value);
      }
    }
    this.notify();
  }

  setCrossfader(value: number): void {
    this.crossfaderValue = Math.max(0, Math.min(1, value));

    // Apply crossfader volumes (equal-power)
    const angleA = (1 - this.crossfaderValue) * Math.PI / 2;
    const angleB = this.crossfaderValue * Math.PI / 2;

    if (this.deckA.gainNode) {
      this.deckA.gainNode.gain.value = this.dbToLinear(this.deckA.volume) * Math.cos(angleB);
    }
    if (this.deckB.gainNode) {
      this.deckB.gainNode.gain.value = this.dbToLinear(this.deckB.volume) * Math.sin(angleB);
    }
    this.notify();
  }

  // ─── Auto-Mix ───────────────────────────────────────────────────────────

  computeAutoMix(): TransitionPlan | null {
    if (!this.deckA.analysis || !this.deckB.analysis) return null;
    const plan = computeTransition(this.deckA.analysis, this.deckB.analysis);
    this.transitionPlan = plan;
    return plan;
  }

  startAutoMix(): void {
    if (!this.transitionPlan) {
      this.computeAutoMix();
    }
    if (!this.transitionPlan) return;

    this.autoMixActive = true;
    this.transitionProgress = 0;

    // Start deck B at the right moment
    if (!this.deckB.playing && this.deckB.loaded) {
      this.deckB.position = 0;
      this.playDeck("B");
    }

    const startTime = performance.now();
    const duration = this.transitionPlan.duration * 1000; // ms

    const animate = () => {
      if (!this.autoMixActive || !this.transitionPlan) return;

      const elapsed = performance.now() - startTime;
      this.transitionProgress = Math.min(1, elapsed / duration);

      // Apply EQ curves
      const curveIndex = Math.floor(this.transitionProgress * (this.transitionPlan.eqCurves.outLow.length - 1));
      const curves = this.transitionPlan.eqCurves;

      this.setDeckEQ("A", "low", (curves.outLow[curveIndex] - 1) * 24);
      this.setDeckEQ("A", "mid", (curves.outMid[curveIndex] - 1) * 24);
      this.setDeckEQ("A", "high", (curves.outHigh[curveIndex] - 1) * 24);
      this.setDeckEQ("B", "low", (curves.inLow[curveIndex] - 1) * 24);
      this.setDeckEQ("B", "mid", (curves.inMid[curveIndex] - 1) * 24);
      this.setDeckEQ("B", "high", (curves.inHigh[curveIndex] - 1) * 24);

      // Apply crossfader
      this.setCrossfader(this.transitionPlan.crossfadeCurve[curveIndex]);

      if (this.transitionProgress >= 1) {
        this.autoMixActive = false;
        this.stopDeck("A");
        this.setCrossfader(1);
        // Reset EQ on B
        this.setDeckEQ("B", "low", 0);
        this.setDeckEQ("B", "mid", 0);
        this.setDeckEQ("B", "high", 0);
        this.notify();
        return;
      }

      this.animFrame = requestAnimationFrame(animate);
    };

    this.animFrame = requestAnimationFrame(animate);
    this.notify();
  }

  stopAutoMix(): void {
    this.autoMixActive = false;
    cancelAnimationFrame(this.animFrame);
    this.notify();
  }

  // ─── Scratch (Vinyl Grab) ────────────────────────────────────────────────

  /**
   * Set playback rate for scratching.
   * rate: -3 to +3 (negative = reverse, 0 = stopped, 1 = normal)
   * Called from Turntable component during mouse drag.
   */
  setScratchRate(deckId: "A" | "B", rate: number): void {
    const deck = deckId === "A" ? this.deckA : this.deckB;
    if (!deck.sourceNode) return;

    // AudioBufferSourceNode.playbackRate controls speed + direction
    // Clamp between -3 and 3
    const clampedRate = Math.max(-3, Math.min(3, rate));
    try {
      deck.sourceNode.playbackRate.value = clampedRate;
    } catch {
      // Some browsers don't support negative playbackRate
      deck.sourceNode.playbackRate.value = Math.max(0, clampedRate);
    }
  }

  /**
   * Start scratch mode: lock the disc.
   * If audio is loaded and playing, freeze playback at current position.
   * Visual lock is handled by Turntable component (scratchingRef stops auto-rotation).
   */
  startScratch(deckId: "A" | "B"): void {
    const deck = deckId === "A" ? this.deckA : this.deckB;
    // Audio scratch only if source is active
    if (deck.sourceNode && deck.playing) {
      try {
        deck.sourceNode.playbackRate.value = 0;
      } catch { /* */ }
    }
  }

  /**
   * End scratch: restore normal playback rate.
   * Visual release is handled by Turntable component.
   */
  endScratch(deckId: "A" | "B"): void {
    const deck = deckId === "A" ? this.deckA : this.deckB;
    if (deck.sourceNode && deck.playing) {
      try {
        deck.sourceNode.playbackRate.value = 1;
      } catch { /* */ }
    }
  }

  // ─── Deck Meter (for VU per deck) ───────────────────────────────────────

  getDeckLevel(deckId: "A" | "B"): number {
    const deck = deckId === "A" ? this.deckA : this.deckB;
    if (!deck.analyserNode || !deck.playing) return -60;

    const data = new Float32Array(deck.analyserNode.fftSize);
    deck.analyserNode.getFloatTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
    const rms = Math.sqrt(sum / data.length);
    return rms > 0.0001 ? 20 * Math.log10(rms) : -60;
  }

  // ─── State Access ───────────────────────────────────────────────────────

  getDeckState(deckId: "A" | "B"): DeckState {
    return deckId === "A" ? { ...this.deckA } : { ...this.deckB };
  }

  getCrossfader(): number {
    return this.crossfaderValue;
  }

  isAutoMixActive(): boolean {
    return this.autoMixActive;
  }

  getTransitionPlan(): TransitionPlan | null {
    return this.transitionPlan;
  }

  getTransitionProgress(): number {
    return this.transitionProgress;
  }

  // ─── Utilities ──────────────────────────────────────────────────────────

  private dbToLinear(db: number): number {
    return Math.pow(10, db / 20);
  }

  private filterValueToFreq(value: number): number {
    // 0 → 200Hz (full LPF), 0.5 → bypass, 1 → 200Hz (full HPF)
    if (value <= 0.5) {
      // LPF: 200Hz to 20000Hz
      const t = value * 2; // 0→1
      return 200 * Math.pow(100, t);
    } else {
      // HPF: 20000Hz down to 200Hz
      const t = (1 - value) * 2; // 1→0
      return 200 * Math.pow(100, t);
    }
  }

  // ─── Subscriptions ──────────────────────────────────────────────────────

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(fn => { try { fn(); } catch { /* */ } });
  }

  // ─── Cleanup ────────────────────────────────────────────────────────────

  dispose(): void {
    this.stopAutoMix();
    this.stopDeck("A");
    this.stopDeck("B");
    this.masterGain?.disconnect();
    this.audioContext = null;
    this.listeners.clear();
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let mixEngineInstance: DJMixEngine | null = null;

export function getMixEngine(): DJMixEngine {
  if (!mixEngineInstance) {
    mixEngineInstance = new DJMixEngine();
  }
  return mixEngineInstance;
}
