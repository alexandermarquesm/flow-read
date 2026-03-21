import { TextToSpeechClient, protos } from "@google-cloud/text-to-speech";
import {
  ITtsService,
  ISynthesizeOptions,
  ITtsResponse,
} from "../../../domain/interfaces/ITtsService";
import { Voice } from "../../../domain/entities/Voice";
import { config } from "../../../config/config";

export class GoogleTtsService implements ITtsService {
  private client: TextToSpeechClient | null = null;
  private isAvailable: boolean = false;

  constructor() {
    try {
      if (config.googleCloud.keyFile) {
        this.client = new TextToSpeechClient({
          keyFilename: config.googleCloud.keyFile,
        });
        this.isAvailable = true;
      } else {
        console.warn(
          "Google TTS credentials missing via config. Skipping initialization.",
        );
      }
    } catch (error) {
      console.warn(
        "Google TTS Client failed to initialize (missing credentials?)",
        error,
      );
      this.isAvailable = false;
    }
  }

  async getVoices(languageCode?: string): Promise<Voice[]> {
    if (!this.isAvailable || !this.client) {
      return [];
    }
    try {
      const [result] = await this.client.listVoices({ languageCode });
      const voices = result.voices || [];

      return voices.map((v) => ({
        id: `google:${v.name || "unknown"}`,
        name: v.name || "Unknown Voice",
        languageCode: (v.languageCodes && v.languageCodes[0]) || "en-US",
        gender: v.ssmlGender as Voice["gender"],
        provider: "google",
      }));
    } catch (error: any) {
      // Only log if it's not the expected "no credentials" error
      if (error.code !== "ENOENT" && !error.message?.includes("NO_ADC_FOUND")) {
        console.error("Failed to fetch Google Voices:", error);
      }
      return [];
    }
  }

  async synthesize(options: ISynthesizeOptions): Promise<ITtsResponse> {
    if (!this.isAvailable || !this.client) {
      throw new Error("Google TTS credentials not configured.");
    }

    const realVoiceId = (options.voiceId || "").replace("google:", "");
    if (!realVoiceId) throw new Error("Voice ID required for Google TTS");

    // Clean text to avoid breaking SSML
    const cleanText = options.text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

    // Split by spaces to inject marks
    const words = cleanText.split(/(\s+)/);
    let ssml = "<speak>";
    const wordMap: { [key: string]: { text: string; charStartIndex: number } } =
      {};
    let currentCharIndex = 0;

    words.forEach((part, index) => {
      ssml += part;
      // Inject mark after non-whitespace tokens
      if (part.trim().length > 0) {
        const markName = `mk_${index}`;
        ssml += `<mark name="${markName}"/>`;
        wordMap[markName] = { text: part, charStartIndex: currentCharIndex };
      }
      currentCharIndex += part.length;
    });
    ssml += "</speak>";

    const request: any = {
      input: { ssml: ssml },
      voice: {
        languageCode: options.languageCode || "en-US",
        name: realVoiceId,
        ssmlGender: "NEUTRAL",
      },
      audioConfig: {
        audioEncoding: "MP3",
        pitch: options.pitch || 1.0,
        speakingRate: options.speakingRate || 1.0,
      },
      enableTimePointing: ["SSML_MARK"],
    };

    const [response] = await this.client.synthesizeSpeech(request);

    if (!response.audioContent) {
      throw new Error("No audio content returned from Google TTS API");
    }

    // Process timepoints to create useful marks
    const rawMarks = (response as any).timepoints || [];
    const marks = rawMarks.map((tp: any, i: number) => {
      const info = wordMap[tp.markName];
      const text = info ? info.text : "";
      const charStartIndex = info ? info.charStartIndex : 0;

      const start = tp.timeSeconds * 1000;

      let end = start + 500; // default
      if (i < rawMarks.length - 1) {
        end = rawMarks[i + 1].timeSeconds * 1000;
      }

      return {
        time: start,
        start: start,
        end: end,
        word: text,
        type: "word",
        part: text,
        charStartIndex: charStartIndex,
      };
    });

    return {
      audio: Buffer.from(response.audioContent as Uint8Array),
      marks: marks,
    };
  }
}
