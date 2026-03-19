/**
 * ADA Opera — Core Audio Engine
 * Vivaldi Conductor: manages all audio routing, instrument SHOs, and the sound pipeline
 *
 * Architecture: Web Audio API (core) + Tone.js (synthesis) + Custom DSP
 * Principle: Vivaldi IS the musicians, the musicians ARE Vivaldi
 */

import * as Tone from "tone";

// ─── Types ───────────────────────────────────────────────────────────────────

export type InstrumentFamily = "strings" | "woodwinds" | "brass" | "percussion" | "keyboard" | "electronic";

export interface InstrumentSHO {
  id: string;
  name: string;
  family: InstrumentFamily;
  synth: Tone.PolySynth | Tone.Synth | Tone.MonoSynth | Tone.FMSynth | Tone.AMSynth | null;
  channel: Tone.Channel;
  effects: Tone.ToneAudioNode[];
  active: boolean;
  volume: number;
  pan: number;
  solo: boolean;
  mute: boolean;
}

export interface ConductorState {
  bpm: number;
  timeSignature: [number, number];
  key: string;
  mode: "major" | "minor";
  playing: boolean;
  recording: boolean;
  masterVolume: number;
}

// ─── CRYSTALLINE Pipeline (6-stage) ─────────────────────────────────────────

export type CrystallineMode = "REALTIME" | "STUDIO" | "CRYSTAL";

export interface CrystallinePipeline {
  mode: CrystallineMode;
  stages: {
    e1_prefilter: boolean;     // RNNoise
    e2_deepfilter: boolean;    // DeepFilterNet3
    e3_separation: boolean;    // MossFormer2
    e4_superres: boolean;      // Resemble Enhance
    e5_postprocess: boolean;   // SpeechBrain + CamillaDSP
    e6_pipeline_check: boolean; // Quality validation + metrics
  };
  metrics: {
    snr: number;
    pesq: number;
    stoi: number;
    latency: number;
    lsd: number;
  };
}

// ─── Vivaldi Conductor ──────────────────────────────────────────────────────

export class VivaldiConductor {
  private instruments: Map<string, InstrumentSHO> = new Map();
  private masterChannel: Tone.Channel | null = null;
  private analyser: Tone.Analyser | null = null;
  private fftAnalyser: Tone.FFT | null = null;
  private waveformAnalyser: Tone.Waveform | null = null;
  private meter: Tone.Meter | null = null;
  // Native Web Audio analyzers for external sources (bypasses Tone.js impedance)
  private externalWaveform: AnalyserNode | null = null;
  private externalFFT: AnalyserNode | null = null;
  private externalConnected = false;
  private state: ConductorState;
  private crystalline: CrystallinePipeline;
  private initialized = false;

  constructor() {
    // Defer Tone.js node creation until first user gesture (Tone.start())
    // to avoid AudioContext warnings on page load
    this.state = {
      bpm: 120,
      timeSignature: [4, 4],
      key: "C",
      mode: "major",
      playing: false,
      recording: false,
      masterVolume: 0,
    };

    this.crystalline = {
      mode: "REALTIME",
      stages: {
        e1_prefilter: true,
        e2_deepfilter: true,
        e3_separation: false,
        e4_superres: false,
        e5_postprocess: true,
        e6_pipeline_check: true,
      },
      metrics: { snr: 0, pesq: 0, stoi: 0, latency: 0, lsd: 0 },
    };
  }

  /** Initialize Tone.js audio nodes — call after Tone.start() */
  private ensureInitialized(): void {
    if (this.initialized) return;
    this.initialized = true;

    this.masterChannel = new Tone.Channel({ volume: 0, pan: 0 }).toDestination();
    this.analyser = new Tone.Analyser("waveform", 2048);
    this.fftAnalyser = new Tone.FFT(2048);
    this.waveformAnalyser = new Tone.Waveform(2048);
    this.meter = new Tone.Meter({ smoothing: 0.8 });

    this.masterChannel.connect(this.analyser);
    this.masterChannel.connect(this.fftAnalyser);
    this.masterChannel.connect(this.waveformAnalyser);
    this.masterChannel.connect(this.meter);

    Tone.getTransport().bpm.value = this.state.bpm;
  }

  // ─── Instrument Management ──────────────────────────────────────────────

  registerInstrument(id: string, name: string, family: InstrumentFamily, synthType: string = "poly"): InstrumentSHO {
    this.ensureInitialized();
    const channel = new Tone.Channel({ volume: -6, pan: 0 }).connect(this.masterChannel!);

    let synth: InstrumentSHO["synth"] = null;
    switch (synthType) {
      case "poly":
        synth = new Tone.PolySynth(Tone.Synth).connect(channel);
        break;
      case "mono":
        synth = new Tone.MonoSynth({ oscillator: { type: "sawtooth" }, envelope: { attack: 0.1, decay: 0.3, sustain: 0.7, release: 1 } }).connect(channel);
        break;
      case "fm":
        synth = new Tone.FMSynth().connect(channel);
        break;
      case "am":
        synth = new Tone.AMSynth().connect(channel);
        break;
      default:
        synth = new Tone.PolySynth(Tone.Synth).connect(channel);
    }

    const instrument: InstrumentSHO = {
      id,
      name,
      family,
      synth,
      channel,
      effects: [],
      active: true,
      volume: -6,
      pan: 0,
      solo: false,
      mute: false,
    };

    this.instruments.set(id, instrument);
    return instrument;
  }

