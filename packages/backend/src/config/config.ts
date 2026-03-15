import dotenv from "dotenv";
import path from "path";

const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env";
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

export const config = {
  port: process.env.PORT || 4000,
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
