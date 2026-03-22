import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Github } from "lucide-react";
import { Button } from "../Button/Button";
import { API_URL } from "../../config";
import styles from "./LoginModal.module.css";
import { useSearchParams, useNavigate } from "react-router-dom";

import { useReader } from "../../context/ReaderContext";

export const LoginModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useReader();
  const error = searchParams.get("error");

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open_login_modal", handleOpen);
    
    // Close modal if user is logged in and no new error is present
    if (user && !error) {
      setIsOpen(false);
    }
    
    if (error) {
      setIsOpen(true);
    }
    
    return () => {
      window.removeEventListener("open_login_modal", handleOpen);
    };
  }, [error, user]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
      if (error && !localStorage.getItem("auth_user")) {
        // Clear error from URL if user closes the modal without logging in
        // Only if they aren't logged in (otherwise the redirect from callback has error parameter sometimes?)
        // Actually, if we are on / but have error, navigating to / removes the query
        navigate(window.location.pathname, { replace: true });
      }
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen, error, navigate]);

  const handleClose = () => setIsOpen(false);

  const handleGoogleLogin = () => {
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    window.open(
      `${API_URL}/api/auth/google`,
      "google-login",
      `width=${width},height=${height},left=${left},top=${top}`
    );
  };

  const handleGithubLogin = () => {
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    window.open(
      `${API_URL}/api/auth/github`,
      "github-login",
      `width=${width},height=${height},left=${left},top=${top}`
    );
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className={styles.overlay} onClick={handleClose}>
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className={styles.closeBtn} onClick={handleClose} aria-label="Close login modal">
              <X size={20} />
            </button>

            <div className={styles.header}>
              <h2 className={styles.title}>Welcome Back</h2>
              <p className={styles.subtitle}>Sign in to securely save your reading progress and personal library.</p>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.buttonGroup}>
              <Button 
                className={styles.googleBtn} 
                fullWidth 
                size="lg"
                onClick={handleGoogleLogin}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </Button>

              <Button 
                className={styles.githubBtn} 
                fullWidth 
                size="lg"
                onClick={handleGithubLogin}
                icon={<Github size={20} style={{ marginRight: '4px' }} />}
              >
                Continue with GitHub
              </Button>
            </div>
            
            <p className={styles.terms}>
              By signing in, you agree to our Terms of Service.
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
