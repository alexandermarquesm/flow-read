import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ReaderProvider } from "./context/ReaderContext";
import { MainLayout } from "./layouts/MainLayout";
import { Home } from "./pages/Home/Home";
import { Reading } from "./pages/Reading/Reading";
import { Library } from "./pages/Library/Library";
import { AuthProvider } from "./context/AuthContext";
import { OAuthCallback } from "./pages/OAuthCallback/OAuthCallback";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { GOOGLE_CLIENT_ID } from "./config";

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <ReaderProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<MainLayout />}>
                <Route index element={<Home />} />
                <Route path="reading" element={<Reading />} />
                <Route path="library" element={<Library />} />
                <Route path="auth/github/callback" element={<OAuthCallback />} />
                {/* Redirect legacy or unknown routes to home for now */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ReaderProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
