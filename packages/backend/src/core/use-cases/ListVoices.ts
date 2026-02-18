import { ITtsService } from "../repositories/ITtsService";
import { Voice } from "../entities/Voice";

export class ListVoices {
  constructor(private ttsService: ITtsService) {}

  async execute(languageCode?: string): Promise<Voice[]> {
    return this.ttsService.getVoices(languageCode);
  }
}
