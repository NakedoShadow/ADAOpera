/**
 * ADA Opera — Le Ballet de la Reine : Shadows Ballerinas
 * Inception-style spinning tops — each instrument/voice/sound = one totem
 * Canvas-rendered metallic tops that pulse, spin, vibrate and interact
 * FFT-driven: 8 frequency bands → 8 ballerinas dancing in harmony
 *
 * Crown toggle: click ♛ → FREE MODE (totems bounce freely with bubble shields)
 *               click ♛ again → FORMATION (totems return to circle)
 * Pong AI ball trail effect under each totem in free mode.
 * Tron laser traces: persistent neon lines that fade over 42s cooldown.
 */

import { useRef, useEffect, useCallback, useState } from "react";
import { getConductor } from "../../engines/audio-engine";
import { useT } from "../../lib/i18n";

// ─── Tron Laser Trace — persistent path segments ────────────────────────────

// 3 trace modes: stellaire (pong particles only), tron (13s fade), tron_mcp5 (immortal, 5 traces per totem)
type TraceMode = "stellaire" | "tron" | "tron_mcp5";

const TRACE_MODE_LABELS: Record<TraceMode, string> = {
  stellaire: "STELLAIRE",
  tron: "TRON",
  tron_mcp5: "TRON MCP 5",
};

const TRON_FADE_DURATION = 13; // seconds — Tron mode cooldown

interface TronSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  hue: number;
  totemId: number;   // which totem drew this
  energy: number;    // brightness at creation
  birth: number;     // timestamp (seconds)
  immortal: boolean; // MCP 5 mode — never fades
}

// ─── Spinning Top (Totem) Definition ─────────────────────────────────────────

interface Totem {
  id: number;
  label: string;
  x: number;
  y: number;
  vx: number;          // velocity for free mode
  vy: number;
  targetX: number;
  targetY: number;
  angle: number;
  spinSpeed: number;
  tilt: number;
  tiltPhase: number;
  energy: number;
  peakEnergy: number;
  hue: number;
  metallic: string;
  size: number;
  vibrateX: number;
  vibrateY: number;
  bubblePhase: number; // bubble shimmer phase
  prevX: number;       // previous frame position for Tron trace
  prevY: number;
}

// Trail particle (Pong AI style)
interface TrailParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
}

const BAND_LABELS = [
  "Sub Bass", "Bass", "Low Mid", "Mid",
  "Upper Mid", "Presence", "Brilliance", "Air",
];

const METALLIC_COLORS = [
  "#C0C0C0", "#DAA520", "#B8860B", "#A0A0C0",
  "#CD7F32", "#E5C100", "#808090", "#B0C4DE",
];

const BAND_HUES = [20, 35, 60, 180, 220, 260, 290, 320];

const TRAIL_COLORS = ["#0055FF", "#8B5CF6", "#3B82F6", "#A78BFA", "#A855F7"];

interface BalletVisualizerProps {
  width?: number;
  height?: number;
  fullscreen?: boolean;
  onClose?: () => void;
}

