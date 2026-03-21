import { ITtsService } from "../domain/interfaces/ITtsService";
import { Voice } from "../domain/entities/Voice";

export class ListVoices {
  constructor(private ttsService: ITtsService) {}

  async execute(languageCode?: string): Promise<Voice[]> {
    return this.ttsService.getVoices(languageCode);
  }
}
