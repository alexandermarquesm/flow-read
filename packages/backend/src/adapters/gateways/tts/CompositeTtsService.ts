import {
  ITtsService,
  ISynthesizeOptions,
  ITtsResponse,
} from "../../../domain/interfaces/ITtsService";
import { Voice } from "../../../domain/entities/Voice";

export class CompositeTtsService implements ITtsService {
  constructor(private services: ITtsService[]) {}

  async getVoices(languageCode?: string): Promise<Voice[]> {
    const allVoices: Voice[] = [];

    // Run in parallel
    const results = await Promise.allSettled(
      this.services.map((service) => service.getVoices(languageCode)),
    );

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        allVoices.push(...result.value);
      } else {
        console.error(
          "One of the TTS services failed to fetch voices:",
          result.reason,
        );
      }
    });

    return allVoices;
  }

  async synthesize(options: ISynthesizeOptions): Promise<ITtsResponse> {
    const voiceId = options.voiceId || "";

    // Route based on prefix
    if (voiceId.startsWith("google:")) {
      const googleService = this.services.find(
        (s) => s.constructor.name === "GoogleTtsService",
      );
      if (!googleService) throw new Error("Google Service not available");
      return googleService.synthesize(options);
    }

    if (voiceId.startsWith("edge:")) {
      const edgeService = this.services.find(
        (s) => s.constructor.name === "EdgeTtsService",
      );
      if (!edgeService) throw new Error("Edge Service not available");
      return edgeService.synthesize(options);
    }

    if (voiceId.startsWith("azure:")) {
      const azureService = this.services.find(
        (s) => s.constructor.name === "AzureTtsService",
      );
      if (!azureService) throw new Error("Azure Service not available");
      return azureService.synthesize(options);
    }

    if (voiceId.startsWith("gemini:")) {
      const geminiService = this.services.find(
        (s) => s.constructor.name === "GeminiTtsService",
      );
      if (geminiService) {
        try {
          return await geminiService.synthesize(options);
        } catch (error) {
          console.error(
            "Gemini TTS failed (likely quota exceeded). Falling back to Edge TTS...",
            error,
          );
          // Fallback to Edge but include a warning
          const edgeService = this.services.find(
            (s) => s.constructor.name === "EdgeTtsService",
          );
          if (edgeService) {
            const fallbackOptions = {
              ...options,
              voiceId: "pt-BR-FranciscaNeural", // valid Edge voice
            };
            const result = await edgeService.synthesize(fallbackOptions);
            return {
              ...result,
              warning: "Gemini quota exceeded. Using free Microsoft voice.",
            };
          }
        }
      }
    }

    // Fallback: If no prefix (legacy), try all or default?
    // Let's assume Edge if no prefix (unlikely with new logic) or try both.
    // For safety, warn and try Edge first?

    const edgeService = this.services.find(
      (s) => s.constructor.name === "EdgeTtsService",
    );
    if (edgeService) {
      try {
        return await edgeService.synthesize(options);
      } catch (e) {
        console.warn("Edge fallback failed", e);
      }
    }

    throw new Error(
      "Could not route synthesis request for voice: " + options.voiceId,
    );
  }
}
