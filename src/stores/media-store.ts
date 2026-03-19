/**
 * ADA Opera — Media Store (persistent across view switches)
 * Holds Grab/Pix/Video state so it survives unmount/remount.
 */

import { create } from "zustand";

export interface MediaState {
  // ─── Grab ──────────────────────────────────────────
  grabUrl: string;
  grabFormat: "mp4" | "mp3" | "gif" | "webm" | "best";
  grabQuality: "360p" | "480p" | "720p" | "1080p" | "best";
  grabStatus: "idle" | "downloading" | "converting" | "done" | "error";
  grabStatusMsg: string;
  grabSealQR: boolean;
  grabSealSnowflake: boolean;
  grabLastFilename: string;
  grabLastPath: string;
  grabLastSize: number;

  // ─── Pix ───────────────────────────────────────────
  pixLoaded: boolean;
  pixFilename: string;
  pixBrightness: number;
  pixContrast: number;
  pixSaturation: number;
  pixStatusMsg: string;
  pixPreviewUrl: string; // data URL for canvas preview persistence

  // ─── Video ─────────────────────────────────────────
  videoLoaded: boolean;
  videoFilename: string;
  videoBlobUrl: string;
  videoSpeed: number;
  videoVolume: number;
  videoFilter: string;
  videoStatusMsg: string;
  videoFileSize: number;

  // ─── Actions ───────────────────────────────────────
  setGrab: (partial: Partial<MediaState>) => void;
  setPix: (partial: Partial<MediaState>) => void;
  setVideo: (partial: Partial<MediaState>) => void;
  resetPix: () => void;
  resetVideo: () => void;
}

export const useMediaStore = create<MediaState>((set) => ({
  // Grab
  grabUrl: "",
  grabFormat: "mp4",
  grabQuality: "1080p",
  grabStatus: "idle",
  grabStatusMsg: "",
  grabSealQR: true,
  grabSealSnowflake: true,
  grabLastFilename: "",
  grabLastPath: "",
  grabLastSize: 0,

  // Pix
  pixLoaded: false,
  pixFilename: "",
  pixBrightness: 0,
  pixContrast: 0,
  pixSaturation: 0,
  pixStatusMsg: "",
  pixPreviewUrl: "",

  // Video
  videoLoaded: false,
  videoFilename: "",
  videoBlobUrl: "",
  videoSpeed: 1,
  videoVolume: 100,
  videoFilter: "",
  videoStatusMsg: "",
  videoFileSize: 0,

  // Actions
  setGrab: (partial) => set(partial),
  setPix: (partial) => set(partial),
  setVideo: (partial) => set(partial),
  resetPix: () => set({
    pixLoaded: false,
    pixFilename: "",
    pixBrightness: 0,
    pixContrast: 0,
    pixSaturation: 0,
    pixStatusMsg: "",
    pixPreviewUrl: "",
  }),
  resetVideo: () => set((s) => {
    if (s.videoBlobUrl) URL.revokeObjectURL(s.videoBlobUrl);
    return {
      videoLoaded: false,
      videoFilename: "",
      videoBlobUrl: "",
      videoSpeed: 1,
      videoVolume: 100,
      videoFilter: "",
      videoStatusMsg: "",
      videoFileSize: 0,
    };
  }),
}));
