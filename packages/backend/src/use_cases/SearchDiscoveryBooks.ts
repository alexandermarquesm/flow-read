import type {
  IDiscoveryRepository,
  DiscoveryBook,
} from "../domain/interfaces/IDiscoveryRepository";

export class SearchDiscoveryBooks {
  constructor(private discoveryRepo: IDiscoveryRepository) {}

  async execute(query: string): Promise<DiscoveryBook[]> {
    return await this.discoveryRepo.search(query);
  }
}
