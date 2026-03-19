/**
 * ADA Opera — NotebookLM Engine
 * Bridge to notebooklm-py API for content generation.
 * Generates: podcasts, videos, shorts, reports, infographics, slides, quizzes.
 *
 * Architecture:
 *   Browser UI → fetch() → local Python server (port 8310) → notebooklm-py async API → Google NotebookLM
 *
 * The Python backend runs as a lightweight FastAPI on localhost:8310
 * and wraps the notebooklm-py async client.
 */

export type ArtifactType =
  | "audio"
  | "video"
  | "cinematic_video"
  | "infographic"
  | "report"
  | "slides"
  | "quiz"
  | "flashcards"
  | "mind_map"
  | "data_table";

export type AudioFormat = "deep-dive" | "brief" | "critique" | "debate";

export type VideoStyle =
  | "whiteboard"
  | "anime"
  | "kawaii"
  | "cinematic"
  | "minimal"
  | "cinematic-documentary"
  | "cinematic-explainer"
  | "cinematic-narrative"
  | "cinematic-educational";

export interface NotebookJob {
  id: string;
  type: ArtifactType;
  status: "pending" | "generating" | "downloading" | "done" | "error";
  progress: string;
  localPath: string;
  error: string;
  startedAt: number;
  completedAt: number;
}

export interface NotebookConfig {
  name: string;
  sources: NotebookSource[];
  language: string;
  audioFormat: AudioFormat;
  videoStyle: VideoStyle;
}

export interface NotebookSource {
  type: "url" | "youtube" | "file" | "text";
  value: string;
  title: string;
}

const API_BASE = "http://127.0.0.1:8310";

// ── API Calls ────────────────────────────────────────────────

async function apiCall(endpoint: string, body: Record<string, any>): Promise<Record<string, any>> {
  try {
    const resp = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const text = await resp.text();
      return { ok: false, error: `HTTP ${resp.status}: ${text}` };
    }
    return await resp.json();
  } catch (e) {
    return { ok: false, error: `Connection failed: ${e}. Is the NotebookLM server running on :8310?` };
  }
}

/** Check if the NotebookLM backend is running */
export async function checkStatus(): Promise<{ ok: boolean; mode: string; error?: string }> {
  try {
    const resp = await fetch(`${API_BASE}/status`);
    if (!resp.ok) return { ok: false, mode: "offline", error: "Server not responding" };
    return await resp.json();
  } catch {
    return { ok: false, mode: "offline", error: "NotebookLM server offline. Run: python notebook_server.py" };
  }
}

/** Create a notebook and add sources */
export async function createNotebook(config: NotebookConfig): Promise<Record<string, any>> {
  return apiCall("/notebook/create", {
    name: config.name,
    sources: config.sources,
    language: config.language,
  });
}

/** Generate an artifact from a notebook */
export async function generateArtifact(
  notebookId: string,
  notebookName: string,
  type: ArtifactType,
  options: Record<string, any> = {},
): Promise<Record<string, any>> {
  return apiCall("/artifact/generate", {
    notebook_id: notebookId,
    notebook_name: notebookName,
    type,
    ...options,
  });
}

/** Full pipeline: sources → notebook → artifacts → download */
export async function runPipeline(
  config: NotebookConfig,
  artifacts: ArtifactType[],
): Promise<Record<string, any>> {
  return apiCall("/pipeline/run", {
    name: config.name,
    sources: config.sources,
    language: config.language,
    audio_format: config.audioFormat,
    video_style: config.videoStyle,
    artifacts,
  });
}

/** List available notebooks */
export async function listNotebooks(): Promise<Record<string, any>> {
  try {
    const resp = await fetch(`${API_BASE}/notebooks`);
    return await resp.json();
  } catch {
    return { ok: false, notebooks: [] };
  }
}

/** Empire integration: generate article via NotebookLM instead of Ollama */
export async function generateEmpireArticle(
  theme: string,
  seedTitle: string,
  seedText: string,
  seedUrl: string,
): Promise<Record<string, any>> {
  return apiCall("/empire/article", {
    theme,
    seed_title: seedTitle,
    seed_text: seedText,
    seed_url: seedUrl,
  });
}

// ── Preset Pipelines ─────────────────────────────────────────

/** Quick podcast from URL/text */
export async function quickPodcast(
  source: string,
  sourceType: "url" | "youtube" | "text" = "url",
  format: AudioFormat = "deep-dive",
  language: string = "fr",
): Promise<Record<string, any>> {
  return apiCall("/quick/podcast", {
    source,
    source_type: sourceType,
    format,
    language,
  });
}

/** Quick video from URL/text */
export async function quickVideo(
  source: string,
  sourceType: "url" | "youtube" | "text" = "url",
  style: VideoStyle = "whiteboard",
): Promise<Record<string, any>> {
  return apiCall("/quick/video", {
    source,
    source_type: sourceType,
    style,
  });
}

/** Quick shorts (brief audio + cinematic video) */
export async function quickShorts(
  topic: string,
  content: string = "",
  style: VideoStyle = "cinematic-explainer",
): Promise<Record<string, any>> {
  return apiCall("/quick/shorts", {
    topic,
    content,
    style,
  });
}
