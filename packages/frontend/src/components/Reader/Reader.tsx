import React, { useEffect, useRef, useState } from "react";
import { useReader } from "../../context/ReaderContext";
import { Settings } from "../Settings/Settings";
import { ActiveSegment } from "../ActiveSegment/ActiveSegment";
import styles from "./Reader.module.css";

const DEFAULT_TEXT = `Olá! Bem-vindo ao seu leitor aconchegante. 
Cole seu texto aqui ou apenas aperte o play para me ouvir. 
A leitura é uma viagem que fazemos sem sair do lugar. 
Espero que aproveite cada palavra!`;

export const Reader: React.FC = () => {
  const {
    text,
    setText,
    segments,
    currentSegmentId,
    highlightEnabled,
    play,
    pause,
    resume,
    stop,
    isPlaying,
    isPaused,
    currentWordCharIndex,
  } = useReader();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const activeRef = useRef<HTMLElement>(null);

  // Set default text on mount if empty and NO active book
  useEffect(() => {
    if (!text && !useReader().activeBookId) setText(DEFAULT_TEXT);
  }, []);

  // Auto-scroll logic
  useEffect(() => {
    if (activeRef.current && highlightEnabled) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentSegmentId, highlightEnabled]);

  return (
    <div className={styles.container}>
      <header style={{ textAlign: "center", marginBottom: "1rem" }}>
        <h1>Leitura Cozy</h1>
        <p style={{ color: "var(--color-primary)", opacity: 0.8 }}>
          Relaxe e ouça.
        </p>
      </header>

      <div className={styles.textArea}>
        {segments.map((segment: any) => {
          const isActive = currentSegmentId === segment.id;

          if (isActive && highlightEnabled) {
            return (
              <span
                key={segment.id}
                id={segment.id}
                ref={activeRef}
                className={`${styles.segment} ${styles.active}`}
              >
                <ActiveSegment
                  text={segment.text}
                  currentIndex={currentWordCharIndex || 0}
                />
              </span>
            );
          }

          return (
            <span key={segment.id} id={segment.id} className={styles.segment}>
              {segment.text}
            </span>
          );
        })}
      </div>

      <textarea
        className={styles.inputArea}
        value={text}
        onChange={(e) => {
          stop();
          setText(e.target.value);
        }}
        placeholder="Cole seu texto aqui..."
      />

      <div className={styles.controls}>
        <button
          className={`${styles.btn} ${styles.btnSecondary}`}
          onClick={stop}
          title="Parar"
        >
          ⏹
        </button>

        {!isPlaying || isPaused ? (
          <button
            className={styles.btn}
            onClick={isPlaying ? resume : play}
            title="Reproduzir"
          >
            ▶
          </button>
        ) : (
          <button className={styles.btn} onClick={pause} title="Pausar">
            ⏸
          </button>
        )}

        <button
          className={`${styles.btn} ${styles.btnSecondary}`}
          onClick={() => setIsSettingsOpen(true)}
          title="Configurações"
        >
          ⚙️
        </button>
      </div>

      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Debug Info - Remove before production */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          background: "rgba(0,0,0,0.7)",
          color: "white",
          padding: "5px",
          fontSize: "10px",
        }}
      >
        Word Index: {currentWordCharIndex ?? "N/A"}
      </div>
    </div>
  );
};
