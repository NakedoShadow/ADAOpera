/**
 * ADA Opera — La Voix de la Reine
 * Feature Tree: 12 Features × 4 SubSkills × 4 DeepSkills = 256 nodes
 *
 * Architecture: Shadow Pix pattern (quantum depth > surface)
 * CRYSTALLINE (Clarity) + VIVALDI (Fluidity) = Absolute Digital Clarity
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SliderControl {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
}

export interface DeepSkill {
  id: string;
  label: string;
  icon: string;
  type: "preset" | "slider" | "action" | "toggle";
  controls?: SliderControl[];
}

export interface SubSkill {
  id: string;
  label: string;
  icon: string;
  type: "preset" | "slider" | "action" | "panel";
  deepSkills: DeepSkill[];
}

export type FeatureCategory =
  | "engine"
  | "instrument"
  | "orchestra"
  | "visual"
  | "dj"
  | "control"
  | "production"
  | "clarity"
  | "media";

export interface Feature {
  id: string;
  label: string;
  icon: string;
  category: FeatureCategory;
  subSkills: SubSkill[];
}

// ─── Feature Tree ────────────────────────────────────────────────────────────

export const featureTree: Feature[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // F01 — CRYSTALLINE (Audio Clarity Engine)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "crystalline",
    label: "Crystalline",
    icon: "◆",
    category: "clarity",
    subSkills: [
      {
        id: "crys-denoise",
        label: "Denoising",
        icon: "◇",
        type: "panel",
        deepSkills: [
          { id: "crys-denoise-rnnoise", label: "RNNoise Pre-Filter", icon: "▸", type: "slider", controls: [{ id: "rnn-strength", label: "Strength", min: 0, max: 100, step: 1, default: 70, unit: "%" }] },
          { id: "crys-denoise-deepfilter", label: "DeepFilterNet3", icon: "▸", type: "slider", controls: [{ id: "df-atten", label: "Attenuation", min: 0, max: 40, step: 1, default: 20, unit: "dB" }] },
          { id: "crys-denoise-fingerprint", label: "Noise Fingerprint", icon: "▸", type: "action" },
          { id: "crys-denoise-gate", label: "Noise Gate", icon: "▸", type: "slider", controls: [{ id: "gate-threshold", label: "Threshold", min: -80, max: 0, step: 1, default: -40, unit: "dB" }] },
        ],
      },
      {
        id: "crys-separate",
        label: "Source Separation",
        icon: "◇",
        type: "panel",
        deepSkills: [
          { id: "crys-sep-voice", label: "Voice Isolation", icon: "▸", type: "toggle" },
          { id: "crys-sep-music", label: "Music Extraction", icon: "▸", type: "toggle" },
          { id: "crys-sep-multi", label: "Multi-Speaker", icon: "▸", type: "action" },
          { id: "crys-sep-stems", label: "Stem Splitter", icon: "▸", type: "action" },
        ],
      },
      {
        id: "crys-enhance",
        label: "Enhancement",
        icon: "◇",
        type: "panel",
        deepSkills: [
          { id: "crys-enh-superres", label: "Super-Resolution 48kHz", icon: "▸", type: "toggle" },
          { id: "crys-enh-bandwidth", label: "Bandwidth Restore", icon: "▸", type: "slider", controls: [{ id: "bw-target", label: "Target", min: 8000, max: 48000, step: 1000, default: 44100, unit: "Hz" }] },
          { id: "crys-enh-clarity", label: "Clarity Boost", icon: "▸", type: "slider", controls: [{ id: "clarity-amount", label: "Amount", min: 0, max: 100, step: 1, default: 50, unit: "%" }] },
          { id: "crys-enh-warmth", label: "Warmth Restore", icon: "▸", type: "slider", controls: [{ id: "warmth", label: "Warmth", min: 0, max: 100, step: 1, default: 30, unit: "%" }] },
        ],
      },
      {
        id: "crys-pipeline",
        label: "Pipeline Mode",
        icon: "◇",
        type: "panel",
        deepSkills: [
          { id: "crys-pipe-realtime", label: "REALTIME (<20ms)", icon: "▸", type: "preset" },
          { id: "crys-pipe-studio", label: "STUDIO (<50ms)", icon: "▸", type: "preset" },
          { id: "crys-pipe-crystal", label: "CRYSTAL (Max)", icon: "▸", type: "preset" },
          { id: "crys-pipe-benchmark", label: "Benchmark", icon: "▸", type: "action" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // F02 — VIVALDI (Orchestra Conductor)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "vivaldi",
    label: "Vivaldi",
    icon: "♛",
    category: "orchestra",
    subSkills: [
      {
        id: "viv-conductor",
        label: "Conductor AI",
        icon: "♕",
        type: "panel",
        deepSkills: [
          { id: "viv-cond-auto", label: "Auto-Orchestrate", icon: "▸", type: "action" },
          { id: "viv-cond-balance", label: "Balance Voices", icon: "▸", type: "slider", controls: [{ id: "balance-mode", label: "Mode", min: 0, max: 3, step: 1, default: 1 }] },
          { id: "viv-cond-tempo", label: "Tempo Control", icon: "▸", type: "slider", controls: [{ id: "tempo-bpm", label: "BPM", min: 20, max: 300, step: 1, default: 120, unit: "BPM" }] },
          { id: "viv-cond-dynamics", label: "Dynamic Shaping", icon: "▸", type: "slider", controls: [{ id: "dynamics", label: "Range", min: 0, max: 127, step: 1, default: 80 }] },
        ],
      },
      {
        id: "viv-sections",
        label: "Orchestra Sections",
        icon: "♕",
        type: "panel",
        deepSkills: [
          { id: "viv-sec-strings", label: "Strings Section", icon: "▸", type: "action" },
          { id: "viv-sec-woodwinds", label: "Woodwinds Section", icon: "▸", type: "action" },
          { id: "viv-sec-brass", label: "Brass Section", icon: "▸", type: "action" },
          { id: "viv-sec-percussion", label: "Percussion Section", icon: "▸", type: "action" },
        ],
      },
      {
        id: "viv-arrangement",
        label: "Arrangement",
        icon: "♕",
        type: "panel",
        deepSkills: [
          { id: "viv-arr-tutti", label: "Tutti (Full)", icon: "▸", type: "preset" },
          { id: "viv-arr-solo", label: "Solo Mode", icon: "▸", type: "preset" },
          { id: "viv-arr-chamber", label: "Chamber", icon: "▸", type: "preset" },
          { id: "viv-arr-duo", label: "Duo / Trio", icon: "▸", type: "preset" },
        ],
      },
      {
        id: "viv-seasons",
        label: "Seasons Presets",
        icon: "♕",
        type: "panel",
        deepSkills: [
          { id: "viv-season-spring", label: "La Primavera", icon: "▸", type: "preset" },
          { id: "viv-season-summer", label: "L'Estate", icon: "▸", type: "preset" },
          { id: "viv-season-autumn", label: "L'Autunno", icon: "▸", type: "preset" },
          { id: "viv-season-winter", label: "L'Inverno", icon: "▸", type: "preset" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // F03 — PIANO (Discrete Synthesis — 1st Operator)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "piano",
    label: "Piano",
    icon: "♪",
    category: "instrument",
    subSkills: [
      {
        id: "piano-keys",
        label: "Keyboard",
        icon: "⌨",
        type: "panel",
        deepSkills: [
          { id: "piano-keys-88", label: "Full 88 Keys", icon: "▸", type: "preset" },
          { id: "piano-keys-velocity", label: "Velocity Curve", icon: "▸", type: "slider", controls: [{ id: "vel-curve", label: "Curve", min: 0, max: 100, step: 1, default: 64 }] },
          { id: "piano-keys-sustain", label: "Sustain Pedal", icon: "▸", type: "toggle" },
          { id: "piano-keys-transpose", label: "Transpose", icon: "▸", type: "slider", controls: [{ id: "transpose", label: "Semitones", min: -24, max: 24, step: 1, default: 0 }] },
        ],
      },
      {
        id: "piano-sound",
        label: "Sound Engine",
        icon: "⌨",
        type: "panel",
        deepSkills: [
          { id: "piano-snd-grand", label: "Grand Piano", icon: "▸", type: "preset" },
          { id: "piano-snd-upright", label: "Upright Piano", icon: "▸", type: "preset" },
          { id: "piano-snd-electric", label: "Electric Piano", icon: "▸", type: "preset" },
          { id: "piano-snd-synth", label: "Synth Piano", icon: "▸", type: "preset" },
        ],
      },
      {
        id: "piano-midi",
        label: "MIDI Control",
        icon: "⌨",
        type: "panel",
        deepSkills: [
          { id: "piano-midi-input", label: "MIDI Input", icon: "▸", type: "action" },
          { id: "piano-midi-record", label: "MIDI Record", icon: "▸", type: "toggle" },
          { id: "piano-midi-playback", label: "MIDI Playback", icon: "▸", type: "action" },
          { id: "piano-midi-export", label: "MIDI Export", icon: "▸", type: "action" },
        ],
      },
      {
        id: "piano-chords",
        label: "Chord Engine",
        icon: "⌨",
        type: "panel",
        deepSkills: [
          { id: "piano-chord-detect", label: "Chord Detection", icon: "▸", type: "toggle" },
          { id: "piano-chord-suggest", label: "Chord Suggestion", icon: "▸", type: "action" },
          { id: "piano-chord-prog", label: "Progressions", icon: "▸", type: "action" },
          { id: "piano-chord-arpegg", label: "Arpeggiator", icon: "▸", type: "slider", controls: [{ id: "arp-rate", label: "Rate", min: 1, max: 32, step: 1, default: 8 }] },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // F04 — VIOLON (Continuous Synthesis — 2nd Operator)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "violin",
    label: "Violon",
    icon: "♫",
    category: "instrument",
    subSkills: [
      {
        id: "violin-bowing",
        label: "Bowing Engine",
        icon: "⌇",
        type: "panel",
        deepSkills: [
          { id: "violin-bow-pressure", label: "Bow Pressure", icon: "▸", type: "slider", controls: [{ id: "bow-press", label: "Pressure", min: 0, max: 127, step: 1, default: 64 }] },
          { id: "violin-bow-speed", label: "Bow Speed", icon: "▸", type: "slider", controls: [{ id: "bow-speed", label: "Speed", min: 0, max: 127, step: 1, default: 64 }] },
          { id: "violin-bow-position", label: "Bow Position", icon: "▸", type: "slider", controls: [{ id: "bow-pos", label: "Position", min: 0, max: 100, step: 1, default: 50, unit: "%" }] },
          { id: "violin-bow-type", label: "Bowing Type", icon: "▸", type: "action" },
        ],
      },
      {
        id: "violin-expression",
        label: "Expression",
        icon: "⌇",
        type: "panel",
        deepSkills: [
          { id: "violin-expr-vibrato", label: "Vibrato", icon: "▸", type: "slider", controls: [{ id: "vib-depth", label: "Depth", min: 0, max: 100, step: 1, default: 40, unit: "cents" }, { id: "vib-rate", label: "Rate", min: 1, max: 12, step: 0.1, default: 5.5, unit: "Hz" }] },
          { id: "violin-expr-portamento", label: "Portamento", icon: "▸", type: "slider", controls: [{ id: "port-time", label: "Time", min: 0, max: 2000, step: 10, default: 200, unit: "ms" }] },
          { id: "violin-expr-glissando", label: "Glissando", icon: "▸", type: "slider", controls: [{ id: "gliss-range", label: "Range", min: 1, max: 24, step: 1, default: 12, unit: "st" }] },
          { id: "violin-expr-tremolo", label: "Tremolo", icon: "▸", type: "slider", controls: [{ id: "trem-speed", label: "Speed", min: 1, max: 32, step: 1, default: 8 }] },
        ],
      },
      {
        id: "violin-strings",
        label: "String Selection",
        icon: "⌇",
        type: "panel",
        deepSkills: [
          { id: "violin-str-g", label: "G String (Sol)", icon: "▸", type: "preset" },
          { id: "violin-str-d", label: "D String (Re)", icon: "▸", type: "preset" },
          { id: "violin-str-a", label: "A String (La)", icon: "▸", type: "preset" },
          { id: "violin-str-e", label: "E String (Mi)", icon: "▸", type: "preset" },
        ],
      },
      {
        id: "violin-technique",
        label: "Techniques",
        icon: "⌇",
        type: "panel",
        deepSkills: [
          { id: "violin-tech-pizz", label: "Pizzicato", icon: "▸", type: "toggle" },
          { id: "violin-tech-spicc", label: "Spiccato", icon: "▸", type: "toggle" },
          { id: "violin-tech-harm", label: "Harmonics", icon: "▸", type: "toggle" },
          { id: "violin-tech-colleg", label: "Col Legno", icon: "▸", type: "toggle" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // F05 — PARTITION (Sheet Music Reader)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "partition",
    label: "Partition",
    icon: "♩",
    category: "production",
    subSkills: [
      {
        id: "part-reader",
        label: "Reader",
        icon: "📄",
        type: "panel",
        deepSkills: [
          { id: "part-read-import", label: "Import Score", icon: "▸", type: "action" },
          { id: "part-read-musicxml", label: "MusicXML Parser", icon: "▸", type: "action" },
          { id: "part-read-midi", label: "MIDI Import", icon: "▸", type: "action" },
          { id: "part-read-abc", label: "ABC Notation", icon: "▸", type: "action" },
        ],
      },
      {
        id: "part-playback",
        label: "Playback",
        icon: "📄",
        type: "panel",
        deepSkills: [
          { id: "part-play-solo", label: "Solo Instrument", icon: "▸", type: "preset" },
          { id: "part-play-section", label: "Section", icon: "▸", type: "preset" },
          { id: "part-play-orchestra", label: "Full Orchestra", icon: "▸", type: "preset" },
          { id: "part-play-loop", label: "Loop Selection", icon: "▸", type: "action" },
        ],
      },
      {
        id: "part-edit",
        label: "Score Editor",
        icon: "📄",
        type: "panel",
        deepSkills: [
          { id: "part-edit-note", label: "Note Entry", icon: "▸", type: "action" },
          { id: "part-edit-rest", label: "Rest Entry", icon: "▸", type: "action" },
          { id: "part-edit-dynamic", label: "Dynamics", icon: "▸", type: "action" },
          { id: "part-edit-articul", label: "Articulations", icon: "▸", type: "action" },
        ],
      },
      {
        id: "part-analysis",
        label: "Analysis",
        icon: "📄",
        type: "panel",
        deepSkills: [
          { id: "part-ana-harmony", label: "Harmony Analysis", icon: "▸", type: "action" },
          { id: "part-ana-pattern", label: "Pattern Detection", icon: "▸", type: "action" },
          { id: "part-ana-structure", label: "Structure Map", icon: "▸", type: "action" },
          { id: "part-ana-compare", label: "Compare Scores", icon: "▸", type: "action" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // F06 — SPECTRUM (Visualization Galaxy)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "spectrum",
    label: "Spectrum",
    icon: "◎",
    category: "visual",
    subSkills: [
      {
        id: "spec-waveform",
        label: "Waveform",
        icon: "〰",
        type: "panel",
        deepSkills: [
          { id: "spec-wave-time", label: "Time Domain", icon: "▸", type: "toggle" },
          { id: "spec-wave-stereo", label: "Stereo Split", icon: "▸", type: "toggle" },
          { id: "spec-wave-zoom", label: "Zoom Level", icon: "▸", type: "slider", controls: [{ id: "wave-zoom", label: "Zoom", min: 1, max: 100, step: 1, default: 10 }] },
          { id: "spec-wave-color", label: "Color Mode", icon: "▸", type: "action" },
        ],
      },
      {
        id: "spec-frequency",
        label: "Frequency",
        icon: "〰",
        type: "panel",
        deepSkills: [
          { id: "spec-freq-fft", label: "FFT Analyzer", icon: "▸", type: "toggle" },
          { id: "spec-freq-bars", label: "Bar Graph", icon: "▸", type: "toggle" },
          { id: "spec-freq-3d", label: "3D Waterfall", icon: "▸", type: "toggle" },
          { id: "spec-freq-peak", label: "Peak Hold", icon: "▸", type: "toggle" },
        ],
      },
      {
        id: "spec-spectrogram",
        label: "Spectrogram",
        icon: "〰",
        type: "panel",
        deepSkills: [
          { id: "spec-gram-linear", label: "Linear Scale", icon: "▸", type: "preset" },
          { id: "spec-gram-log", label: "Log Scale", icon: "▸", type: "preset" },
          { id: "spec-gram-mel", label: "Mel Scale", icon: "▸", type: "preset" },
          { id: "spec-gram-chromag", label: "Chromagram", icon: "▸", type: "preset" },
        ],
      },
      {
        id: "spec-meters",
        label: "Meters",
        icon: "〰",
        type: "panel",
        deepSkills: [
          { id: "spec-meter-vu", label: "VU Meter", icon: "▸", type: "toggle" },
          { id: "spec-meter-peak", label: "Peak Meter", icon: "▸", type: "toggle" },
          { id: "spec-meter-lufs", label: "LUFS Meter", icon: "▸", type: "toggle" },
          { id: "spec-meter-phase", label: "Phase Scope", icon: "▸", type: "toggle" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // F07 — PLATINE (DJ Turntable)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "platine",
    label: "Platine",
    icon: "◉",
    category: "dj",
    subSkills: [
      {
        id: "plat-decks",
        label: "Decks",
        icon: "◎",
        type: "panel",
        deepSkills: [
          { id: "plat-deck-a", label: "Deck A", icon: "▸", type: "action" },
          { id: "plat-deck-b", label: "Deck B", icon: "▸", type: "action" },
          { id: "plat-deck-load", label: "Load Track", icon: "▸", type: "action" },
          { id: "plat-deck-eject", label: "Eject", icon: "▸", type: "action" },
        ],
      },
      {
        id: "plat-mixer",
        label: "Mixer",
        icon: "◎",
        type: "panel",
        deepSkills: [
          { id: "plat-mixer-eq", label: "3-Band EQ", icon: "▸", type: "slider", controls: [{ id: "eq-low", label: "Low", min: -24, max: 6, step: 0.5, default: 0, unit: "dB" }] },
          { id: "plat-mixer-filter", label: "Filter Sweep", icon: "▸", type: "slider", controls: [{ id: "filter", label: "Cutoff", min: 0, max: 100, step: 1, default: 50, unit: "%" }] },
          { id: "plat-mixer-gain", label: "Channel Gain", icon: "▸", type: "slider", controls: [{ id: "gain", label: "Gain", min: -60, max: 6, step: 0.5, default: 0, unit: "dB" }] },
          { id: "plat-mixer-crossfade", label: "Crossfader", icon: "▸", type: "slider", controls: [{ id: "xfade", label: "Position", min: 0, max: 100, step: 1, default: 50, unit: "%" }] },
        ],
      },
      {
        id: "plat-crate",
        label: "Crate",
        icon: "◎",
        type: "panel",
        deepSkills: [
          { id: "plat-crate-browse", label: "Browse", icon: "▸", type: "action" },
          { id: "plat-crate-select", label: "Select", icon: "▸", type: "action" },
          { id: "plat-crate-load", label: "Load to Deck", icon: "▸", type: "action" },
          { id: "plat-crate-history", label: "Session History", icon: "▸", type: "action" },
        ],
      },
      {
        id: "plat-skins",
        label: "Skins",
        icon: "◎",
        type: "panel",
        deepSkills: [
          { id: "plat-skin-vinyl", label: "Vinyl Classic", icon: "▸", type: "preset" },
          { id: "plat-skin-cd", label: "CDJ Modern", icon: "▸", type: "preset" },
          { id: "plat-skin-oldschool", label: "Old School", icon: "▸", type: "preset" },
          { id: "plat-skin-futuristic", label: "Futuristic", icon: "▸", type: "preset" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // F07b — AUTO-MIX (DeepFlow Transition Engine)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "automix",
    label: "AutoMix",
    icon: "∞",
    category: "dj",
    subSkills: [
      {
        id: "amix-transition",
        label: "Transition",
        icon: "◎",
        type: "panel",
        deepSkills: [
          { id: "amix-compute", label: "Compute Mix", icon: "▸", type: "action" },
          { id: "amix-spectral", label: "Spectral Morph", icon: "▸", type: "preset" },
          { id: "amix-harmonic", label: "Harmonic Blend", icon: "▸", type: "preset" },
          { id: "amix-filter", label: "Filter Sweep", icon: "▸", type: "preset" },
        ],
      },
      {
        id: "amix-sync",
        label: "BPM Sync",
        icon: "◎",
        type: "panel",
        deepSkills: [
          { id: "amix-sync-auto", label: "Auto Sync", icon: "▸", type: "toggle" },
          { id: "amix-sync-manual", label: "Manual Adjust", icon: "▸", type: "slider", controls: [{ id: "bpm-adj", label: "BPM", min: -20, max: 20, step: 0.1, default: 0 }] },
          { id: "amix-sync-key", label: "Key Match", icon: "▸", type: "toggle" },
          { id: "amix-sync-camelot", label: "Camelot Wheel", icon: "▸", type: "action" },
        ],
      },
      {
        id: "amix-fluidity",
        label: "Fluidity",
        icon: "◎",
        type: "panel",
        deepSkills: [
          { id: "amix-if-score", label: "IF Score", icon: "▸", type: "action" },
          { id: "amix-if-spectral", label: "H(S) Spectral", icon: "▸", type: "action" },
          { id: "amix-if-temporal", label: "C(T) Temporal", icon: "▸", type: "action" },
          { id: "amix-if-dynamic", label: "F(D) Dynamic", icon: "▸", type: "action" },
        ],
      },
      {
        id: "amix-deepflow",
        label: "DeepFlow",
        icon: "◎",
        type: "panel",
        deepSkills: [
          { id: "amix-df-style", label: "Style Detect", icon: "▸", type: "action" },
          { id: "amix-df-taxonomy", label: "12-Tier Map", icon: "▸", type: "action" },
          { id: "amix-df-energy", label: "Energy Curve", icon: "▸", type: "action" },
          { id: "amix-df-narrative", label: "Narrative Arc", icon: "▸", type: "action" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // F07c — KARAOKE (Real-time Lyrics Engine)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "karaoke",
    label: "Karaoke",
    icon: "♪",
    category: "dj",
    subSkills: [
      {
        id: "kara-lyrics",
        label: "Lyrics",
        icon: "◎",
        type: "panel",
        deepSkills: [
          { id: "kara-lyrics-gen", label: "Generate", icon: "▸", type: "action" },
          { id: "kara-lyrics-load", label: "Load LRC", icon: "▸", type: "action" },
          { id: "kara-lyrics-edit", label: "Edit Timing", icon: "▸", type: "action" },
          { id: "kara-lyrics-save", label: "Save", icon: "▸", type: "action" },
        ],
      },
      {
        id: "kara-tracking",
        label: "Tracking",
        icon: "◎",
        type: "panel",
        deepSkills: [
          { id: "kara-track-auto", label: "Auto Track", icon: "▸", type: "toggle" },
          { id: "kara-track-offset", label: "Offset", icon: "▸", type: "slider", controls: [{ id: "offset", label: "ms", min: -500, max: 500, step: 10, default: 0, unit: "ms" }] },
          { id: "kara-track-highlight", label: "Word Highlight", icon: "▸", type: "toggle" },
          { id: "kara-track-scroll", label: "Auto Scroll", icon: "▸", type: "toggle" },
        ],
      },
      {
        id: "kara-display",
        label: "Display",
        icon: "◎",
        type: "panel",
        deepSkills: [
          { id: "kara-disp-font", label: "Font Size", icon: "▸", type: "slider", controls: [{ id: "font", label: "px", min: 16, max: 64, step: 2, default: 32 }] },
          { id: "kara-disp-color", label: "Text Color", icon: "▸", type: "preset" },
          { id: "kara-disp-bg", label: "Background", icon: "▸", type: "preset" },
          { id: "kara-disp-effect", label: "Glow Effect", icon: "▸", type: "toggle" },
        ],
      },
      {
        id: "kara-style",
        label: "Style",
        icon: "◎",
        type: "panel",
        deepSkills: [
          { id: "kara-style-classic", label: "Classic", icon: "▸", type: "preset" },
          { id: "kara-style-neon", label: "Neon", icon: "▸", type: "preset" },
          { id: "kara-style-shadow", label: "Shadow", icon: "▸", type: "preset" },
          { id: "kara-style-minimal", label: "Minimal", icon: "▸", type: "preset" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // F07d — REMIX (Live Style Transfer Engine)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "remix",
    label: "Remix",
    icon: "↺",
    category: "dj",
    subSkills: [
      {
        id: "remix-style",
        label: "Style",
        icon: "◎",
        type: "panel",
        deepSkills: [
          { id: "remix-trap", label: "Trap", icon: "▸", type: "preset" },
          { id: "remix-house", label: "House", icon: "▸", type: "preset" },
          { id: "remix-dnb", label: "DnB", icon: "▸", type: "preset" },
          { id: "remix-lofi", label: "Lo-Fi", icon: "▸", type: "preset" },
        ],
      },
      {
        id: "remix-live",
        label: "Live FX",
        icon: "◎",
        type: "panel",
        deepSkills: [
          { id: "remix-tempo", label: "Tempo Shift", icon: "▸", type: "slider", controls: [{ id: "tempo", label: "BPM", min: -50, max: 50, step: 1, default: 0 }] },
          { id: "remix-pitch", label: "Pitch Shift", icon: "▸", type: "slider", controls: [{ id: "pitch", label: "st", min: -12, max: 12, step: 1, default: 0, unit: "st" }] },
          { id: "remix-stutter", label: "Stutter", icon: "▸", type: "action" },
          { id: "remix-reverse", label: "Reverse", icon: "▸", type: "toggle" },
        ],
      },
      {
        id: "remix-stems",
        label: "Stems",
        icon: "◎",
        type: "panel",
        deepSkills: [
          { id: "remix-stem-vocals", label: "Vocals", icon: "▸", type: "toggle" },
          { id: "remix-stem-drums", label: "Drums", icon: "▸", type: "toggle" },
          { id: "remix-stem-bass", label: "Bass", icon: "▸", type: "toggle" },
          { id: "remix-stem-other", label: "Other", icon: "▸", type: "toggle" },
        ],
      },
      {
        id: "remix-export",
        label: "Export",
        icon: "◎",
        type: "panel",
        deepSkills: [
          { id: "remix-export-wav", label: "WAV", icon: "▸", type: "action" },
          { id: "remix-export-mp3", label: "MP3", icon: "▸", type: "action" },
          { id: "remix-export-stems", label: "Stems Pack", icon: "▸", type: "action" },
          { id: "remix-export-project", label: "Project File", icon: "▸", type: "action" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // F08 — BEAT (Tempo & Sync Control)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "beat",
    label: "Beat",
    icon: "♬",
    category: "control",
    subSkills: [
      {
        id: "beat-tempo",
        label: "Tempo",
        icon: "⏱",
        type: "panel",
        deepSkills: [
          { id: "beat-tempo-bpm", label: "BPM Control", icon: "▸", type: "slider", controls: [{ id: "bpm", label: "BPM", min: 20, max: 300, step: 0.1, default: 120, unit: "BPM" }] },
          { id: "beat-tempo-tap", label: "Tap Tempo", icon: "▸", type: "action" },
          { id: "beat-tempo-detect", label: "Auto Detect", icon: "▸", type: "action" },
          { id: "beat-tempo-ramp", label: "Tempo Ramp", icon: "▸", type: "slider", controls: [{ id: "ramp-bars", label: "Bars", min: 1, max: 64, step: 1, default: 8 }] },
        ],
      },
      {
        id: "beat-sync",
        label: "Sync Engine",
        icon: "⏱",
        type: "panel",
        deepSkills: [
          { id: "beat-sync-audio", label: "Audio Sync", icon: "▸", type: "toggle" },
          { id: "beat-sync-video", label: "Video Sync", icon: "▸", type: "toggle" },
          { id: "beat-sync-image", label: "Image Sync", icon: "▸", type: "toggle" },
          { id: "beat-sync-midi", label: "MIDI Clock", icon: "▸", type: "toggle" },
        ],
      },
      {
        id: "beat-metro",
        label: "Metronome",
        icon: "⏱",
        type: "panel",
        deepSkills: [
          { id: "beat-metro-enable", label: "Enable", icon: "▸", type: "toggle" },
          { id: "beat-metro-sound", label: "Click Sound", icon: "▸", type: "action" },
          { id: "beat-metro-subdiv", label: "Subdivisions", icon: "▸", type: "slider", controls: [{ id: "subdiv", label: "Subdivisions", min: 1, max: 8, step: 1, default: 4 }] },
          { id: "beat-metro-accent", label: "Accent Pattern", icon: "▸", type: "action" },
        ],
      },
      {
        id: "beat-quantize",
        label: "Quantize",
        icon: "⏱",
        type: "panel",
        deepSkills: [
          { id: "beat-quant-grid", label: "Grid Snap", icon: "▸", type: "toggle" },
          { id: "beat-quant-res", label: "Resolution", icon: "▸", type: "slider", controls: [{ id: "quant-res", label: "Note", min: 1, max: 64, step: 1, default: 16 }] },
          { id: "beat-quant-swing", label: "Swing", icon: "▸", type: "slider", controls: [{ id: "swing", label: "Swing", min: 0, max: 100, step: 1, default: 0, unit: "%" }] },
          { id: "beat-quant-humanize", label: "Humanize", icon: "▸", type: "slider", controls: [{ id: "humanize", label: "Amount", min: 0, max: 100, step: 1, default: 0, unit: "%" }] },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // F09 — MIXER (Channel Mixing)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "mixer",
    label: "Mixer",
    icon: "≡",
    category: "production",
    subSkills: [
      {
        id: "mix-channels",
        label: "Channels",
        icon: "▥",
        type: "panel",
        deepSkills: [
          { id: "mix-ch-volume", label: "Volume Faders", icon: "▸", type: "slider", controls: [{ id: "vol", label: "Volume", min: -96, max: 6, step: 0.1, default: 0, unit: "dB" }] },
          { id: "mix-ch-pan", label: "Pan Control", icon: "▸", type: "slider", controls: [{ id: "pan", label: "Pan", min: -100, max: 100, step: 1, default: 0 }] },
          { id: "mix-ch-mute", label: "Mute / Solo", icon: "▸", type: "toggle" },
          { id: "mix-ch-group", label: "Group Assign", icon: "▸", type: "action" },
        ],
      },
      {
        id: "mix-eq",
        label: "Equalizer",
        icon: "▥",
        type: "panel",
        deepSkills: [
          { id: "mix-eq-low", label: "Low (20-250Hz)", icon: "▸", type: "slider", controls: [{ id: "eq-low", label: "Low", min: -24, max: 24, step: 0.5, default: 0, unit: "dB" }] },
          { id: "mix-eq-mid", label: "Mid (250-4kHz)", icon: "▸", type: "slider", controls: [{ id: "eq-mid", label: "Mid", min: -24, max: 24, step: 0.5, default: 0, unit: "dB" }] },
          { id: "mix-eq-high", label: "High (4k-20kHz)", icon: "▸", type: "slider", controls: [{ id: "eq-high", label: "High", min: -24, max: 24, step: 0.5, default: 0, unit: "dB" }] },
          { id: "mix-eq-param", label: "Parametric EQ", icon: "▸", type: "action" },
        ],
      },
      {
        id: "mix-sends",
        label: "Sends / Returns",
        icon: "▥",
        type: "panel",
        deepSkills: [
          { id: "mix-send-a", label: "Send A (Reverb)", icon: "▸", type: "slider", controls: [{ id: "send-a", label: "Level", min: -96, max: 6, step: 0.5, default: -20, unit: "dB" }] },
          { id: "mix-send-b", label: "Send B (Delay)", icon: "▸", type: "slider", controls: [{ id: "send-b", label: "Level", min: -96, max: 6, step: 0.5, default: -20, unit: "dB" }] },
          { id: "mix-send-c", label: "Send C (Chorus)", icon: "▸", type: "slider", controls: [{ id: "send-c", label: "Level", min: -96, max: 6, step: 0.5, default: -20, unit: "dB" }] },
          { id: "mix-send-master", label: "Master Bus", icon: "▸", type: "action" },
        ],
      },
      {
        id: "mix-master",
        label: "Master",
        icon: "▥",
        type: "panel",
        deepSkills: [
          { id: "mix-master-vol", label: "Master Volume", icon: "▸", type: "slider", controls: [{ id: "master-vol", label: "Volume", min: -96, max: 6, step: 0.1, default: 0, unit: "dB" }] },
          { id: "mix-master-limiter", label: "Limiter", icon: "▸", type: "slider", controls: [{ id: "limiter", label: "Ceiling", min: -6, max: 0, step: 0.1, default: -0.3, unit: "dB" }] },
          { id: "mix-master-stereo", label: "Stereo Width", icon: "▸", type: "slider", controls: [{ id: "stereo-w", label: "Width", min: 0, max: 200, step: 1, default: 100, unit: "%" }] },
          { id: "mix-master-mono", label: "Mono Check", icon: "▸", type: "toggle" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // F10 — EFFECTS (Signal Processing Chain)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "effects",
    label: "Effects",
    icon: "✧",
    category: "production",
    subSkills: [
      {
        id: "fx-space",
        label: "Space",
        icon: "◌",
        type: "panel",
        deepSkills: [
          { id: "fx-space-reverb", label: "Reverb", icon: "▸", type: "slider", controls: [{ id: "reverb-size", label: "Size", min: 0, max: 100, step: 1, default: 40, unit: "%" }, { id: "reverb-decay", label: "Decay", min: 0.1, max: 20, step: 0.1, default: 2.5, unit: "s" }] },
          { id: "fx-space-delay", label: "Delay", icon: "▸", type: "slider", controls: [{ id: "delay-time", label: "Time", min: 1, max: 2000, step: 1, default: 375, unit: "ms" }, { id: "delay-fb", label: "Feedback", min: 0, max: 95, step: 1, default: 40, unit: "%" }] },
          { id: "fx-space-echo", label: "Echo", icon: "▸", type: "slider", controls: [{ id: "echo-taps", label: "Taps", min: 1, max: 8, step: 1, default: 3 }] },
          { id: "fx-space-convol", label: "Convolution", icon: "▸", type: "action" },
        ],
      },
      {
        id: "fx-modulation",
        label: "Modulation",
        icon: "◌",
        type: "panel",
        deepSkills: [
          { id: "fx-mod-chorus", label: "Chorus", icon: "▸", type: "slider", controls: [{ id: "chorus-depth", label: "Depth", min: 0, max: 100, step: 1, default: 50, unit: "%" }] },
          { id: "fx-mod-flanger", label: "Flanger", icon: "▸", type: "slider", controls: [{ id: "flanger-rate", label: "Rate", min: 0.1, max: 10, step: 0.1, default: 0.5, unit: "Hz" }] },
          { id: "fx-mod-phaser", label: "Phaser", icon: "▸", type: "slider", controls: [{ id: "phaser-stages", label: "Stages", min: 2, max: 24, step: 2, default: 8 }] },
          { id: "fx-mod-tremolo", label: "Tremolo", icon: "▸", type: "slider", controls: [{ id: "trem-rate", label: "Rate", min: 0.1, max: 20, step: 0.1, default: 4, unit: "Hz" }] },
        ],
      },
      {
        id: "fx-dynamics",
        label: "Dynamics",
        icon: "◌",
        type: "panel",
        deepSkills: [
          { id: "fx-dyn-compress", label: "Compressor", icon: "▸", type: "slider", controls: [{ id: "comp-ratio", label: "Ratio", min: 1, max: 20, step: 0.5, default: 4 }, { id: "comp-thresh", label: "Threshold", min: -60, max: 0, step: 1, default: -20, unit: "dB" }] },
          { id: "fx-dyn-expand", label: "Expander", icon: "▸", type: "slider", controls: [{ id: "exp-ratio", label: "Ratio", min: 1, max: 10, step: 0.5, default: 2 }] },
          { id: "fx-dyn-deesser", label: "De-Esser", icon: "▸", type: "slider", controls: [{ id: "deess-freq", label: "Frequency", min: 2000, max: 12000, step: 100, default: 6000, unit: "Hz" }] },
          { id: "fx-dyn-transient", label: "Transient Shaper", icon: "▸", type: "slider", controls: [{ id: "trans-attack", label: "Attack", min: -100, max: 100, step: 1, default: 0, unit: "%" }] },
        ],
      },
      {
        id: "fx-distortion",
        label: "Distortion",
        icon: "◌",
        type: "panel",
        deepSkills: [
          { id: "fx-dist-overdrive", label: "Overdrive", icon: "▸", type: "slider", controls: [{ id: "od-drive", label: "Drive", min: 0, max: 100, step: 1, default: 30, unit: "%" }] },
          { id: "fx-dist-saturation", label: "Saturation", icon: "▸", type: "slider", controls: [{ id: "sat-amount", label: "Amount", min: 0, max: 100, step: 1, default: 20, unit: "%" }] },
          { id: "fx-dist-bitcrush", label: "Bitcrusher", icon: "▸", type: "slider", controls: [{ id: "bit-depth", label: "Bits", min: 1, max: 24, step: 1, default: 16 }] },
          { id: "fx-dist-waveshape", label: "Waveshaper", icon: "▸", type: "action" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // F11 — RECORDER (Capture & Export)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "recorder",
    label: "Recorder",
    icon: "●",
    category: "production",
    subSkills: [
      {
        id: "rec-capture",
        label: "Capture",
        icon: "⏺",
        type: "panel",
        deepSkills: [
          { id: "rec-cap-start", label: "Start Recording", icon: "▸", type: "action" },
          { id: "rec-cap-pause", label: "Pause", icon: "▸", type: "toggle" },
          { id: "rec-cap-stop", label: "Stop & Save", icon: "▸", type: "action" },
          { id: "rec-cap-monitor", label: "Input Monitor", icon: "▸", type: "toggle" },
        ],
      },
      {
        id: "rec-format",
        label: "Formats",
        icon: "⏺",
        type: "panel",
        deepSkills: [
          { id: "rec-fmt-wav", label: "WAV (Lossless)", icon: "▸", type: "preset" },
          { id: "rec-fmt-flac", label: "FLAC (Lossless)", icon: "▸", type: "preset" },
          { id: "rec-fmt-mp3", label: "MP3 (320kbps)", icon: "▸", type: "preset" },
          { id: "rec-fmt-ogg", label: "OGG Vorbis", icon: "▸", type: "preset" },
        ],
      },
      {
        id: "rec-settings",
        label: "Settings",
        icon: "⏺",
        type: "panel",
        deepSkills: [
          { id: "rec-set-sr", label: "Sample Rate", icon: "▸", type: "slider", controls: [{ id: "sample-rate", label: "Rate", min: 22050, max: 96000, step: 1, default: 48000, unit: "Hz" }] },
          { id: "rec-set-bits", label: "Bit Depth", icon: "▸", type: "slider", controls: [{ id: "bit-depth", label: "Bits", min: 16, max: 32, step: 8, default: 24 }] },
          { id: "rec-set-channels", label: "Channels", icon: "▸", type: "slider", controls: [{ id: "channels", label: "Ch", min: 1, max: 8, step: 1, default: 2 }] },
          { id: "rec-set-source", label: "Input Source", icon: "▸", type: "action" },
        ],
      },
      {
        id: "rec-stream",
        label: "Streaming",
        icon: "⏺",
        type: "panel",
        deepSkills: [
          { id: "rec-stream-rtmp", label: "RTMP Output", icon: "▸", type: "action" },
          { id: "rec-stream-icecast", label: "Icecast", icon: "▸", type: "action" },
          { id: "rec-stream-webrtc", label: "WebRTC", icon: "▸", type: "action" },
          { id: "rec-stream-websocket", label: "WebSocket", icon: "▸", type: "action" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // F12 — ORCHESTRE (Full Orchestra Registry)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "orchestre",
    label: "Orchestre",
    icon: "♚",
    category: "orchestra",
    subSkills: [
      {
        id: "orch-strings",
        label: "Cordes",
        icon: "♝",
        type: "panel",
        deepSkills: [
          { id: "orch-str-violin1", label: "Violon I (Konzertmeister)", icon: "▸", type: "action" },
          { id: "orch-str-violin2", label: "Violon II", icon: "▸", type: "action" },
          { id: "orch-str-viola", label: "Alto (Viola)", icon: "▸", type: "action" },
          { id: "orch-str-cello", label: "Violoncelle", icon: "▸", type: "action" },
        ],
      },
      {
        id: "orch-winds",
        label: "Vents",
        icon: "♝",
        type: "panel",
        deepSkills: [
          { id: "orch-wind-flute", label: "Flute", icon: "▸", type: "action" },
          { id: "orch-wind-oboe", label: "Hautbois (Oboe)", icon: "▸", type: "action" },
          { id: "orch-wind-clarinet", label: "Clarinette", icon: "▸", type: "action" },
          { id: "orch-wind-bassoon", label: "Basson", icon: "▸", type: "action" },
        ],
      },
      {
        id: "orch-brass",
        label: "Cuivres",
        icon: "♝",
        type: "panel",
        deepSkills: [
          { id: "orch-brass-horn", label: "Cor (French Horn)", icon: "▸", type: "action" },
          { id: "orch-brass-trumpet", label: "Trompette", icon: "▸", type: "action" },
          { id: "orch-brass-trombone", label: "Trombone", icon: "▸", type: "action" },
          { id: "orch-brass-tuba", label: "Tuba", icon: "▸", type: "action" },
        ],
      },
      {
        id: "orch-percussion",
        label: "Percussion",
        icon: "♝",
        type: "panel",
        deepSkills: [
          { id: "orch-perc-timpani", label: "Timbales", icon: "▸", type: "action" },
          { id: "orch-perc-cymbals", label: "Cymbales", icon: "▸", type: "action" },
          { id: "orch-perc-triangle", label: "Triangle", icon: "▸", type: "action" },
          { id: "orch-perc-harp", label: "Harpe", icon: "▸", type: "action" },
        ],
      },
    ],
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // F13 — GRAB (ShadowGrab — Media Downloader + Shadow Seal)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "grab",
    label: "Grab",
    icon: "⤓",
    category: "media",
    subSkills: [
      {
        id: "grab-download",
        label: "Download",
        icon: "⬇",
        type: "panel",
        deepSkills: [
          { id: "grab-dl-url", label: "URL Download", icon: "▸", type: "action" },
          { id: "grab-dl-youtube", label: "YouTube", icon: "▸", type: "action" },
          { id: "grab-dl-twitter", label: "Twitter/X", icon: "▸", type: "action" },
          { id: "grab-dl-batch", label: "Batch Download", icon: "▸", type: "action" },
        ],
      },
      {
        id: "grab-convert",
        label: "Convert",
        icon: "⬇",
        type: "panel",
        deepSkills: [
          { id: "grab-conv-mp4", label: "To MP4", icon: "▸", type: "action" },
          { id: "grab-conv-mp3", label: "To MP3 (Audio)", icon: "▸", type: "action" },
          { id: "grab-conv-gif", label: "To GIF", icon: "▸", type: "slider", controls: [{ id: "gif-fps", label: "FPS", min: 8, max: 30, step: 1, default: 15 }, { id: "gif-width", label: "Width", min: 240, max: 1080, step: 10, default: 480, unit: "px" }] },
          { id: "grab-conv-webm", label: "To WebM", icon: "▸", type: "action" },
        ],
      },
      {
        id: "grab-seal",
        label: "Shadow Seal",
        icon: "⬇",
        type: "panel",
        deepSkills: [
          { id: "grab-seal-qr", label: "QR Watermark", icon: "▸", type: "toggle" },
          { id: "grab-seal-snow", label: "Snowflake Seal", icon: "▸", type: "toggle" },
          { id: "grab-seal-serial", label: "Serial Registry", icon: "▸", type: "action" },
          { id: "grab-seal-branch", label: "Community Branch", icon: "▸", type: "action" },
        ],
      },
      {
        id: "grab-formats",
        label: "Formats",
        icon: "⬇",
        type: "panel",
        deepSkills: [
          { id: "grab-fmt-pdf", label: "PDF Convert", icon: "▸", type: "action" },
          { id: "grab-fmt-docx", label: "DOCX Convert", icon: "▸", type: "action" },
          { id: "grab-fmt-img", label: "Image Convert", icon: "▸", type: "action" },
          { id: "grab-fmt-merge", label: "PDF Merge", icon: "▸", type: "action" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // F14 — PIX (ShadowPix — Image Editor)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "pix",
    label: "Pix",
    icon: "◈",
    category: "media",
    subSkills: [
      {
        id: "pix-adjust",
        label: "Adjustments",
        icon: "◇",
        type: "panel",
        deepSkills: [
          { id: "pix-adj-brightness", label: "Brightness", icon: "▸", type: "slider", controls: [{ id: "pix-bright", label: "Value", min: -100, max: 100, step: 1, default: 0 }] },
          { id: "pix-adj-contrast", label: "Contrast", icon: "▸", type: "slider", controls: [{ id: "pix-contrast", label: "Value", min: -100, max: 100, step: 1, default: 0 }] },
          { id: "pix-adj-saturation", label: "Saturation", icon: "▸", type: "slider", controls: [{ id: "pix-sat", label: "Value", min: -100, max: 100, step: 1, default: 0 }] },
          { id: "pix-adj-levels", label: "Levels", icon: "▸", type: "slider", controls: [{ id: "pix-black", label: "Black", min: 0, max: 255, step: 1, default: 0 }, { id: "pix-white", label: "White", min: 0, max: 255, step: 1, default: 255 }, { id: "pix-gamma", label: "Gamma", min: 0.1, max: 3, step: 0.01, default: 1 }] },
        ],
      },
      {
        id: "pix-filters",
        label: "Filters",
        icon: "◇",
        type: "panel",
        deepSkills: [
          { id: "pix-flt-blur", label: "Blur", icon: "▸", type: "slider", controls: [{ id: "blur-radius", label: "Radius", min: 1, max: 50, step: 1, default: 5, unit: "px" }] },
          { id: "pix-flt-sharpen", label: "Sharpen", icon: "▸", type: "slider", controls: [{ id: "sharp-amount", label: "Amount", min: 0, max: 100, step: 1, default: 50, unit: "%" }] },
          { id: "pix-flt-denoise", label: "Denoise", icon: "▸", type: "slider", controls: [{ id: "denoise-strength", label: "Strength", min: 1, max: 3, step: 1, default: 1 }] },
          { id: "pix-flt-vignette", label: "Vignette", icon: "▸", type: "slider", controls: [{ id: "vignette-intensity", label: "Intensity", min: 0, max: 100, step: 1, default: 50, unit: "%" }] },
        ],
      },
      {
        id: "pix-transform",
        label: "Transform",
        icon: "◇",
        type: "panel",
        deepSkills: [
          { id: "pix-tf-crop", label: "Crop", icon: "▸", type: "action" },
          { id: "pix-tf-resize", label: "Resize", icon: "▸", type: "slider", controls: [{ id: "resize-w", label: "Width", min: 16, max: 8192, step: 1, default: 1920, unit: "px" }, { id: "resize-h", label: "Height", min: 16, max: 8192, step: 1, default: 1080, unit: "px" }] },
          { id: "pix-tf-rotate", label: "Rotate", icon: "▸", type: "slider", controls: [{ id: "rotate-deg", label: "Degrees", min: -180, max: 180, step: 90, default: 0, unit: "°" }] },
          { id: "pix-tf-flip", label: "Flip", icon: "▸", type: "action" },
        ],
      },
      {
        id: "pix-presets",
        label: "Presets",
        icon: "◇",
        type: "panel",
        deepSkills: [
          { id: "pix-pre-grayscale", label: "Grayscale", icon: "▸", type: "preset" },
          { id: "pix-pre-sepia", label: "Sepia", icon: "▸", type: "preset" },
          { id: "pix-pre-invert", label: "Invert", icon: "▸", type: "preset" },
          { id: "pix-pre-autoenhance", label: "Auto-Enhance", icon: "▸", type: "action" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // F15 — VIDEO (Video Manipulation & Processing)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "video",
    label: "Video",
    icon: "▶",
    category: "media",
    subSkills: [
      {
        id: "vid-edit",
        label: "Edit",
        icon: "✂",
        type: "panel",
        deepSkills: [
          { id: "vid-edit-trim", label: "Trim / Cut", icon: "▸", type: "slider", controls: [{ id: "trim-start", label: "Start", min: 0, max: 3600, step: 0.1, default: 0, unit: "s" }, { id: "trim-end", label: "End", min: 0, max: 3600, step: 0.1, default: 30, unit: "s" }] },
          { id: "vid-edit-merge", label: "Merge Clips", icon: "▸", type: "action" },
          { id: "vid-edit-speed", label: "Speed", icon: "▸", type: "slider", controls: [{ id: "vid-speed", label: "Speed", min: 0.25, max: 4, step: 0.25, default: 1, unit: "x" }] },
          { id: "vid-edit-reverse", label: "Reverse", icon: "▸", type: "action" },
        ],
      },
      {
        id: "vid-audio",
        label: "Audio Track",
        icon: "✂",
        type: "panel",
        deepSkills: [
          { id: "vid-aud-extract", label: "Extract Audio", icon: "▸", type: "action" },
          { id: "vid-aud-replace", label: "Replace Audio", icon: "▸", type: "action" },
          { id: "vid-aud-volume", label: "Volume", icon: "▸", type: "slider", controls: [{ id: "vid-vol", label: "Volume", min: 0, max: 200, step: 1, default: 100, unit: "%" }] },
          { id: "vid-aud-mute", label: "Mute Audio", icon: "▸", type: "toggle" },
        ],
      },
      {
        id: "vid-filters",
        label: "Filters",
        icon: "✂",
        type: "panel",
        deepSkills: [
          { id: "vid-flt-brightness", label: "Brightness", icon: "▸", type: "slider", controls: [{ id: "vid-bright", label: "Value", min: -1, max: 1, step: 0.05, default: 0 }] },
          { id: "vid-flt-contrast", label: "Contrast", icon: "▸", type: "slider", controls: [{ id: "vid-contrast", label: "Value", min: 0.5, max: 2, step: 0.05, default: 1 }] },
          { id: "vid-flt-grayscale", label: "Grayscale", icon: "▸", type: "toggle" },
          { id: "vid-flt-stabilize", label: "Stabilize", icon: "▸", type: "toggle" },
        ],
      },
      {
        id: "vid-export",
        label: "Export",
        icon: "✂",
        type: "panel",
        deepSkills: [
          { id: "vid-exp-mp4", label: "Export MP4", icon: "▸", type: "slider", controls: [{ id: "vid-crf", label: "Quality (CRF)", min: 18, max: 35, step: 1, default: 23 }] },
          { id: "vid-exp-webm", label: "Export WebM", icon: "▸", type: "action" },
          { id: "vid-exp-gif", label: "Export GIF", icon: "▸", type: "action" },
          { id: "vid-exp-frames", label: "Extract Frames", icon: "▸", type: "slider", controls: [{ id: "frame-interval", label: "Every N frames", min: 1, max: 60, step: 1, default: 10 }] },
        ],
      },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function countNodes(): { features: number; subSkills: number; deepSkills: number; total: number } {
  const features = featureTree.length;
  const subSkills = featureTree.reduce((acc, f) => acc + f.subSkills.length, 0);
  const deepSkills = featureTree.reduce((acc, f) => acc + f.subSkills.reduce((a, s) => a + s.deepSkills.length, 0), 0);
  return { features, subSkills, deepSkills, total: features + subSkills + deepSkills };
}

export function getFeature(id: string): Feature | undefined {
  return featureTree.find((f) => f.id === id);
}

export function getSubSkill(featureId: string, subId: string): SubSkill | undefined {
  return getFeature(featureId)?.subSkills.find((s) => s.id === subId);
}

export function searchTree(query: string): Array<{ feature: Feature; subSkill?: SubSkill; deepSkill?: DeepSkill }> {
  const q = query.toLowerCase();
  const results: Array<{ feature: Feature; subSkill?: SubSkill; deepSkill?: DeepSkill }> = [];
  for (const f of featureTree) {
    if (f.label.toLowerCase().includes(q)) results.push({ feature: f });
    for (const s of f.subSkills) {
      if (s.label.toLowerCase().includes(q)) results.push({ feature: f, subSkill: s });
      for (const d of s.deepSkills) {
        if (d.label.toLowerCase().includes(q)) results.push({ feature: f, subSkill: s, deepSkill: d });
      }
    }
  }
  return results;
}
