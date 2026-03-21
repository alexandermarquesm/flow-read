import { config } from "../../../config/config";
import { log } from "@flow-read/shared";
import type {
  DiscoveryBook,
  IDiscoveryRepository,
} from "../../../domain/interfaces/IDiscoveryRepository";

export class BiblioCliDiscoveryRepository implements IDiscoveryRepository {
  private baseUrl = config.discovery.baseUrl;

  private async safeFetch(url: string, options?: RequestInit): Promise<Response> {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error: any) {
      if (error.code === "ConnectionRefused" || error.errno === -111) {
        log(`[Discovery] Service unavailable at ${this.baseUrl}. Check if BiblioCLI is running.`);
        throw new Error("DISCOVERY_SERVICE_UNAVAILABLE");
      }
      throw error;
    }
  }

  async search(query: string): Promise<DiscoveryBook[]> {
    const response = await this.safeFetch(
      `${this.baseUrl}/search?query=${encodeURIComponent(query)}`,
    );
    if (!response.ok) throw new Error("Failed to search in BiblioCLI");
    return (await response.json()) as DiscoveryBook[];
  }

  async downloadAndFormat(url: string): Promise<any> {
    const response = await this.safeFetch(
      `${this.baseUrl}/download?url=${encodeURIComponent(url)}`,
    );
    if (!response.ok) throw new Error("Failed to download from BiblioCLI");
    return await response.json();
  }

  async getPopularBooks(): Promise<DiscoveryBook[]> {
    const response = await this.safeFetch(`${this.baseUrl}/popular`);
    if (!response.ok) {
      const errorBody = await response.text();
      log(`[Discovery] Failed to fetch popular books. Status: ${response.status}, Body: ${errorBody}`);
      throw new Error(`Failed to fetch popular books from BiblioCLI: ${response.status}`);
    }
    return (await response.json()) as DiscoveryBook[];
  }
}
