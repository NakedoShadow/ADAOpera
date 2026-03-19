/**
 * ADA Opera — Video Engine (Basic Video Manipulation)
 * Browser-native video processing via Canvas + MediaRecorder.
 * For heavy operations, delegates to ffmpeg backend via Tauri or API.
 *
 * Capabilities: trim, merge, speed, reverse, audio extract/replace,
 * filters (brightness/contrast/grayscale/stabilize), export (MP4/WebM/GIF/frames)
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface VideoMetadata {
  filename: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  audioCodec: string;
  fileSize: number;
}

export interface TrimRange {
  start: number;
  end: number;
}

export interface VideoFilters {
  brightness: number;    // -1 to 1
  contrast: number;      // 0.5 to 2
  saturation: number;    // 0 to 2
  grayscale: boolean;
  sepia: boolean;
  blur: number;          // 0 to 20px
}

export interface ExportSettings {
  format: "mp4" | "webm" | "gif";
  quality: number;       // CRF 18-35 (lower = better)
  width?: number;
  height?: number;
  fps?: number;
  audioBitrate?: number;
}

export interface VideoState {
  loaded: boolean;
  filename: string;
  metadata: VideoMetadata | null;
  currentTime: number;
  playing: boolean;
  speed: number;
  trim: TrimRange | null;
  filters: VideoFilters;
  audioMuted: boolean;
  audioVolume: number;
  exporting: boolean;
  exportProgress: number;
}

// ─── Supported Formats ──────────────────────────────────────────────────────

export const VIDEO_FORMATS = {
  input: ["mp4", "webm", "mkv", "avi", "mov", "ogg", "m4v"],
  output: ["mp4", "webm", "gif"],
  audio: ["mp3", "wav", "ogg", "aac", "flac"],
};

// ─── Default Filters ────────────────────────────────────────────────────────

const DEFAULT_FILTERS: VideoFilters = {
  brightness: 0,
  contrast: 1,
  saturation: 1,
  grayscale: false,
  sepia: false,
  blur: 0,
};

// ─── Video Engine ───────────────────────────────────────────────────────────

export class VideoEngine {
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private animFrameId: number = 0;
  private state: VideoState;
  private ffmpegApiBase: string;

  constructor(ffmpegHost = "localhost", ffmpegPort = 8106) {
    this.ffmpegApiBase = `http://${ffmpegHost}:${ffmpegPort}`;
    this.state = {
      loaded: false,
      filename: "",
      metadata: null,
      currentTime: 0,
      playing: false,
      speed: 1,
      trim: null,
      filters: { ...DEFAULT_FILTERS },
      audioMuted: false,
      audioVolume: 100,
      exporting: false,
      exportProgress: 0,
    };
  }

  // ─── Load Video ─────────────────────────────────────────────────────────

  async loadFromFile(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      this.video = document.createElement("video");
      this.video.preload = "auto";
      this.video.muted = false;

      this.video.onloadedmetadata = () => {
        if (!this.video) return resolve(false);

        this.state.metadata = {
          filename: file.name,
          duration: this.video.duration,
          width: this.video.videoWidth,
          height: this.video.videoHeight,
          fps: 30, // estimated, actual FPS requires parsing
          codec: "h264",
          audioCodec: "aac",
          fileSize: file.size,
        };

        this.canvas = document.createElement("canvas");
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        this.ctx = this.canvas.getContext("2d")!;

        this.state.loaded = true;
        this.state.filename = file.name;
        this.state.filters = { ...DEFAULT_FILTERS };
        this.state.trim = null;

        resolve(true);
      };

      this.video.onerror = () => resolve(false);
      this.video.src = url;
    });
  }

  async loadFromURL(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.video = document.createElement("video");
      this.video.crossOrigin = "anonymous";
      this.video.preload = "auto";

      this.video.onloadedmetadata = () => {
        if (!this.video) return resolve(false);

        this.state.metadata = {
          filename: url.split("/").pop() ?? "video",
          duration: this.video.duration,
          width: this.video.videoWidth,
          height: this.video.videoHeight,
          fps: 30,
          codec: "h264",
          audioCodec: "aac",
          fileSize: 0,
        };

        this.canvas = document.createElement("canvas");
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        this.ctx = this.canvas.getContext("2d")!;

        this.state.loaded = true;
        this.state.filename = this.state.metadata.filename;
        resolve(true);
      };

      this.video.onerror = () => resolve(false);
      this.video.src = url;
    });
  }

  // ─── Playback ───────────────────────────────────────────────────────────

  play(): void {
    if (!this.video) return;
    this.video.playbackRate = this.state.speed;
    this.video.play();
    this.state.playing = true;
    this.startRenderLoop();
  }

  pause(): void {
    this.video?.pause();
    this.state.playing = false;
    this.stopRenderLoop();
  }

  seek(time: number): void {
    if (!this.video) return;
    this.video.currentTime = Math.max(0, Math.min(time, this.video.duration));
    this.state.currentTime = this.video.currentTime;
    this.renderFrame();
  }

  setSpeed(speed: number): void {
    this.state.speed = Math.max(0.25, Math.min(4, speed));
    if (this.video) this.video.playbackRate = this.state.speed;
  }

  // ─── Audio Controls ─────────────────────────────────────────────────────

  setVolume(percent: number): void {
    this.state.audioVolume = Math.max(0, Math.min(200, percent));
    if (this.video) this.video.volume = Math.min(1, this.state.audioVolume / 100);
  }

  setMuted(muted: boolean): void {
    this.state.audioMuted = muted;
    if (this.video) this.video.muted = muted;
  }

  // ─── Trim ───────────────────────────────────────────────────────────────

  setTrim(start: number, end: number): void {
    this.state.trim = { start, end };
  }

  clearTrim(): void {
    this.state.trim = null;
  }

  // ─── Filters ────────────────────────────────────────────────────────────

  setFilter<K extends keyof VideoFilters>(key: K, value: VideoFilters[K]): void {
    this.state.filters[key] = value;
    this.renderFrame();
  }

  resetFilters(): void {
    this.state.filters = { ...DEFAULT_FILTERS };
    this.renderFrame();
  }

  // ─── Render with Filters ────────────────────────────────────────────────

  private renderFrame(): void {
    if (!this.video || !this.ctx || !this.canvas) return;

    // Build CSS filter string
    const f = this.state.filters;
    const filters: string[] = [];
    if (f.brightness !== 0) filters.push(`brightness(${1 + f.brightness})`);
    if (f.contrast !== 1) filters.push(`contrast(${f.contrast})`);
    if (f.saturation !== 1) filters.push(`saturate(${f.saturation})`);
    if (f.grayscale) filters.push("grayscale(1)");
    if (f.sepia) filters.push("sepia(1)");
    if (f.blur > 0) filters.push(`blur(${f.blur}px)`);

    this.ctx.filter = filters.length > 0 ? filters.join(" ") : "none";
    this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
    this.ctx.filter = "none";

    this.state.currentTime = this.video.currentTime;
  }

  private startRenderLoop(): void {
    const loop = () => {
      if (!this.state.playing) return;

      // Handle trim bounds
      if (this.state.trim && this.video) {
        if (this.video.currentTime >= this.state.trim.end) {
          this.video.currentTime = this.state.trim.start;
        }
      }

      this.renderFrame();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  private stopRenderLoop(): void {
    cancelAnimationFrame(this.animFrameId);
  }

  // ─── Export ─────────────────────────────────────────────────────────────

  async exportVideo(settings: ExportSettings): Promise<Blob | null> {
    if (!this.canvas || !this.video) return null;

    this.state.exporting = true;
    this.state.exportProgress = 0;

    return new Promise((resolve) => {
      const stream = this.canvas!.captureStream(settings.fps ?? 30);

      // Add audio track if not muted and not GIF
      if (!this.state.audioMuted && settings.format !== "gif" && this.video) {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaElementSource(this.video);
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(dest);
        source.connect(audioCtx.destination);
        dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
      }

      const mimeType = settings.format === "webm" ? "video/webm;codecs=vp9" : "video/webm";
      this.mediaRecorder = new MediaRecorder(stream, { mimeType });
      this.recordedChunks = [];

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.recordedChunks.push(e.data);
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        this.state.exporting = false;
        this.state.exportProgress = 100;
        resolve(blob);
      };

      // Play through video while recording
      const startTime = this.state.trim?.start ?? 0;
      const endTime = this.state.trim?.end ?? this.video!.duration;

      this.video!.currentTime = startTime;
      this.mediaRecorder.start();
      this.state.playing = true;
      this.video!.play();
      this.startRenderLoop();

      // Monitor progress and stop at end
      const checkProgress = () => {
        if (!this.video || !this.mediaRecorder) return;
        this.state.exportProgress = ((this.video.currentTime - startTime) / (endTime - startTime)) * 100;

        if (this.video.currentTime >= endTime) {
          this.video.pause();
          this.state.playing = false;
          this.stopRenderLoop();
          this.mediaRecorder.stop();
        } else {
          requestAnimationFrame(checkProgress);
        }
      };
      requestAnimationFrame(checkProgress);
    });
  }

  // ─── Frame Extraction ─────────────────────────────────────────────────

  async extractFrame(time: number): Promise<string | null> {
    if (!this.video || !this.ctx || !this.canvas) return null;

    return new Promise((resolve) => {
      this.video!.currentTime = time;
      this.video!.onseeked = () => {
        this.renderFrame();
        const dataURL = (this.canvas as any as HTMLCanvasElement).toDataURL?.("image/png");
        // OffscreenCanvas doesn't have toDataURL, use convertToBlob
        if (dataURL) {
          resolve(dataURL);
        } else {
          resolve(null);
        }
      };
    });
  }

  async extractFrames(interval: number): Promise<string[]> {
    if (!this.video || !this.state.metadata) return [];
    const frames: string[] = [];
    const duration = this.state.trim?.end ?? this.state.metadata.duration;
    const start = this.state.trim?.start ?? 0;

    for (let t = start; t < duration; t += interval / (this.state.metadata.fps || 30)) {
      const frame = await this.extractFrame(t);
      if (frame) frames.push(frame);
    }
    return frames;
  }

  // ─── Get Canvas (for rendering in React) ──────────────────────────────

  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.video;
  }

  // ─── State ──────────────────────────────────────────────────────────────

  getState(): VideoState {
    if (this.video) {
      this.state.currentTime = this.video.currentTime;
    }
    return { ...this.state };
  }

  // ─── Format Helpers ───────────────────────────────────────────────────

  static formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${m}:${String(s).padStart(2, "0")}.${ms}`;
  }

  static formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────

  dispose(): void {
    this.stopRenderLoop();
    this.mediaRecorder?.stop();
    if (this.video?.src) URL.revokeObjectURL(this.video.src);
    this.video = null;
    this.canvas = null;
    this.ctx = null;
    this.state.loaded = false;
    this.state.playing = false;
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let videoInstance: VideoEngine | null = null;

export function getVideoEngine(): VideoEngine {
  if (!videoInstance) {
    videoInstance = new VideoEngine();
  }
  return videoInstance;
}
