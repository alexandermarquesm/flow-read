import dotenv from "dotenv";
import path from "path";

dotenv.config();

export const config = {
  port: process.env.PORT || 4000,
  googleCloud: {
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  },
  azureTts: {
    key: process.env.AZURE_TTS_KEY || "",
    region: process.env.AZURE_TTS_REGION || "",
  },
};
