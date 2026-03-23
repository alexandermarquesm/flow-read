import { useEffect } from "react";

export const OAuthCallback = () => {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const error = urlParams.get("error");

    if (window.opener) {
      if (code) {
        window.opener.postMessage({ type: "OAUTH_CODE", code }, window.location.origin);
      } else if (error) {
        window.opener.postMessage({ type: "OAUTH_ERROR", error }, window.location.origin);
      }
    } else {
      // If opened directly, just show a message or redirect
      console.error("No opener window found for OAuth callback");
    }
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      fontFamily: 'var(--font-ui)',
      backgroundColor: 'var(--color-bg)',
      color: 'var(--color-text)'
    }}>
      Authenticating...
    </div>
  );
};
