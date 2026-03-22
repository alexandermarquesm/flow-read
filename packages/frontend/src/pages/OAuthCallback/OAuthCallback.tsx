import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useReader } from "../../context/ReaderContext";

export const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useReader();

  useEffect(() => {
    const token = searchParams.get("token");
    const userStr = searchParams.get("user"); // Legacy fallback

    if (token) {
      // ReaderContext will fetch the profile automatically when login() is called or on mount
      let userData = null;
      if (userStr) {
        try { userData = JSON.parse(userStr); } catch (e) {}
      }
      
      login(userData, token);
      
      setTimeout(() => {
        window.location.href = "/";
      }, 100);
    } else if (userStr) {
      // Legacy behavior for backward compatibility during deployment
      try {
        const userData = JSON.parse(userStr);
        login(userData);
        setTimeout(() => { window.location.href = "/"; }, 100);
      } catch (e) {
        navigate("/?error=Invalid%20user%20data");
      }
    } else {
      navigate("/?error=Authentication%20failed");
    }
  }, [searchParams, navigate, login]);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", fontFamily: "var(--font-ui)", color: "#8d6e63" }}>
      <p>Completing authentication...</p>
    </div>
  );
};