  removeInstrument(id: string): void {
    const inst = this.instruments.get(id);
    if (inst) {
      inst.synth?.dispose();
      inst.channel.dispose();
      inst.effects.forEach((e) => e.dispose());
      this.instruments.delete(id);
    }
  }

  getInstrument(id: string): InstrumentSHO | undefined {
    return this.instruments.get(id);
  }

  getAllInstruments(): InstrumentSHO[] {
    return Array.from(this.instruments.values());
  }

  getInstrumentsByFamily(family: InstrumentFamily): InstrumentSHO[] {
    return this.getAllInstruments().filter((i) => i.family === family);
  }

  // ─── Playback Control ──────────────────────────────────────────────────

  async start(): Promise<void> {
    await Tone.start();
    this.ensureInitialized();
    this.state.playing = true;
  }

  play(): void {
    Tone.getTransport().start();
    this.state.playing = true;
  }

  pause(): void {
    Tone.getTransport().pause();
    this.state.playing = false;
  }

  stop(): void {
    Tone.getTransport().stop();
    this.state.playing = false;
  }

  // ─── Note Playback (subluminal speed) ──────────────────────────────────

  playNote(instrumentId: string, note: string | string[], duration: string = "8n", time?: number, velocity?: number): void {
    const inst = this.instruments.get(instrumentId);
    if (!inst?.synth || inst.mute) return;
    if (inst.synth instanceof Tone.PolySynth) {
      inst.synth.triggerAttackRelease(note, duration, time, velocity);
    } else {
      const n = Array.isArray(note) ? note[0] : note;
      inst.synth.triggerAttackRelease(n, duration, time, velocity);
    }
  }

  triggerAttack(instrumentId: string, note: string | string[], velocity?: number): void {
    const inst = this.instruments.get(instrumentId);
    if (!inst?.synth || inst.mute) return;
    if (inst.synth instanceof Tone.PolySynth) {
      inst.synth.triggerAttack(note, undefined, velocity);
    } else {
      const n = Array.isArray(note) ? note[0] : note;
      inst.synth.triggerAttack(n, undefined, velocity);
    }
  }

  triggerRelease(instrumentId: string, note?: string | string[]): void {
    const inst = this.instruments.get(instrumentId);
    if (!inst?.synth) return;
    if (inst.synth instanceof Tone.PolySynth && note) {
      inst.synth.triggerRelease(note);
    } else if (inst.synth instanceof Tone.PolySynth) {
      inst.synth.releaseAll();
    } else {
      inst.synth.triggerRelease();
    }
  }

  // ─── Conductor Controls ────────────────────────────────────────────────

  setBPM(bpm: number): void {
    this.state.bpm = Math.max(20, Math.min(300, bpm));
    Tone.getTransport().bpm.value = this.state.bpm;
  }

  setTimeSignature(numerator: number, denominator: number): void {
    this.state.timeSignature = [numerator, denominator];
    Tone.getTransport().timeSignature = numerator;
  }

  setKey(key: string, mode: "major" | "minor"): void {
    this.state.key = key;
    this.state.mode = mode;
  }

  setMasterVolume(db: number): void {
    this.state.masterVolume = db;
    if (this.masterChannel) this.masterChannel.volume.value = db;
  }

  setInstrumentVolume(id: string, db: number): void {
    const inst = this.instruments.get(id);
    if (inst) {
      inst.volume = db;
      inst.channel.volume.value = db;
    }
  }

  setInstrumentPan(id: string, pan: number): void {
    const inst = this.instruments.get(id);
    if (inst) {
      inst.pan = Math.max(-1, Math.min(1, pan));
      inst.channel.pan.value = inst.pan;
    }
  }

  muteInstrument(id: string, muted: boolean): void {
    const inst = this.instruments.get(id);
    if (inst) {
      inst.mute = muted;
      inst.channel.mute = muted;
    }
  }

  soloInstrument(id: string, solo: boolean): void {
    const inst = this.instruments.get(id);
    if (inst) {
      inst.solo = solo;
      inst.channel.solo = solo;
    }
  }

  // ─── Effects Chain ─────────────────────────────────────────────────────

  addEffect(instrumentId: string, effect: Tone.ToneAudioNode): void {
    const inst = this.instruments.get(instrumentId);
    if (inst) {
      inst.effects.push(effect);
      inst.synth?.disconnect();
      const chain = [inst.synth as Tone.ToneAudioNode, ...inst.effects, inst.channel];
      for (let i = 0; i < chain.length - 1; i++) {
        if (chain[i] && chain[i + 1]) chain[i].connect(chain[i + 1]);
      }
    }
  }

  // ─── External Source (PlaybackBus integration) ────────────────────────

