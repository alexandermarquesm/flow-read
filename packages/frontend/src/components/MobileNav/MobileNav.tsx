import { NavLink } from "react-router-dom";
import { BookOpen, Home, Library } from "lucide-react";
import styles from "./MobileNav.module.css";

export const MobileNav = () => {
  return (
    <nav className={styles.mobileNav}>
      <NavLink
        to="/"
        className={({ isActive }) =>
          `${styles.navItem} ${isActive ? styles.active : ""}`
        }
      >
        <Home size={22} />
        <span>Home</span>
      </NavLink>

      <NavLink
        to="/library"
        className={({ isActive }) =>
          `${styles.navItem} ${isActive ? styles.active : ""}`
        }
      >
        <Library size={22} />
        <span>Library</span>
      </NavLink>

      <NavLink
        to="/reading"
        className={({ isActive }) =>
          `${styles.navItem} ${isActive ? styles.active : ""}`
        }
      >
        <BookOpen size={22} />
        <span>Read</span>
      </NavLink>
    </nav>
  );
};
