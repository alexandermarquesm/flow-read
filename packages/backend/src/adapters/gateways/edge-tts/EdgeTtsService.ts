import {
  ITtsService,
  ISynthesizeOptions,
  ITtsResponse,
} from "../../../domain/interfaces/ITtsService";
import { Voice } from "../../../domain/entities/Voice";
import { EdgeTTSClient } from "edge-tts-client";
import { EdgeTTS } from "node-edge-tts";
import { readFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

export class EdgeTtsService implements ITtsService {
  constructor() {}

  async getVoices(languageCode?: string): Promise<Voice[]> {
    try {
      // Keep using edge-tts-client for listing voices as it works well for that
      const client = new EdgeTTSClient();
      const edgeVoices = await client.getVoices();

      const voices: Voice[] = edgeVoices
        .filter((v) => v.Locale === "pt-BR") // User requested only pt-BR
        .map((v) => ({
          id: `edge:${v.ShortName}`, // Prefixing for routing
          name: v.FriendlyName,
          languageCode: v.Locale,
          gender: v.Gender === "Female" ? "FEMALE" : "MALE",
          provider: "edge",
        }));

      if (languageCode) {
        return voices.filter((v) =>
          v.languageCode.startsWith(languageCode.split("-")[0]),
        );
      }
      return voices;
    } catch (e) {
      console.error("EdgeTTS getVoices error", e);
      return [];
    }
  }

  async synthesize(options: ISynthesizeOptions): Promise<ITtsResponse> {
    const rawVoiceId = options.voiceId || "pt-BR-FranciscaNeural";

    // Strip prefix if present
    const voiceId = rawVoiceId.startsWith("edge:")
      ? rawVoiceId.replace("edge:", "")
      : rawVoiceId;

    // Use node-edge-tts for synthesis (more stable in this env + supports marks via file)
    const tts = new EdgeTTS({
      voice: voiceId,
      lang: options.languageCode || "pt-BR",
      outputFormat: "audio-24khz-48kbitrate-mono-mp3",
      saveSubtitles: true,
      rate: options.speakingRate
        ? `${(options.speakingRate - 1) * 100}%`
        : "+0%",
      pitch: options.pitch ? `${(options.pitch - 1) * 100}%` : "+0Hz",
      volume: "+0%",
    });

    // Generate temp file paths
    const runId = randomUUID();
    const tempDir = tmpdir();
    const audioPath = join(tempDir, `flow-read-${runId}.mp3`);
    const jsonPath = audioPath + ".json"; // node-edge-tts automatically appends .json when saveSubtitles is true

    try {
      await tts.ttsPromise(options.text, audioPath);

      // Read the generated audio file
      const audio = await readFile(audioPath);
      let marks: any[] = [];

      try {
        // Read the generated subtitles file
        const jsonContent = await readFile(jsonPath, "utf-8");
        const rawMarks = JSON.parse(jsonContent);

        // Map to ITtsResponse marks format
        // node-edge-tts marks structure: { part: string, start: number, end: number }
        marks = rawMarks.reduce((acc: any[], m: any) => {
          const text = m.part;

          // Split by whitespace but keep delimiters
          const parts = text.split(/(\s+)/).filter((s: string) => s.length > 0);

          if (parts.length <= 1) {
            // Single part, keep as is
            acc.push({
              time: m.start,
              type: "word",
              start: m.start,
              end: m.end,
              word: text,
              value: text,
              part: text,
            });
          } else {
            // Compound part (e.g. "em 1943."), split it
            const totalDuration = m.end - m.start;
            const totalLength = text.length;
            let currentStart = m.start;

            parts.forEach((p: string) => {
              const weight = p.length / totalLength;
              const duration = Math.floor(totalDuration * weight);
              const partEnd = currentStart + duration;

              acc.push({
                time: currentStart,
                type: "word",
                start: currentStart,
                end: partEnd,
                word: p,
                value: p,
                part: p,
              });

              currentStart = partEnd;
            });

            // Fix rounding error for the last part
            if (acc.length > 0) {
              acc[acc.length - 1].end = m.end;
            }
          }
          return acc;
        }, []);
      } catch (jsonError) {
        // It's possible no marks were generated for short text or if failed, don't block audio
        console.warn("Could not read/parse subtitles for marks", jsonError);
      }

      return {
        audio,
        marks,
      };
    } catch (e) {
      console.error("EdgeTTS synthesis failed", e);
      throw e;
    } finally {
      // Cleanup temp files
      try {
        await unlink(audioPath).catch(() => {});
        await unlink(jsonPath).catch(() => {});
      } catch (cleanupErr) {
        // ignore
      }
    }
  }
}
