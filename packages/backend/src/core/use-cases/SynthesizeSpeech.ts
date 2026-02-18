import {
  ITtsService,
  ISynthesizeOptions,
  ITtsResponse,
} from "../repositories/ITtsService";

export class SynthesizeSpeech {
  constructor(private ttsService: ITtsService) {}

  async execute(options: ISynthesizeOptions): Promise<ITtsResponse> {
    if (!options.text) {
      throw new Error("Text is required");
    }
    return this.ttsService.synthesize(options);
  }
}