export function BalletVisualizer({ width = 900, height = 500, fullscreen = false, onClose }: BalletVisualizerProps) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const totemsRef = useRef<Totem[]>([]);
  const particlesRef = useRef<TrailParticle[]>([]);
  const tronRef = useRef<TronSegment[]>([]);
  const tronTimeRef = useRef(0);
  const freeRef = useRef(false);
  const traceModeRef = useRef<TraceMode>("stellaire");
  const [freeMode, setFreeMode] = useState(false);
  const [traceMode, setTraceMode] = useState<TraceMode>("stellaire");
  const [hovered, setHovered] = useState<number>(-1);
  const lastTimeRef = useRef(performance.now());

  // Translated labels for canvas rendering (updated via ref to avoid draw loop deps)
  const bandLabelsRef = useRef(BAND_LABELS.map((_, i) => t(`band_${BAND_LABELS[i].toLowerCase().replace(/ /g, "_")}`)));
  const traceLabelRef = useRef({
    stellaire: t("ballet_stellaire"),
    tron: t("ballet_tron"),
    tron_mcp5: t("ballet_tron_mcp5"),
  });
  const freeLabelRef = useRef({ free_stellaire: t("ballet_free_stellaire"), free_tron: t("ballet_free_tron"), free_tron_mcp5: t("ballet_free_tron_mcp5") });
  const badgeLabelRef = useRef(t("ballet_badge"));

  // Keep refs in sync with language changes
  useEffect(() => {
    bandLabelsRef.current = BAND_LABELS.map((_, i) => t(`band_${BAND_LABELS[i].toLowerCase().replace(/ /g, "_")}`));
    traceLabelRef.current = { stellaire: t("ballet_stellaire"), tron: t("ballet_tron"), tron_mcp5: t("ballet_tron_mcp5") };
    freeLabelRef.current = { free_stellaire: t("ballet_free_stellaire"), free_tron: t("ballet_free_tron"), free_tron_mcp5: t("ballet_free_tron_mcp5") };
    badgeLabelRef.current = t("ballet_badge");
  }, [t]);

  const rw = fullscreen ? window.innerWidth : width;
  const rh = fullscreen ? window.innerHeight : height;

  // Crown hit zone (center)
  const crownRef = useRef({ x: rw / 2, y: rh / 2, r: 30 });

  // ESC to exit fullscreen
  useEffect(() => {
    if (!fullscreen || !onClose) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [fullscreen, onClose]);

  // Initialize totems
  useEffect(() => {
    const totems: Totem[] = [];
    const cx = rw / 2;
    const cy = rh / 2;
    const radius = Math.min(rw, rh) * 0.32;
    crownRef.current = { x: cx, y: cy, r: 30 };

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * radius;
      const y = cy + Math.sin(a) * radius;
      totems.push({
        id: i,
        label: bandLabelsRef.current[i] || BAND_LABELS[i],
        x, y,
        vx: 0, vy: 0,
        targetX: x, targetY: y,
        angle: Math.random() * Math.PI * 2,
        spinSpeed: 0.02 + Math.random() * 0.02,
        tilt: 0,
        tiltPhase: Math.random() * Math.PI * 2,
        energy: 0,
        peakEnergy: 0,
        hue: BAND_HUES[i],
        metallic: METALLIC_COLORS[i],
        size: 1,
        vibrateX: 0,
        vibrateY: 0,
        bubblePhase: Math.random() * Math.PI * 2,
        prevX: x,
        prevY: y,
      });
    }
    totemsRef.current = totems;
    particlesRef.current = [];
    tronRef.current = [];
    tronTimeRef.current = 0;
  }, [rw, rh]);

  // Toggle free mode
  const toggleFreeMode = useCallback(() => {
    const next = !freeRef.current;
    freeRef.current = next;
    setFreeMode(next);

    if (next) {
      // Launch totems outward with random velocities
      for (const t of totemsRef.current) {
        const cx = rw / 2;
        const cy = rh / 2;
        const dx = t.x - cx;
        const dy = t.y - cy;
        const dist = Math.hypot(dx, dy) || 1;
        t.vx = (dx / dist) * (80 + Math.random() * 120) + (Math.random() - 0.5) * 60;
        t.vy = (dy / dist) * (80 + Math.random() * 120) + (Math.random() - 0.5) * 60;
      }
    } else {
      // Reset velocities — totems will glide back to formation
      for (const t of totemsRef.current) {
        t.vx = 0;
        t.vy = 0;
      }
      particlesRef.current = [];
      // Clear Tron traces on return to formation
      tronRef.current = [];
    }
  }, [rw, rh]);

  // ─── Particle System (Pong AI style) ────────────────────────────────────

  const emitTrail = useCallback((x: number, y: number, energy: number, hue: number) => {
    const particles = particlesRef.current;
    if (particles.length > 300) return; // cap

    const speed = 10 + energy * 40;
    const angle = Math.random() * Math.PI * 2;
    const sr = energy;
    const colors = sr > 0.6
      ? ["#A855F7", "#fff"]
      : sr > 0.3
        ? [TRAIL_COLORS[1], TRAIL_COLORS[0]]
        : [`hsl(${hue},70%,50%)`, "rgba(0,85,255,0.5)"];

    particles.push({
      x, y,
      vx: Math.cos(angle) * speed * (0.5 + Math.random() * 0.8),
      vy: Math.sin(angle) * speed * (0.5 + Math.random() * 0.8),
      radius: 1.5 + sr * 2.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 0.3 + sr * 0.4,
      maxLife: 0.3 + sr * 0.4,
    });
  }, []);

  // ─── Draw Loop ────────────────────────────────────────────────────────────

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const now = performance.now();
    const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05); // cap at 50ms
    lastTimeRef.current = now;

    const conductor = getConductor();
    const fftData = conductor.getFFTData();
    const totems = totemsRef.current;
    const particles = particlesRef.current;
    const free = freeRef.current;
    const tMode = traceModeRef.current;
    const tronSegs = tronRef.current;
    const cx = rw / 2;
    const cy = rh / 2;

    // Advance tron clock
    tronTimeRef.current += dt;
    const tronNow = tronTimeRef.current;

    const bandEnergies = analyzeBands(fftData);

    // ─── Clear ───
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, rw, rh);

    // ─── Subtle floor ───
    const floorY = rh * 0.72;
    const floorGrad = ctx.createLinearGradient(0, floorY, 0, rh);
    floorGrad.addColorStop(0, "rgba(255,255,255,0.01)");
    floorGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, floorY, rw, rh - floorY);

    // ─── Render Tron laser traces (batched for performance) ───
    if (tMode !== "stellaire" && tronSegs.length > 0) {
      // Prune expired segments (tron mode only — mcp5 are immortal)
      if (tMode === "tron") {
        // Batch prune: find first valid index instead of splicing one by one
        let firstValid = 0;
        while (firstValid < tronSegs.length &&
               !tronSegs[firstValid].immortal &&
               (tronNow - tronSegs[firstValid].birth) > TRON_FADE_DURATION) {
          firstValid++;
        }
        if (firstValid > 0) tronSegs.splice(0, firstValid);
      }

      // Batch render: group segments by hue into single paths
      // Use 4 alpha buckets to avoid per-segment state changes
      const ALPHA_BUCKETS = 4;
      // Map: hue → bucket → segment list
      const batches = new Map<number, { alpha: number; segs: TronSegment[] }[]>();

      for (const seg of tronSegs) {
        let alpha: number;
        if (seg.immortal) {
          alpha = 0.7;
        } else {
          const age = tronNow - seg.birth;
          alpha = Math.max(0, 1 - age / TRON_FADE_DURATION) * 0.6;
        }
        if (alpha <= 0.02) continue;

        // Quantize alpha to bucket
        const bucket = Math.min(ALPHA_BUCKETS - 1, Math.floor(alpha * ALPHA_BUCKETS));

        if (!batches.has(seg.hue)) {
          batches.set(seg.hue, Array.from({ length: ALPHA_BUCKETS }, (_, i) => ({
            alpha: (i + 0.5) / ALPHA_BUCKETS,
            segs: [],
          })));
        }
        batches.get(seg.hue)![bucket].segs.push(seg);
      }

      // Draw batched — 2 passes per hue/bucket (glow + core) but single path each
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (const [hue, buckets] of batches) {
        for (const batch of buckets) {
          if (batch.segs.length === 0) continue;

          // Glow pass (wider, colored, no shadowBlur for perf)
          ctx.globalAlpha = batch.alpha * 0.5;
          ctx.strokeStyle = `hsl(${hue},80%,55%)`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          for (const s of batch.segs) {
            ctx.moveTo(s.x1, s.y1);
            ctx.lineTo(s.x2, s.y2);
          }
          ctx.stroke();

          // Core pass (thin, bright)
          ctx.globalAlpha = batch.alpha * 0.9;
          ctx.strokeStyle = `hsl(${hue},60%,80%)`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (const s of batch.segs) {
            ctx.moveTo(s.x1, s.y1);
            ctx.lineTo(s.x2, s.y2);
          }
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1;
      ctx.lineCap = "butt";
    }

    // ─── Update & render particles (behind totems) ───
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      const alpha = (p.life / p.maxLife) * 0.8;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * (p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ─── Update totems ───
    const totalEnergy = bandEnergies.reduce((a, b) => a + b, 0) / 8;
    const BUBBLE_R = 40; // collision radius for bubble

    for (let i = 0; i < totems.length; i++) {
      const t = totems[i];
      const rawEnergy = bandEnergies[i];

      // Smooth energy
      t.energy = t.energy * 0.7 + rawEnergy * 0.3;
      t.peakEnergy = Math.max(t.peakEnergy * 0.995, t.energy);

      // Spin
      const baseSpeed = 0.02 + i * 0.005;
      t.spinSpeed = baseSpeed + t.energy * 0.15;
      t.angle += t.spinSpeed;

      // Wobble
      t.tiltPhase += 0.03 + t.energy * 0.05;
      t.tilt = t.energy * 0.25 * Math.sin(t.tiltPhase);

      // Size pulse
      t.size = 1 + t.energy * 0.3;

      // Bubble shimmer
      t.bubblePhase += 0.04;

      if (free) {
        // ─── FREE MODE: physics-based movement ───

        // Music-reactive force: energy pushes in current velocity direction
        if (t.energy > 0.2) {
          const speed = Math.hypot(t.vx, t.vy) || 1;
          t.vx += (t.vx / speed) * t.energy * 200 * dt;
          t.vy += (t.vy / speed) * t.energy * 200 * dt;
        }

        // Random drift from music
        t.vx += (Math.random() - 0.5) * t.energy * 80 * dt;
        t.vy += (Math.random() - 0.5) * t.energy * 80 * dt;

        // Friction
        t.vx *= 0.995;
        t.vy *= 0.995;

        // Speed cap
        const maxSpeed = 250;
        const spd = Math.hypot(t.vx, t.vy);
        if (spd > maxSpeed) {
          t.vx = (t.vx / spd) * maxSpeed;
          t.vy = (t.vy / spd) * maxSpeed;
        }

        // Move
        t.x += t.vx * dt;
        t.y += t.vy * dt;

        // ─── Wall bounce ───
        const margin = BUBBLE_R + 5;
        if (t.x < margin) { t.x = margin; t.vx = Math.abs(t.vx) * 0.85; emitBounceParticles(t, particles); }
        if (t.x > rw - margin) { t.x = rw - margin; t.vx = -Math.abs(t.vx) * 0.85; emitBounceParticles(t, particles); }
        if (t.y < margin) { t.y = margin; t.vy = Math.abs(t.vy) * 0.85; emitBounceParticles(t, particles); }
        if (t.y > rh - margin) { t.y = rh - margin; t.vy = -Math.abs(t.vy) * 0.85; emitBounceParticles(t, particles); }

        // ─── Totem-to-totem collision (bubble bounce) ───
        for (let j = i + 1; j < totems.length; j++) {
          const o = totems[j];
          const dx = o.x - t.x;
          const dy = o.y - t.y;
          const dist = Math.hypot(dx, dy);
          const minDist = BUBBLE_R * 2;

          if (dist < minDist && dist > 0) {
            // Elastic collision
            const nx = dx / dist;
            const ny = dy / dist;
            const relVx = t.vx - o.vx;
            const relVy = t.vy - o.vy;
            const relDot = relVx * nx + relVy * ny;

            if (relDot > 0) {
              t.vx -= relDot * nx;
              t.vy -= relDot * ny;
              o.vx += relDot * nx;
              o.vy += relDot * ny;
            }

            // Separate overlapping
            const overlap = (minDist - dist) / 2 + 1;
            t.x -= nx * overlap;
            t.y -= ny * overlap;
            o.x += nx * overlap;
            o.y += ny * overlap;

            // Collision sparks
            const midX = (t.x + o.x) / 2;
            const midY = (t.y + o.y) / 2;
            for (let s = 0; s < 6; s++) {
              const sa = Math.random() * Math.PI * 2;
              const ss = 40 + Math.random() * 80;
              if (particles.length < 300) {
                particles.push({
                  x: midX, y: midY,
                  vx: Math.cos(sa) * ss,
                  vy: Math.sin(sa) * ss,
                  radius: 1.5 + Math.random() * 2,
                  color: TRAIL_COLORS[Math.floor(Math.random() * TRAIL_COLORS.length)],
                  life: 0.4 + Math.random() * 0.3,
                  maxLife: 0.4 + Math.random() * 0.3,
                });
              }
            }
          }
        }

        // ─── Emit trail particles (Pong AI style) ───
        if (Math.random() < 0.6 + t.energy * 0.4) {
          emitTrail(t.x, t.y + 15, t.energy, t.hue);
        }

        // ─── Record Tron laser trace segment ───
        if (tMode !== "stellaire") {
          const moveDist = Math.hypot(t.x - t.prevX, t.y - t.prevY);
          if (moveDist > 5) { // minimum 5px between segments for performance
            const isImmortal = tMode === "tron_mcp5";

            // MCP 5: global cap at 8000 total segments for performance
            if (isImmortal && tronSegs.length > 8000) {
              // Trim oldest 20% in one splice
              tronSegs.splice(0, Math.floor(tronSegs.length * 0.2));
            }

            tronSegs.push({
              x1: t.prevX, y1: t.prevY,
              x2: t.x, y2: t.y,
              hue: t.hue,
              totemId: t.id,
              energy: t.energy,
              birth: tronNow,
              immortal: isImmortal,
            });
          }
        }
        t.prevX = t.x;
        t.prevY = t.y;

      } else {
        // ─── FORMATION MODE: glide to target ───
        t.vibrateX = (Math.random() - 0.5) * t.energy * 6;
        t.vibrateY = (Math.random() - 0.5) * t.energy * 4;

        const radius = Math.min(rw, rh) * (0.32 - totalEnergy * 0.08);
        const circleAngle = (i / 8) * Math.PI * 2 - Math.PI / 2;
        t.targetX = cx + Math.cos(circleAngle) * radius;
        t.targetY = cy + Math.sin(circleAngle) * radius;

        t.x += (t.targetX - t.x) * 0.05 + t.vibrateX;
        t.y += (t.targetY - t.y) * 0.05 + t.vibrateY;
        t.prevX = t.x;
        t.prevY = t.y;
      }

      // ─── Draw Pong-style ball glow under totem (free mode) ───
      if (free) {
        const ballSpeed = Math.hypot(t.vx, t.vy) / 250; // 0..1
        const gc = ballSpeed > 0.7 ? "#06FFA5" : ballSpeed > 0.4 ? "#8B5CF6" : "#0055FF";

        // Glow shadow
        ctx.shadowColor = gc;
        ctx.shadowBlur = 20 + ballSpeed * 25;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(t.x, t.y + 18, 4 + t.energy * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Radial halo
        const halo = ctx.createRadialGradient(t.x, t.y + 18, 0, t.x, t.y + 18, 8 + t.energy * 4);
        halo.addColorStop(0, "rgba(255,255,255,0.7)");
        halo.addColorStop(0.5, "rgba(255,255,255,0.2)");
        halo.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(t.x, t.y + 18, 10 + t.energy * 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // ─── Draw bubble shield (free mode) ───
      if (free) {
        drawBubble(ctx, t, BUBBLE_R);
      }

      // ─── Draw the spinning top ───
      drawTotem(ctx, t, i === hovered);
    }

    // ─── Center crown (clickable) ───
    const crownR = 24 + totalEnergy * 12;
    crownRef.current = { x: cx, y: cy, r: crownR + 10 };

    // Crown glow
    const crownGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, crownR * 2.5);
    crownGlow.addColorStop(0, `rgba(124,58,237,${free ? 0.25 : 0.1 + totalEnergy * 0.12})`);
    crownGlow.addColorStop(0.5, `rgba(0,85,255,${free ? 0.12 : totalEnergy * 0.06})`);
    crownGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = crownGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, crownR * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Crown symbol
    ctx.fillStyle = free
      ? `rgba(168,85,247,${0.5 + totalEnergy * 0.4})`
      : `rgba(255,255,255,${0.12 + totalEnergy * 0.2})`;
    ctx.font = `${crownR}px Playfair Display, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("♛", cx, cy);

    // Free mode indicator + trace mode
    if (free) {
      ctx.fillStyle = "rgba(168,85,247,0.4)";
      ctx.font = "9px JetBrains Mono, monospace";
      const freeKey = `free_${tMode}` as keyof typeof freeLabelRef.current;
      ctx.fillText(freeLabelRef.current[freeKey], cx, cy + crownR + 8);
    }

    // ─── Title ───
    if (!fullscreen) {
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.font = "11px JetBrains Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillText(badgeLabelRef.current, rw / 2, rh - 12);
    }

    animRef.current = requestAnimationFrame(draw);
  }, [rw, rh, hovered, fullscreen, emitTrail]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  // ─── Click handler: crown toggle or label ───
  const handleClick = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Check crown hit
    const c = crownRef.current;
    if (Math.hypot(mx - c.x, my - c.y) < c.r) {
      e.stopPropagation();
      toggleFreeMode();
    }
  }, [toggleFreeMode]);

  // Mouse hover for labels
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Crown cursor
    const c = crownRef.current;
    const onCrown = Math.hypot(mx - c.x, my - c.y) < c.r;
    canvas.style.cursor = onCrown ? "pointer" : "default";

    let closest = -1;
    let minDist = 50;
    for (const t of totemsRef.current) {
      const d = Math.hypot(mx - t.x, my - t.y);
      if (d < minDist) {
        minDist = d;
        closest = t.id;
      }
    }
    setHovered(closest);
  }, []);

  const containerClass = fullscreen ? "ballet-fullscreen" : "ballet-windowed";

  return (
    <div className={containerClass} onClick={fullscreen ? onClose : undefined}>
      {fullscreen && (
        <div className="ballet-fs-close" title="ESC to close">×</div>
      )}
      <canvas
        ref={canvasRef}
        width={rw}
        height={rh}
        style={{ cursor: "default", display: "block" }}
        onMouseMove={handleMouseMove}
        onClick={(e) => { if (fullscreen) e.stopPropagation(); handleClick(e); }}
      />
      {/* Trace mode selector (visible in free mode) */}
      {freeMode && (
        <div className={`ballet-trace-selector ${fullscreen ? "ballet-trace-fs" : ""}`}>
          {(["stellaire", "tron", "tron_mcp5"] as const).map((m) => (
            <button
              key={m}
              className={`ballet-trace-btn ${traceMode === m ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                traceModeRef.current = m;
                setTraceMode(m);
                // Clear traces when switching mode
                tronRef.current = [];
              }}
            >
              {traceLabelRef.current[m]}
            </button>
          ))}
        </div>
      )}
      {fullscreen && (
        <div className="ballet-fs-badge">
          {badgeLabelRef.current}
          {freeMode && ` — ${traceLabelRef.current[traceMode]}`}
        </div>
      )}
    </div>
  );
}

