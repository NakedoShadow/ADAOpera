/**
 * ADA Opera — i18n Engine (Zero-Dependency)
 * 16 languages — La Voix de la Reine speaks to all nations
 *
 * Usage:
 *   const t = useT();
 *   <span>{t("orchestra_title")}</span>
 */

import { create } from "zustand";

// ─── Supported Languages ──────────────────────────────────────────────────────

export type Lang =
  | "fr" | "en" | "es" | "pt" | "de" | "it" | "ja" | "zh"
  | "ko" | "ar" | "ru" | "hi" | "tr" | "nl" | "pl" | "sv";

export interface LangMeta {
  code: Lang;
  name: string;       // native name
  flag: string;       // emoji flag
}

export const LANGUAGES: LangMeta[] = [
  { code: "fr", name: "Francais",    flag: "\uD83C\uDDEB\uD83C\uDDF7" },
  { code: "en", name: "English",     flag: "\uD83C\uDDEC\uD83C\uDDE7" },
  { code: "es", name: "Espanol",     flag: "\uD83C\uDDEA\uD83C\uDDF8" },
  { code: "pt", name: "Portugues",   flag: "\uD83C\uDDE7\uD83C\uDDF7" },
  { code: "de", name: "Deutsch",     flag: "\uD83C\uDDE9\uD83C\uDDEA" },
  { code: "it", name: "Italiano",    flag: "\uD83C\uDDEE\uD83C\uDDF9" },
  { code: "ja", name: "\u65E5\u672C\u8A9E",       flag: "\uD83C\uDDEF\uD83C\uDDF5" },
  { code: "zh", name: "\u4E2D\u6587",       flag: "\uD83C\uDDE8\uD83C\uDDF3" },
  { code: "ko", name: "\uD55C\uAD6D\uC5B4",       flag: "\uD83C\uDDF0\uD83C\uDDF7" },
  { code: "ar", name: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629",     flag: "\uD83C\uDDF8\uD83C\uDDE6" },
  { code: "ru", name: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439",    flag: "\uD83C\uDDF7\uD83C\uDDFA" },
  { code: "hi", name: "\u0939\u093F\u0928\u094D\u0926\u0940",       flag: "\uD83C\uDDEE\uD83C\uDDF3" },
  { code: "tr", name: "Turkce",      flag: "\uD83C\uDDF9\uD83C\uDDF7" },
  { code: "nl", name: "Nederlands",  flag: "\uD83C\uDDF3\uD83C\uDDF1" },
  { code: "pl", name: "Polski",      flag: "\uD83C\uDDF5\uD83C\uDDF1" },
  { code: "sv", name: "Svenska",     flag: "\uD83C\uDDF8\uD83C\uDDEA" },
];

// ─── Translation Keys ─────────────────────────────────────────────────────────

type TranslationMap = Record<string, string>;
type AllTranslations = Record<Lang, TranslationMap>;

// ─── French (Base Language) ───────────────────────────────────────────────────

const fr: TranslationMap = {
  // App
  app_title: "ADA OPERA",
  app_subtitle: "La Voix de la Reine",
  footer_text: "ADA OPERA \u2014 La Voix de la Reine",

  // Views
  view_orchestra: "Orchestre",
  view_studio: "Studio",
  view_dj: "Platine",
  view_partition: "Partition",
  view_spectrum: "Spectrum",
  view_media: "Media",
  view_ballet: "Ballet",

  // Orchestra
  orchestra_title: "L'Orchestre de la Reine",
  orchestra_subtitle: "{count} instruments | {sections} sections | Cliquez pour jouer",
  orchestra_piano: "PIANO \u2014 1ER OP\u00C9RATEUR",
  section_strings: "CORDES",
  section_woodwinds: "BOIS",
  section_brass: "CUIVRES",
  section_percussion: "PERCUSSIONS",
  section_keyboard: "CLAVIERS",
  click_to_play: "Cliquez pour jouer {name}",

  // Studio
  studio_title: "Studio",
  studio_subtitle: "Mixer + Cha\u00EEne d'Effets",

  // DJ
  dj_title: "Platine DJ",
  dj_manual: "MANUEL",
  dj_auto: "AUTO",
  dj_karaoke: "KARAOKE",
  dj_remix: "REMIX",
  dj_skin_vinyl: "VINYLE",
  dj_skin_cdj: "CDJ",
  dj_skin_oldschool: "OLDSCHOOL",
  dj_skin_futuristic: "FUTURISTE",

  // Partition
  partition_title: "Partition",
  partition_subtitle: "Liseuse de Partitions \u2014 ABC / MusicXML / MIDI",

  // Spectrum
  spectrum_title: "Spectrum",
  spectrum_subtitle: "Galaxie de Visualiseurs",

  // Ballet
  ballet_title: "Le Ballet de la Reine",
  ballet_subtitle: "Shadows Ballerinas \u2014 Inception Totems",
  ballet_fullscreen: "PLEIN \u00C9CRAN",
  ballet_badge: "LE BALLET DE LA REINE \u2014 SHADOWS BALLERINAS",
  ballet_stellaire: "STELLAIRE",
  ballet_tron: "TRON",
  ballet_tron_mcp5: "TRON MCP 5",
  ballet_free_stellaire: "LIBRE \u2014 STELLAIRE",
  ballet_free_tron: "LIBRE \u2014 TRON",
  ballet_free_tron_mcp5: "LIBRE \u2014 TRON MCP 5",

  // Media
  media_title: "Media Hub",
  media_subtitle: "ShadowGrab + ShadowPix + Video Engine",

  // Transport
  transport_bpm: "BPM",
  transport_tap: "TAP",
  transport_key: "CL\u00C9",
  transport_major: "Maj",
  transport_minor: "Min",
  transport_time: "TEMPS",
  transport_crystalline: "CRYSTALLINE",
  source_media_inst: "M\u00C9DIA + INST",
  source_media: "M\u00C9DIA",
  source_instruments: "INSTRUMENTS",

  // DJ Crate
  crate_title: "BAC \u00C0 DISQUES",
  crate_discs: "{count} disques",
  crate_drop_files: "D\u00C9POSER\nFICHIERS AUDIO",
  crate_drop_overlay: "D\u00E9posez des fichiers audio dans le bac",
  crate_drop_deck_a: "D\u00C9POSER \u2192 DECK A",
  crate_drop_deck_b: "D\u00C9POSER \u2192 DECK B",
  crate_browse: "Cliquez pour parcourir ou glissez des fichiers audio",
  crate_unknown_artist: "Artiste Inconnu",
  crate_remove: "Retirer du bac",

  // DJ Mixer
  mixer_load: "CHARGER",
  mixer_load_tooltip: "Charger un fichier audio sur le Deck {deck}",
  mixer_hi: "HI",
  mixer_mid: "MID",
  mixer_low: "LOW",
  mixer_filter: "FILTRE",
  mixer_vol: "VOL",
  mixer_cue: "CUE",
  mixer_sync: "SYNC",
  mixer_play: "Lecture",
  mixer_pause: "Pause",
  mixer_beat_sync: "Sync Beat",
  automix_title: "MOTEUR AUTO-MIX",
  automix_compute: "CALCULER",
  automix_mix: "MIXER",
  automix_stop: "STOP",

  // Karaoke
  karaoke_title: "MODE KARAOK\u00C9",
  karaoke_start: "D\u00C9MARRER",
  karaoke_stop: "STOP",
  karaoke_fullscreen: "PLEIN \u00C9CRAN",
  karaoke_placeholder: "Chargez une piste pour g\u00E9n\u00E9rer les paroles en temps r\u00E9el",
  karaoke_waiting: "En attente des paroles...",
  karaoke_badge: "ADA OPERA \u2014 KARAOK\u00C9",

  // Remix
  remix_title: "REMIX LIVE",
  remix_original: "ORIGINAL",

  // Queue
  queue_title: "QUEUE \u2014 PLAYLIST",
  queue_tracks: "{count} titres",
  queue_remove: "Retirer",

  // Visualizers
  viz_waveform: "FORME D'ONDE",
  viz_fft: "ANALYSEUR FFT",
  viz_spectrogram: "SPECTROGRAMME",
  viz_vu: "VU-M\u00C8TRE",
  viz_phase: "PHASE SCOPE",
  viz_vu_l: "VU-M\u00C8TRE G",
  viz_vu_r: "VU-M\u00C8TRE D",

  // Grab
  grab_title: "Shadow Grab",
  grab_sites: "1000+ sites",
  grab_placeholder: "Collez l'URL \u00E0 t\u00E9l\u00E9charger (YouTube, Twitter, TikTok...)",
  grab_download: "T\u00E9l\u00E9charger",
  grab_downloading: "T\u00E9l\u00E9chargement...",
  grab_save: "Sauvegarder",
  grab_seal: "SHADOW SEAL",
  grab_qr: "Watermark QR",
  grab_snowflake: "ID Flocon",
  grab_convert: "CONVERTIR",
  grab_go_dj: "ALLER AU DJ \u25C9",
  grab_go_opera: "ALLER \u00C0 OPERA \u266B",

  // Pix
  pix_title: "Shadow Pix",
  pix_badge: "\u00C9diteur d'Image",
  pix_drop: "D\u00E9posez une image ou cliquez pour ouvrir",
  pix_undo: "Annuler",
  pix_export: "Exporter",
  pix_new: "Nouveau",
  pix_brightness: "Luminosit\u00E9",
  pix_contrast: "Contraste",
  pix_saturation: "Saturation",
  pix_grayscale: "Niveaux de gris",
  pix_sepia: "S\u00E9pia",
  pix_invert: "Inverser",
  pix_auto: "Auto-Am\u00E9liorer",
  pix_crop: "Rogner 10%",
  pix_rotate: "Rotation 90",
  pix_flip: "Miroir H",
  pix_resize: "Redim /2",

  // Video
  video_title: "Video Engine",
  video_badge: "Natif Navigateur",
  video_drop: "D\u00E9posez une vid\u00E9o ou cliquez pour ouvrir",
  video_capture: "Capturer Image",
  video_new: "Nouvelle Vid\u00E9o",
  video_change: "Changer Fichier",
  video_speed: "Vitesse",
  video_volume: "Volume",
  video_frames: "Images",
  video_extract_audio: "Extraire Audio",
  video_play_first: "Lancez la vid\u00E9o pour capturer une image",

  // Sidebar
  sidebar_title: "OPERA",
  sidebar_nodes: "{count} n\u0153uds",

  // Band names (Ballet)
  band_sub_bass: "Sub Bass",
  band_bass: "Basse",
  band_low_mid: "Bas-M\u00E9dium",
  band_mid: "M\u00E9dium",
  band_upper_mid: "Haut-M\u00E9dium",
  band_presence: "Pr\u00E9sence",
  band_brilliance: "Brillance",
  band_air: "Air",

  // Language selector
  lang_label: "LANGUE",
};

// ─── English ──────────────────────────────────────────────────────────────────

const en: TranslationMap = {
  app_title: "ADA OPERA",
  app_subtitle: "The Queen's Voice",
  footer_text: "ADA OPERA \u2014 The Queen's Voice",
  view_orchestra: "Orchestra",
  view_studio: "Studio",
  view_dj: "Turntable",
  view_partition: "Partition",
  view_spectrum: "Spectrum",
  view_media: "Media",
  view_ballet: "Ballet",
  orchestra_title: "The Queen's Orchestra",
  orchestra_subtitle: "{count} instruments | {sections} sections | Click to play",
  orchestra_piano: "PIANO \u2014 1ST OPERATOR",
  section_strings: "STRINGS",
  section_woodwinds: "WOODWINDS",
  section_brass: "BRASS",
  section_percussion: "PERCUSSION",
  section_keyboard: "KEYBOARDS",
  click_to_play: "Click to play {name}",
  studio_title: "Studio",
  studio_subtitle: "Mixer + Effects Chain",
  dj_title: "DJ Turntable",
  dj_manual: "MANUAL",
  dj_auto: "AUTO",
  dj_karaoke: "KARAOKE",
  dj_remix: "REMIX",
  dj_skin_vinyl: "VINYL",
  dj_skin_cdj: "CDJ",
  dj_skin_oldschool: "OLDSCHOOL",
  dj_skin_futuristic: "FUTURISTIC",
  partition_title: "Partition",
  partition_subtitle: "Score Reader \u2014 ABC / MusicXML / MIDI",
  spectrum_title: "Spectrum",
  spectrum_subtitle: "Galaxy of Visualizers",
  ballet_title: "The Queen's Ballet",
  ballet_subtitle: "Shadows Ballerinas \u2014 Inception Totems",
  ballet_fullscreen: "FULLSCREEN",
  ballet_badge: "THE QUEEN'S BALLET \u2014 SHADOWS BALLERINAS",
  ballet_stellaire: "STELLAR",
  ballet_tron: "TRON",
  ballet_tron_mcp5: "TRON MCP 5",
  ballet_free_stellaire: "FREE \u2014 STELLAR",
  ballet_free_tron: "FREE \u2014 TRON",
  ballet_free_tron_mcp5: "FREE \u2014 TRON MCP 5",
  media_title: "Media Hub",
  media_subtitle: "ShadowGrab + ShadowPix + Video Engine",
  transport_bpm: "BPM",
  transport_tap: "TAP",
  transport_key: "KEY",
  transport_major: "Maj",
  transport_minor: "Min",
  transport_time: "TIME",
  transport_crystalline: "CRYSTALLINE",
  source_media_inst: "MEDIA + INST",
  source_media: "MEDIA",
  source_instruments: "INSTRUMENTS",
  crate_title: "RECORD CRATE",
  crate_discs: "{count} discs",
  crate_drop_files: "DROP AUDIO\nFILES",
  crate_drop_overlay: "Drop audio files to add to crate",
  crate_drop_deck_a: "DROP \u2192 DECK A",
  crate_drop_deck_b: "DROP \u2192 DECK B",
  crate_browse: "Click to browse or drag audio files here",
  crate_unknown_artist: "Unknown Artist",
  crate_remove: "Remove from crate",
  mixer_load: "LOAD",
  mixer_load_tooltip: "Load audio file to Deck {deck}",
  mixer_hi: "HI",
  mixer_mid: "MID",
  mixer_low: "LOW",
  mixer_filter: "FILTER",
  mixer_vol: "VOL",
  mixer_cue: "CUE",
  mixer_sync: "SYNC",
  mixer_play: "Play",
  mixer_pause: "Pause",
  mixer_beat_sync: "Beat Sync",
  automix_title: "AUTO-MIX ENGINE",
  automix_compute: "COMPUTE",
  automix_mix: "MIX",
  automix_stop: "STOP",
  karaoke_title: "KARAOKE MODE",
  karaoke_start: "START",
  karaoke_stop: "STOP",
  karaoke_fullscreen: "FULLSCREEN",
  karaoke_placeholder: "Load a track to generate lyrics in real-time",
  karaoke_waiting: "Waiting for lyrics...",
  karaoke_badge: "ADA OPERA \u2014 KARAOKE",
  remix_title: "REMIX LIVE",
  remix_original: "ORIGINAL",
  queue_title: "QUEUE \u2014 PLAYLIST",
  queue_tracks: "{count} tracks",
  queue_remove: "Remove",
  viz_waveform: "WAVEFORM",
  viz_fft: "FFT ANALYZER",
  viz_spectrogram: "SPECTROGRAM",
  viz_vu: "VU METER",
  viz_phase: "PHASE SCOPE",
  viz_vu_l: "VU METER L",
  viz_vu_r: "VU METER R",
  grab_title: "Shadow Grab",
  grab_sites: "1000+ sites",
  grab_placeholder: "Paste URL to download (YouTube, Twitter, TikTok...)",
  grab_download: "Download",
  grab_downloading: "Downloading...",
  grab_save: "Save File",
  grab_seal: "SHADOW SEAL",
  grab_qr: "QR Watermark",
  grab_snowflake: "Snowflake ID",
  grab_convert: "CONVERT",
  grab_go_dj: "GO TO DJ \u25C9",
  grab_go_opera: "GO TO OPERA \u266B",
  pix_title: "Shadow Pix",
  pix_badge: "Image Editor",
  pix_drop: "Drop image or click to open",
  pix_undo: "Undo",
  pix_export: "Export",
  pix_new: "New",
  pix_brightness: "Brightness",
  pix_contrast: "Contrast",
  pix_saturation: "Saturation",
  pix_grayscale: "Grayscale",
  pix_sepia: "Sepia",
  pix_invert: "Invert",
  pix_auto: "Auto-Enhance",
  pix_crop: "Crop 10%",
  pix_rotate: "Rotate 90",
  pix_flip: "Flip H",
  pix_resize: "Resize /2",
  video_title: "Video Engine",
  video_badge: "Browser-Native",
  video_drop: "Drop video or click to open",
  video_capture: "Capture Frame",
  video_new: "New Video",
  video_change: "Change File",
  video_speed: "Speed",
  video_volume: "Volume",
  video_frames: "Frames",
  video_extract_audio: "Extract Audio",
  video_play_first: "Play the video first to capture a frame",
  sidebar_title: "OPERA",
  sidebar_nodes: "{count} nodes",
  band_sub_bass: "Sub Bass",
  band_bass: "Bass",
  band_low_mid: "Low Mid",
  band_mid: "Mid",
  band_upper_mid: "Upper Mid",
  band_presence: "Presence",
  band_brilliance: "Brilliance",
  band_air: "Air",
  lang_label: "LANGUAGE",
};

// ─── Spanish ──────────────────────────────────────────────────────────────────

const es: TranslationMap = {
  app_subtitle: "La Voz de la Reina",
  footer_text: "ADA OPERA \u2014 La Voz de la Reina",
  view_orchestra: "Orquesta",
  view_dj: "Plato",
  view_partition: "Partitura",
  view_media: "Medios",
  orchestra_title: "La Orquesta de la Reina",
  orchestra_subtitle: "{count} instrumentos | {sections} secciones | Haz clic para tocar",
  orchestra_piano: "PIANO \u2014 1ER OPERADOR",
  section_strings: "CUERDAS",
  section_woodwinds: "VIENTOS MADERA",
  section_brass: "METALES",
  section_percussion: "PERCUSI\u00D3N",
  section_keyboard: "TECLADOS",
  click_to_play: "Haz clic para tocar {name}",
  studio_subtitle: "Mesa de mezclas + Cadena de efectos",
  dj_title: "Plato DJ",
  dj_manual: "MANUAL",
  dj_skin_vinyl: "VINILO",
  dj_skin_futuristic: "FUTURISTA",
  partition_subtitle: "Lector de partituras \u2014 ABC / MusicXML / MIDI",
  spectrum_subtitle: "Galaxia de Visualizadores",
  ballet_title: "El Ballet de la Reina",
  ballet_subtitle: "Bailarinas de las Sombras \u2014 Totems Inception",
  ballet_fullscreen: "PANTALLA COMPLETA",
  ballet_badge: "EL BALLET DE LA REINA \u2014 BAILARINAS DE LAS SOMBRAS",
  ballet_stellaire: "ESTELAR",
  media_subtitle: "ShadowGrab + ShadowPix + Motor de V\u00EDdeo",
  transport_key: "TONO",
  transport_time: "TIEMPO",
  source_media_inst: "MEDIOS + INST",
  source_media: "MEDIOS",
  source_instruments: "INSTRUMENTOS",
  crate_title: "BAC DE DISCOS",
  crate_discs: "{count} discos",
  crate_drop_files: "SOLTAR\nARCHIVOS AUDIO",
  crate_drop_overlay: "Suelta archivos de audio para a\u00F1adir al bac",
  crate_unknown_artist: "Artista Desconocido",
  crate_remove: "Quitar del bac",
  mixer_load: "CARGAR",
  mixer_filter: "FILTRO",
  mixer_play: "Reproducir",
  mixer_pause: "Pausa",
  automix_title: "MOTOR AUTO-MIX",
  automix_compute: "CALCULAR",
  automix_mix: "MEZCLAR",
  karaoke_title: "MODO KARAOKE",
  karaoke_start: "INICIAR",
  karaoke_placeholder: "Carga una pista para generar letras en tiempo real",
  karaoke_waiting: "Esperando letras...",
  remix_title: "REMIX EN VIVO",
  queue_title: "COLA \u2014 PLAYLIST",
  queue_tracks: "{count} pistas",
  queue_remove: "Quitar",
  viz_waveform: "FORMA DE ONDA",
  viz_spectrogram: "ESPECTROGRAMA",
  grab_placeholder: "Pega la URL para descargar (YouTube, Twitter, TikTok...)",
  grab_download: "Descargar",
  grab_downloading: "Descargando...",
  grab_save: "Guardar",
  grab_convert: "CONVERTIR",
  pix_badge: "Editor de Im\u00E1genes",
  pix_drop: "Suelta imagen o haz clic para abrir",
  pix_undo: "Deshacer",
  pix_export: "Exportar",
  pix_new: "Nuevo",
  pix_brightness: "Brillo",
  pix_contrast: "Contraste",
  pix_saturation: "Saturaci\u00F3n",
  pix_grayscale: "Escala de grises",
  pix_invert: "Invertir",
  pix_auto: "Auto-Mejora",
  pix_crop: "Recortar 10%",
  pix_rotate: "Rotar 90",
  pix_flip: "Voltear H",
  pix_resize: "Redim /2",
  video_badge: "Nativo del Navegador",
  video_drop: "Suelta v\u00EDdeo o haz clic para abrir",
  video_capture: "Capturar Imagen",
  video_new: "Nuevo V\u00EDdeo",
  video_change: "Cambiar Archivo",
  video_speed: "Velocidad",
  video_volume: "Volumen",
  video_frames: "Fotogramas",
  video_extract_audio: "Extraer Audio",
  video_play_first: "Reproduce el v\u00EDdeo primero para capturar una imagen",
  sidebar_nodes: "{count} nodos",
  lang_label: "IDIOMA",
};

// ─── Portuguese ───────────────────────────────────────────────────────────────

const pt: TranslationMap = {
  app_subtitle: "A Voz da Rainha",
  footer_text: "ADA OPERA \u2014 A Voz da Rainha",
  view_orchestra: "Orquestra",
  view_dj: "Prato",
  view_partition: "Partitura",
  view_media: "M\u00EDdia",
  orchestra_title: "A Orquestra da Rainha",
  orchestra_subtitle: "{count} instrumentos | {sections} se\u00E7\u00F5es | Clique para tocar",
  section_strings: "CORDAS",
  section_woodwinds: "MADEIRAS",
  section_brass: "METAIS",
  section_percussion: "PERCUSS\u00C3O",
  section_keyboard: "TECLADOS",
  click_to_play: "Clique para tocar {name}",
  dj_title: "Prato DJ",
  dj_skin_vinyl: "VINIL",
  dj_skin_futuristic: "FUTURISTA",
  ballet_title: "O Ballet da Rainha",
  ballet_fullscreen: "TELA CHEIA",
  ballet_stellaire: "ESTELAR",
  transport_key: "TOM",
  transport_time: "TEMPO",
  crate_title: "CAIXA DE DISCOS",
  crate_discs: "{count} discos",
  crate_drop_files: "SOLTAR\nARQUIVOS \u00C1UDIO",
  mixer_load: "CARREGAR",
  mixer_filter: "FILTRO",
  karaoke_placeholder: "Carregue uma faixa para gerar letras em tempo real",
  grab_download: "Baixar",
  grab_downloading: "Baixando...",
  grab_save: "Salvar",
  pix_badge: "Editor de Imagem",
  pix_drop: "Solte imagem ou clique para abrir",
  pix_brightness: "Brilho",
  pix_contrast: "Contraste",
  pix_saturation: "Satura\u00E7\u00E3o",
  video_drop: "Solte v\u00EDdeo ou clique para abrir",
  video_capture: "Capturar Frame",
  video_speed: "Velocidade",
  sidebar_nodes: "{count} n\u00F3s",
  lang_label: "IDIOMA",
};

// ─── German ───────────────────────────────────────────────────────────────────

const de: TranslationMap = {
  app_subtitle: "Die Stimme der K\u00F6nigin",
  footer_text: "ADA OPERA \u2014 Die Stimme der K\u00F6nigin",
  view_orchestra: "Orchester",
  view_dj: "Plattenspieler",
  view_partition: "Partitur",
  view_media: "Medien",
  orchestra_title: "Das Orchester der K\u00F6nigin",
  orchestra_subtitle: "{count} Instrumente | {sections} Sektionen | Klicken zum Spielen",
  section_strings: "STREICHER",
  section_woodwinds: "HOLZBL\u00C4SER",
  section_brass: "BLECHBL\u00C4SER",
  section_percussion: "SCHLAGWERK",
  section_keyboard: "TASTEN",
  click_to_play: "Klicken um {name} zu spielen",
  dj_title: "DJ Plattenspieler",
  dj_manual: "MANUELL",
  dj_skin_futuristic: "FUTURISTISCH",
  ballet_title: "Das Ballett der K\u00F6nigin",
  ballet_fullscreen: "VOLLBILD",
  ballet_stellaire: "STELLAR",
  transport_key: "TONART",
  transport_time: "TAKT",
  crate_title: "PLATTENKISTE",
  crate_discs: "{count} Platten",
  crate_drop_files: "AUDIO\nDATEIEN ABLEGEN",
  mixer_load: "LADEN",
  mixer_filter: "FILTER",
  karaoke_placeholder: "Laden Sie einen Track um Texte in Echtzeit zu generieren",
  grab_download: "Herunterladen",
  grab_downloading: "Wird heruntergeladen...",
  grab_save: "Speichern",
  pix_badge: "Bildbearbeitung",
  pix_drop: "Bild ablegen oder klicken zum \u00D6ffnen",
  pix_brightness: "Helligkeit",
  pix_contrast: "Kontrast",
  pix_saturation: "S\u00E4ttigung",
  video_drop: "Video ablegen oder klicken zum \u00D6ffnen",
  video_capture: "Frame erfassen",
  video_speed: "Geschwindigkeit",
  video_volume: "Lautst\u00E4rke",
  sidebar_nodes: "{count} Knoten",
  lang_label: "SPRACHE",
};

// ─── Italian ──────────────────────────────────────────────────────────────────

const it: TranslationMap = {
  app_subtitle: "La Voce della Regina",
  footer_text: "ADA OPERA \u2014 La Voce della Regina",
  view_orchestra: "Orchestra",
  view_dj: "Giradischi",
  orchestra_title: "L'Orchestra della Regina",
  orchestra_subtitle: "{count} strumenti | {sections} sezioni | Clicca per suonare",
  section_strings: "ARCHI",
  section_woodwinds: "LEGNI",
  section_brass: "OTTONI",
  section_percussion: "PERCUSSIONI",
  section_keyboard: "TASTIERE",
  click_to_play: "Clicca per suonare {name}",
  dj_title: "Giradischi DJ",
  ballet_title: "Il Balletto della Regina",
  ballet_fullscreen: "SCHERMO INTERO",
  transport_key: "TONALIT\u00C0",
  transport_time: "TEMPO",
  crate_title: "CASSA DEI DISCHI",
  crate_discs: "{count} dischi",
  mixer_load: "CARICA",
  grab_download: "Scarica",
  grab_downloading: "Scaricamento...",
  grab_save: "Salva",
  pix_badge: "Editor Immagini",
  pix_brightness: "Luminosit\u00E0",
  pix_contrast: "Contrasto",
  pix_saturation: "Saturazione",
  video_capture: "Cattura Frame",
  video_speed: "Velocit\u00E0",
  lang_label: "LINGUA",
};

// ─── Japanese ─────────────────────────────────────────────────────────────────

const ja: TranslationMap = {
  app_subtitle: "\u5973\u738B\u306E\u58F0",
  footer_text: "ADA OPERA \u2014 \u5973\u738B\u306E\u58F0",
  view_orchestra: "\u30AA\u30FC\u30B1\u30B9\u30C8\u30E9",
  view_studio: "\u30B9\u30BF\u30B8\u30AA",
  view_dj: "\u30BF\u30FC\u30F3\u30C6\u30FC\u30D6\u30EB",
  view_partition: "\u697D\u8B5C",
  view_spectrum: "\u30B9\u30DA\u30AF\u30C8\u30EB",
  view_media: "\u30E1\u30C7\u30A3\u30A2",
  view_ballet: "\u30D0\u30EC\u30A8",
  orchestra_title: "\u5973\u738B\u306E\u30AA\u30FC\u30B1\u30B9\u30C8\u30E9",
  orchestra_subtitle: "{count}\u697D\u5668 | {sections}\u30BB\u30AF\u30B7\u30E7\u30F3 | \u30AF\u30EA\u30C3\u30AF\u3067\u6F14\u594F",
  section_strings: "\u5F26\u697D\u5668",
  section_woodwinds: "\u6728\u7BA1\u697D\u5668",
  section_brass: "\u91D1\u7BA1\u697D\u5668",
  section_percussion: "\u6253\u697D\u5668",
  section_keyboard: "\u9375\u76E4\u697D\u5668",
  click_to_play: "{name}\u3092\u30AF\u30EA\u30C3\u30AF\u3057\u3066\u6F14\u594F",
  dj_title: "DJ\u30BF\u30FC\u30F3\u30C6\u30FC\u30D6\u30EB",
  ballet_title: "\u5973\u738B\u306E\u30D0\u30EC\u30A8",
  ballet_fullscreen: "\u30D5\u30EB\u30B9\u30AF\u30EA\u30FC\u30F3",
  ballet_stellaire: "\u661F\u7A7A",
  transport_key: "\u30AD\u30FC",
  transport_time: "\u62CD\u5B50",
  crate_title: "\u30EC\u30B3\u30FC\u30C9\u30AF\u30EC\u30FC\u30C8",
  crate_discs: "{count}\u30C7\u30A3\u30B9\u30AF",
  mixer_load: "\u8AAD\u8FBC",
  grab_download: "\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9",
  grab_save: "\u4FDD\u5B58",
  pix_badge: "\u753B\u50CF\u30A8\u30C7\u30A3\u30BF",
  pix_brightness: "\u660E\u308B\u3055",
  pix_contrast: "\u30B3\u30F3\u30C8\u30E9\u30B9\u30C8",
  video_capture: "\u30D5\u30EC\u30FC\u30E0\u30AD\u30E3\u30D7\u30C1\u30E3",
  video_speed: "\u901F\u5EA6",
  sidebar_nodes: "{count}\u30CE\u30FC\u30C9",
  lang_label: "\u8A00\u8A9E",
};

// ─── Chinese ──────────────────────────────────────────────────────────────────

const zh: TranslationMap = {
  app_subtitle: "\u5973\u738B\u4E4B\u58F0",
  footer_text: "ADA OPERA \u2014 \u5973\u738B\u4E4B\u58F0",
  view_orchestra: "\u7BA1\u5F26\u4E50\u961F",
  view_studio: "\u5DE5\u4F5C\u5BA4",
  view_dj: "\u8F6C\u76D8",
  view_partition: "\u4E50\u8C31",
  view_spectrum: "\u9891\u8C31",
  view_media: "\u5A92\u4F53",
  view_ballet: "\u82AD\u857E\u821E",
  orchestra_title: "\u5973\u738B\u7BA1\u5F26\u4E50\u961F",
  orchestra_subtitle: "{count}\u4EF6\u4E50\u5668 | {sections}\u4E2A\u58F0\u90E8 | \u70B9\u51FB\u6F14\u594F",
  section_strings: "\u5F26\u4E50",
  section_woodwinds: "\u6728\u7BA1",
  section_brass: "\u94DC\u7BA1",
  section_percussion: "\u6253\u51FB\u4E50",
  section_keyboard: "\u952E\u76D8",
  click_to_play: "\u70B9\u51FB\u6F14\u594F{name}",
  dj_title: "DJ\u8F6C\u76D8",
  ballet_title: "\u5973\u738B\u82AD\u857E\u821E",
  ballet_fullscreen: "\u5168\u5C4F",
  ballet_stellaire: "\u661F\u7A7A",
  transport_key: "\u8C03",
  transport_time: "\u62CD\u53F7",
  crate_title: "\u5531\u7247\u7BB1",
  crate_discs: "{count}\u5F20\u5531\u7247",
  mixer_load: "\u52A0\u8F7D",
  grab_download: "\u4E0B\u8F7D",
  grab_save: "\u4FDD\u5B58",
  pix_badge: "\u56FE\u50CF\u7F16\u8F91\u5668",
  pix_brightness: "\u4EAE\u5EA6",
  pix_contrast: "\u5BF9\u6BD4\u5EA6",
  video_capture: "\u622A\u53D6\u5E27",
  video_speed: "\u901F\u5EA6",
  sidebar_nodes: "{count}\u4E2A\u8282\u70B9",
  lang_label: "\u8BED\u8A00",
};

// ─── Korean ───────────────────────────────────────────────────────────────────

const ko: TranslationMap = {
  app_subtitle: "\uC5EC\uC655\uC758 \uBAA9\uC18C\uB9AC",
  footer_text: "ADA OPERA \u2014 \uC5EC\uC655\uC758 \uBAA9\uC18C\uB9AC",
  view_orchestra: "\uC624\uCF00\uC2A4\uD2B8\uB77C",
  view_dj: "\uD134\uD14C\uC774\uBE14",
  view_partition: "\uC545\uBCF4",
  view_media: "\uBBF8\uB514\uC5B4",
  view_ballet: "\uBC1C\uB808",
  orchestra_title: "\uC5EC\uC655\uC758 \uC624\uCF00\uC2A4\uD2B8\uB77C",
  orchestra_subtitle: "{count}\uC545\uAE30 | {sections}\uC139\uC158 | \uD074\uB9AD\uD558\uC5EC \uC5F0\uC8FC",
  section_strings: "\uD604\uC545\uAE30",
  section_woodwinds: "\uBAA9\uAD00\uC545\uAE30",
  section_brass: "\uAE08\uAD00\uC545\uAE30",
  section_percussion: "\uD0C0\uC545\uAE30",
  section_keyboard: "\uAC74\uBC18\uC545\uAE30",
  dj_title: "DJ \uD134\uD14C\uC774\uBE14",
  ballet_title: "\uC5EC\uC655\uC758 \uBC1C\uB808",
  ballet_fullscreen: "\uC804\uCCB4\uD654\uBA74",
  transport_key: "\uC870",
  crate_title: "\uB808\uCF54\uB4DC \uC0C1\uC790",
  crate_discs: "{count}\uC7A5 \uB514\uC2A4\uD06C",
  mixer_load: "\uB85C\uB4DC",
  grab_download: "\uB2E4\uC6B4\uB85C\uB4DC",
  grab_save: "\uC800\uC7A5",
  pix_badge: "\uC774\uBBF8\uC9C0 \uD3B8\uC9D1\uAE30",
  pix_brightness: "\uBC1D\uAE30",
  video_capture: "\uD504\uB808\uC784 \uCEA1\uCC98",
  video_speed: "\uC18D\uB3C4",
  sidebar_nodes: "{count}\uAC1C \uB178\uB4DC",
  lang_label: "\uC5B8\uC5B4",
};

// ─── Arabic ───────────────────────────────────────────────────────────────────

const ar: TranslationMap = {
  app_subtitle: "\u0635\u0648\u062A \u0627\u0644\u0645\u0644\u0643\u0629",
  footer_text: "ADA OPERA \u2014 \u0635\u0648\u062A \u0627\u0644\u0645\u0644\u0643\u0629",
  view_orchestra: "\u0627\u0644\u0623\u0648\u0631\u0643\u0633\u062A\u0631\u0627",
  view_studio: "\u0627\u0644\u0627\u0633\u062A\u0648\u062F\u064A\u0648",
  view_dj: "\u0627\u0644\u062F\u064A\u062C\u064A",
  view_partition: "\u0627\u0644\u0646\u0648\u062A\u0629",
  view_media: "\u0627\u0644\u0648\u0633\u0627\u0626\u0637",
  view_ballet: "\u0627\u0644\u0628\u0627\u0644\u064A\u0647",
  orchestra_title: "\u0623\u0648\u0631\u0643\u0633\u062A\u0631\u0627 \u0627\u0644\u0645\u0644\u0643\u0629",
  section_strings: "\u0627\u0644\u0648\u062A\u0631\u064A\u0627\u062A",
  section_woodwinds: "\u0627\u0644\u0646\u0641\u062E\u064A\u0627\u062A \u0627\u0644\u062E\u0634\u0628\u064A\u0629",
  section_brass: "\u0627\u0644\u0646\u062D\u0627\u0633\u064A\u0627\u062A",
  section_percussion: "\u0627\u0644\u0625\u064A\u0642\u0627\u0639\u064A\u0627\u062A",
  section_keyboard: "\u0644\u0648\u062D\u0629 \u0627\u0644\u0645\u0641\u0627\u062A\u064A\u062D",
  ballet_title: "\u0628\u0627\u0644\u064A\u0647 \u0627\u0644\u0645\u0644\u0643\u0629",
  ballet_fullscreen: "\u0634\u0627\u0634\u0629 \u0643\u0627\u0645\u0644\u0629",
  crate_title: "\u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u0623\u0633\u0637\u0648\u0627\u0646\u0627\u062A",
  mixer_load: "\u062A\u062D\u0645\u064A\u0644",
  grab_download: "\u062A\u0646\u0632\u064A\u0644",
  grab_save: "\u062D\u0641\u0638",
  pix_brightness: "\u0627\u0644\u0633\u0637\u0648\u0639",
  video_speed: "\u0627\u0644\u0633\u0631\u0639\u0629",
  lang_label: "\u0627\u0644\u0644\u063A\u0629",
};

// ─── Russian ──────────────────────────────────────────────────────────────────

const ru: TranslationMap = {
  app_subtitle: "\u0413\u043E\u043B\u043E\u0441 \u041A\u043E\u0440\u043E\u043B\u0435\u0432\u044B",
  footer_text: "ADA OPERA \u2014 \u0413\u043E\u043B\u043E\u0441 \u041A\u043E\u0440\u043E\u043B\u0435\u0432\u044B",
  view_orchestra: "\u041E\u0440\u043A\u0435\u0441\u0442\u0440",
  view_studio: "\u0421\u0442\u0443\u0434\u0438\u044F",
  view_dj: "\u0412\u0435\u0440\u0442\u0443\u0448\u043A\u0430",
  view_partition: "\u041F\u0430\u0440\u0442\u0438\u0442\u0443\u0440\u0430",
  view_media: "\u041C\u0435\u0434\u0438\u0430",
  view_ballet: "\u0411\u0430\u043B\u0435\u0442",
  orchestra_title: "\u041E\u0440\u043A\u0435\u0441\u0442\u0440 \u041A\u043E\u0440\u043E\u043B\u0435\u0432\u044B",
  orchestra_subtitle: "{count} \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u043E\u0432 | {sections} \u0441\u0435\u043A\u0446\u0438\u0439 | \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u0434\u043B\u044F \u0438\u0433\u0440\u044B",
  section_strings: "\u0421\u0422\u0420\u0423\u041D\u041D\u042B\u0415",
  section_woodwinds: "\u0414\u0415\u0420\u0415\u0412\u042F\u041D\u041D\u042B\u0415",
  section_brass: "\u041C\u0415\u0414\u041D\u042B\u0415",
  section_percussion: "\u0423\u0414\u0410\u0420\u041D\u042B\u0415",
  section_keyboard: "\u041A\u041B\u0410\u0412\u0418\u0428\u041D\u042B\u0415",
  dj_title: "DJ \u0412\u0435\u0440\u0442\u0443\u0448\u043A\u0430",
  ballet_title: "\u0411\u0430\u043B\u0435\u0442 \u041A\u043E\u0440\u043E\u043B\u0435\u0432\u044B",
  ballet_fullscreen: "\u041F\u041E\u041B\u041D\u042B\u0419 \u042D\u041A\u0420\u0410\u041D",
  crate_title: "\u042F\u0429\u0418\u041A \u041F\u041B\u0410\u0421\u0422\u0418\u041D\u041E\u041A",
  crate_discs: "{count} \u043F\u043B\u0430\u0441\u0442\u0438\u043D\u043E\u043A",
  mixer_load: "\u0417\u0410\u0413\u0420.",
  grab_download: "\u0421\u043A\u0430\u0447\u0430\u0442\u044C",
  grab_save: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C",
  pix_badge: "\u0420\u0435\u0434\u0430\u043A\u0442\u043E\u0440 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439",
  pix_brightness: "\u042F\u0440\u043A\u043E\u0441\u0442\u044C",
  pix_contrast: "\u041A\u043E\u043D\u0442\u0440\u0430\u0441\u0442",
  video_speed: "\u0421\u043A\u043E\u0440\u043E\u0441\u0442\u044C",
  sidebar_nodes: "{count} \u0443\u0437\u043B\u043E\u0432",
  lang_label: "\u042F\u0417\u042B\u041A",
};

// ─── Hindi ────────────────────────────────────────────────────────────────────

const hi: TranslationMap = {
  app_subtitle: "\u0930\u093E\u0928\u0940 \u0915\u0940 \u0906\u0935\u093E\u091C\u093C",
  footer_text: "ADA OPERA \u2014 \u0930\u093E\u0928\u0940 \u0915\u0940 \u0906\u0935\u093E\u091C\u093C",
  view_orchestra: "\u0911\u0930\u094D\u0915\u0947\u0938\u094D\u091F\u094D\u0930\u093E",
  orchestra_title: "\u0930\u093E\u0928\u0940 \u0915\u093E \u0911\u0930\u094D\u0915\u0947\u0938\u094D\u091F\u094D\u0930\u093E",
  section_strings: "\u0924\u093E\u0930 \u0935\u093E\u0926\u094D\u092F",
  section_percussion: "\u0924\u093E\u0932 \u0935\u093E\u0926\u094D\u092F",
  ballet_title: "\u0930\u093E\u0928\u0940 \u0915\u093E \u092C\u0948\u0932\u0947",
  ballet_fullscreen: "\u092A\u0942\u0930\u094D\u0923 \u0938\u094D\u0915\u094D\u0930\u0940\u0928",
  mixer_load: "\u0932\u094B\u0921",
  grab_download: "\u0921\u093E\u0909\u0928\u0932\u094B\u0921",
  lang_label: "\u092D\u093E\u0937\u093E",
};

// ─── Turkish ──────────────────────────────────────────────────────────────────

const tr: TranslationMap = {
  app_subtitle: "Krali\u00E7enin Sesi",
  footer_text: "ADA OPERA \u2014 Krali\u00E7enin Sesi",
  view_orchestra: "Orkestra",
  view_dj: "Pikap",
  view_partition: "Partisyon",
  view_media: "Medya",
  orchestra_title: "Krali\u00E7enin Orkestr\u0131",
  section_strings: "YAYLILAR",
  section_woodwinds: "TAHTA \u00DCFLEMEL\u0130LER",
  section_brass: "BAKIR \u00DCFLEMEL\u0130LER",
  section_percussion: "VURMALILAR",
  section_keyboard: "TU\u015ELAR",
  dj_title: "DJ Pikap",
  ballet_title: "Krali\u00E7enin Balesi",
  ballet_fullscreen: "TAM EKRAN",
  crate_title: "PLAK KUTUSU",
  crate_discs: "{count} plak",
  mixer_load: "Y\u00DCKLE",
  grab_download: "\u0130ndir",
  grab_save: "Kaydet",
  pix_brightness: "Parlakl\u0131k",
  video_speed: "H\u0131z",
  lang_label: "D\u0130L",
};

// ─── Dutch ────────────────────────────────────────────────────────────────────

const nl: TranslationMap = {
  app_subtitle: "De Stem van de Koningin",
  footer_text: "ADA OPERA \u2014 De Stem van de Koningin",
  view_orchestra: "Orkest",
  view_dj: "Draaitafel",
  view_partition: "Partituur",
  view_media: "Media",
  orchestra_title: "Het Orkest van de Koningin",
  section_strings: "STRIJKERS",
  section_woodwinds: "HOUTBLAZERS",
  section_brass: "KOPERBLAZERS",
  section_percussion: "SLAGWERK",
  section_keyboard: "TOETSEN",
  dj_title: "DJ Draaitafel",
  ballet_title: "Het Ballet van de Koningin",
  ballet_fullscreen: "VOLLEDIG SCHERM",
  crate_title: "PLATENBAK",
  crate_discs: "{count} platen",
  mixer_load: "LADEN",
  grab_download: "Downloaden",
  grab_save: "Opslaan",
  pix_brightness: "Helderheid",
  video_speed: "Snelheid",
  sidebar_nodes: "{count} knooppunten",
  lang_label: "TAAL",
};

// ─── Polish ───────────────────────────────────────────────────────────────────

const pl: TranslationMap = {
  app_subtitle: "G\u0142os Kr\u00F3lowej",
  footer_text: "ADA OPERA \u2014 G\u0142os Kr\u00F3lowej",
  view_orchestra: "Orkiestra",
  view_dj: "Gramofon",
  view_partition: "Partytura",
  view_media: "Media",
  orchestra_title: "Orkiestra Kr\u00F3lowej",
  section_strings: "SMYCZKI",
  section_woodwinds: "DREWNIANE D\u0118TE",
  section_brass: "BLASZANE",
  section_percussion: "PERKUSJA",
  section_keyboard: "KLAWISZOWE",
  dj_title: "DJ Gramofon",
  ballet_title: "Balet Kr\u00F3lowej",
  ballet_fullscreen: "PE\u0141NY EKRAN",
  crate_title: "SKRZYNKA P\u0141YT",
  crate_discs: "{count} p\u0142yt",
  mixer_load: "ZA\u0141ADUJ",
  grab_download: "Pobierz",
  grab_save: "Zapisz",
  pix_brightness: "Jasno\u015B\u0107",
  video_speed: "Pr\u0119dko\u015B\u0107",
  sidebar_nodes: "{count} w\u0119z\u0142\u00F3w",
  lang_label: "J\u0118ZYK",
};

// ─── Swedish ──────────────────────────────────────────────────────────────────

const sv: TranslationMap = {
  app_subtitle: "Drottningens R\u00F6st",
  footer_text: "ADA OPERA \u2014 Drottningens R\u00F6st",
  view_orchestra: "Orkester",
  view_dj: "Skivspelare",
  view_partition: "Partitur",
  view_media: "Media",
  orchestra_title: "Drottningens Orkester",
  section_strings: "STR\u00C5KAR",
  section_woodwinds: "TR\u00C4BL\u00C5S",
  section_brass: "BL\u00C5S",
  section_percussion: "SLAGVERK",
  section_keyboard: "TANGENTER",
  dj_title: "DJ Skivspelare",
  ballet_title: "Drottningens Balett",
  ballet_fullscreen: "HELSK\u00C4RM",
  crate_title: "SKIVL\u00C5DA",
  crate_discs: "{count} skivor",
  mixer_load: "LADDA",
  grab_download: "Ladda ner",
  grab_save: "Spara",
  pix_brightness: "Ljusstyrka",
  video_speed: "Hastighet",
  sidebar_nodes: "{count} noder",
  lang_label: "SPR\u00C5K",
};

// ─── All Translations ─────────────────────────────────────────────────────────

const translations: AllTranslations = {
  fr, en, es, pt, de, it, ja, zh, ko, ar, ru, hi, tr, nl, pl, sv,
};

// ─── i18n Store ───────────────────────────────────────────────────────────────

interface I18nState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useI18n = create<I18nState>((set) => ({
  lang: (typeof navigator !== "undefined"
    ? (navigator.language?.slice(0, 2) as Lang) || "fr"
    : "fr"),
  setLang: (lang) => set({ lang }),
}));

// ─── Translation Function ─────────────────────────────────────────────────────

/**
 * Resolve a translation key. Falls back: lang → en → fr → key.
 * Supports interpolation: t("crate_discs", { count: 5 }) → "5 disques"
 */
export function translate(lang: Lang, key: string, params?: Record<string, string | number>): string {
  const val = translations[lang]?.[key] ?? translations.en?.[key] ?? translations.fr?.[key] ?? key;
  if (!params) return val;
  return val.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
}

/**
 * React hook — returns a bound translate function for the current language.
 *
 * Usage:
 *   const t = useT();
 *   return <span>{t("orchestra_title")}</span>
 */
export function useT(): (key: string, params?: Record<string, string | number>) => string {
  const lang = useI18n((s) => s.lang);
  return (key: string, params?: Record<string, string | number>) => translate(lang, key, params);
}
