import React, { useEffect } from "react";
import styles from "./Toast.module.css";
import { CheckCircle, AlertTriangle, Info, XCircle } from "lucide-react";

export type ToastType = "info" | "success" | "warning" | "error";

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = "info",
  onClose,
  duration = 5000,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case "success": return <CheckCircle size={20} />;
      case "warning": return <AlertTriangle size={20} />;
      case "error": return <XCircle size={20} />;
      default: return <Info size={20} />;
    }
  };

  return (
    <div className={`${styles.toast} ${styles[type]}`}>
      <div className={styles.content}>
        <span className={styles.icon}>{getIcon()}</span>
        <p>{message}</p>
      </div>
      <button onClick={onClose} className={styles.closeButton}>
        ×
      </button>
    </div>
  );
};