// ─── Emit bounce particles on wall hit ───────────────────────────────────────

function emitBounceParticles(t: { x: number; y: number; hue: number }, particles: TrailParticle[]) {
  for (let i = 0; i < 8 && particles.length < 300; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 30 + Math.random() * 60;
    particles.push({
      x: t.x, y: t.y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      radius: 1.5 + Math.random() * 2,
      color: `hsl(${t.hue},80%,60%)`,
      life: 0.3 + Math.random() * 0.3,
      maxLife: 0.3 + Math.random() * 0.3,
    });
  }
}

// ─── Draw Bubble Shield ──────────────────────────────────────────────────────

function drawBubble(ctx: CanvasRenderingContext2D, t: Totem, radius: number) {
  const r = radius + 2 + t.energy * 4;
  const shimmer = 0.04 + Math.sin(t.bubblePhase) * 0.02 + t.energy * 0.06;

  // Outer bubble ring
  ctx.beginPath();
  ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
  ctx.strokeStyle = `hsla(${t.hue},60%,70%,${shimmer + 0.08})`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Inner gradient fill (very subtle)
  const bg = ctx.createRadialGradient(t.x, t.y, r * 0.6, t.x, t.y, r);
  bg.addColorStop(0, "rgba(0,0,0,0)");
  bg.addColorStop(0.8, `hsla(${t.hue},50%,60%,${shimmer * 0.3})`);
  bg.addColorStop(1, `hsla(${t.hue},60%,80%,${shimmer * 0.5})`);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
  ctx.fill();

  // Specular highlight (top-left)
  const specX = t.x - r * 0.3;
  const specY = t.y - r * 0.3;
  const spec = ctx.createRadialGradient(specX, specY, 0, specX, specY, r * 0.4);
  spec.addColorStop(0, `rgba(255,255,255,${0.08 + t.energy * 0.08})`);
  spec.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = spec;
  ctx.beginPath();
  ctx.arc(specX, specY, r * 0.4, 0, Math.PI * 2);
  ctx.fill();
}

