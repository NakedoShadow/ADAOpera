// ADA Opera — Native DSP Module
// Rust-powered audio processing for subluminal speed
//
// Uses: dasp (signal processing), rubato (resampling), hound (WAV I/O),
//       symphonia (codec decoding), realfft (spectral analysis)

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

// ─── Types ──────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct AudioMetadata {
    pub sample_rate: u32,
    pub channels: u16,
    pub duration_secs: f64,
    pub bit_depth: u16,
    pub format: String,
    pub total_samples: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FFTResult {
    pub magnitudes: Vec<f32>,
    pub frequencies: Vec<f32>,
    pub bin_count: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WaveformPeaks {
    pub peaks: Vec<f32>,
    pub rms: Vec<f32>,
    pub sample_rate: u32,
    pub resolution: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BPMResult {
    pub bpm: f64,
    pub confidence: f64,
    pub beats: Vec<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CrystallineMetrics {
    pub snr_db: f64,
    pub peak_db: f64,
    pub rms_db: f64,
    pub crest_factor: f64,
    pub dc_offset: f64,
    pub zero_crossings: usize,
    pub silence_ratio: f64,
}

// ─── Audio File Analysis ────────────────────────────────────────────────────

#[tauri::command]
pub fn analyze_audio_file(path: String) -> Result<AudioMetadata, String> {
    let path = PathBuf::from(&path);
    if !path.exists() {
        return Err(format!("File not found: {}", path.display()));
    }

    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");

    match ext.to_lowercase().as_str() {
        "wav" => analyze_wav(&path),
        _ => Err(format!("Unsupported format: {}. Use symphonia for full codec support.", ext)),
    }
}

fn analyze_wav(path: &PathBuf) -> Result<AudioMetadata, String> {
    let reader = hound::WavReader::open(path).map_err(|e| format!("WAV read error: {}", e))?;
    let spec = reader.spec();
    let total_samples = reader.len() as u64;
    let duration = total_samples as f64 / (spec.sample_rate as f64 * spec.channels as f64);

    Ok(AudioMetadata {
        sample_rate: spec.sample_rate,
        channels: spec.channels,
        duration_secs: duration,
        bit_depth: spec.bits_per_sample,
        format: "WAV".to_string(),
        total_samples,
    })
}

// ─── FFT Computation ────────────────────────────────────────────────────────

#[tauri::command]
pub fn compute_fft(samples: Vec<f32>, sample_rate: u32) -> Result<FFTResult, String> {
    use realfft::RealFftPlanner;

    let len = samples.len().next_power_of_two();
    let mut planner = RealFftPlanner::<f32>::new();
    let fft = planner.plan_fft_forward(len);

    let mut input: Vec<f32> = samples.clone();
    input.resize(len, 0.0);

    // Apply Hann window
    for (i, sample) in input.iter_mut().enumerate() {
        let window = 0.5 * (1.0 - (2.0 * std::f32::consts::PI * i as f32 / len as f32).cos());
        *sample *= window;
    }

    let mut spectrum = fft.make_output_vec();
    fft.process(&mut input, &mut spectrum)
        .map_err(|e| format!("FFT error: {}", e))?;

    let bin_count = spectrum.len();
    let freq_resolution = sample_rate as f32 / len as f32;

    let magnitudes: Vec<f32> = spectrum
        .iter()
        .map(|c| (c.re * c.re + c.im * c.im).sqrt() / len as f32)
        .collect();

    let frequencies: Vec<f32> = (0..bin_count)
        .map(|i| i as f32 * freq_resolution)
        .collect();

    Ok(FFTResult {
        magnitudes,
        frequencies,
        bin_count,
    })
}

// ─── Resampling ─────────────────────────────────────────────────────────────

#[tauri::command]
pub fn resample_audio(
    samples: Vec<f32>,
    from_rate: u32,
    to_rate: u32,
    channels: u16,
) -> Result<Vec<f32>, String> {
    use rubato::{FftFixedIn, Resampler};

    if from_rate == to_rate {
        return Ok(samples);
    }

    let ch = channels as usize;
    let chunk_size = 1024;

    let mut resampler = FftFixedIn::<f32>::new(
        from_rate as usize,
        to_rate as usize,
        chunk_size,
        2,
        ch,
    )
    .map_err(|e| format!("Resampler init error: {}", e))?;

    // De-interleave
    let frames = samples.len() / ch;
    let mut channel_data: Vec<Vec<f32>> = (0..ch)
        .map(|c| (0..frames).map(|f| samples[f * ch + c]).collect())
        .collect();

    // Pad to chunk boundary
    let pad_len = ((frames + chunk_size - 1) / chunk_size) * chunk_size;
    for ch_data in &mut channel_data {
        ch_data.resize(pad_len, 0.0);
    }

    let mut output_channels: Vec<Vec<f32>> = (0..ch).map(|_| Vec::new()).collect();

    for start in (0..pad_len).step_by(chunk_size) {
        let end = (start + chunk_size).min(pad_len);
        let chunk: Vec<&[f32]> = channel_data.iter().map(|c| &c[start..end]).collect();
        let resampled = resampler
            .process(&chunk, None)
            .map_err(|e| format!("Resample error: {}", e))?;
        for (c, data) in resampled.iter().enumerate() {
            output_channels[c].extend_from_slice(data);
        }
    }

    // Re-interleave
    let out_frames = output_channels[0].len();
    let mut output = Vec::with_capacity(out_frames * ch);
    for f in 0..out_frames {
        for c in 0..ch {
            output.push(output_channels[c][f]);
        }
    }

    Ok(output)
}

// ─── Normalization ──────────────────────────────────────────────────────────

#[tauri::command]
pub fn normalize_audio(samples: Vec<f32>, target_db: f64) -> Result<Vec<f32>, String> {
    let peak = samples.iter().map(|s| s.abs()).fold(0.0f32, f32::max);
    if peak == 0.0 {
        return Ok(samples);
    }

    let target_linear = 10.0f32.powf(target_db as f32 / 20.0);
    let gain = target_linear / peak;

    Ok(samples.iter().map(|s| s * gain).collect())
}

// ─── BPM Detection ──────────────────────────────────────────────────────────

#[tauri::command]
pub fn detect_bpm(samples: Vec<f32>, sample_rate: u32) -> Result<BPMResult, String> {
    // Energy-based onset detection + autocorrelation BPM estimation
    let hop_size = sample_rate as usize / 100; // 10ms hops
    let frame_size = hop_size * 2;

    // Compute energy envelope
    let mut energy: Vec<f64> = Vec::new();
    let mut i = 0;
    while i + frame_size <= samples.len() {
        let e: f64 = samples[i..i + frame_size]
            .iter()
            .map(|s| (*s as f64) * (*s as f64))
            .sum();
        energy.push(e / frame_size as f64);
        i += hop_size;
    }

    if energy.len() < 100 {
        return Ok(BPMResult { bpm: 120.0, confidence: 0.0, beats: vec![] });
    }

    // Onset detection (spectral flux approximation via energy diff)
    let mut onset: Vec<f64> = vec![0.0];
    for j in 1..energy.len() {
        let diff = (energy[j] - energy[j - 1]).max(0.0);
        onset.push(diff);
    }

    // Autocorrelation for periodicity
    let min_bpm_lag = (60.0 / 200.0 * 100.0) as usize; // 200 BPM max
    let max_bpm_lag = (60.0 / 40.0 * 100.0) as usize;  // 40 BPM min
    let max_lag = max_bpm_lag.min(onset.len() / 2);

    let mut best_lag = min_bpm_lag;
    let mut best_corr = 0.0f64;

    for lag in min_bpm_lag..max_lag {
        let mut corr = 0.0;
        let n = onset.len() - lag;
        for j in 0..n {
            corr += onset[j] * onset[j + lag];
        }
        corr /= n as f64;
        if corr > best_corr {
            best_corr = corr;
            best_lag = lag;
        }
    }

    let bpm = 60.0 / (best_lag as f64 / 100.0);
    let confidence = if best_corr > 0.0 { (best_corr * 100.0).min(100.0) } else { 0.0 };

    // Find beat positions
    let beat_interval = best_lag;
    let beats: Vec<f64> = (0..energy.len())
        .step_by(beat_interval.max(1))
        .map(|j| j as f64 * hop_size as f64 / sample_rate as f64)
        .collect();

    Ok(BPMResult { bpm, confidence, beats })
}

// ─── Waveform Peak Generation ───────────────────────────────────────────────

#[tauri::command]
pub fn generate_waveform_peaks(
    samples: Vec<f32>,
    resolution: usize,
) -> Result<WaveformPeaks, String> {
    if samples.is_empty() || resolution == 0 {
        return Err("Empty samples or zero resolution".to_string());
    }

    let chunk_size = (samples.len() / resolution).max(1);
    let mut peaks = Vec::with_capacity(resolution);
    let mut rms = Vec::with_capacity(resolution);

    for chunk in samples.chunks(chunk_size) {
        let peak = chunk.iter().map(|s| s.abs()).fold(0.0f32, f32::max);
        let rms_val = (chunk.iter().map(|s| s * s).sum::<f32>() / chunk.len() as f32).sqrt();
        peaks.push(peak);
        rms.push(rms_val);
    }

    Ok(WaveformPeaks {
        peaks,
        rms,
        sample_rate: 0, // caller provides context
        resolution,
    })
}

// ─── Gain Application ───────────────────────────────────────────────────────

#[tauri::command]
pub fn apply_gain(samples: Vec<f32>, gain_db: f64) -> Result<Vec<f32>, String> {
    let gain_linear = 10.0f32.powf(gain_db as f32 / 20.0);
    Ok(samples.iter().map(|s| (s * gain_linear).clamp(-1.0, 1.0)).collect())
}

// ─── Channel Mixing ─────────────────────────────────────────────────────────

#[tauri::command]
pub fn mix_channels(
    channel_a: Vec<f32>,
    channel_b: Vec<f32>,
    mix: f32,
) -> Result<Vec<f32>, String> {
    let len = channel_a.len().max(channel_b.len());
    let mix_b = mix.clamp(0.0, 1.0);
    let mix_a = 1.0 - mix_b;

    let mut output = Vec::with_capacity(len);
    for i in 0..len {
        let a = channel_a.get(i).copied().unwrap_or(0.0);
        let b = channel_b.get(i).copied().unwrap_or(0.0);
        output.push((a * mix_a + b * mix_b).clamp(-1.0, 1.0));
    }
    Ok(output)
}

// ─── Audio Metadata (from raw path) ─────────────────────────────────────────

#[tauri::command]
pub fn get_audio_metadata(path: String) -> Result<AudioMetadata, String> {
    analyze_audio_file(path)
}

// ─── CRYSTALLINE Native Denoise ─────────────────────────────────────────────

#[tauri::command]
pub fn crystalline_denoise(
    samples: Vec<f32>,
    strength: f32,
) -> Result<Vec<f32>, String> {
    // Spectral gating noise reduction (native Rust implementation)
    // Full ML pipeline (RNNoise/DeepFilterNet3) runs via Python sidecar
    let strength = strength.clamp(0.0, 1.0);
    let threshold = 0.01 * (1.0 - strength);

    Ok(samples
        .iter()
        .map(|s| {
            if s.abs() < threshold {
                *s * (s.abs() / threshold) // soft gate
            } else {
                *s
            }
        })
        .collect())
}

// ─── CRYSTALLINE Metrics Computation ────────────────────────────────────────

#[tauri::command]
pub fn crystalline_metrics(samples: Vec<f32>) -> Result<CrystallineMetrics, String> {
    if samples.is_empty() {
        return Err("Empty buffer".to_string());
    }

    let n = samples.len() as f64;

    // Peak
    let peak = samples.iter().map(|s| s.abs()).fold(0.0f32, f32::max);
    let peak_db = if peak > 0.0 { 20.0 * (peak as f64).log10() } else { -120.0 };

    // RMS
    let rms = (samples.iter().map(|s| (*s as f64) * (*s as f64)).sum::<f64>() / n).sqrt();
    let rms_db = if rms > 0.0 { 20.0 * rms.log10() } else { -120.0 };

    // Crest factor
    let crest_factor = if rms > 0.0 { peak as f64 / rms } else { 0.0 };

    // SNR estimation (signal power / noise floor estimate)
    let mut sorted: Vec<f32> = samples.iter().map(|s| s.abs()).collect();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let noise_floor: f64 = sorted[..sorted.len() / 10]
        .iter()
        .map(|s| (*s as f64) * (*s as f64))
        .sum::<f64>()
        / (sorted.len() / 10).max(1) as f64;
    let signal_power = rms * rms;
    let snr_db = if noise_floor > 0.0 {
        10.0 * (signal_power / noise_floor).log10()
    } else {
        60.0 // very clean signal
    };

    // DC offset
    let dc_offset = samples.iter().map(|s| *s as f64).sum::<f64>() / n;

    // Zero crossings
    let zero_crossings = samples
        .windows(2)
        .filter(|w| (w[0] >= 0.0) != (w[1] >= 0.0))
        .count();

    // Silence ratio (samples below -60dB)
    let silence_threshold = 0.001f32; // ~-60dB
    let silent_count = samples.iter().filter(|s| s.abs() < silence_threshold).count();
    let silence_ratio = silent_count as f64 / n;

    Ok(CrystallineMetrics {
        snr_db,
        peak_db,
        rms_db,
        crest_factor,
        dc_offset,
        zero_crossings,
        silence_ratio,
    })
}
