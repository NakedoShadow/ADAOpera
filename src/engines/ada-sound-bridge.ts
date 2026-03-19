/**
 * ADA Opera — Sound Integration Bridge
 * Connects ADA Opera to existing ADA sound programs:
 *
 * 1. Shadow Voice Commander (core/orchestration/shadow_voice_commander.py)
 *    → Wake word detection, STT, TTS with queen voice clone
 *
 * 2. SHO-CALL Voice Agent (core/orchestration/ada_voice_agent.py)
 *    → ElevenLabs, Minimax, phone calls
 *
 * 3. ADA Voice Router (core/orchestration/ada_voice_router.py)
 *    → Multi-modal routing, DEFCON-aware, La Voix de la Reine priority
 *
 * Communication: HTTP API + WebSocket for real-time audio streams
 * Protocol: JSON-RPC over WebSocket for low-latency voice commands
 */

import { getConductor } from "./audio-engine";
import { getRituala } from "./rituala-engine";
import { useOperaStore } from "../stores/opera-store";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface VoiceCommanderConfig {
  host: string;
  port: number;
  wsPort: number;
  wakeWord: string;
  sttModel: string;
  ttsEngine: "f5-tts" | "kokoro" | "edge-tts";
  voiceClone: string;
}

export interface VoiceAgentConfig {
  host: string;
  port: number;
  provider: "elevenlabs" | "minimax" | "vapi" | "retell";
  voiceId: string;
  language: string;
}

export interface VoiceRouterConfig {
  host: string;
  port: number;
  transport: "livekit" | "websocket" | "sip";
  defconLevel: number;
}

export interface BridgeState {
  connected: boolean;
  voiceCommander: "disconnected" | "listening" | "processing" | "speaking";
  voiceAgent: "idle" | "in-call" | "error";
  voiceRouter: "disconnected" | "routing" | "active";
  lastCommand: string;
  latency: number;
}

export interface AudioStreamMessage {
  type: "audio" | "command" | "status" | "metrics";
  payload: unknown;
  timestamp: number;
}

// ─── Default Configuration ──────────────────────────────────────────────────

const DEFAULT_COMMANDER_CONFIG: VoiceCommanderConfig = {
  host: "localhost",
  port: 8400,
  wsPort: 8401,
  wakeWord: "ada",
  sttModel: "faster-whisper-large-v3-turbo",
  ttsEngine: "kokoro",
  voiceClone: "queen_fr",
};

const DEFAULT_AGENT_CONFIG: VoiceAgentConfig = {
  host: "localhost",
  port: 8410,
  provider: "minimax",
  voiceId: "queen_voice",
  language: "fr-FR",
};

const DEFAULT_ROUTER_CONFIG: VoiceRouterConfig = {
  host: "localhost",
  port: 8420,
  transport: "websocket",
  defconLevel: 3,
};

// ─── ADA Sound Bridge ──────────────────────────────────────────────────────

export class ADASoundBridge {
  private ws: WebSocket | null = null;
  private state: BridgeState;
  private commanderConfig: VoiceCommanderConfig;
  private agentConfig: VoiceAgentConfig;
  private routerConfig: VoiceRouterConfig;
  private messageHandlers: Map<string, (msg: AudioStreamMessage) => void> = new Map();
  private reconnectTimer: number | null = null;

  constructor(
    commander?: Partial<VoiceCommanderConfig>,
    agent?: Partial<VoiceAgentConfig>,
    router?: Partial<VoiceRouterConfig>,
  ) {
    this.commanderConfig = { ...DEFAULT_COMMANDER_CONFIG, ...commander };
    this.agentConfig = { ...DEFAULT_AGENT_CONFIG, ...agent };
    this.routerConfig = { ...DEFAULT_ROUTER_CONFIG, ...router };

    this.state = {
      connected: false,
      voiceCommander: "disconnected",
      voiceAgent: "idle",
      voiceRouter: "disconnected",
      lastCommand: "",
      latency: 0,
    };
  }

