import dotenv from "dotenv";
import path from "path";

const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env";
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

export const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "4000", 10),
  frontend: {
    // Retorna a primeira URL como principal (para redirects) e a lista completa para CORS
    urls: (process.env.FRONTEND_URL || "http://localhost:5173").split(",").map(url => url.trim().replace(/\/$/, "")),
    mainUrl: (process.env.FRONTEND_URL || "http://localhost:5173").split(",")[0].trim().replace(/\/$/, ""),
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || "default_secret_change_me",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL || `http://localhost:${process.env.PORT || 4000}/api/auth/google/callback`,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackUrl: process.env.GITHUB_CALLBACK_URL || `http://localhost:${process.env.PORT || 4000}/api/auth/github/callback`,
    },
  },
  googleCloud: {
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  },
  azureTts: {
    key: process.env.AZURE_TTS_KEY || "",
    region: process.env.AZURE_TTS_REGION || "",
  },
  discovery: {
    baseUrl: process.env.DISCOVERY_API_URL || "http://127.0.0.1:8000/api/v1/books",
  },
};
