import React from "react";
import { useReader } from "../../context/ReaderContext";
import { useSpeechSynthesis } from "../../hooks/useSpeechSynthesis";
import styles from "./Settings.module.css";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  const { highlightEnabled, setHighlightEnabled, settings, updateSettings } =
    useReader();

  const { voices } = useSpeechSynthesis();

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Configurações</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        <div className={styles.group}>
          <label className={styles.label}>Voz da Narração</label>
          <select
            className={styles.select}
            value={settings.voiceURI || ""}
            onChange={(e) => updateSettings({ voiceURI: e.target.value })}
          >
            {voices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </div>

        <div className={styles.group}>
          <label className={styles.label}>Velocidade: {settings.rate}x</label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={settings.rate}
            onChange={(e) =>
              updateSettings({ rate: parseFloat(e.target.value) })
            }
            style={{ width: "100%" }}
          />
        </div>

        <div className={styles.group}>
          <label className={styles.label}>
            Volume: {Math.round((settings.volume || 1) * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.volume || 1}
            onChange={(e) =>
              updateSettings({ volume: parseFloat(e.target.value) })
            }
            style={{ width: "100%" }}
          />
        </div>

        <div className={styles.group}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={settings.playAudio !== false}
              onChange={(e) => updateSettings({ playAudio: e.target.checked })}
            />
            Tocar Áudio (Mudo mantém marcação)
          </label>
        </div>

        <div className={styles.group}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={highlightEnabled}
              onChange={(e) => setHighlightEnabled(e.target.checked)}
            />
            Habilitar Destaque Visual
          </label>
        </div>
      </div>
    </div>
  );
};
