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
    
    console.log('[Auth Callback] Params:', { token: token ? 'yes' : 'no', user: userStr ? 'yes' : 'no' });

    if (token) {
      let userData = null;
      if (userStr) {
        try { userData = JSON.parse(userStr); } catch (e) { console.error('[Auth Callback] User parse fail', e); }
      }
      
      console.log('[Auth Callback] Calling login()...');
      login(userData, token);
      
      console.log('[Auth Callback] Redirecting to home...');
      setTimeout(() => {
        window.location.href = "/";
      }, 100);
    } else if (userStr) {
      console.log('[Auth Callback] Legacy user string found...');
      try {
        const userData = JSON.parse(userStr);
        login(userData);
        setTimeout(() => { window.location.href = "/"; }, 100);
      } catch (e) {
        navigate("/?error=Invalid%20user%20data");
      }
    } else {
      console.warn('[Auth Callback] No token or user found in URL');
      navigate("/?error=Authentication%20failed");
    }
  }, [searchParams, navigate, login]);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", fontFamily: "var(--font-ui)", color: "#8d6e63" }}>
      <p>Completing authentication...</p>
    </div>
  );
};
