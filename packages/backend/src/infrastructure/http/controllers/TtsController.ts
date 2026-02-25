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
  async getVoices(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const languageCode = url.searchParams.get("languageCode") || undefined;

    try {
      const voices = await listVoicesUseCase.execute(languageCode);
      return new Response(JSON.stringify(voices), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error fetching voices:", error);
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
