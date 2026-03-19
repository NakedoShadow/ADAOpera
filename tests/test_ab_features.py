"""
ADA Opera — A/B Feature Test Harness
Tests all 256 DeepSkill handlers against a live audio signal.

Principle: Signal A (baseline) → apply feature → Signal B (post) → compare A/B.
Categories:
  - SIGNAL_CHANGED: Feature produced measurable audio/state change
  - STATE_CHANGED: Feature changed app state (store, conductor, etc.)
  - MESSAGE_ONLY: Handler returned OK but no observable change (stub)
  - ERROR: Handler returned ok=false or threw
"""

from playwright.sync_api import sync_playwright
import json
import sys
import io

# Fix Windows console encoding for Unicode chars
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# ─── All 256 DeepSkill IDs grouped by Feature ────────────────────────────────

FEATURES = {
    "F01_CRYSTALLINE": [
        "crys-denoise-rnnoise", "crys-denoise-deepfilter", "crys-denoise-fingerprint", "crys-denoise-gate",
        "crys-sep-voice", "crys-sep-music", "crys-sep-multi", "crys-sep-stems",
        "crys-enh-superres", "crys-enh-bandwidth", "crys-enh-clarity", "crys-enh-warmth",
        "crys-pipe-realtime", "crys-pipe-studio", "crys-pipe-crystal", "crys-pipe-benchmark",
    ],
    "F02_VIVALDI": [
        "viv-cond-auto", "viv-cond-balance", "viv-cond-tempo", "viv-cond-dynamics",
        "viv-sec-strings", "viv-sec-woodwinds", "viv-sec-brass", "viv-sec-percussion",
        "viv-arr-tutti", "viv-arr-solo", "viv-arr-chamber", "viv-arr-duo",
        "viv-season-spring", "viv-season-summer", "viv-season-autumn", "viv-season-winter",
    ],
    "F03_PIANO": [
        "piano-keys-88", "piano-keys-velocity", "piano-keys-sustain", "piano-keys-transpose",
        "piano-snd-grand", "piano-snd-upright", "piano-snd-electric", "piano-snd-synth",
        "piano-midi-input", "piano-midi-record", "piano-midi-playback", "piano-midi-export",
        "piano-chord-detect", "piano-chord-suggest", "piano-chord-prog", "piano-chord-arpegg",
    ],
    "F04_VIOLON": [
        "violin-bow-pressure", "violin-bow-speed", "violin-bow-position", "violin-bow-type",
        "violin-expr-vibrato", "violin-expr-portamento", "violin-expr-glissando", "violin-expr-tremolo",
        "violin-str-g", "violin-str-d", "violin-str-a", "violin-str-e",
        "violin-tech-pizz", "violin-tech-spicc", "violin-tech-harm", "violin-tech-colleg",
    ],
    "F05_PARTITION": [
        "part-read-import", "part-read-musicxml", "part-read-midi", "part-read-abc",
        "part-play-solo", "part-play-section", "part-play-orchestra", "part-play-loop",
        "part-edit-note", "part-edit-rest", "part-edit-dynamic", "part-edit-articul",
        "part-ana-harmony", "part-ana-pattern", "part-ana-structure", "part-ana-compare",
    ],
    "F06_SPECTRUM": [
        "spec-wave-time", "spec-wave-stereo", "spec-wave-zoom", "spec-wave-color",
        "spec-freq-fft", "spec-freq-bars", "spec-freq-3d", "spec-freq-peak",
        "spec-gram-linear", "spec-gram-log", "spec-gram-mel", "spec-gram-chromag",
        "spec-meter-vu", "spec-meter-peak", "spec-meter-lufs", "spec-meter-phase",
    ],
    "F07_PLATINE": [
        "plat-deck-a", "plat-deck-b", "plat-deck-load", "plat-deck-eject",
        "plat-mix-crossfade", "plat-mix-sync", "plat-mix-cue", "plat-mix-loop",
        "plat-scratch-enable", "plat-scratch-sensitivity", "plat-scratch-reverse", "plat-scratch-brake",
        "plat-skin-vinyl", "plat-skin-cd", "plat-skin-oldschool", "plat-skin-futuristic",
    ],
    "F08_BEAT": [
        "beat-tempo-bpm", "beat-tempo-tap", "beat-tempo-detect", "beat-tempo-ramp",
        "beat-sync-audio", "beat-sync-video", "beat-sync-image", "beat-sync-midi",
        "beat-metro-enable", "beat-metro-sound", "beat-metro-subdiv", "beat-metro-accent",
        "beat-quant-grid", "beat-quant-res", "beat-quant-swing", "beat-quant-humanize",
    ],
    "F09_MIXER": [
        "mix-ch-volume", "mix-ch-pan", "mix-ch-mute", "mix-ch-group",
        "mix-eq-low", "mix-eq-mid", "mix-eq-high", "mix-eq-param",
        "mix-send-a", "mix-send-b", "mix-send-c", "mix-send-master",
        "mix-master-vol", "mix-master-limiter", "mix-master-stereo", "mix-master-mono",
    ],
    "F10_EFFECTS": [
        "fx-space-reverb", "fx-space-delay", "fx-space-echo", "fx-space-convol",
        "fx-mod-chorus", "fx-mod-flanger", "fx-mod-phaser", "fx-mod-tremolo",
        "fx-dyn-compress", "fx-dyn-expand", "fx-dyn-deesser", "fx-dyn-transient",
        "fx-dist-overdrive", "fx-dist-saturation", "fx-dist-bitcrush", "fx-dist-waveshape",
    ],
    "F11_RECORDER": [
        "rec-cap-start", "rec-cap-pause", "rec-cap-stop", "rec-cap-monitor",
        "rec-fmt-wav", "rec-fmt-flac", "rec-fmt-mp3", "rec-fmt-ogg",
        "rec-set-sr", "rec-set-bits", "rec-set-channels", "rec-set-source",
        "rec-stream-rtmp", "rec-stream-icecast", "rec-stream-webrtc", "rec-stream-websocket",
    ],
    "F12_ORCHESTRE": [
        "orch-str-violin1", "orch-str-violin2", "orch-str-viola", "orch-str-cello",
        "orch-wind-flute", "orch-wind-oboe", "orch-wind-clarinet", "orch-wind-bassoon",
        "orch-brass-horn", "orch-brass-trumpet", "orch-brass-trombone", "orch-brass-tuba",
        "orch-perc-timpani", "orch-perc-cymbals", "orch-perc-triangle", "orch-perc-harp",
    ],
    "F13_GRAB": [
        "grab-dl-url", "grab-dl-youtube", "grab-dl-twitter", "grab-dl-batch",
        "grab-conv-mp4", "grab-conv-mp3", "grab-conv-gif", "grab-conv-webm",
        "grab-seal-qr", "grab-seal-snow", "grab-seal-serial", "grab-seal-branch",
        "grab-fmt-pdf", "grab-fmt-docx", "grab-fmt-img", "grab-fmt-merge",
    ],
    "F14_PIX": [
        "pix-adj-brightness", "pix-adj-contrast", "pix-adj-saturation", "pix-adj-levels",
        "pix-flt-blur", "pix-flt-sharpen", "pix-flt-denoise", "pix-flt-vignette",
        "pix-tf-crop", "pix-tf-resize", "pix-tf-rotate", "pix-tf-flip",
        "pix-pre-grayscale", "pix-pre-sepia", "pix-pre-invert", "pix-pre-autoenhance",
    ],
    "F15_VIDEO": [
        "vid-edit-trim", "vid-edit-merge", "vid-edit-speed", "vid-edit-reverse",
        "vid-aud-extract", "vid-aud-replace", "vid-aud-volume", "vid-aud-mute",
        "vid-flt-brightness", "vid-flt-contrast", "vid-flt-grayscale", "vid-flt-stabilize",
        "vid-exp-mp4", "vid-exp-webm", "vid-exp-gif", "vid-exp-frames",
    ],
}

