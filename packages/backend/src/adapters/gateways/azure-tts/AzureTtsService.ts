import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import {
  ITtsService,
  ISynthesizeOptions,
  ITtsResponse,
} from "../../../domain/interfaces/ITtsService";
import { Voice } from "../../../domain/entities/Voice";
import { config } from "../../../config/config";

export class AzureTtsService implements ITtsService {
  private isAvailable: boolean = false;
  private speechConfig: sdk.SpeechConfig | null = null;

  constructor() {
    if (config.azureTts.key && config.azureTts.region) {
      try {
        this.speechConfig = sdk.SpeechConfig.fromSubscription(
          config.azureTts.key,
          config.azureTts.region,
        );
        this.speechConfig.speechSynthesisOutputFormat =
          sdk.SpeechSynthesisOutputFormat.Audio48Khz192KBitRateMonoMp3;
        this.isAvailable = true;
      } catch (error) {
        console.warn("Azure TTS Client failed to initialize", error);
      }
    } else {
      console.warn(
        "Azure TTS credentials missing via config. Skipping initialization.",
      );
    }
  }

  async getVoices(languageCode?: string): Promise<Voice[]> {
    if (!this.isAvailable || !this.speechConfig) {
      return [];
    }

    try {
      const synthesizer = new sdk.SpeechSynthesizer(this.speechConfig);
      const result = await synthesizer.getVoicesAsync(languageCode || "");
      synthesizer.close();

      if (result.reason === sdk.ResultReason.VoicesListRetrieved) {
        return result.voices.map((v) => ({
          id: `azure:${v.shortName}`,
          name: v.localName || v.shortName,
          languageCode: v.locale,
          gender:
            v.gender === sdk.SynthesisVoiceGender.Female
              ? "FEMALE"
              : v.gender === sdk.SynthesisVoiceGender.Male
                ? "MALE"
                : "NEUTRAL",
          provider: "azure",
        }));
      }
      return [];
    } catch (error) {
      console.error("Failed to fetch Azure Voices:", error);
      return [];
    }
  }

  async synthesize(options: ISynthesizeOptions): Promise<ITtsResponse> {
    if (!this.isAvailable || !this.speechConfig) {
      throw new Error("Azure TTS credentials not configured.");
    }

    const realVoiceId = (options.voiceId || "").replace("azure:", "");
    if (!realVoiceId) throw new Error("Voice ID required for Azure TTS");

    const pullStream = sdk.AudioOutputStream.createPullStream();
    const audioConfig = sdk.AudioConfig.fromStreamOutput(pullStream);

    this.speechConfig.speechSynthesisVoiceName = realVoiceId;
    const synthesizer = new sdk.SpeechSynthesizer(
      this.speechConfig,
      audioConfig,
    );

    const marks: any[] = [];
    let lastFoundIndex = 0;

    // Listen for word boundary events
    synthesizer.wordBoundary = (s, e) => {
      // e.audioOffset is in "ticks" (1 tick = 100 nanoseconds, so divide by 10,000 for ms)
      const startMs = e.audioOffset / 10000;
      const durationMs = e.duration / 10000;
      const word = e.text;

      // Find the word in the original text to get the correct character offset
      // Azure's e.textOffset in SSML mode is relative to the SSML string, which is wrong for us.
      let foundIndex = options.text.indexOf(word, lastFoundIndex);

      // If word not found at current pointer, try searching from start (less preferred)
      if (foundIndex === -1) {
        foundIndex = options.text.indexOf(word);
      }

      if (foundIndex !== -1) {
        lastFoundIndex = foundIndex + word.length;
      }

      marks.push({
        time: startMs,
        start: startMs,
        end: startMs + durationMs,
        word: word,
        type: "word",
        part: word,
        charStartIndex: foundIndex !== -1 ? foundIndex : e.textOffset,
      });
    };

    return new Promise((resolve, reject) => {
      // Azure requires SSML for rate and pitch changes easily
      const rate = options.speakingRate ? options.speakingRate : 1.0;
      const pitch = options.pitch ? options.pitch : 1.0;

      // Convert multiplier to relative percentage for SSML (e.g., 1.5 -> +50%)
      const ratePercent = Math.round((rate - 1) * 100);
      const pitchPercent = Math.round((pitch - 1) * 100);
      const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;
      const pitchStr =
        pitchPercent >= 0 ? `+${pitchPercent}%` : `${pitchPercent}%`;

      const cleanText = options.text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

      const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${options.languageCode || "en-US"}"><voice name="${realVoiceId}"><prosody rate="${rateStr}" pitch="${pitchStr}">${cleanText}</prosody></voice></speak>`;

      synthesizer.speakSsmlAsync(
        ssml,
        (result) => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            const arrayBuffer = result.audioData;
            const buffer = Buffer.from(arrayBuffer);
            synthesizer.close();
            resolve({
              audio: buffer,
              marks: marks,
            });
          } else {
            synthesizer.close();
            reject(
              new Error(
                "Speech synthesis canceled, " +
                  result.errorDetails +
                  "\nDid you update your subscription info?",
              ),
            );
          }
        },
        (err) => {
          synthesizer.close();
          reject(err);
        },
      );
    });
  }
}
