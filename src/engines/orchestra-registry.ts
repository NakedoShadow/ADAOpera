/**
 * ADA Opera — Orchestra Registry
 * One instrument = One SHO (Shadow Orchestration Handler)
 *
 * Vivaldi is the musicians, the musicians are Vivaldi.
 * The Queen's Orchestra: 32 instruments across 4 sections
 */

import { InstrumentFamily } from "./audio-engine";

export interface InstrumentDef {
  id: string;
  name: string;
  nameFr: string;
  family: InstrumentFamily;
  synthType: string;
  range: { low: string; high: string };
  defaultVolume: number;
  defaultPan: number;
  oscillatorType: string;
  section: "strings" | "woodwinds" | "brass" | "percussion" | "keyboard" | "continuo";
  seatPosition: number; // 0-100, left to right in orchestra layout
}

// ─── Complete Orchestra ──────────────────────────────────────────────────────

export const ORCHESTRA_REGISTRY: InstrumentDef[] = [
  // ═══ STRINGS (Cordes) ═══════════════════════════════════════════════════
  { id: "violin-1", name: "Violin I (Konzertmeister)", nameFr: "Violon I", family: "strings", synthType: "poly", range: { low: "G3", high: "E7" }, defaultVolume: -6, defaultPan: -0.6, oscillatorType: "sawtooth", section: "strings", seatPosition: 10 },
  { id: "violin-2", name: "Violin II", nameFr: "Violon II", family: "strings", synthType: "poly", range: { low: "G3", high: "E7" }, defaultVolume: -8, defaultPan: -0.3, oscillatorType: "sawtooth", section: "strings", seatPosition: 20 },
  { id: "viola", name: "Viola", nameFr: "Alto", family: "strings", synthType: "poly", range: { low: "C3", high: "E6" }, defaultVolume: -8, defaultPan: 0.3, oscillatorType: "sawtooth", section: "strings", seatPosition: 60 },
  { id: "cello", name: "Cello", nameFr: "Violoncelle", family: "strings", synthType: "poly", range: { low: "C2", high: "C6" }, defaultVolume: -7, defaultPan: 0.5, oscillatorType: "sawtooth", section: "strings", seatPosition: 70 },
  { id: "contrabass", name: "Double Bass", nameFr: "Contrebasse", family: "strings", synthType: "mono", range: { low: "E1", high: "G4" }, defaultVolume: -8, defaultPan: 0.7, oscillatorType: "sawtooth", section: "strings", seatPosition: 80 },
  { id: "harp", name: "Harp", nameFr: "Harpe", family: "strings", synthType: "poly", range: { low: "C1", high: "G#7" }, defaultVolume: -10, defaultPan: -0.7, oscillatorType: "triangle", section: "strings", seatPosition: 5 },

  // ═══ WOODWINDS (Bois) ══════════════════════════════════════════════════
  { id: "piccolo", name: "Piccolo", nameFr: "Piccolo", family: "woodwinds", synthType: "mono", range: { low: "D5", high: "C8" }, defaultVolume: -12, defaultPan: -0.4, oscillatorType: "sine", section: "woodwinds", seatPosition: 30 },
  { id: "flute", name: "Flute", nameFr: "Flute", family: "woodwinds", synthType: "mono", range: { low: "C4", high: "D7" }, defaultVolume: -10, defaultPan: -0.3, oscillatorType: "sine", section: "woodwinds", seatPosition: 32 },
  { id: "oboe", name: "Oboe", nameFr: "Hautbois", family: "woodwinds", synthType: "mono", range: { low: "Bb3", high: "A6" }, defaultVolume: -10, defaultPan: -0.1, oscillatorType: "sawtooth", section: "woodwinds", seatPosition: 35 },
  { id: "english-horn", name: "English Horn", nameFr: "Cor Anglais", family: "woodwinds", synthType: "mono", range: { low: "E3", high: "C6" }, defaultVolume: -12, defaultPan: 0.0, oscillatorType: "sawtooth", section: "woodwinds", seatPosition: 37 },
  { id: "clarinet", name: "Clarinet", nameFr: "Clarinette", family: "woodwinds", synthType: "mono", range: { low: "D3", high: "Bb6" }, defaultVolume: -10, defaultPan: 0.1, oscillatorType: "square", section: "woodwinds", seatPosition: 40 },
  { id: "bass-clarinet", name: "Bass Clarinet", nameFr: "Clarinette Basse", family: "woodwinds", synthType: "mono", range: { low: "Bb1", high: "G5" }, defaultVolume: -12, defaultPan: 0.15, oscillatorType: "square", section: "woodwinds", seatPosition: 42 },
  { id: "bassoon", name: "Bassoon", nameFr: "Basson", family: "woodwinds", synthType: "mono", range: { low: "Bb1", high: "Eb5" }, defaultVolume: -10, defaultPan: 0.2, oscillatorType: "sawtooth", section: "woodwinds", seatPosition: 45 },
  { id: "contrabassoon", name: "Contrabassoon", nameFr: "Contrebasson", family: "woodwinds", synthType: "mono", range: { low: "Bb0", high: "Bb3" }, defaultVolume: -12, defaultPan: 0.25, oscillatorType: "sawtooth", section: "woodwinds", seatPosition: 47 },

  // ═══ BRASS (Cuivres) ═══════════════════════════════════════════════════
  { id: "french-horn", name: "French Horn", nameFr: "Cor", family: "brass", synthType: "mono", range: { low: "B1", high: "F5" }, defaultVolume: -10, defaultPan: 0.4, oscillatorType: "sawtooth", section: "brass", seatPosition: 50 },
  { id: "trumpet", name: "Trumpet", nameFr: "Trompette", family: "brass", synthType: "mono", range: { low: "F#3", high: "D6" }, defaultVolume: -10, defaultPan: -0.2, oscillatorType: "sawtooth", section: "brass", seatPosition: 52 },
  { id: "cornet", name: "Cornet", nameFr: "Cornet a Pistons", family: "brass", synthType: "mono", range: { low: "F#3", high: "C6" }, defaultVolume: -12, defaultPan: -0.15, oscillatorType: "sawtooth", section: "brass", seatPosition: 53 },
  { id: "trombone", name: "Trombone", nameFr: "Trombone", family: "brass", synthType: "mono", range: { low: "E2", high: "Bb4" }, defaultVolume: -10, defaultPan: 0.3, oscillatorType: "sawtooth", section: "brass", seatPosition: 55 },
  { id: "bass-trombone", name: "Bass Trombone", nameFr: "Trombone Basse", family: "brass", synthType: "mono", range: { low: "Bb1", high: "Bb4" }, defaultVolume: -12, defaultPan: 0.35, oscillatorType: "sawtooth", section: "brass", seatPosition: 57 },
  { id: "tuba", name: "Tuba", nameFr: "Tuba", family: "brass", synthType: "mono", range: { low: "D1", high: "F4" }, defaultVolume: -10, defaultPan: 0.5, oscillatorType: "sawtooth", section: "brass", seatPosition: 60 },

  // ═══ PERCUSSION ════════════════════════════════════════════════════════
  { id: "timpani", name: "Timpani", nameFr: "Timbales", family: "percussion", synthType: "poly", range: { low: "D2", high: "C4" }, defaultVolume: -8, defaultPan: 0.0, oscillatorType: "sine", section: "percussion", seatPosition: 85 },
  { id: "snare", name: "Snare Drum", nameFr: "Caisse Claire", family: "percussion", synthType: "mono", range: { low: "C4", high: "C4" }, defaultVolume: -10, defaultPan: 0.1, oscillatorType: "triangle", section: "percussion", seatPosition: 87 },
  { id: "bass-drum", name: "Bass Drum", nameFr: "Grosse Caisse", family: "percussion", synthType: "mono", range: { low: "C2", high: "C2" }, defaultVolume: -8, defaultPan: 0.0, oscillatorType: "sine", section: "percussion", seatPosition: 88 },
  { id: "cymbals", name: "Cymbals", nameFr: "Cymbales", family: "percussion", synthType: "mono", range: { low: "C5", high: "C5" }, defaultVolume: -14, defaultPan: 0.2, oscillatorType: "triangle", section: "percussion", seatPosition: 89 },
  { id: "triangle", name: "Triangle", nameFr: "Triangle", family: "percussion", synthType: "mono", range: { low: "C6", high: "C6" }, defaultVolume: -16, defaultPan: -0.3, oscillatorType: "sine", section: "percussion", seatPosition: 86 },
  { id: "tambourine", name: "Tambourine", nameFr: "Tambourin", family: "percussion", synthType: "mono", range: { low: "C5", high: "C5" }, defaultVolume: -14, defaultPan: 0.15, oscillatorType: "triangle", section: "percussion", seatPosition: 90 },
  { id: "glockenspiel", name: "Glockenspiel", nameFr: "Glockenspiel", family: "percussion", synthType: "poly", range: { low: "G5", high: "C8" }, defaultVolume: -14, defaultPan: -0.2, oscillatorType: "sine", section: "percussion", seatPosition: 83 },
  { id: "xylophone", name: "Xylophone", nameFr: "Xylophone", family: "percussion", synthType: "poly", range: { low: "F4", high: "C8" }, defaultVolume: -12, defaultPan: -0.15, oscillatorType: "triangle", section: "percussion", seatPosition: 84 },

  // ═══ KEYBOARD (Claviers) ═══════════════════════════════════════════════
  { id: "piano", name: "Grand Piano", nameFr: "Piano a Queue", family: "keyboard", synthType: "poly", range: { low: "A0", high: "C8" }, defaultVolume: -6, defaultPan: 0.0, oscillatorType: "triangle", section: "keyboard", seatPosition: 95 },
  { id: "celesta", name: "Celesta", nameFr: "Celesta", family: "keyboard", synthType: "poly", range: { low: "C4", high: "C8" }, defaultVolume: -14, defaultPan: -0.1, oscillatorType: "sine", section: "keyboard", seatPosition: 93 },
  { id: "harpsichord", name: "Harpsichord", nameFr: "Clavecin", family: "keyboard", synthType: "poly", range: { low: "F1", high: "F6" }, defaultVolume: -10, defaultPan: 0.0, oscillatorType: "sawtooth", section: "keyboard", seatPosition: 94 },

  // ═══ CONTINUO (Basse Continue — Vivaldi's foundation) ══════════════════
  { id: "organ", name: "Organ (Continuo)", nameFr: "Orgue", family: "keyboard", synthType: "poly", range: { low: "C1", high: "C7" }, defaultVolume: -10, defaultPan: 0.0, oscillatorType: "sine", section: "continuo", seatPosition: 96 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getInstrumentsBySection(section: InstrumentDef["section"]): InstrumentDef[] {
  return ORCHESTRA_REGISTRY.filter((i) => i.section === section);
}

export function getInstrumentsByFamily(family: InstrumentFamily): InstrumentDef[] {
  return ORCHESTRA_REGISTRY.filter((i) => i.family === family);
}

export function getInstrumentDef(id: string): InstrumentDef | undefined {
  return ORCHESTRA_REGISTRY.find((i) => i.id === id);
}

export function getOrchestraSections(): Record<string, InstrumentDef[]> {
  const sections: Record<string, InstrumentDef[]> = {};
  for (const inst of ORCHESTRA_REGISTRY) {
    if (!sections[inst.section]) sections[inst.section] = [];
    sections[inst.section].push(inst);
  }
  return sections;
}

export const ORCHESTRA_STATS = {
  totalInstruments: ORCHESTRA_REGISTRY.length,
  strings: getInstrumentsBySection("strings").length,
  woodwinds: getInstrumentsBySection("woodwinds").length,
  brass: getInstrumentsBySection("brass").length,
  percussion: getInstrumentsBySection("percussion").length,
  keyboard: getInstrumentsBySection("keyboard").length,
  continuo: getInstrumentsBySection("continuo").length,
};
