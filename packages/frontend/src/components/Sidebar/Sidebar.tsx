import { NavLink } from "react-router-dom";
import {
  BookOpen,
  Home,
  Library,
  Settings as SettingsIcon,
} from "lucide-react";
import { Button } from "../Button/Button";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  className?: string; // Allow external layout to affect positioning/visibility
  style?: React.CSSProperties; // Allow inline styles (e.g. for dynamic visibility)
}

export const Sidebar = ({ className, style }: SidebarProps) => {
  return (
    <aside className={`${styles.sidebar} ${className || ""}`} style={style}>
      <div className={styles.brand}>
        <h1 className={styles.brandTitle}>
          <img
            src="/logo.png"
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
      </div>
    </aside>
  );
};
