import { config } from "../../../config/config";
import { log } from "@flow-read/shared";
import type {
  DiscoveryBook,
  IDiscoveryRepository,
} from "../../../domain/interfaces/IDiscoveryRepository";

export class BiblioCliDiscoveryRepository implements IDiscoveryRepository {
  private baseUrl = config.discovery.baseUrl.replace(/\/$/, "");
  private warnedOffline = false;

  private async safeFetch(url: string, options?: RequestInit, retry = true): Promise<Response> {
    try {
      const response = await fetch(url, options);
      
      // If service is sleeping (Render cold start)
      if (!response.ok && [502, 503, 504].includes(response.status) && retry) {
        log(`[Discovery] Service unavailable (Status ${response.status}) at ${url}. Waiting 15s to retry...`);
        await new Promise(resolve => setTimeout(resolve, 15000));
        return this.safeFetch(url, options, false); // Retry once without another retry
      }

      this.warnedOffline = false; // Reset warning if it succeeds
      return response;
    } catch (error: any) {
      const isConnectionError = 
        error.code === "ECONNREFUSED" || 
        error.code === "ConnectionRefused" || 
        error.errno === -111;

      if (isConnectionError) {
        if (retry) {
          log(`[Discovery] Connection refused at ${this.baseUrl}. Waiting 15s to retry...`);
          await new Promise(resolve => setTimeout(resolve, 15000));
          return this.safeFetch(url, options, false);
        }

        if (!this.warnedOffline) {
          log(`[Discovery] Service offline at ${this.baseUrl}. Further connection errors will be silenced.`);
          this.warnedOffline = true;
        }
        throw new Error("DISCOVERY_SERVICE_UNAVAILABLE");
      }
      
      log(`[Discovery] Fetch error at ${url}: ${error.message}`);
      throw error;
    }
  }

  async search(query: string): Promise<DiscoveryBook[]> {
    const response = await this.safeFetch(
      `${this.baseUrl}/search?query=${encodeURIComponent(query)}`,
    );
    if (!response.ok) {
      if ([502, 503, 504].includes(response.status)) {
        throw new Error("DISCOVERY_SERVICE_UNAVAILABLE");
      }
      throw new Error("Failed to search in BiblioCLI");
    }
    return (await response.json()) as DiscoveryBook[];
  }

  async downloadAndFormat(url: string): Promise<any> {
    const response = await this.safeFetch(
      `${this.baseUrl}/download?url=${encodeURIComponent(url)}`,
    );
    if (!response.ok) {
      if ([502, 503, 504].includes(response.status)) {
        throw new Error("DISCOVERY_SERVICE_UNAVAILABLE");
      }
      throw new Error("Failed to download from BiblioCLI");
    }
    return await response.json();
  }

  async getPopularBooks(): Promise<DiscoveryBook[]> {
    const response = await this.safeFetch(`${this.baseUrl}/popular`);
    if (!response.ok) {
      const errorBody = await response.text();
      log(`[Discovery] Failed to fetch popular books. Status: ${response.status}, Body: ${errorBody.slice(0, 100)}...`);
      
      if ([502, 503, 504].includes(response.status)) {
        throw new Error("DISCOVERY_SERVICE_UNAVAILABLE");
      }
      
      throw new Error(`Failed to fetch popular books from BiblioCLI: ${response.status}`);
    }
    return (await response.json()) as DiscoveryBook[];
  }
}
