import dotenv from "dotenv";
import path from "path";

// Layered environment loading
const root = path.resolve(import.meta.dirname, "../../");

// 1. Base defaults
dotenv.config({ path: path.join(root, ".env") });

// 2. Environment specific overrides
const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.development";
dotenv.config({ path: path.join(root, envFile), override: true });

// 3. Local developer overrides (not committed to git)
dotenv.config({ path: path.join(root, ".env.local"), override: true });

export const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "4000", 10),
  frontend: {
    // Retorna a primeira URL como principal (para redirects) e a lista completa para CORS
    urls: (process.env.FRONTEND_URL || "http://localhost:5173").split(",").map(url => url.trim().replace(/\/$/, "")),
    mainUrl: (process.env.FRONTEND_URL || "http://localhost:5173").split(",")[0].trim().replace(/\/$/, ""),
  },
  db: {
    url: process.env.TURSO_DB_URL || "libsql://flow-read-gangplanklol.aws-us-east-1.turso.io",
    authToken: process.env.TURSO_DB_AUTH_TOKEN || "",
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || "default_secret_change_me",
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
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
