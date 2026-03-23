import { NavLink } from "react-router-dom";
import {
  BookOpen,
  Home,
  Library,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { Button } from "../Button/Button";
import styles from "./Sidebar.module.css";
import { useAuth } from "../../context/AuthContext";

interface SidebarProps {
  className?: string;
  style?: React.CSSProperties;
  onOpenLogin?: () => void;
}

export const Sidebar = ({ className, style, onOpenLogin }: SidebarProps) => {
  const { user, logout } = useAuth();

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
        {user ? (
          <div className={styles.userSection}>
            <div className={styles.avatarWrapper}>
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className={styles.avatar}
                />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  <UserIcon size={18} />
                </div>
              )}
            </div>
            <div className={styles.userMeta}>
              <span className={styles.userName}>{user.name}</span>
              <div className={styles.userActions}>
                <button
                  className={styles.actionBtn}
                  onClick={logout}
                  title="Logout"
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <Button
            variant="primary"
            fullWidth
            icon={<UserIcon size={20} />}
            onClick={onOpenLogin}
          >
            Login
          </Button>
        )}
      </div>
    </aside>
  );
};
