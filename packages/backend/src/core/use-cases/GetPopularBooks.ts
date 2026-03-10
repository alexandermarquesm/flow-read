import type {
  IDiscoveryRepository,
  DiscoveryBook,
} from "../repositories/IDiscoveryRepository";

export class GetPopularBooks {
  constructor(private discoveryRepo: IDiscoveryRepository) {}

  async execute(): Promise<DiscoveryBook[]> {
    return await this.discoveryRepo.getPopularBooks();
  }
}
