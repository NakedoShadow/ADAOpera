/**
 * ADA Opera — Global State Store
 * Zustand 5.0 — Single source of truth for the Queen's Orchestra
 */

import { create } from "zustand";
import type { CrystallineMode } from "../engines/audio-engine";
import type { FeatureCategory } from "../lib/feature-tree";
import type { SourceType } from "../engines/playback-bus";
import type { CrateTrack, MixMode, RemixStyle, TransitionPlan } from "../engines/mix-engine";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ViewMode = "orchestra" | "studio" | "dj" | "partition" | "spectrum" | "media" | "ballet";
export type DJSkin = "vinyl" | "cdj" | "oldschool" | "futuristic";

export interface OperaState {
  // Navigation
  activeView: ViewMode;
  activeFeatureId: string | null;
  activeSubSkillId: string | null;
  sidebarOpen: boolean;

  // Playback
  playing: boolean;
  recording: boolean;
  bpm: number;
  timeSignature: [number, number];
  key: string;
  mode: "major" | "minor";
  masterVolume: number;

  // CRYSTALLINE
  crystallineMode: CrystallineMode;
  crystallineActive: boolean;

  // DJ
  djSkin: DJSkin;
  crossfader: number;
  deckALoaded: boolean;
  deckBLoaded: boolean;

  // DJ Crate (Bac à Disques)
  djCrate: CrateTrack[];
  selectedCrateIndex: number;
  crateOpen: boolean;

  // DJ Queue (playlist anticipation — reorderable)
  djQueue: CrateTrack[];
  queueOpen: boolean;

  // DJ Mixer state
  mixMode: MixMode;
  remixStyle: RemixStyle;
  autoMixActive: boolean;
  transitionPlan: TransitionPlan | null;
  transitionProgress: number;
  karaokeActive: boolean;
  karaokeFullscreen: boolean;
  balletFullscreen: boolean;
  karaokeLyrics: string[];
  karaokeCurrentLine: number;

  // Visualization
  showWaveform: boolean;
  showFFT: boolean;
  showSpectrogram: boolean;
  showMeter: boolean;
  showPhaseScope: boolean;

  // Partition
  partitionLoaded: boolean;
  partitionName: string;

  // Active instruments
  activeInstruments: string[];
  soloInstruments: string[];
  mutedInstruments: string[];

  // PlaybackBus
  sourceType: SourceType;
  mediaTitle: string;

  // Signal (Scribe-detected notes for cross-view highlighting)
  signalNotes: string[];
  scribeListening: boolean;
  scribeABC: string;

  // Actions
  setActiveView: (view: ViewMode) => void;
  setActiveFeature: (id: string | null) => void;
  setActiveSubSkill: (id: string | null) => void;
  toggleSidebar: () => void;
  setPlaying: (playing: boolean) => void;
  setRecording: (recording: boolean) => void;
  setBPM: (bpm: number) => void;
  setTimeSignature: (ts: [number, number]) => void;
  setKey: (key: string) => void;
  setMode: (mode: "major" | "minor") => void;
  setMasterVolume: (vol: number) => void;
  setCrystallineMode: (mode: CrystallineMode) => void;
  setCrystallineActive: (active: boolean) => void;
  setDJSkin: (skin: DJSkin) => void;
  setCrossfader: (value: number) => void;
  toggleVisualization: (viz: "waveform" | "fft" | "spectrogram" | "meter" | "phaseScope") => void;
  addActiveInstrument: (id: string) => void;
  removeActiveInstrument: (id: string) => void;
  toggleSolo: (id: string) => void;
  toggleMute: (id: string) => void;
  setSourceType: (type: SourceType) => void;
  setMediaTitle: (title: string) => void;
  setSignalNotes: (notes: string[]) => void;
  setScribeListening: (listening: boolean) => void;
  setScribeABC: (abc: string) => void;

  // DJ Crate actions
  addToCrate: (track: CrateTrack) => void;
  removeFromCrate: (trackId: string) => void;
  selectCrateTrack: (index: number) => void;
  toggleCrate: () => void;
  clearCrate: () => void;

  // DJ Queue actions
  addToQueue: (track: CrateTrack) => void;
  removeFromQueue: (trackId: string) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  toggleQueue: () => void;
  clearQueue: () => void;

