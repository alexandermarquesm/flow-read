import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ReaderProvider } from "./context/ReaderContext";
import { MainLayout } from "./layouts/MainLayout";
import { Home } from "./pages/Home/Home";
import { Reading } from "./pages/Reading/Reading";
import { Library } from "./pages/Library/Library";
import { LoginModal } from "./components/LoginModal/LoginModal";
import { OAuthCallback } from "./pages/OAuthCallback/OAuthCallback";

function App() {
  return (
    <ReaderProvider>
      <BrowserRouter>
        <LoginModal />
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="reading" element={<Reading />} />
            <Route path="library" element={<Library />} />
            <Route path="auth/callback" element={<OAuthCallback />} />
            {/* Redirect legacy or unknown routes to home for now */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ReaderProvider>
  );
}

export default App;
