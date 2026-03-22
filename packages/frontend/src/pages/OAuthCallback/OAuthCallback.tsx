import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useReader } from "../../context/ReaderContext";

export const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useReader();

  useEffect(() => {
    const token = searchParams.get("token");
    const userStr = searchParams.get("user");
    
    console.log('[Auth Callback Popup] Params:', { token: token ? 'yes' : 'no', user: userStr ? 'yes' : 'no' });

    if (token) {
      let userData = null;
      if (userStr) {
        try { userData = JSON.parse(userStr); } catch (e) { console.error('[Auth Callback] User parse fail', e); }
      }
      
      // 1. Storage Sync (Reliable across tabs/popups)
      localStorage.setItem('auth_pending_data', JSON.stringify({ token, user: userData }));
      
      // 2. Message Sync (Immediate)
      if (window.opener) {
        console.log('[Auth Callback Popup] Sending success to opener...');
        window.opener.postMessage({ type: "AUTH_SUCCESS", token, user: userData }, window.location.origin);
        
        // Give some time for sync before closing
        setTimeout(() => {
          window.close();
        }, 500);
      } else {
        // Fallback for direct access (not a popup)
        console.log('[Auth Callback Popup] No opener found, using direct login');
        login(userData, token);
        setTimeout(() => { window.location.href = "/"; }, 100);
      }
    } else {
      const error = searchParams.get("error") || "Authentication failed";
      console.warn('[Auth Callback Popup] Error:', error);
      if (window.opener) {
        window.opener.postMessage({ type: "AUTH_ERROR", error }, window.location.origin);
        window.close();
      } else {
        navigate(`/?error=${encodeURIComponent(error)}`);
      }
    }
  }, [searchParams, navigate, login]);

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column",
      justifyContent: "center", 
      alignItems: "center", 
      height: "100vh", 
      width: "100vw",
      fontFamily: "var(--font-ui)", 
      color: "#8d6e63",
      backgroundColor: "#fdfcfb"
    }}>
      <div style={{ 
        width: "40px", 
        height: "40px", 
        border: "4px solid #f3e9e5", 
        borderTop: "4px solid #8d6e63", 
        borderRadius: "50%",
        marginBottom: "16px"
      }}></div>
      <p style={{ margin: 0, fontWeight: 500 }}>Finalizando acesso...</p>
      <p style={{ fontSize: "14px", opacity: 0.7, marginTop: "8px" }}>Esta janela fechará automaticamente.</p>
    </div>
  );
};