// ─── FFT → 8 Frequency Bands ─────────────────────────────────────────────────

function analyzeBands(fftData: Float32Array): number[] {
  const bands = new Array(8).fill(0);
  if (!fftData || fftData.length === 0) return bands;

  const binCount = fftData.length;
  const boundaries = [0, 4, 12, 23, 93, 186, 279, 558, binCount];

  for (let b = 0; b < 8; b++) {
    const start = Math.min(boundaries[b], binCount - 1);
    const end = Math.min(boundaries[b + 1], binCount);
    let sum = 0;
    let count = 0;
    for (let i = start; i < end; i++) {
      const val = (fftData[i] + 100) / 100;
      sum += Math.max(0, val);
      count++;
    }
    bands[b] = count > 0 ? sum / count : 0;
  }

  return bands;
}

// ─── Draw a Single Spinning Top (Inception Totem) ────────────────────────────

function drawTotem(ctx: CanvasRenderingContext2D, t: Totem, showLabel: boolean) {
  const baseRadius = 18 * t.size;
  const stemHeight = baseRadius * 2.8;
  const discWidth = baseRadius * 1.6;

  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate(t.tilt);

  // Shadow on floor
  ctx.beginPath();
  ctx.ellipse(0, stemHeight * 0.4, baseRadius * 0.8 * t.size, 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${hexToRgb(t.metallic)},${0.1 + t.energy * 0.15})`;
  ctx.fill();

  // Glow aura
  if (t.energy > 0.1) {
    const aura = ctx.createRadialGradient(0, 0, baseRadius * 0.3, 0, 0, baseRadius * 2.5);
    aura.addColorStop(0, `hsla(${t.hue},80%,60%,${t.energy * 0.25})`);
    aura.addColorStop(0.5, `hsla(${t.hue},70%,40%,${t.energy * 0.1})`);
    aura.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, baseRadius * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Stem (bottom spike)
  const stemGrad = ctx.createLinearGradient(0, 0, 0, stemHeight * 0.4);
  stemGrad.addColorStop(0, t.metallic);
  stemGrad.addColorStop(1, darken(t.metallic, 0.5));
  ctx.fillStyle = stemGrad;
  ctx.beginPath();
  ctx.moveTo(-2, 0);
  ctx.lineTo(0, stemHeight * 0.4);
  ctx.lineTo(2, 0);
  ctx.fill();

  // Main body disc
  const discSquish = 0.3 + 0.1 * Math.sin(t.angle * 2);
  const discGrad = ctx.createLinearGradient(-discWidth, 0, discWidth, 0);
  discGrad.addColorStop(0, darken(t.metallic, 0.3));
  discGrad.addColorStop(0.3, lighten(t.metallic, 0.4));
  discGrad.addColorStop(0.5, t.metallic);
  discGrad.addColorStop(0.7, lighten(t.metallic, 0.3));
  discGrad.addColorStop(1, darken(t.metallic, 0.4));
  ctx.fillStyle = discGrad;
  ctx.beginPath();
  ctx.ellipse(0, -stemHeight * 0.15, discWidth, discWidth * discSquish, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(255,255,255,${0.15 + t.energy * 0.2})`;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Spinning grooves
  ctx.save();
  ctx.translate(0, -stemHeight * 0.15);
  for (let g = 0; g < 6; g++) {
    const ga = t.angle + (g / 6) * Math.PI * 2;
    const gx = Math.cos(ga) * discWidth * 0.7;
    const gy = Math.sin(ga) * discWidth * discSquish * 0.7;
    ctx.beginPath();
    ctx.arc(gx, gy, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.08 + t.energy * 0.1})`;
    ctx.fill();
  }
  ctx.restore();

  // Upper cone
  const coneGrad = ctx.createLinearGradient(0, -stemHeight * 0.15, 0, -stemHeight * 0.7);
  coneGrad.addColorStop(0, t.metallic);
  coneGrad.addColorStop(0.5, lighten(t.metallic, 0.2));
  coneGrad.addColorStop(1, darken(t.metallic, 0.2));
  ctx.fillStyle = coneGrad;
  ctx.beginPath();
  ctx.moveTo(-discWidth * 0.6, -stemHeight * 0.15);
  ctx.quadraticCurveTo(0, -stemHeight * 0.3, 0, -stemHeight * 0.7);
  ctx.quadraticCurveTo(0, -stemHeight * 0.3, discWidth * 0.6, -stemHeight * 0.15);
  ctx.fill();

  // Top nub
  ctx.beginPath();
  ctx.arc(0, -stemHeight * 0.7, 3 * t.size, 0, Math.PI * 2);
  const nubGrad = ctx.createRadialGradient(0, -stemHeight * 0.7, 0, 0, -stemHeight * 0.7, 3 * t.size);
  nubGrad.addColorStop(0, lighten(t.metallic, 0.5));
  nubGrad.addColorStop(1, t.metallic);
  ctx.fillStyle = nubGrad;
  ctx.fill();

  // Energy pulse ring
  if (t.energy > 0.15) {
    ctx.beginPath();
    ctx.arc(0, -stemHeight * 0.15, discWidth + 4 + t.energy * 8, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${t.hue},80%,60%,${t.energy * 0.4})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Peak energy sparks
  if (t.peakEnergy > 0.5) {
    for (let s = 0; s < 3; s++) {
      const sa = t.angle * 3 + s * (Math.PI * 2 / 3);
      const sr = discWidth * (1.2 + t.peakEnergy * 0.8);
      const sx = Math.cos(sa) * sr;
      const sy = Math.sin(sa) * sr * discSquish - stemHeight * 0.15;
      ctx.beginPath();
      ctx.arc(sx, sy, 1 + t.peakEnergy * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${t.hue},90%,70%,${t.peakEnergy * 0.6})`;
      ctx.fill();
    }
  }

  // Label
  if (showLabel) {
    ctx.fillStyle = `hsla(${t.hue},60%,70%,0.9)`;
    ctx.font = "10px JetBrains Mono, monospace";
    ctx.textAlign = "center";
    ctx.fillText(t.label.toUpperCase(), 0, stemHeight * 0.55);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText(`${(t.energy * 100).toFixed(0)}%`, 0, stemHeight * 0.55 + 14);
  }

  ctx.restore();
}

// ─── Color Utilities ─────────────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function lighten(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.min(255, Math.round(r + (255 - r) * amount));
  const lg = Math.min(255, Math.round(g + (255 - g) * amount));
  const lb = Math.min(255, Math.round(b + (255 - b) * amount));
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}

function darken(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const dr = Math.round(r * (1 - amount));
  const dg = Math.round(g * (1 - amount));
  const db = Math.round(b * (1 - amount));
  return `#${dr.toString(16).padStart(2, "0")}${dg.toString(16).padStart(2, "0")}${db.toString(16).padStart(2, "0")}`;
}
