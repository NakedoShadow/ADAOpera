/**
 * ADA Opera — Mixer Channel Strip
 * Volume fader, pan, mute/solo, EQ — per instrument
 */

import { useCallback } from "react";
import { getConductor } from "../../engines/audio-engine";
import { useOperaStore } from "../../stores/opera-store";

interface MixerChannelProps {
  instrumentId: string;
  name: string;
  color?: string;
}

export function MixerChannel({ instrumentId, name, color = "#0055FF" }: MixerChannelProps) {
  const conductor = getConductor();
  const mutedInstruments = useOperaStore((s) => s.mutedInstruments);
  const soloInstruments = useOperaStore((s) => s.soloInstruments);
  const toggleMute = useOperaStore((s) => s.toggleMute);
  const toggleSolo = useOperaStore((s) => s.toggleSolo);

  const isMuted = mutedInstruments.includes(instrumentId);
  const isSolo = soloInstruments.includes(instrumentId);

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const vol = parseFloat(e.target.value);
      conductor.setInstrumentVolume(instrumentId, vol);
    },
    [conductor, instrumentId]
  );

  const handlePanChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const pan = parseFloat(e.target.value) / 100;
      conductor.setInstrumentPan(instrumentId, pan);
    },
    [conductor, instrumentId]
  );

  const handleMute = useCallback(() => {
    toggleMute(instrumentId);
    conductor.muteInstrument(instrumentId, !isMuted);
  }, [conductor, instrumentId, isMuted, toggleMute]);

  const handleSolo = useCallback(() => {
    toggleSolo(instrumentId);
    conductor.soloInstrument(instrumentId, !isSolo);
  }, [conductor, instrumentId, isSolo, toggleSolo]);

  return (
    <div className="mixer-channel" style={{ opacity: isMuted ? 0.4 : 1 }}>
      {/* Channel label */}
      <div className="mixer-channel-label" style={{ borderTopColor: color }}>
        {name}
      </div>

      {/* Volume fader (vertical) */}
      <div className="mixer-fader-container">
        <input
          type="range"
          className="mixer-fader"
          min={-60}
          max={6}
          step={0.5}
          defaultValue={-6}
          onChange={handleVolumeChange}
          style={{ writingMode: "vertical-lr", direction: "rtl" }}
        />
      </div>

      {/* Pan knob */}
      <div className="mixer-pan-container">
        <span className="mixer-pan-label">PAN</span>
        <input
          type="range"
          className="mixer-pan"
          min={-100}
          max={100}
          step={1}
          defaultValue={0}
          onChange={handlePanChange}
        />
      </div>

      {/* Mute / Solo */}
      <div className="mixer-buttons">
        <button
          className={`mixer-btn mixer-mute ${isMuted ? "active" : ""}`}
          onClick={handleMute}
        >
          M
        </button>
        <button
          className={`mixer-btn mixer-solo ${isSolo ? "active" : ""}`}
          onClick={handleSolo}
        >
          S
        </button>
      </div>
    </div>
  );
}
