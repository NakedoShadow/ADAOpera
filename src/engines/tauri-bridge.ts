/**
 * ADA Opera — Tauri Bridge
 * TypeScript bindings for native Rust DSP commands
 *
 * When running in Tauri desktop mode, these call into Rust for
 * subluminal-speed audio processing. In browser mode, they gracefully
 * fall back to Web Audio API / Tone.js equivalents.
 */

// ─── Types (mirror Rust structs) ────────────────────────────────────────────

export interface AudioMetadata {
  sample_rate: number;
  channels: number;
  duration_secs: number;
  bit_depth: number;
  format: string;
  total_samples: number;
}

export interface FFTResult {
  magnitudes: number[];
  frequencies: number[];
  bin_count: number;
}

export interface WaveformPeaks {
  peaks: number[];
  rms: number[];
  sample_rate: number;
  resolution: number;
}

export interface BPMResult {
  bpm: number;
  confidence: number;
  beats: number[];
}

export interface CrystallineMetrics {
  snr_db: number;
  peak_db: number;
  rms_db: number;
  crest_factor: number;
  dc_offset: number;
  zero_crossings: number;
  silence_ratio: number;
}

// ─── Tauri Detection ────────────────────────────────────────────────────────

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    throw new Error(`Tauri not available — "${cmd}" requires desktop mode`);
  }
  // Dynamic import to avoid bundling @tauri-apps/api in web builds
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke<T>(cmd, args);
}

// ─── DSP Commands ───────────────────────────────────────────────────────────

export async function analyzeAudioFile(path: string): Promise<AudioMetadata> {
  return invoke<AudioMetadata>("analyze_audio_file", { path });
}

export async function computeFFT(samples: number[], sampleRate: number): Promise<FFTResult> {
  return invoke<FFTResult>("compute_fft", { samples, sampleRate });
}

export async function resampleAudio(
  samples: number[],
  fromRate: number,
  toRate: number,
  channels: number,
): Promise<number[]> {
  return invoke<number[]>("resample_audio", { samples, fromRate, toRate, channels });
}

export async function normalizeAudio(samples: number[], targetDb: number): Promise<number[]> {
  return invoke<number[]>("normalize_audio", { samples, targetDb });
}

export async function detectBPM(samples: number[], sampleRate: number): Promise<BPMResult> {
  return invoke<BPMResult>("detect_bpm", { samples, sampleRate });
}

export async function generateWaveformPeaks(
  samples: number[],
  resolution: number,
): Promise<WaveformPeaks> {
  return invoke<WaveformPeaks>("generate_waveform_peaks", { samples, resolution });
}

export async function applyGain(samples: number[], gainDb: number): Promise<number[]> {
  return invoke<number[]>("apply_gain", { samples, gainDb });
}

export async function mixChannels(
  channelA: number[],
  channelB: number[],
  mix: number,
): Promise<number[]> {
  return invoke<number[]>("mix_channels", { channelA, channelB, mix });
}

export async function getAudioMetadata(path: string): Promise<AudioMetadata> {
  return invoke<AudioMetadata>("get_audio_metadata", { path });
}

// ─── CRYSTALLINE Native ─────────────────────────────────────────────────────

export async function crystallineDenoise(
  samples: number[],
  strength: number,
): Promise<number[]> {
  return invoke<number[]>("crystalline_denoise", { samples, strength });
}

export async function crystallineComputeMetrics(
  samples: number[],
): Promise<CrystallineMetrics> {
  return invoke<CrystallineMetrics>("crystalline_metrics", { samples });
}

// ─── Capability Check ───────────────────────────────────────────────────────

export function getNativeCapabilities(): {
  available: boolean;
  commands: string[];
} {
  return {
    available: isTauri(),
    commands: isTauri()
      ? [
          "analyze_audio_file",
          "compute_fft",
          "resample_audio",
          "normalize_audio",
          "detect_bpm",
          "generate_waveform_peaks",
          "apply_gain",
          "mix_channels",
          "get_audio_metadata",
          "crystalline_denoise",
          "crystalline_metrics",
        ]
      : [],
  };
}
