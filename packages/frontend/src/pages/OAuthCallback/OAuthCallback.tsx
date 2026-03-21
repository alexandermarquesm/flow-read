import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const userStr = searchParams.get("user");

    // O Token agora está seguro dentro do navegador via Cookie HttpOnly!
    if (userStr) {
      localStorage.setItem("auth_user", userStr);
      // Dispatches an event so other components (like Sidebar) can update
      window.dispatchEvent(new Event("auth_change"));
      navigate("/");
    } else {
      navigate("/?error=Authentication%20failed");
    }
  }, [searchParams, navigate]);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", fontFamily: "var(--font-ui)", color: "#8d6e63" }}>
      <p>Completing authentication...</p>
    </div>
  );
};
