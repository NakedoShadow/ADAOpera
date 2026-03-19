/**
 * ADA Opera — Partition Parser
 * Sheet music parsing for ABC notation, MusicXML, and MIDI
 *
 * ABC notation is the primary input format (copy-paste friendly).
 * Parsed notes are scheduled through the VivaldiConductor for playback.
 *
 * ABC Reference: https://abcnotation.com/wiki/abc:standard:v2.1
 */

import { getConductor } from "./audio-engine";
import { getRituala } from "./rituala-engine";
import * as Tone from "tone";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ParsedNote {
  pitch: string;       // e.g. "C4", "F#5", "Bb3"
  duration: string;    // Tone.js duration: "4n", "8n", "2n", "16n", "1n"
  time: number;        // time offset in seconds from start
  velocity: number;    // 0-1
  tie: boolean;        // tied to next note
  rest: boolean;       // is a rest
}

export interface ParsedMeasure {
  notes: ParsedNote[];
  number: number;
  timeSignature: [number, number];
}

export interface ParsedScore {
  title: string;
  composer: string;
  key: string;
  mode: "major" | "minor";
  timeSignature: [number, number];
  tempo: number;
  measures: ParsedMeasure[];
  totalDuration: number;
  noteCount: number;
}

export interface ABCHeader {
  title: string;
  composer: string;
  key: string;
  mode: "major" | "minor";
  meter: [number, number];
  tempo: number;
  defaultNoteLength: string;
  voices: string[];
}

// ─── ABC Parser ─────────────────────────────────────────────────────────────

const NOTE_MAP: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
  c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11,
};

const KEY_SHARPS: Record<string, string[]> = {
  C: [], G: ["F"], D: ["F", "C"], A: ["F", "C", "G"],
  E: ["F", "C", "G", "D"], B: ["F", "C", "G", "D", "A"],
  "F#": ["F", "C", "G", "D", "A", "E"],
};

const KEY_FLATS: Record<string, string[]> = {
  F: ["B"], Bb: ["B", "E"], Eb: ["B", "E", "A"],
  Ab: ["B", "E", "A", "D"], Db: ["B", "E", "A", "D", "G"],
};

export function parseABC(abc: string): ParsedScore {
  const lines = abc.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const header = parseABCHeader(lines);
  const bodyLines = lines.filter((l) => !l.match(/^[A-Z]:/));

  const beatDuration = 60 / header.tempo;
  const defaultLength = parseDefaultLength(header.defaultNoteLength);

  let currentTime = 0;
  let measureNumber = 0;
  const measures: ParsedMeasure[] = [];
  let currentMeasure: ParsedNote[] = [];

  // Key signature accidentals
  const keyAccidentals = getKeyAccidentals(header.key);

  const body = bodyLines.join(" ");
  let i = 0;

  while (i < body.length) {
    const ch = body[i];

    // Bar line
    if (ch === "|") {
      if (currentMeasure.length > 0) {
        measures.push({
          notes: currentMeasure,
          number: measureNumber++,
          timeSignature: header.meter,
        });
        currentMeasure = [];
      }
      i++;
      // Handle double bar ||, |], [|
      if (i < body.length && (body[i] === "|" || body[i] === "]" || body[i] === "[")) i++;
      continue;
    }

    // Skip spaces
    if (ch === " " || ch === "\t") {
      i++;
      continue;
    }

    // Repeat signs, decorations — skip
    if (ch === ":" || ch === "!" || ch === "+" || ch === "~" || ch === ".") {
      i++;
      continue;
    }

    // Chord brackets [CEG] — parse as simultaneous notes
    if (ch === "[") {
      i++;
      const chordNotes: ParsedNote[] = [];
      while (i < body.length && body[i] !== "]") {
        const result = parseABCNote(body, i, keyAccidentals, defaultLength, beatDuration, currentTime);
        if (result) {
          chordNotes.push(result.note);
          i = result.nextIndex;
        } else {
          i++;
        }
      }
      if (i < body.length) i++; // skip ]
      chordNotes.forEach((n) => currentMeasure.push(n));
      if (chordNotes.length > 0) {
        currentTime += chordNotes[0].rest ? 0 : parseFloat(Tone.Time(chordNotes[0].duration).toSeconds().toString());
      }
      continue;
    }

    // Rest
    if (ch === "z" || ch === "x") {
      const result = parseRestDuration(body, i + 1, defaultLength, beatDuration);
      currentMeasure.push({
        pitch: "C4",
        duration: result.duration,
        time: currentTime,
        velocity: 0,
        tie: false,
        rest: true,
      });
      currentTime += Tone.Time(result.duration).toSeconds();
      i = result.nextIndex;
      continue;
    }

    // Note
    if (ch.match(/[A-Ga-g]/)) {
      const result = parseABCNote(body, i, keyAccidentals, defaultLength, beatDuration, currentTime);
      if (result) {
        currentMeasure.push(result.note);
        currentTime += Tone.Time(result.note.duration).toSeconds();
        i = result.nextIndex;
      } else {
        i++;
      }
      continue;
    }

    i++;
  }

  // Final measure
  if (currentMeasure.length > 0) {
    measures.push({
      notes: currentMeasure,
      number: measureNumber,
      timeSignature: header.meter,
    });
  }

  const noteCount = measures.reduce((acc, m) => acc + m.notes.filter((n) => !n.rest).length, 0);

  return {
    title: header.title,
    composer: header.composer,
    key: header.key,
    mode: header.mode,
    timeSignature: header.meter,
    tempo: header.tempo,
    measures,
    totalDuration: currentTime,
    noteCount,
  };
}

