import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar/Sidebar";
import { MobileNav } from "../components/MobileNav/MobileNav";
import styles from "./MainLayout.module.css";

export const MainLayout = () => {
  return (
    <div className={styles.container}>
      <Sidebar />
      <main className={styles.main}>
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
};
