import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useReader } from "../../context/ReaderContext";

export const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useReader();

  useEffect(() => {
    const userStr = searchParams.get("user");
    const token = searchParams.get("token");

    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        login(userData, token || undefined);
        
        // Full page reload after small delay to ensure persistence
        setTimeout(() => {
          window.location.href = "/";
        }, 100);
      } catch (e) {
        console.error("Failed to parse user data", e);
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