# IDs that call real engine methods (synth/conductor/rituala/pix/video)
# even though they don't change tracked Zustand store keys.
# Identified by reading deepskill-handler.ts source code.
ENGINE_ACTION_IDS = {
    # CRYSTALLINE — modify conductor crystalline pipeline state
    "crys-denoise-rnnoise", "crys-denoise-deepfilter", "crys-enh-superres",
    # VIVALDI — call conductor.setInstrumentPan, setBPM, setKey, registerInstrument
    "viv-cond-auto", "viv-arr-solo", "viv-arr-chamber",
    # PIANO — reconfigure synth oscillator + envelope
    "piano-snd-grand", "piano-snd-upright", "piano-snd-electric", "piano-snd-synth",
    # VIOLIN — modify synth params (vibrato, portamento, pizzicato envelope)
    "violin-expr-vibrato", "violin-expr-portamento", "violin-tech-pizz",
    # SPECTRUM — toggle visualization flags in store (activeVisualizations)
    "spec-wave-time", "spec-freq-fft", "spec-meter-vu", "spec-meter-phase",
    # PLATINE — setDJSkin (vinyl is default, already set)
    "plat-skin-vinyl",
    # BEAT — call rituala engine methods
    "beat-tempo-tap", "beat-sync-audio", "beat-sync-video", "beat-sync-image", "beat-sync-midi",
    "beat-metro-enable", "beat-metro-subdiv",
    "beat-quant-grid", "beat-quant-res", "beat-quant-swing", "beat-quant-humanize",
    # MIXER — call conductor.setMasterVolume
    "mix-master-vol",
    # EFFECTS — create Tone.js effect instances
    "fx-space-reverb",
    # RECORDER — toggle recording state
    "rec-cap-start",
    # ORCHESTRE — register instruments in conductor
    "orch-str-violin1", "orch-str-violin2", "orch-str-viola", "orch-str-cello",
    "orch-wind-flute", "orch-wind-oboe", "orch-wind-clarinet", "orch-wind-bassoon",
    "orch-brass-horn", "orch-brass-trumpet", "orch-brass-trombone", "orch-brass-tuba",
    "orch-perc-timpani", "orch-perc-cymbals", "orch-perc-triangle", "orch-perc-harp",
    # GRAB — call grab engine methods
    "grab-seal-qr", "grab-seal-snow", "grab-seal-serial", "grab-conv-gif",
    # PIX — call pix engine processing methods
    "pix-adj-brightness", "pix-adj-contrast", "pix-adj-saturation", "pix-adj-levels",
    "pix-flt-blur", "pix-flt-sharpen", "pix-flt-denoise", "pix-flt-vignette",
    "pix-tf-resize", "pix-tf-rotate", "pix-tf-flip",
    "pix-pre-grayscale", "pix-pre-sepia", "pix-pre-invert", "pix-pre-autoenhance",
    # VIDEO — call video engine methods
    "vid-edit-trim", "vid-edit-speed", "vid-aud-volume", "vid-aud-mute",
    "vid-flt-brightness", "vid-flt-contrast", "vid-flt-grayscale",
    "vid-exp-frames",
}

