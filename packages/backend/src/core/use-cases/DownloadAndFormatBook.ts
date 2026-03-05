import type { IDiscoveryRepository } from "../repositories/IDiscoveryRepository";

export class DownloadAndFormatBook {
  constructor(private discoveryRepo: IDiscoveryRepository) {}

  async execute(url: string): Promise<any> {
    return await this.discoveryRepo.downloadAndFormat(url);
  }
}
