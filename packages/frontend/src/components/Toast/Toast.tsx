import React, { useEffect } from "react";
import styles from "./Toast.module.css";

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  onClose,
  duration = 5000,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className={styles.toast}>
      <div className={styles.content}>
        <span className={styles.icon}>⚠️</span>
        <p>{message}</p>
      </div>
      <button onClick={onClose} className={styles.closeButton}>
        ×
      </button>
    </div>
  );
};
