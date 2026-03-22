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
      
      if (window.opener) {
        console.log('[Auth Callback Popup] Sending success to opener...');
        window.opener.postMessage({ type: "AUTH_SUCCESS", token, user: userData }, window.location.origin);
        window.close();
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
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", fontFamily: "var(--font-ui)", color: "#8d6e63" }}>
      <p>Completing authentication...</p>
    </div>
  );
};