  /**
   * Connect an external Web Audio source (e.g. MediaElementSourceNode)
   * to native AnalyserNodes so all visualizers display its signal.
   *
   * Uses native Web Audio API directly — no Tone.js impedance mismatch.
   * The getWaveformData/getFFTData methods auto-detect signal from either source.
   */
  connectExternalSource(sourceNode: AudioNode): void {
    this.ensureInitialized();

    const rawCtx = Tone.getContext().rawContext as AudioContext;

    // Create native analyzers for external source (only once)
    if (!this.externalWaveform) {
      this.externalWaveform = rawCtx.createAnalyser();
      this.externalWaveform.fftSize = 2048;
      this.externalWaveform.smoothingTimeConstant = 0.8;
    }
    if (!this.externalFFT) {
      this.externalFFT = rawCtx.createAnalyser();
      this.externalFFT.fftSize = 2048;
      this.externalFFT.smoothingTimeConstant = 0.85;
    }

    // Connect: external source → native analyzers (guaranteed to work)
    try {
      sourceNode.connect(this.externalWaveform);
      sourceNode.connect(this.externalFFT);
      this.externalConnected = true;
    } catch (e) {
      console.warn("[Conductor] Failed to connect external source:", e);
    }
  }

  /**
   * Disconnect external source from analyzers.
   */
  disconnectExternalSource(): void {
    this.externalConnected = false;
  }

  // ─── Analysis (for visualizers) ────────────────────────────────────────

  getWaveformData(): Float32Array {
    // Prefer external source (media) if connected and has signal
    if (this.externalConnected && this.externalWaveform) {
      const data = new Float32Array(this.externalWaveform.fftSize);
      this.externalWaveform.getFloatTimeDomainData(data);
      // Check for actual signal (not flat silence)
      for (let i = 0; i < data.length; i += 32) {
        if (Math.abs(data[i]) > 0.001) return data;
      }
    }
    if (!this.waveformAnalyser) return new Float32Array(2048);
    return this.waveformAnalyser.getValue() as Float32Array;
  }

  getFFTData(): Float32Array {
    // Prefer external source (media) if connected and has signal
    if (this.externalConnected && this.externalFFT) {
      const data = new Float32Array(this.externalFFT.frequencyBinCount);
      this.externalFFT.getFloatFrequencyData(data);
      // Check for actual signal (not all -Infinity)
      for (let i = 4; i < data.length; i += 32) {
        if (data[i] > -80) return data;
      }
    }
    if (!this.fftAnalyser) return new Float32Array(2048);
    return this.fftAnalyser.getValue() as Float32Array;
  }

  getMeterLevel(): number | number[] {
    // Calculate from external waveform if available
    if (this.externalConnected && this.externalWaveform) {
      const data = new Float32Array(this.externalWaveform.fftSize);
      this.externalWaveform.getFloatTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      const rms = Math.sqrt(sum / data.length);
      if (rms > 0.0001) {
        return 20 * Math.log10(rms); // Convert to dB
      }
    }
    if (!this.meter) return 0;
    return this.meter.getValue();
  }

  // ─── CRYSTALLINE Pipeline ──────────────────────────────────────────────

  setCrystallineMode(mode: CrystallineMode): void {
    this.crystalline.mode = mode;
    switch (mode) {
      case "REALTIME":
        this.crystalline.stages = { e1_prefilter: true, e2_deepfilter: true, e3_separation: false, e4_superres: false, e5_postprocess: true, e6_pipeline_check: true };
        break;
      case "STUDIO":
        this.crystalline.stages = { e1_prefilter: true, e2_deepfilter: true, e3_separation: true, e4_superres: false, e5_postprocess: true, e6_pipeline_check: true };
        break;
      case "CRYSTAL":
        this.crystalline.stages = { e1_prefilter: true, e2_deepfilter: true, e3_separation: true, e4_superres: true, e5_postprocess: true, e6_pipeline_check: true };
        break;
    }
  }

  getCrystallineState(): CrystallinePipeline {
    return { ...this.crystalline };
  }

  // ─── State ─────────────────────────────────────────────────────────────

  getState(): ConductorState {
    return { ...this.state };
  }

  // ─── Cleanup ───────────────────────────────────────────────────────────

  dispose(): void {
    this.instruments.forEach((inst) => {
      inst.synth?.dispose();
      inst.channel.dispose();
      inst.effects.forEach((e) => e.dispose());
    });
    this.instruments.clear();
    this.masterChannel?.dispose();
    this.analyser?.dispose();
    this.fftAnalyser?.dispose();
    this.waveformAnalyser?.dispose();
    this.meter?.dispose();
    this.externalWaveform?.disconnect();
    this.externalFFT?.disconnect();
    this.externalWaveform = null;
    this.externalFFT = null;
    this.externalConnected = false;
    this.initialized = false;
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let conductorInstance: VivaldiConductor | null = null;

export function getConductor(): VivaldiConductor {
  if (!conductorInstance) {
    conductorInstance = new VivaldiConductor();
  }
  return conductorInstance;
}
