/**
 * ADA Opera — PlaybackBus (Universal Signal Router)
 *
 * The Queen's conductor wire: routes ANY media source (video, audio file,
 * instruments, microphone) through the Vivaldi Conductor's analyzer chain.
 *
 * Architecture:
 *   MediaElement → MediaElementSourceNode → GainNode → Conductor.masterChannel
 *                                                    → AudioContext.destination
 *
 * Result: all visualizers (Waveform, FFT, Spectrogram, VU, PhaseScope)
 * automatically display the signal regardless of which view is active.
 *
 * The transport Play/Stop/Pause is universal:
 *   - Media loaded → controls the video/audio element
 *   - No media → controls Tone.js instruments/transport
 *   - Both active → controls both simultaneously
 */

import * as Tone from "tone";
import { getConductor } from "./audio-engine";
import { getRituala } from "./rituala-engine";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SourceType = "none" | "media" | "instruments" | "both";

export interface PlaybackBusState {
  sourceType: SourceType;
  mediaConnected: boolean;
  mediaPlaying: boolean;
  mediaDuration: number;
  mediaCurrentTime: number;
  mediaTitle: string;
}

type BusListener = (state: PlaybackBusState) => void;

// ─── PlaybackBus ─────────────────────────────────────────────────────────────

export class PlaybackBus {
  private mediaElement: HTMLVideoElement | HTMLAudioElement | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;
  private mediaGain: GainNode | null = null;
  private connectedElements = new WeakSet<HTMLMediaElement>();
  private sourceType: SourceType = "none";
  private mediaTitle = "";
  private listeners: Set<BusListener> = new Set();
  private timeUpdateHandler: (() => void) | null = null;
  private endedHandler: (() => void) | null = null;

  /**
   * Connect a video/audio element to the audio analysis pipeline.
   * The element's audio will flow through all Conductor analyzers,
   * making it visible in every visualizer across all views.
   *
   * IMPORTANT: MediaElementSourceNode can only be created ONCE per element.
   * We track connected elements to avoid double-connecting.
   */
  connectMediaElement(
    element: HTMLVideoElement | HTMLAudioElement,
    title: string = ""
  ): boolean {
    // Ensure Tone.js AudioContext is started
    const rawCtx = Tone.getContext().rawContext as AudioContext;
    if (rawCtx.state === "suspended") {
      // Will be resumed on next user gesture via Tone.start()
      // We still set up the connection — it'll work once resumed
    }

    this.mediaElement = element;
    this.mediaTitle = title;

    // Only create MediaElementSourceNode once per element
    if (!this.connectedElements.has(element)) {
      try {
        this.mediaSource = rawCtx.createMediaElementSource(element);
        this.mediaGain = rawCtx.createGain();
        this.mediaGain.gain.value = 1.0;

        // Route: MediaSource → Gain → Destination (for playback)
        this.mediaSource.connect(this.mediaGain);
        this.mediaGain.connect(rawCtx.destination);

        // Also route to Conductor's analyzer chain
        const conductor = getConductor();
        conductor.connectExternalSource(this.mediaGain);

        this.connectedElements.add(element);
      } catch (e) {
        console.warn("[PlaybackBus] Failed to connect media element:", e);
        return false;
      }
    }

    // Track media events
    this.cleanupMediaListeners();
    this.timeUpdateHandler = () => this.notifyListeners();
    this.endedHandler = () => {
      this.sourceType = this.sourceType === "both" ? "instruments" : "none";
      this.notifyListeners();
    };
    element.addEventListener("timeupdate", this.timeUpdateHandler);
    element.addEventListener("ended", this.endedHandler);

    this.sourceType = this.sourceType === "instruments" ? "both" : "media";
    this.notifyListeners();
    return true;
  }

  /**
   * Disconnect the current media element from the bus.
   */
  disconnectMedia(): void {
    this.cleanupMediaListeners();
    // Don't disconnect the AudioNode — MediaElementSourceNode is permanent
    // Just stop tracking the element
    this.mediaElement = null;
    this.mediaTitle = "";
    this.sourceType = this.sourceType === "both" ? "instruments" : "none";
    // Tell conductor to stop reading external signal
    getConductor().disconnectExternalSource();
    this.notifyListeners();
  }

