/**
 * ADA Opera — Grab Engine (ShadowGrab + Shadow Convert Integration)
 * Media downloading (1000+ sites via yt-dlp), format conversion,
 * Shadow Seal watermarking, and universal file conversion.
 *
 * Backend: ShadowGrab (Python/yt-dlp/ffmpeg) @ port 8106
 * Backend: Shadow Convert (Flask/Pillow/PyMuPDF) @ port 8106
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DownloadRequest {
  url: string;
  format: "mp4" | "mp3" | "gif" | "webm" | "best";
  quality: "360p" | "480p" | "720p" | "1080p" | "best";
  gifOptions?: { fps: number; width: number };
  sealEnabled: boolean;
}

export interface DownloadResult {
  ok: boolean;
  filename: string;
  path: string;
  size: number;
  duration?: number;
  serial?: string;
  format: string;
}

export interface ConvertRequest {
  sourcePath: string;
  targetFormat: string;
  dpi?: number;
  sealEnabled?: boolean;
}

export interface ConvertResult {
  ok: boolean;
  filename: string;
  path: string;
  size: number;
  format: string;
}

export interface SealConfig {
  sourceQR: boolean;
  nakedoQR: boolean;
  snowflake: boolean;
  serialPrefix: string;
  creatorName: string;
}

export interface GrabState {
  downloading: boolean;
  converting: boolean;
  progress: number;
  currentUrl: string;
  lastResult: DownloadResult | null;
  sealConfig: SealConfig;
  serialCounter: number;
}

// ─── Supported Formats ──────────────────────────────────────────────────────

export const GRAB_FORMATS = {
  download: {
    video: ["mp4", "webm", "mkv", "avi", "mov", "flv"],
    audio: ["mp3", "wav", "flac", "ogg", "m4a", "aac", "opus"],
    animated: ["gif"],
  },
  convert: {
    image: {
      input: ["jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff", "svg", "ico"],
      output: ["jpg", "png", "webp", "pdf", "bmp"],
    },
    document: {
      input: ["pdf", "docx", "txt"],
      output: ["pdf", "docx", "txt", "jpg", "png"],
    },
    video: {
      input: ["mp4", "webm", "mkv", "avi", "mov"],
      output: ["mp4", "webm", "gif", "mp3"],
    },
  },
  sources: [
    "YouTube", "Twitter/X", "TikTok", "Instagram", "Reddit",
    "Vimeo", "Dailymotion", "Twitch", "SoundCloud", "Bandcamp",
    "Facebook", "Bilibili", "Niconico", "Crunchyroll",
    "1000+ more via yt-dlp",
  ],
};

// ─── Grab Engine ────────────────────────────────────────────────────────────

export class GrabEngine {
  private state: GrabState;
  private convertApiBase: string;
  private grabApiBase: string;

  constructor(convertHost = "localhost", convertPort = 8106) {
    this.convertApiBase = `http://${convertHost}:${convertPort}`;
    this.grabApiBase = `http://${convertHost}:${convertPort}`;

    this.state = {
      downloading: false,
      converting: false,
      progress: 0,
      currentUrl: "",
      lastResult: null,
      sealConfig: {
        sourceQR: true,
        nakedoQR: true,
        snowflake: true,
        serialPrefix: "QSA",
        creatorName: "Shadows Company",
      },
      serialCounter: 1,
    };
  }

  // ─── Download ───────────────────────────────────────────────────────────

  async download(request: DownloadRequest): Promise<DownloadResult> {
    this.state.downloading = true;
    this.state.currentUrl = request.url;
    this.state.progress = 0;

    try {
      const response = await fetch(`${this.grabApiBase}/api/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: request.url,
          format: request.format,
          quality: request.quality,
          gif_options: request.gifOptions,
          seal: request.sealEnabled ? this.state.sealConfig : null,
        }),
      });

      if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);

      const data = await response.json();
      const result: DownloadResult = {
        ok: true,
        filename: data.filename,
        path: data.path,
        size: data.size,
        duration: data.duration,
        serial: data.serial,
        format: request.format,
      };

      this.state.lastResult = result;
      this.state.progress = 100;
      return result;
    } catch (error) {
      return { ok: false, filename: "", path: "", size: 0, format: request.format };
    } finally {
      this.state.downloading = false;
    }
  }

  // ─── Convert ────────────────────────────────────────────────────────────

  async convert(request: ConvertRequest): Promise<ConvertResult> {
    this.state.converting = true;

    try {
      const formData = new FormData();

      // If source is a file path, we need to read it first
      // In browser mode, this expects a File from input[type=file]
      formData.append("target_format", request.targetFormat);
      if (request.dpi) formData.append("dpi", String(request.dpi));
      if (request.sealEnabled) formData.append("seal", "true");

      const response = await fetch(`${this.convertApiBase}/api/convert`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error(`Conversion failed: ${response.statusText}`);

      const data = await response.json();
      return {
        ok: true,
        filename: data.filename,
        path: data.download_url,
        size: data.size ?? 0,
        format: request.targetFormat,
      };
    } catch {
      return { ok: false, filename: "", path: "", size: 0, format: request.targetFormat };
    } finally {
      this.state.converting = false;
    }
  }

  // ─── PDF Merge ──────────────────────────────────────────────────────────

  async mergePDFs(files: File[]): Promise<ConvertResult> {
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    try {
      const response = await fetch(`${this.convertApiBase}/api/merge`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Merge failed");
      const data = await response.json();
      return { ok: true, filename: data.filename, path: data.download_url, size: 0, format: "pdf" };
    } catch {
      return { ok: false, filename: "", path: "", size: 0, format: "pdf" };
    }
  }

  // ─── Shadow Seal ────────────────────────────────────────────────────────

  generateSerial(): string {
    const num = String(this.state.serialCounter++).padStart(6, "0");
    return `${this.state.sealConfig.serialPrefix}${num}`;
  }

  setSealConfig(config: Partial<SealConfig>): void {
    this.state.sealConfig = { ...this.state.sealConfig, ...config };
  }

  // ─── Supported Formats Check ────────────────────────────────────────────

  canDownload(url: string): boolean {
    // yt-dlp supports 1000+ sites — basic check
    const supported = [
      "youtube.com", "youtu.be", "twitter.com", "x.com",
      "tiktok.com", "instagram.com", "reddit.com", "vimeo.com",
      "dailymotion.com", "twitch.tv", "soundcloud.com",
    ];
    return supported.some((s) => url.includes(s)) || url.startsWith("http");
  }

  canConvert(ext: string, targetExt: string): boolean {
    const all = GRAB_FORMATS.convert;
    const imgIn = all.image.input.includes(ext) && all.image.output.includes(targetExt);
    const docIn = all.document.input.includes(ext) && all.document.output.includes(targetExt);
    const vidIn = all.video.input.includes(ext) && all.video.output.includes(targetExt);
    return imgIn || docIn || vidIn;
  }

  // ─── State ──────────────────────────────────────────────────────────────

  getState(): GrabState {
    return { ...this.state };
  }

  dispose(): void {
    this.state.downloading = false;
    this.state.converting = false;
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let grabInstance: GrabEngine | null = null;

export function getGrabEngine(): GrabEngine {
  if (!grabInstance) {
    grabInstance = new GrabEngine();
  }
  return grabInstance;
}
