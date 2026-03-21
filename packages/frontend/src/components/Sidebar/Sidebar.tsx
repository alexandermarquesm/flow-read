import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Home,
  Library,
  Settings as SettingsIcon,
  LogIn,
  LogOut,
  User as UserIcon
} from "lucide-react";
import type { OAuthUser } from "@flow-read/shared";
import { Button } from "../Button/Button";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  className?: string; // Allow external layout to affect positioning/visibility
  style?: React.CSSProperties; // Allow inline styles (e.g. for dynamic visibility)
}

export const Sidebar = ({ className, style }: SidebarProps) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<OAuthUser | null>(null);

  const loadUser = () => {
    const userStr = localStorage.getItem("auth_user");
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        setUser(null);
      }
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    loadUser();
    window.addEventListener("auth_change", loadUser);
    return () => window.removeEventListener("auth_change", loadUser);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setUser(null);
    window.dispatchEvent(new Event("auth_change"));
    navigate("/login");
  };

  return (
    <aside className={`${styles.sidebar} ${className || ""}`} style={style}>
      <div className={styles.brand}>
        <h1 className={styles.brandTitle}>
          <img
            src="/logo.webp"
            alt="Flow Reader Logo"
            className={styles.brandLogo}
          />
          Flow Reader
        </h1>
      </div>

      <nav className={styles.nav}>
        <NavLink
          to="/"
          className={({ isActive }) =>
            `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
          }
        >
          <Home size={20} />
          Home
        </NavLink>

        <NavLink
          to="/library"
          className={({ isActive }) =>
            `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
          }
        >
          <Library size={20} />
          Library
        </NavLink>

        <NavLink
          to="/reading"
          className={({ isActive }) =>
            `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
          }
        >
          <BookOpen size={20} />
          Current Read
        </NavLink>
      </nav>

      <div className={styles.footer}>
        <Button
          variant="ghost"
          fullWidth
          icon={<SettingsIcon size={20} />}
          onClick={() => {}} // Handle settings click if needed
        >
          Settings
        </Button>

        {user ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%", marginTop: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem", background: "rgba(0,0,0,0.03)", borderRadius: "8px" }}>
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} style={{ width: 32, height: 32, borderRadius: "50%" }} />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--color-brand-sage)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                  <UserIcon size={16} />
                </div>
              )}
              <span style={{ fontSize: "0.9rem", color: "#3e2723", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</span>
            </div>
            <Button
              variant="ghost"
              fullWidth
              icon={<LogOut size={18} />}
              onClick={handleLogout}
            >
              Sign Out
            </Button>
          </div>
        ) : (
          <div style={{ marginTop: "1rem" }}>
            <Button
              variant="primary"
              fullWidth
              icon={<LogIn size={18} />}
              onClick={() => window.dispatchEvent(new Event("open_login_modal"))}
            >
              Log In
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
};