  // DJ Mix actions
  setMixMode: (mode: MixMode) => void;
  setRemixStyle: (style: RemixStyle) => void;
  setAutoMixActive: (active: boolean) => void;
  setTransitionPlan: (plan: TransitionPlan | null) => void;
  setTransitionProgress: (progress: number) => void;
  setKaraokeActive: (active: boolean) => void;
  setKaraokeFullscreen: (fullscreen: boolean) => void;
  setBalletFullscreen: (fullscreen: boolean) => void;
  setKaraokeLyrics: (lyrics: string[]) => void;
  setKaraokeCurrentLine: (line: number) => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useOperaStore = create<OperaState>((set) => ({
  // Navigation
  activeView: "orchestra",
  activeFeatureId: null,
  activeSubSkillId: null,
  sidebarOpen: true,

  // Playback
  playing: false,
  recording: false,
  bpm: 120,
  timeSignature: [4, 4],
  key: "C",
  mode: "major",
  masterVolume: 0,

  // CRYSTALLINE
  crystallineMode: "REALTIME",
  crystallineActive: false,

  // DJ
  djSkin: "vinyl",
  crossfader: 50,
  deckALoaded: false,
  deckBLoaded: false,

  // DJ Crate
  djCrate: [],
  selectedCrateIndex: -1,
  crateOpen: true,

  // DJ Queue
  djQueue: [],
  queueOpen: true,

  // DJ Mix
  mixMode: "manual",
  remixStyle: "original",
  autoMixActive: false,
  transitionPlan: null,
  transitionProgress: 0,
  karaokeActive: false,
  karaokeFullscreen: false,
  balletFullscreen: false,
  karaokeLyrics: [],
  karaokeCurrentLine: 0,

  // Visualization
  showWaveform: true,
  showFFT: true,
  showSpectrogram: false,
  showMeter: true,
  showPhaseScope: false,

  // Partition
  partitionLoaded: false,
  partitionName: "",

  // Active instruments
  activeInstruments: ["piano", "violin-1"],
  soloInstruments: [],
  mutedInstruments: [],

  // PlaybackBus
  sourceType: "none",
  mediaTitle: "",

  // Signal
  signalNotes: [],
  scribeListening: false,
  scribeABC: "",

  // Actions
  setActiveView: (view) => set({ activeView: view }),
  setActiveFeature: (id) => set({ activeFeatureId: id, activeSubSkillId: null }),
  setActiveSubSkill: (id) => set({ activeSubSkillId: id }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setPlaying: (playing) => set({ playing }),
  setRecording: (recording) => set({ recording }),
  setBPM: (bpm) => set({ bpm: Math.max(20, Math.min(300, bpm)) }),
  setTimeSignature: (ts) => set({ timeSignature: ts }),
  setKey: (key) => set({ key }),
  setMode: (mode) => set({ mode }),
  setMasterVolume: (vol) => set({ masterVolume: vol }),
  setCrystallineMode: (mode) => set({ crystallineMode: mode }),
  setCrystallineActive: (active) => set({ crystallineActive: active }),
  setDJSkin: (skin) => set({ djSkin: skin }),
  setCrossfader: (value) => set({ crossfader: value }),
  toggleVisualization: (viz) => set((s) => {
    const map: Record<string, keyof OperaState> = {
      waveform: "showWaveform",
      fft: "showFFT",
      spectrogram: "showSpectrogram",
      meter: "showMeter",
      phaseScope: "showPhaseScope",
    };
    return { [map[viz]]: !s[map[viz] as keyof OperaState] } as Partial<OperaState>;
  }),
  addActiveInstrument: (id) => set((s) => ({
    activeInstruments: s.activeInstruments.includes(id) ? s.activeInstruments : [...s.activeInstruments, id],
  })),
  removeActiveInstrument: (id) => set((s) => ({
    activeInstruments: s.activeInstruments.filter((i) => i !== id),
  })),
  toggleSolo: (id) => set((s) => ({
    soloInstruments: s.soloInstruments.includes(id)
      ? s.soloInstruments.filter((i) => i !== id)
      : [...s.soloInstruments, id],
  })),
  toggleMute: (id) => set((s) => ({
    mutedInstruments: s.mutedInstruments.includes(id)
      ? s.mutedInstruments.filter((i) => i !== id)
      : [...s.mutedInstruments, id],
  })),
  setSourceType: (type) => set({ sourceType: type }),
  setMediaTitle: (title) => set({ mediaTitle: title }),
  setSignalNotes: (notes) => set({ signalNotes: notes }),
  setScribeListening: (listening) => set({ scribeListening: listening }),
  setScribeABC: (abc) => set({ scribeABC: abc }),

  // DJ Crate actions
  addToCrate: (track) => set((s) => ({
    djCrate: s.djCrate.some(t => t.id === track.id) ? s.djCrate : [...s.djCrate, track],
  })),
  removeFromCrate: (trackId) => set((s) => ({
    djCrate: s.djCrate.filter(t => t.id !== trackId),
    selectedCrateIndex: s.selectedCrateIndex >= s.djCrate.length - 1
      ? Math.max(-1, s.selectedCrateIndex - 1) : s.selectedCrateIndex,
  })),
  selectCrateTrack: (index) => set({ selectedCrateIndex: index }),
  toggleCrate: () => set((s) => ({ crateOpen: !s.crateOpen })),
  clearCrate: () => set({ djCrate: [], selectedCrateIndex: -1 }),

  // DJ Queue actions
  addToQueue: (track) => set((s) => ({
    djQueue: s.djQueue.some(t => t.id === track.id) ? s.djQueue : [...s.djQueue, track],
  })),
  removeFromQueue: (trackId) => set((s) => ({
    djQueue: s.djQueue.filter(t => t.id !== trackId),
  })),
  reorderQueue: (fromIndex, toIndex) => set((s) => {
    const q = [...s.djQueue];
    const [moved] = q.splice(fromIndex, 1);
    q.splice(toIndex, 0, moved);
    return { djQueue: q };
  }),
  toggleQueue: () => set((s) => ({ queueOpen: !s.queueOpen })),
  clearQueue: () => set({ djQueue: [] }),

  // DJ Mix actions
  setMixMode: (mode) => set({ mixMode: mode }),
  setRemixStyle: (style) => set({ remixStyle: style }),
  setAutoMixActive: (active) => set({ autoMixActive: active }),
  setTransitionPlan: (plan) => set({ transitionPlan: plan }),
  setTransitionProgress: (progress) => set({ transitionProgress: progress }),
  setKaraokeActive: (active) => set({ karaokeActive: active }),
  setKaraokeFullscreen: (fullscreen) => set({ karaokeFullscreen: fullscreen }),
  setBalletFullscreen: (fullscreen) => set({ balletFullscreen: fullscreen }),
  setKaraokeLyrics: (lyrics) => set({ karaokeLyrics: lyrics }),
  setKaraokeCurrentLine: (line) => set({ karaokeCurrentLine: line }),
}));
