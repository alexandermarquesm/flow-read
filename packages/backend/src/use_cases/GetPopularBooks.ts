import type {
  IDiscoveryRepository,
  DiscoveryBook,
} from "../domain/interfaces/IDiscoveryRepository";

export class GetPopularBooks {
  constructor(private discoveryRepo: IDiscoveryRepository) {}

  async execute(): Promise<DiscoveryBook[]> {
    return await this.discoveryRepo.getPopularBooks();
  }
}