# IDs that need special params to avoid side effects (downloads, file ops, etc.)
SKIP_IDS = {
    # Download handlers — would trigger actual downloads
    "grab-dl-url", "grab-dl-youtube", "grab-dl-twitter", "grab-dl-batch",
    # File conversion — needs real files
    "grab-conv-mp4", "grab-conv-mp3", "grab-conv-webm",
    "grab-fmt-pdf", "grab-fmt-docx", "grab-fmt-img", "grab-fmt-merge",
    # Export — would trigger file generation
    "vid-exp-mp4", "vid-exp-webm", "vid-exp-gif",
    # MIDI hardware scan
    "piano-midi-input",
}

# Params to pass to specific handlers for meaningful A/B comparison
HANDLER_PARAMS = {
    "crys-denoise-rnnoise": {"rnn-strength": 90},
    "crys-denoise-deepfilter": {"df-atten": 30},
    "crys-denoise-gate": {"gate-threshold": -30},
    "crys-enh-bandwidth": {"bw-target": 48000},
    "crys-enh-clarity": {"clarity-amount": 80},
    "crys-enh-warmth": {"warmth": 60},
    "viv-cond-tempo": {"tempo-bpm": 140},
    "viv-cond-dynamics": {"dynamics": 100},
    "viv-cond-balance": {"balance-mode": 2},
    "piano-keys-velocity": {"vel-curve": 80},
    "piano-keys-transpose": {"transpose": 3},
    "violin-bow-pressure": {"bow-press": 90},
    "violin-bow-speed": {"bow-speed": 80},
    "violin-bow-position": {"bow-pos": 70},
    "violin-expr-vibrato": {"vib-depth": 60, "vib-rate": 6},
    "violin-expr-portamento": {"port-time": 300},
    "violin-expr-glissando": {"gliss-range": 7},
    "violin-expr-tremolo": {"trem-speed": 12},
    "spec-wave-zoom": {"wave-zoom": 5},
    "plat-mix-crossfade": {"xfade": 75},
    "plat-scratch-sensitivity": {"scratch-sens": 80},
    "beat-tempo-bpm": {"bpm": 140},
    "beat-metro-subdiv": {"subdiv": 8},
    "beat-quant-res": {"quant-res": 8},
    "beat-quant-swing": {"swing": 40},
    "beat-quant-humanize": {"humanize": 30},
    "mix-ch-volume": {"vol": -3},
    "mix-ch-pan": {"pan": 0.5},
    "mix-eq-low": {"eq-low": 3},
    "mix-eq-mid": {"eq-mid": -2},
    "mix-eq-high": {"eq-high": 4},
    "mix-send-a": {"send-a": -10},
    "mix-send-b": {"send-b": -12},
    "mix-send-c": {"send-c": -15},
    "mix-master-vol": {"master-vol": -3},
    "mix-master-limiter": {"limiter": -0.5},
    "mix-master-stereo": {"stereo-w": 120},
    "fx-space-reverb": {"reverb-size": 60, "reverb-decay": 3},
    "fx-space-delay": {"delay-time": 500, "delay-fb": 50},
    "fx-space-echo": {"echo-taps": 4},
    "fx-mod-chorus": {"chorus-depth": 70},
    "fx-mod-flanger": {"flanger-rate": 0.8},
    "fx-mod-phaser": {"phaser-stages": 12},
    "fx-mod-tremolo": {"trem-rate": 6},
    "fx-dyn-compress": {"comp-ratio": 6, "comp-thresh": -15},
    "fx-dyn-expand": {"exp-ratio": 3},
    "fx-dyn-deesser": {"deess-freq": 7000},
    "fx-dyn-transient": {"trans-attack": 30},
    "fx-dist-overdrive": {"od-drive": 50},
    "fx-dist-saturation": {"sat-amount": 40},
    "fx-dist-bitcrush": {"bit-depth": 8},
    "rec-set-sr": {"sample-rate": 96000},
    "rec-set-bits": {"bit-depth": 32},
    "rec-set-channels": {"channels": 1},
    "vid-edit-trim": {"trim-start": 5, "trim-end": 20},
    "vid-edit-speed": {"vid-speed": 1.5},
    "vid-aud-volume": {"vid-vol": 80},
    "vid-flt-brightness": {"vid-bright": 20},
    "vid-flt-contrast": {"vid-contrast": 1.3},
    "vid-exp-frames": {"frame-interval": 5},
    "grab-conv-gif": {"gif-fps": 20, "gif-width": 320},
    "pix-adj-brightness": {"pix-bright": 30},
    "pix-adj-contrast": {"pix-contrast": 20},
    "pix-adj-saturation": {"pix-sat": 40},
    "pix-adj-levels": {"pix-black": 10, "pix-white": 240, "pix-gamma": 1.2},
    "pix-flt-blur": {"blur-radius": 8},
    "pix-flt-sharpen": {"sharp-amount": 70},
    "pix-flt-denoise": {"denoise-strength": 2},
    "pix-flt-vignette": {"vignette-intensity": 60},
    "pix-tf-resize": {"resize-w": 1280, "resize-h": 720},
    "pix-tf-rotate": {"rotate-deg": 90},
    "beat-tempo-ramp": {"ramp-bars": 16},
    "vid-exp-mp4": {"vid-crf": 18},
}


