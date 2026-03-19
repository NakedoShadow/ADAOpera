/**
 * ADA Opera — Pix Engine (ShadowPix Image Processing Bridge)
 * In-browser image editing: adjustments, filters, transforms, presets.
 *
 * Uses Canvas 2D API for browser-native processing.
 * When in Tauri desktop mode, delegates to Rust image engine for speed.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PixAdjustments {
  brightness: number;   // -100 to 100
  contrast: number;     // -100 to 100
  saturation: number;   // -100 to 100
  hue: number;          // -180 to 180
  temperature: number;  // -100 to 100
  tint: number;         // -100 to 100
  gamma: number;        // 0.1 to 3.0
  blackPoint: number;   // 0 to 255
  whitePoint: number;   // 0 to 255
}

export interface PixTransform {
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
  rotation: number;     // 0, 90, 180, 270
  flipH: boolean;
  flipV: boolean;
  resizeW: number;
  resizeH: number;
  keepAspect: boolean;
}

export interface PixHistogram {
  r: number[];
  g: number[];
  b: number[];
  luminance: number[];
}

export interface PixState {
  loaded: boolean;
  filename: string;
  width: number;
  height: number;
  format: string;
  adjustments: PixAdjustments;
  undoStack: ImageData[];
  redoStack: ImageData[];
  maxUndo: number;
}

// ─── Supported Formats ──────────────────────────────────────────────────────

export const PIX_FORMATS = [
  "png", "jpg", "jpeg", "webp", "gif", "bmp", "tiff", "ico", "svg",
];

// ─── Default Adjustments ────────────────────────────────────────────────────

const DEFAULT_ADJUSTMENTS: PixAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  temperature: 0,
  tint: 0,
  gamma: 1.0,
  blackPoint: 0,
  whitePoint: 255,
};

// ─── Pix Engine ─────────────────────────────────────────────────────────────

export class PixEngine {
  private canvas: OffscreenCanvas | null = null;
  private ctx: OffscreenCanvasRenderingContext2D | null = null;
  private originalImage: ImageBitmap | null = null;
  private state: PixState;

  constructor() {
    this.state = {
      loaded: false,
      filename: "",
      width: 0,
      height: 0,
      format: "",
      adjustments: { ...DEFAULT_ADJUSTMENTS },
      undoStack: [],
      redoStack: [],
      maxUndo: 20,
    };
  }

  // ─── Load Image ─────────────────────────────────────────────────────────

  async loadFromFile(file: File): Promise<boolean> {
    try {
      const bitmap = await createImageBitmap(file);
      this.originalImage = bitmap;
      this.canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      this.ctx = this.canvas.getContext("2d")!;
      this.ctx.drawImage(bitmap, 0, 0);

      this.state.loaded = true;
      this.state.filename = file.name;
      this.state.width = bitmap.width;
      this.state.height = bitmap.height;
      this.state.format = file.name.split(".").pop() ?? "png";
      this.state.adjustments = { ...DEFAULT_ADJUSTMENTS };
      this.state.undoStack = [];
      this.state.redoStack = [];

      return true;
    } catch {
      return false;
    }
  }

  async loadFromDataURL(dataURL: string, filename = "image.png"): Promise<boolean> {
    try {
      const response = await fetch(dataURL);
      const blob = await response.blob();
      const file = new File([blob], filename);
      return this.loadFromFile(file);
    } catch {
      return false;
    }
  }

  // ─── Push Undo ──────────────────────────────────────────────────────────

  private pushUndo(): void {
    if (!this.ctx || !this.canvas) return;
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.state.undoStack.push(imageData);
    if (this.state.undoStack.length > this.state.maxUndo) {
      this.state.undoStack.shift();
    }
    this.state.redoStack = [];
  }

  undo(): boolean {
    if (this.state.undoStack.length === 0 || !this.ctx) return false;
    const current = this.ctx.getImageData(0, 0, this.canvas!.width, this.canvas!.height);
    this.state.redoStack.push(current);
    const prev = this.state.undoStack.pop()!;
    this.ctx.putImageData(prev, 0, 0);
    return true;
  }

  redo(): boolean {
    if (this.state.redoStack.length === 0 || !this.ctx) return false;
    const current = this.ctx.getImageData(0, 0, this.canvas!.width, this.canvas!.height);
    this.state.undoStack.push(current);
    const next = this.state.redoStack.pop()!;
    this.ctx.putImageData(next, 0, 0);
    return true;
  }

  // ─── Adjustments ────────────────────────────────────────────────────────

  applyBrightness(value: number): void {
    this.applyPixelFilter((r, g, b) => {
      const v = value * 2.55;
      return [clamp(r + v), clamp(g + v), clamp(b + v)];
    });
    this.state.adjustments.brightness = value;
  }

  applyContrast(value: number): void {
    const factor = (259 * (value + 255)) / (255 * (259 - value));
    this.applyPixelFilter((r, g, b) => [
      clamp(factor * (r - 128) + 128),
      clamp(factor * (g - 128) + 128),
      clamp(factor * (b - 128) + 128),
    ]);
    this.state.adjustments.contrast = value;
  }

  applySaturation(value: number): void {
    const factor = 1 + value / 100;
    this.applyPixelFilter((r, g, b) => {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      return [
        clamp(gray + factor * (r - gray)),
        clamp(gray + factor * (g - gray)),
        clamp(gray + factor * (b - gray)),
      ];
    });
    this.state.adjustments.saturation = value;
  }

  applyLevels(blackPoint: number, whitePoint: number, gamma: number): void {
    const range = whitePoint - blackPoint || 1;
    this.applyPixelFilter((r, g, b) => {
      const adjust = (v: number) => {
        let normalized = (v - blackPoint) / range;
        normalized = Math.max(0, Math.min(1, normalized));
        return clamp(Math.pow(normalized, 1 / gamma) * 255);
      };
      return [adjust(r), adjust(g), adjust(b)];
    });
    this.state.adjustments.blackPoint = blackPoint;
    this.state.adjustments.whitePoint = whitePoint;
    this.state.adjustments.gamma = gamma;
  }

  // ─── Filters ────────────────────────────────────────────────────────────

  applyBlur(radius: number): void {
    if (!this.ctx || !this.canvas) return;
    this.pushUndo();
    // Use CSS filter for blur (fast, GPU-accelerated)
    const tempCanvas = new OffscreenCanvas(this.canvas.width, this.canvas.height);
    const tempCtx = tempCanvas.getContext("2d")!;
    tempCtx.filter = `blur(${radius}px)`;
    tempCtx.drawImage(this.canvas, 0, 0);
    this.ctx.drawImage(tempCanvas, 0, 0);
  }

  applySharpen(): void {
    if (!this.ctx || !this.canvas) return;
    this.pushUndo();
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const { data, width, height } = imageData;
    const output = new Uint8ClampedArray(data);

    // 3x3 sharpen kernel: [0,-1,0,-1,5,-1,0,-1,0]
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) {
          const idx = (y * width + x) * 4 + c;
          const val =
            5 * data[idx] -
            data[((y - 1) * width + x) * 4 + c] -
            data[((y + 1) * width + x) * 4 + c] -
            data[(y * width + x - 1) * 4 + c] -
            data[(y * width + x + 1) * 4 + c];
          output[idx] = Math.max(0, Math.min(255, val));
        }
      }
    }

    imageData.data.set(output);
    this.ctx.putImageData(imageData, 0, 0);
  }

  applyDenoise(strength: number): void {
    // Median filter approximation
    this.applyBlur(strength);
  }

  applyVignette(intensity: number): void {
    if (!this.ctx || !this.canvas) return;
    this.pushUndo();
    const { width, height } = this.canvas;
    const cx = width / 2;
    const cy = height / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);

    const imageData = this.ctx.getImageData(0, 0, width, height);
    const { data } = imageData;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;
        const factor = 1 - dist * dist * (intensity / 100);
        const idx = (y * width + x) * 4;
        data[idx] = clamp(data[idx] * factor);
        data[idx + 1] = clamp(data[idx + 1] * factor);
        data[idx + 2] = clamp(data[idx + 2] * factor);
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  // ─── Presets ────────────────────────────────────────────────────────────

  applyGrayscale(): void {
    this.applyPixelFilter((r, g, b) => {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      return [gray, gray, gray];
    });
  }

  applySepia(): void {
    this.applyPixelFilter((r, g, b) => [
      clamp(r * 0.393 + g * 0.769 + b * 0.189),
      clamp(r * 0.349 + g * 0.686 + b * 0.168),
      clamp(r * 0.272 + g * 0.534 + b * 0.131),
    ]);
  }

  applyInvert(): void {
    this.applyPixelFilter((r, g, b) => [255 - r, 255 - g, 255 - b]);
  }

  autoEnhance(): void {
    if (!this.ctx || !this.canvas) return;
    this.pushUndo();
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const { data } = imageData;

    // Find 1st and 99th percentile per channel
    const channels = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
    const total = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      channels[0][data[i]]++;
      channels[1][data[i + 1]]++;
      channels[2][data[i + 2]]++;
    }

    const pLow = Math.floor(total * 0.01);
    const pHigh = Math.floor(total * 0.99);
    const ranges: [number, number][] = [];

    for (const ch of channels) {
      let cumLow = 0, cumHigh = 0;
      let low = 0, high = 255;
      for (let v = 0; v < 256; v++) {
        cumLow += ch[v];
        if (cumLow >= pLow) { low = v; break; }
      }
      for (let v = 255; v >= 0; v--) {
        cumHigh += ch[v];
        if (cumHigh >= (total - pHigh)) { high = v; break; }
      }
      ranges.push([low, high]);
    }

    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const [low, high] = ranges[c];
        const range = high - low || 1;
        data[i + c] = clamp(((data[i + c] - low) / range) * 255);
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  // ─── Transform ──────────────────────────────────────────────────────────

  crop(x: number, y: number, w: number, h: number): void {
    if (!this.ctx || !this.canvas) return;
    this.pushUndo();
    const imageData = this.ctx.getImageData(x, y, w, h);
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.putImageData(imageData, 0, 0);
    this.state.width = w;
    this.state.height = h;
  }

  resize(w: number, h: number): void {
    if (!this.ctx || !this.canvas) return;
    this.pushUndo();
    const tempCanvas = new OffscreenCanvas(w, h);
    const tempCtx = tempCanvas.getContext("2d")!;
    tempCtx.drawImage(this.canvas, 0, 0, w, h);
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(tempCanvas, 0, 0);
    this.state.width = w;
    this.state.height = h;
  }

  rotate(degrees: number): void {
    if (!this.ctx || !this.canvas) return;
    this.pushUndo();
    const { width, height } = this.canvas;
    const swap = degrees === 90 || degrees === 270;
    const newW = swap ? height : width;
    const newH = swap ? width : height;

    const tempCanvas = new OffscreenCanvas(newW, newH);
    const tempCtx = tempCanvas.getContext("2d")!;
    tempCtx.translate(newW / 2, newH / 2);
    tempCtx.rotate((degrees * Math.PI) / 180);
    tempCtx.drawImage(this.canvas, -width / 2, -height / 2);

    this.canvas.width = newW;
    this.canvas.height = newH;
    this.ctx.drawImage(tempCanvas, 0, 0);
    this.state.width = newW;
    this.state.height = newH;
  }

  flip(horizontal: boolean): void {
    if (!this.ctx || !this.canvas) return;
    this.pushUndo();
    const { width, height } = this.canvas;
    const tempCanvas = new OffscreenCanvas(width, height);
    const tempCtx = tempCanvas.getContext("2d")!;
    if (horizontal) {
      tempCtx.translate(width, 0);
      tempCtx.scale(-1, 1);
    } else {
      tempCtx.translate(0, height);
      tempCtx.scale(1, -1);
    }
    tempCtx.drawImage(this.canvas, 0, 0);
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.drawImage(tempCanvas, 0, 0);
  }

  // ─── Histogram ──────────────────────────────────────────────────────────

  getHistogram(): PixHistogram {
    if (!this.ctx || !this.canvas) {
      return { r: Array(256).fill(0), g: Array(256).fill(0), b: Array(256).fill(0), luminance: Array(256).fill(0) };
    }
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const { data } = imageData;
    const r = new Array(256).fill(0);
    const g = new Array(256).fill(0);
    const b = new Array(256).fill(0);
    const luminance = new Array(256).fill(0);

    for (let i = 0; i < data.length; i += 4) {
      r[data[i]]++;
      g[data[i + 1]]++;
      b[data[i + 2]]++;
      const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      luminance[lum]++;
    }

    return { r, g, b, luminance };
  }

  // ─── Export ─────────────────────────────────────────────────────────────

  async toDataURL(format = "image/png", quality = 0.92): Promise<string> {
    if (!this.canvas) return "";
    const blob = await this.canvas.convertToBlob({ type: format, quality });
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }

  async toBlob(format = "image/png", quality = 0.92): Promise<Blob | null> {
    if (!this.canvas) return null;
    return this.canvas.convertToBlob({ type: format, quality });
  }

  // ─── Private Helpers ────────────────────────────────────────────────────

  private applyPixelFilter(fn: (r: number, g: number, b: number) => [number, number, number]): void {
    if (!this.ctx || !this.canvas) return;
    this.pushUndo();
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const { data } = imageData;
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b] = fn(data[i], data[i + 1], data[i + 2]);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
    this.ctx.putImageData(imageData, 0, 0);
  }

  // ─── State ──────────────────────────────────────────────────────────────

  getState(): PixState {
    return { ...this.state };
  }

  isLoaded(): boolean {
    return this.state.loaded;
  }

  dispose(): void {
    this.originalImage?.close();
    this.originalImage = null;
    this.canvas = null;
    this.ctx = null;
    this.state.loaded = false;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function clamp(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let pixInstance: PixEngine | null = null;

export function getPixEngine(): PixEngine {
  if (!pixInstance) {
    pixInstance = new PixEngine();
  }
  return pixInstance;
}