  // ─── WebSocket Connection ───────────────────────────────────────────────

  connect(): void {
    const url = `ws://${this.commanderConfig.host}:${this.commanderConfig.wsPort}/opera`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.state.connected = true;
        this.state.voiceCommander = "listening";
        console.log("[ADA Bridge] Connected to Voice Commander");
        this.sendHandshake();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: AudioStreamMessage = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch {
          console.warn("[ADA Bridge] Invalid message format");
        }
      };

      this.ws.onclose = () => {
        this.state.connected = false;
        this.state.voiceCommander = "disconnected";
        console.log("[ADA Bridge] Disconnected — will reconnect in 5s");
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.state.connected = false;
      };
    } catch {
      console.warn("[ADA Bridge] Connection failed — Voice Commander not running");
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 5000);
  }

  private sendHandshake(): void {
    this.send({
      type: "command",
      payload: {
        action: "handshake",
        client: "ada-opera",
        version: "1.0.0",
        capabilities: [
          "audio-playback",
          "beat-sync",
          "crystalline-pipeline",
          "orchestra-control",
          "score-playback",
        ],
      },
      timestamp: Date.now(),
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this.state.connected = false;
    this.state.voiceCommander = "disconnected";
  }

  // ─── Message Handling ─────────────────────────────────────────────────

  private handleMessage(msg: AudioStreamMessage): void {
    this.state.latency = Date.now() - msg.timestamp;

    switch (msg.type) {
      case "command":
        this.handleVoiceCommand(msg.payload as VoiceCommand);
        break;

      case "audio":
        this.handleAudioStream(msg.payload as AudioPayload);
        break;

      case "status":
        this.handleStatusUpdate(msg.payload as StatusPayload);
        break;

      case "metrics":
        this.handleMetrics(msg.payload as MetricsPayload);
        break;
    }

    // Notify registered handlers
    this.messageHandlers.forEach((handler) => handler(msg));
  }

  private handleVoiceCommand(cmd: VoiceCommand): void {
    this.state.lastCommand = cmd.text;
    const conductor = getConductor();
    const rituala = getRituala();
    const store = useOperaStore.getState();

    // Voice command router — map spoken commands to Opera actions
    const text = cmd.text.toLowerCase();

    if (text.includes("play") || text.includes("joue")) {
      conductor.play();
      rituala.start();
      store.setPlaying(true);
    } else if (text.includes("stop") || text.includes("arrete")) {
      conductor.stop();
      rituala.stop();
      store.setPlaying(false);
    } else if (text.includes("pause")) {
      conductor.pause();
      rituala.pause();
      store.setPlaying(false);
    } else if (text.match(/tempo|bpm/)) {
      const bpmMatch = text.match(/(\d+)/);
      if (bpmMatch) {
        const bpm = parseInt(bpmMatch[1]);
        conductor.setBPM(bpm);
        rituala.setBPM(bpm);
        store.setBPM(bpm);
      }
    } else if (text.includes("orchestra") || text.includes("orchestre")) {
      store.setActiveView("orchestra");
    } else if (text.includes("studio")) {
      store.setActiveView("studio");
    } else if (text.includes("dj") || text.includes("platine")) {
      store.setActiveView("dj");
    } else if (text.includes("partition") || text.includes("score")) {
      store.setActiveView("partition");
    } else if (text.includes("spectrum") || text.includes("spectre")) {
      store.setActiveView("spectrum");
    } else if (text.includes("metronome")) {
      rituala.setMetronomeEnabled(true);
    } else if (text.includes("crystalline")) {
      if (text.includes("crystal")) {
        conductor.setCrystallineMode("CRYSTAL");
        store.setCrystallineMode("CRYSTAL");
      } else if (text.includes("studio")) {
        conductor.setCrystallineMode("STUDIO");
        store.setCrystallineMode("STUDIO");
      } else {
        conductor.setCrystallineMode("REALTIME");
        store.setCrystallineMode("REALTIME");
      }
    }
  }

  private handleAudioStream(payload: AudioPayload): void {
    // Incoming audio data from Voice Commander (e.g., for CRYSTALLINE processing)
    if (payload.format === "pcm_f32" && payload.samples) {
      console.log(`[ADA Bridge] Received audio: ${payload.samples.length} samples @ ${payload.sampleRate}Hz`);
    }
  }

  private handleStatusUpdate(payload: StatusPayload): void {
    if (payload.commander) this.state.voiceCommander = payload.commander;
    if (payload.agent) this.state.voiceAgent = payload.agent;
    if (payload.router) this.state.voiceRouter = payload.router;
  }

  private handleMetrics(payload: MetricsPayload): void {
    // Forward CRYSTALLINE metrics from Voice Commander
    if (payload.crystalline) {
      console.log(`[ADA Bridge] CRYSTALLINE metrics: SNR=${payload.crystalline.snr}dB, PESQ=${payload.crystalline.pesq}`);
    }
  }

  // ─── Send Messages ────────────────────────────────────────────────────

  send(msg: AudioStreamMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  sendAudio(samples: Float32Array, sampleRate: number): void {
    this.send({
      type: "audio",
      payload: {
        format: "pcm_f32",
        samples: Array.from(samples),
        sampleRate,
        channels: 1,
      },
      timestamp: Date.now(),
    });
  }

  // ─── Voice Agent Integration ──────────────────────────────────────────

  async requestTTS(text: string): Promise<void> {
    try {
      const response = await fetch(
        `http://${this.agentConfig.host}:${this.agentConfig.port}/tts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            voice_id: this.agentConfig.voiceId,
            language: this.agentConfig.language,
            provider: this.agentConfig.provider,
          }),
        },
      );
      if (response.ok) {
        const audioBuffer = await response.arrayBuffer();
        console.log(`[ADA Bridge] TTS response: ${audioBuffer.byteLength} bytes`);
      }
    } catch {
      console.warn("[ADA Bridge] TTS request failed — Voice Agent not running");
    }
  }

  // ─── Voice Router Integration ─────────────────────────────────────────

  async routeAudio(mode: "realtime" | "studio" | "crystal"): Promise<void> {
    try {
      await fetch(
        `http://${this.routerConfig.host}:${this.routerConfig.port}/route`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: "ada-opera",
            mode,
            transport: this.routerConfig.transport,
            defcon: this.routerConfig.defconLevel,
          }),
        },
      );
    } catch {
      console.warn("[ADA Bridge] Voice Router not available");
    }
  }

  // ─── Event Registration ───────────────────────────────────────────────

  onMessage(id: string, handler: (msg: AudioStreamMessage) => void): void {
    this.messageHandlers.set(id, handler);
  }

  offMessage(id: string): void {
    this.messageHandlers.delete(id);
  }

  // ─── State ────────────────────────────────────────────────────────────

  getState(): BridgeState {
    return { ...this.state };
  }

  isConnected(): boolean {
    return this.state.connected;
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────

  dispose(): void {
    this.disconnect();
    this.messageHandlers.clear();
  }
}

// ─── Internal Types ─────────────────────────────────────────────────────────

interface VoiceCommand {
  text: string;
  language: string;
  confidence: number;
}

interface AudioPayload {
  format: string;
  samples?: number[];
  sampleRate?: number;
  channels?: number;
}

interface StatusPayload {
  commander?: BridgeState["voiceCommander"];
  agent?: BridgeState["voiceAgent"];
  router?: BridgeState["voiceRouter"];
}

interface MetricsPayload {
  crystalline?: {
    snr: number;
    pesq: number;
    stoi: number;
    latency: number;
  };
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let bridgeInstance: ADASoundBridge | null = null;

export function getADABridge(): ADASoundBridge {
  if (!bridgeInstance) {
    bridgeInstance = new ADASoundBridge();
  }
  return bridgeInstance;
}