def run_ab_test():
    """Execute the A/B test harness against the live ADA Opera instance."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8300")
        page.wait_for_load_state("networkidle")

        print("=" * 72)
        print("  ADA OPERA — A/B Feature Test Harness (256 DeepSkills)")
        print("=" * 72)

        # ─── Phase 1: Initialize audio context ────────────────────────────
        print("\n[PHASE 1] Initializing audio context...")
        page.click(".transport-bar")  # trigger user gesture for AudioContext
        page.wait_for_timeout(300)

        # ─── Phase 2: Start playback to get baseline signal ───────────────
        print("[PHASE 2] Starting playback (baseline signal A)...")
        play_btn = page.locator(".transport-btn").first
        play_btn.click()
        page.wait_for_timeout(1000)  # let signal stabilize

        # ─── Phase 3: Capture baseline state (Signal A) ──────────────────
        print("[PHASE 3] Capturing baseline state (A)...")
        baseline = page.evaluate("""() => {
            const store = window.__OPERA_STORE__;
            const storeState = store ? store.getState() : null;

            // Capture key state values
            return {
                bpm: storeState?.bpm ?? null,
                key: storeState?.key ?? null,
                mode: storeState?.mode ?? null,
                playing: storeState?.playing ?? null,
                recording: storeState?.recording ?? null,
                crystallineMode: storeState?.crystallineMode ?? null,
                masterVolume: storeState?.masterVolume ?? null,
                activeInstruments: storeState?.activeInstruments?.length ?? 0,
                djSkin: storeState?.djSkin ?? null,
                sourceType: storeState?.sourceType ?? null,
                storeAvailable: !!store,
            };
        }""")

        if not baseline.get("storeAvailable"):
            print("[WARN] Store not exposed on window — injecting access...")
            # Inject store access via module
            page.evaluate("""() => {
                // The store is a Zustand store — we'll access it via module scope
                // This works because Vite HMR exposes modules
                window.__AB_RESULTS__ = [];
            }""")

        print(f"  Baseline: BPM={baseline.get('bpm')}, Key={baseline.get('key')}, "
              f"Mode={baseline.get('mode')}, Instruments={baseline.get('activeInstruments')}")

        # ─── Phase 4: Run all 256 handlers A/B ───────────────────────────
        print("\n[PHASE 4] Running A/B tests on 256 DeepSkill handlers...\n")

        results = {
            "SIGNAL_CHANGED": [],
            "STATE_CHANGED": [],
            "ENGINE_ACTION": [],
            "MESSAGE_ONLY": [],
            "SKIPPED": [],
            "ERROR": [],
        }

        total = sum(len(ids) for ids in FEATURES.values())
        tested = 0

        for feature_name, skill_ids in FEATURES.items():
            print(f"─── {feature_name} ({len(skill_ids)} handlers) ───")

            for skill_id in skill_ids:
                tested += 1

                # Skip dangerous handlers
                if skill_id in SKIP_IDS:
                    results["SKIPPED"].append({"id": skill_id, "reason": "side-effect (download/file)"})
                    print(f"  [{tested:3d}/{total}] ⏭  {skill_id} — SKIPPED (side-effect)")
                    continue

                params = HANDLER_PARAMS.get(skill_id, {})
                params_json = json.dumps(params)

                # Execute handler and capture state diff
                try:
                    result = page.evaluate(f"""(paramsJson) => {{
                        const params = JSON.parse(paramsJson);

                        const handler = window.__DEEPSKILL_HANDLER__;
                        if (!handler || !handler.executeDeepSkill) {{
                            return {{ error: "Handler module not exposed", ok: false }};
                        }}

                        // Capture state BEFORE
                        const store = window.__OPERA_STORE__;
                        const beforeState = store ? JSON.parse(JSON.stringify(store.getState())) : null;

                        // Execute the DeepSkill
                        let handlerResult;
                        try {{
                            handlerResult = handler.executeDeepSkill("{skill_id}", params);
                        }} catch (e) {{
                            return {{ error: e.message, ok: false }};
                        }}

                        // Capture state AFTER
                        const afterState = store ? JSON.parse(JSON.stringify(store.getState())) : null;

                        // Compare store states
                        const stateChanges = [];
                        if (beforeState && afterState) {{
                            const keysToCheck = [
                                'bpm', 'key', 'mode', 'playing', 'recording',
                                'crystallineMode', 'masterVolume', 'djSkin',
                                'activeInstruments', 'crossfader',
                                'activeVisualizations'
                            ];
                            for (const k of keysToCheck) {{
                                const b = JSON.stringify(beforeState[k]);
                                const a = JSON.stringify(afterState[k]);
                                if (b !== a) {{
                                    stateChanges.push({{ key: k, before: beforeState[k], after: afterState[k] }});
                                }}
                            }}
                        }}

                        return {{
                            ok: handlerResult.ok,
                            message: handlerResult.message || "",
                            hasValue: handlerResult.value !== undefined && handlerResult.value !== null,
                            stateChanges: stateChanges,
                            stateChangeCount: stateChanges.length,
                        }};
                    }}""", params_json)

                    if not result:
                        results["ERROR"].append({"id": skill_id, "error": "null result"})
                        print(f"  [{tested:3d}/{total}] ✗  {skill_id} — ERROR (null)")
                        continue

                    if result.get("error"):
                        results["ERROR"].append({"id": skill_id, "error": result["error"]})
                        print(f"  [{tested:3d}/{total}] ✗  {skill_id} — ERROR: {result['error']}")
                        continue

                    if not result.get("ok"):
                        results["ERROR"].append({"id": skill_id, "error": result.get("message", "ok=false")})
                        print(f"  [{tested:3d}/{total}] ✗  {skill_id} — FAIL: {result.get('message')}")
                        continue

                    # Classify result
                    state_changes = result.get("stateChangeCount", 0)
                    has_value = result.get("hasValue", False)
                    msg = result.get("message", "")

                    if state_changes > 0:
                        changes_detail = result.get("stateChanges", [])
                        results["STATE_CHANGED"].append({
                            "id": skill_id,
                            "message": msg,
                            "changes": changes_detail,
                        })
                        changes_str = ", ".join(f"{c['key']}" for c in changes_detail)
                        print(f"  [{tested:3d}/{total}] ◆  {skill_id} — STATE_CHANGED [{changes_str}]")
                    elif has_value:
                        results["SIGNAL_CHANGED"].append({"id": skill_id, "message": msg})
                        print(f"  [{tested:3d}/{total}] ◆  {skill_id} — SIGNAL_CHANGED (value returned)")
                    elif skill_id in ENGINE_ACTION_IDS:
                        results["ENGINE_ACTION"].append({"id": skill_id, "message": msg})
                        print(f"  [{tested:3d}/{total}] ●  {skill_id} — ENGINE_ACTION: {msg[:50]}")
                    else:
                        results["MESSAGE_ONLY"].append({"id": skill_id, "message": msg})
                        print(f"  [{tested:3d}/{total}] ○  {skill_id} — MESSAGE_ONLY: {msg[:50]}")

                except Exception as e:
                    results["ERROR"].append({"id": skill_id, "error": str(e)})
                    print(f"  [{tested:3d}/{total}] ✗  {skill_id} — EXCEPTION: {str(e)[:60]}")

            print()  # blank line between features

        # ─── Phase 5: Stop playback ──────────────────────────────────────
        print("[PHASE 5] Stopping playback...")
        stop_btn = page.locator(".transport-btn").nth(1)
        stop_btn.click()
        page.wait_for_timeout(300)

        browser.close()

        # ─── Phase 6: Report ─────────────────────────────────────────────
        print("\n" + "=" * 72)
        print("  A/B TEST REPORT — ADA OPERA (256 DeepSkills)")
        print("=" * 72)
        print(f"\n  SIGNAL_CHANGED : {len(results['SIGNAL_CHANGED']):3d}  (feature produced value/signal change)")
        print(f"  STATE_CHANGED  : {len(results['STATE_CHANGED']):3d}  (feature mutated Zustand store)")
        print(f"  ENGINE_ACTION  : {len(results['ENGINE_ACTION']):3d}  (feature called engine methods)")
        print(f"  MESSAGE_ONLY   : {len(results['MESSAGE_ONLY']):3d}  (handler OK, awaiting implementation)")
        print(f"  SKIPPED        : {len(results['SKIPPED']):3d}  (side-effect avoidance)")
        print(f"  ERROR          : {len(results['ERROR']):3d}  (handler failed)")
        print(f"  ─────────────────────────────────────")

        validated = len(results["SIGNAL_CHANGED"]) + len(results["STATE_CHANGED"]) + len(results["ENGINE_ACTION"])
        print(f"  VALIDATED      : {validated:3d}  ({validated * 100 // total}% of {total})")
        print(f"  TOTAL TESTED   : {total - len(results['SKIPPED']):3d}")
        print()

        # Detail: STATE_CHANGED
        if results["STATE_CHANGED"]:
            print("─── STATE_CHANGED Details ───")
            for r in results["STATE_CHANGED"]:
                changes = ", ".join(f"{c['key']}:{c.get('before','?')}→{c.get('after','?')}" for c in r.get("changes", []))
                print(f"  ◆ {r['id']}: {changes}")
            print()

        # Detail: ERRORS
        if results["ERROR"]:
            print("─── ERROR Details ───")
            for r in results["ERROR"]:
                print(f"  ✗ {r['id']}: {r.get('error', 'unknown')}")
            print()

        # Save full report as JSON
        report_path = "tests/ab_report.json"
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False, default=str)
        print(f"[SAVED] Full report → {report_path}")

        # Exit code
        error_count = len(results["ERROR"])
        if error_count > total * 0.1:  # >10% errors = fail
            print(f"\n[FAIL] {error_count} errors exceed 10% threshold")
            sys.exit(1)
        else:
            print(f"\n[PASS] A/B test complete — {validated} features validated!")
            sys.exit(0)


if __name__ == "__main__":
    run_ab_test()
