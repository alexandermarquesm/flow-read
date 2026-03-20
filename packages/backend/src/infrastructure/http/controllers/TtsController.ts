import { ListVoices } from "../../../core/use-cases/ListVoices";
import { SynthesizeSpeech } from "../../../core/use-cases/SynthesizeSpeech";
import { GoogleTtsService } from "../../google-tts/GoogleTtsService";
import { EdgeTtsService } from "../../edge-tts/EdgeTtsService";
import { GeminiTtsService } from "../../gemini-tts/GeminiTtsService";
import { AzureTtsService } from "../../azure-tts/AzureTtsService";
import { CompositeTtsService } from "../../CompositeTtsService";

const googleService = new GoogleTtsService();
const edgeService = new EdgeTtsService();
const geminiService = new GeminiTtsService();
const azureService = new AzureTtsService();
const ttsService = new CompositeTtsService([
  azureService,
  edgeService,
  googleService,
  geminiService,
]);

const listVoicesUseCase = new ListVoices(ttsService);
const synthesizeSpeechUseCase = new SynthesizeSpeech(ttsService);

export class TtsController {
  private voicesCache = new Map<string, { data: any; timestamp: number }>();
  private CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

  async getVoices(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const languageCode = url.searchParams.get("languageCode") || "all";

    const cached = this.voicesCache.get(languageCode);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return new Response(JSON.stringify(cached.data), {
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=86400"
        },
      });
    }

    try {
      const voices = await listVoicesUseCase.execute(languageCode === "all" ? undefined : languageCode);
      this.voicesCache.set(languageCode, { data: voices, timestamp: Date.now() });

      return new Response(JSON.stringify(voices), {
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=86400" 
        },
      });
    } catch (error) {
      console.error("Error fetching voices:", error);
      // Return stale cache if available
      if (cached) {
        return new Response(JSON.stringify(cached.data), {
          headers: { 
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=30" // Retry sooner
          },
        });
      }
      return new Response(JSON.stringify({ error: "Failed to fetch voices" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  async synthesize(req: Request): Promise<Response> {
    try {
      const body = (await req.json()) as any;
      const { text, voiceId, languageCode, pitch, speakingRate } = body;

      const { audio, marks, warning } = await synthesizeSpeechUseCase.execute({
        text,
        voiceId,
        languageCode,
        pitch,
        speakingRate,
      });

      return new Response(
        JSON.stringify({
          audio: `data:audio/mp3;base64,${audio.toString("base64")}`,
          marks,
          warning,
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    } catch (error) {
      console.error("Error synthesizing speech:", error);
      return new Response(
        JSON.stringify({ error: "Failed to synthesize speech" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }
}
