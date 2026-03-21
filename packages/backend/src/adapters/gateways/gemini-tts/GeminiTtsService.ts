import {
  ITtsService,
  ISynthesizeOptions,
  ITtsResponse,
} from "../../../domain/interfaces/ITtsService";
import { Voice } from "../../../domain/entities/Voice";
import { GoogleGenAI } from "@google/genai";
import { randomUUID } from "crypto";

export class GeminiTtsService implements ITtsService {
  private client: GoogleGenAI | null = null;
  private model = "gemini-2.5-pro-preview-tts";

  constructor() {
    // Lazy initialization
  }

  private getClient(): GoogleGenAI | null {
    if (this.client) return this.client;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn(
        "GEMINI_API_KEY not found in environment variables. Gemini TTS will be disabled.",
      );
      return null;
    }

    try {
      this.client = new GoogleGenAI({ apiKey });
      return this.client;
    } catch (e) {
      console.error("Failed to initialize GoogleGenAI client:", e);
      return null;
    }
  }

  async getVoices(languageCode?: string): Promise<Voice[]> {
    if (!this.getClient()) return [];

    // Gemini voices are pre-defined, we hardcode them for now as there isn't a simple list endpoint in the new SDK yet (or it's experimental)
    // Based on documentation/examples: Zephyr, Puck, Charon, Kore, Fenrir, Aoede
    const geminiVoices = [
      { name: "Zephyr", gender: "MALE" },
      { name: "Puck", gender: "MALE" },
      { name: "Charon", gender: "MALE" },
      { name: "Kore", gender: "FEMALE" },
      { name: "Fenrir", gender: "MALE" },
      { name: "Aoede", gender: "FEMALE" },
    ];

    const voices: Voice[] = geminiVoices.map((v) => ({
      id: `gemini:${v.name}`,
      name: `Gemini ${v.name}`,
      languageCode: "pt-BR", // User uses the app in PT-BR, and Gemini is multilingual.
      gender: v.gender as "MALE" | "FEMALE",
      provider: "google-gemini",
    }));

    if (languageCode) {
      // If user filters by 'pt-BR', should we show these?
      // Gemini Multimodal might support it. Let's show them if no language code or if it matches loosely.
      // For now, return all since they are "experimental/multilingual" models usually.
      return voices;
    }
    return voices;
  }

  async synthesize(options: ISynthesizeOptions): Promise<ITtsResponse> {
    const client = this.getClient();
    if (!client) {
      throw new Error("Gemini API Key is missing or invalid.");
    }

    const rawVoiceId = options.voiceId || "Zephyr";
    const voiceName = rawVoiceId.startsWith("gemini:")
      ? rawVoiceId.replace("gemini:", "")
      : rawVoiceId;

    const config = {
      temperature: 1,
      responseModalities: ["audio"] as any, // Type definition might string array
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voiceName,
          },
        },
      },
    };

    const contents = [
      {
        role: "user",
        parts: [
          {
            text: options.text,
          },
        ],
      },
    ];

    try {
      const response = await client.models.generateContentStream({
        model: this.model,
        config: config as any, // Cast to avoid strict type issues with preview SDK
        contents,
      });

      const audioChunks: Buffer[] = [];

      for await (const chunk of response) {
        if (
          !chunk.candidates ||
          !chunk.candidates[0].content ||
          !chunk.candidates[0].content.parts
        ) {
          continue;
        }

        const part = chunk.candidates[0].content.parts[0];

        // Check for inlineData (audio)
        if (part.inlineData && part.inlineData.data) {
          const buffer = Buffer.from(part.inlineData.data, "base64");
          audioChunks.push(buffer);
        }
      }

      const audio = Buffer.concat(audioChunks);

      return {
        audio,
        marks: [], // Gemini TTS (via this API) doesn't return alignment marks yet
      };
    } catch (error) {
      console.error("[GeminiTtsService] Error synthesizing:", error);
      throw error;
    }
  }
}
