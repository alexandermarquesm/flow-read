import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar/Sidebar";
import { MobileNav } from "../components/MobileNav/MobileNav";
import styles from "./MainLayout.module.css";
import { LoginModal } from "../components/LoginModal";

export const MainLayout = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <div className={styles.container}>
      <Sidebar onOpenLogin={() => setIsLoginModalOpen(true)} />
      <main className={styles.main}>
        <Outlet />
      </main>
      <MobileNav />
      {isLoginModalOpen && (
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
        />
      )}
    </div>
  );
};