function parseABCHeader(lines: string[]): ABCHeader {
  const header: ABCHeader = {
    title: "Untitled",
    composer: "Unknown",
    key: "C",
    mode: "major",
    meter: [4, 4],
    tempo: 120,
    defaultNoteLength: "1/8",
    voices: [],
  };

  for (const line of lines) {
    if (line.startsWith("T:")) header.title = line.slice(2).trim();
    else if (line.startsWith("C:")) header.composer = line.slice(2).trim();
    else if (line.startsWith("K:")) {
      const keyStr = line.slice(2).trim();
      const match = keyStr.match(/^([A-G][b#]?)\s*(m|min|maj|major|minor)?/i);
      if (match) {
        header.key = match[1];
        header.mode = match[2] && match[2].startsWith("m") ? "minor" : "major";
      }
    } else if (line.startsWith("M:")) {
      const parts = line.slice(2).trim().split("/");
      if (parts.length === 2) {
        header.meter = [parseInt(parts[0]), parseInt(parts[1])];
      }
    } else if (line.startsWith("Q:")) {
      const tempoMatch = line.slice(2).trim().match(/(\d+)/);
      if (tempoMatch) header.tempo = parseInt(tempoMatch[1]);
    } else if (line.startsWith("L:")) {
      header.defaultNoteLength = line.slice(2).trim();
    } else if (line.startsWith("V:")) {
      header.voices.push(line.slice(2).trim());
    }
  }

  return header;
}

function parseDefaultLength(len: string): number {
  const parts = len.split("/");
  if (parts.length === 2) return parseInt(parts[0]) / parseInt(parts[1]);
  return 1 / 8;
}

function getKeyAccidentals(key: string): Map<string, number> {
  const acc = new Map<string, number>();
  const sharps = KEY_SHARPS[key];
  const flats = KEY_FLATS[key];
  if (sharps) sharps.forEach((n) => acc.set(n, 1));
  if (flats) flats.forEach((n) => acc.set(n, -1));
  return acc;
}

function parseABCNote(
  body: string,
  startIndex: number,
  keyAcc: Map<string, number>,
  defaultLength: number,
  beatDuration: number,
  currentTime: number,
): { note: ParsedNote; nextIndex: number } | null {
  let i = startIndex;

  // Accidentals
  let accidental = 0;
  while (i < body.length && (body[i] === "^" || body[i] === "_" || body[i] === "=")) {
    if (body[i] === "^") accidental++;
    else if (body[i] === "_") accidental--;
    else accidental = 0; // natural
    i++;
  }

  if (i >= body.length || !body[i].match(/[A-Ga-g]/)) return null;

  const noteChar = body[i];
  const isLower = noteChar === noteChar.toLowerCase();
  let octave = isLower ? 5 : 4;
  const noteName = noteChar.toUpperCase();
  i++;

  // Octave modifiers
  while (i < body.length) {
    if (body[i] === "'") { octave++; i++; }
    else if (body[i] === ",") { octave--; i++; }
    else break;
  }

  // Apply key signature if no explicit accidental
  if (accidental === 0 && keyAcc.has(noteName)) {
    accidental = keyAcc.get(noteName)!;
  }

  // Build pitch string
  let pitch = noteName;
  if (accidental > 0) pitch += "#".repeat(accidental);
  else if (accidental < 0) pitch += "b".repeat(-accidental);
  pitch += octave;

  // Duration
  const result = parseNoteDuration(body, i, defaultLength);
  i = result.nextIndex;

  // Tie
  let tie = false;
  if (i < body.length && body[i] === "-") {
    tie = true;
    i++;
  }

  const duration = lengthToToneDuration(result.length);

  return {
    note: {
      pitch,
      duration,
      time: currentTime,
      velocity: 0.75,
      tie,
      rest: false,
    },
    nextIndex: i,
  };
}

function parseNoteDuration(body: string, startIndex: number, defaultLength: number): { length: number; nextIndex: number } {
  let i = startIndex;
  let length = defaultLength;

  // Multiplier (e.g., A2 = double length)
  let numStr = "";
  while (i < body.length && body[i].match(/\d/)) {
    numStr += body[i];
    i++;
  }
  if (numStr) {
    length *= parseInt(numStr);
  }

  // Halving with slashes (e.g., A/ = half, A// = quarter)
  while (i < body.length && body[i] === "/") {
    i++;
    let divStr = "";
    while (i < body.length && body[i].match(/\d/)) {
      divStr += body[i];
      i++;
    }
    const divisor = divStr ? parseInt(divStr) : 2;
    length /= divisor;
  }

  return { length, nextIndex: i };
}

function parseRestDuration(body: string, startIndex: number, defaultLength: number, beatDuration: number): { duration: string; nextIndex: number } {
  const result = parseNoteDuration(body, startIndex, defaultLength);
  return { duration: lengthToToneDuration(result.length), nextIndex: result.nextIndex };
}

function lengthToToneDuration(length: number): string {
  // Map fractional note length to Tone.js notation
  if (length >= 2) return "1n";
  if (length >= 1) return "2n";
  if (length >= 0.5) return "4n";
  if (length >= 0.25) return "8n";
  if (length >= 0.125) return "16n";
  if (length >= 0.0625) return "32n";
  return "16n";
}

// ─── Score Playback ─────────────────────────────────────────────────────────

export class ScorePlayer {
  private score: ParsedScore | null = null;
  private scheduledEvents: number[] = [];
  private isPlaying = false;
  private instrumentId: string;

  constructor(instrumentId: string = "piano") {
    this.instrumentId = instrumentId;
  }

  loadScore(score: ParsedScore): void {
    this.stop();
    this.score = score;
    getConductor().setBPM(score.tempo);
    getConductor().setKey(score.key, score.mode);
    getRituala().setBPM(score.tempo);
  }

  play(startMeasure: number = 0): void {
    if (!this.score) return;
    this.stop();
    this.isPlaying = true;

    const conductor = getConductor();
    const transport = Tone.getTransport();

    // Schedule all notes
    for (const measure of this.score.measures) {
      if (measure.number < startMeasure) continue;

      for (const note of measure.notes) {
        if (note.rest) continue;

        const eventId = transport.schedule((time) => {
          conductor.playNote(this.instrumentId, note.pitch, note.duration, time, note.velocity);
        }, note.time);
        this.scheduledEvents.push(eventId);
      }
    }

    transport.start();
  }

  playMeasure(measureNumber: number): void {
    if (!this.score) return;
    const measure = this.score.measures[measureNumber];
    if (!measure) return;

    this.stop();
    this.isPlaying = true;
    const conductor = getConductor();
    const transport = Tone.getTransport();

    const baseTime = measure.notes[0]?.time ?? 0;
    for (const note of measure.notes) {
      if (note.rest) continue;
      const relativeTime = note.time - baseTime;
      const eventId = transport.schedule((time) => {
        conductor.playNote(this.instrumentId, note.pitch, note.duration, time, note.velocity);
      }, relativeTime);
      this.scheduledEvents.push(eventId);
    }

    transport.start();
  }

  stop(): void {
    this.isPlaying = false;
    const transport = Tone.getTransport();
    this.scheduledEvents.forEach((id) => transport.clear(id));
    this.scheduledEvents = [];
    transport.stop();
    transport.position = 0;
  }

  getScore(): ParsedScore | null {
    return this.score;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  setInstrument(instrumentId: string): void {
    this.instrumentId = instrumentId;
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let playerInstance: ScorePlayer | null = null;

export function getScorePlayer(): ScorePlayer {
  if (!playerInstance) {
    playerInstance = new ScorePlayer("piano");
  }
  return playerInstance;
}

// ─── Example Scores ─────────────────────────────────────────────────────────

export const EXAMPLE_SCORES = {
  twinkle: `X:1
T:Twinkle Twinkle Little Star
C:Traditional
M:4/4
L:1/4
Q:100
K:C
C C G G | A A G2 | F F E E | D D C2 |
G G F F | E E D2 | G G F F | E E D2 |
C C G G | A A G2 | F F E E | D D C2 |`,

  odetojoy: `X:1
T:Ode to Joy
C:Beethoven
M:4/4
L:1/4
Q:120
K:C
E E F G | G F E D | C C D E | E D D2 |
E E F G | G F E D | C C D E | D C C2 |`,

  spring: `X:1
T:La Primavera (Spring) — Opening
C:Antonio Vivaldi
M:4/4
L:1/8
Q:132
K:E
E2 E2 EF G2 | E2 E2 EF G2 | GF EF G2 A2 | GF EF ED C2 |
E2 E2 EF G2 | E2 E2 EF G2 | GF EF G2 A2 | GF EF ED C2 |`,

  furElise: `X:1
T:Fur Elise (Opening)
C:Beethoven
M:3/8
L:1/16
Q:140
K:Am
E2 ^D2 | E2 ^D2 E2 B2 D2 C2 | A4 z2 C2 E2 A2 | B4 z2 E2 ^G2 B2 | C4 z2 |`,
};