  // ─── Universal Transport ─────────────────────────────────────────────────

  /**
   * Universal Play — plays whatever is loaded.
   * Returns the effective source type that started playing.
   */
  async play(): Promise<SourceType> {
    // Ensure AudioContext is running
    await Tone.start();

    const conductor = getConductor();
    await conductor.start();

    let type: SourceType = "none";

    // Play media element if connected
    if (this.mediaElement && this.mediaElement.src) {
      try {
        await this.mediaElement.play();
        type = "media";
      } catch (e) {
        console.warn("[PlaybackBus] Media play failed:", e);
      }
    }

    // Always start the Tone transport (for instruments, metronome, etc.)
    getRituala().start();

    if (type === "media") {
      this.sourceType = "both"; // media + instruments/transport both active
    } else {
      this.sourceType = "instruments";
    }

    this.notifyListeners();
    return this.sourceType;
  }

  /**
   * Universal Pause — pauses everything.
   */
  pause(): void {
    if (this.mediaElement && !this.mediaElement.paused) {
      this.mediaElement.pause();
    }

    getConductor().pause();
    getRituala().pause();

    this.notifyListeners();
  }

  /**
   * Universal Stop — stops everything, resets position.
   */
  stop(): void {
    if (this.mediaElement) {
      this.mediaElement.pause();
      this.mediaElement.currentTime = 0;
    }

    getConductor().stop();
    getRituala().stop();

    this.notifyListeners();
  }

  /**
   * Is anything currently playing?
   */
  isPlaying(): boolean {
    const mediaPlaying = this.mediaElement ? !this.mediaElement.paused : false;
    const transportPlaying = getConductor().getState().playing;
    return mediaPlaying || transportPlaying;
  }

  // ─── Media Control ───────────────────────────────────────────────────────

  getMediaElement(): HTMLVideoElement | HTMLAudioElement | null {
    return this.mediaElement;
  }

  isMediaConnected(): boolean {
    return this.mediaElement !== null && this.mediaElement.src !== "";
  }

  setMediaVolume(volume: number): void {
    if (this.mediaGain) {
      this.mediaGain.gain.value = Math.max(0, Math.min(2, volume));
    }
  }

  // ─── State ───────────────────────────────────────────────────────────────

  getState(): PlaybackBusState {
    return {
      sourceType: this.sourceType,
      mediaConnected: this.isMediaConnected(),
      mediaPlaying: this.mediaElement ? !this.mediaElement.paused : false,
      mediaDuration: this.mediaElement?.duration ?? 0,
      mediaCurrentTime: this.mediaElement?.currentTime ?? 0,
      mediaTitle: this.mediaTitle,
    };
  }

  // ─── Listeners ───────────────────────────────────────────────────────────

  subscribe(listener: BusListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((fn) => {
      try { fn(state); } catch { /* listener error silenced */ }
    });
  }

  private cleanupMediaListeners(): void {
    if (this.mediaElement && this.timeUpdateHandler) {
      this.mediaElement.removeEventListener("timeupdate", this.timeUpdateHandler);
    }
    if (this.mediaElement && this.endedHandler) {
      this.mediaElement.removeEventListener("ended", this.endedHandler);
    }
    this.timeUpdateHandler = null;
    this.endedHandler = null;
  }

  // ─── Cleanup ─────────────────────────────────────────────────────────────

  dispose(): void {
    this.cleanupMediaListeners();
    this.mediaGain?.disconnect();
    this.mediaSource?.disconnect();
    this.mediaElement = null;
    this.mediaSource = null;
    this.mediaGain = null;
    this.sourceType = "none";
    this.listeners.clear();
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let busInstance: PlaybackBus | null = null;

export function getPlaybackBus(): PlaybackBus {
  if (!busInstance) {
    busInstance = new PlaybackBus();
  }
  return busInstance;
}
