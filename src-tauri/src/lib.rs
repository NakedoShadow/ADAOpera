// ADA Opera — La Voix de la Reine | Tauri v2 Library
// Native DSP backend for CRYSTALLINE pipeline + audio processing

mod dsp;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            // DSP Commands
            dsp::analyze_audio_file,
            dsp::compute_fft,
            dsp::resample_audio,
            dsp::normalize_audio,
            dsp::detect_bpm,
            dsp::generate_waveform_peaks,
            dsp::apply_gain,
            dsp::mix_channels,
            dsp::get_audio_metadata,
            // CRYSTALLINE native commands
            dsp::crystalline_denoise,
            dsp::crystalline_metrics,
        ])
        .run(tauri::generate_context!())
        .expect("ADA Opera — Failed to launch the Queen's Voice");
}
