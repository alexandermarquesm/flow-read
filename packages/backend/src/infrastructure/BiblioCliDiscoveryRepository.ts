import type {
  DiscoveryBook,
  IDiscoveryRepository,
} from "../core/repositories/IDiscoveryRepository";

export class BiblioCliDiscoveryRepository implements IDiscoveryRepository {
  private baseUrl = "http://127.0.0.1:8000/api/v1/books";

  async search(query: string): Promise<DiscoveryBook[]> {
    const response = await fetch(
      `${this.baseUrl}/search?query=${encodeURIComponent(query)}`,
    );
    if (!response.ok) throw new Error("Failed to search in BiblioCLI");
    return (await response.json()) as DiscoveryBook[];
  }

  async downloadAndFormat(url: string): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/download?url=${encodeURIComponent(url)}`,
    );
    if (!response.ok) throw new Error("Failed to download from BiblioCLI");
    return await response.json();
  }

  async getPopularBooks(): Promise<DiscoveryBook[]> {
    const response = await fetch(`${this.baseUrl}/popular`);
    if (!response.ok) throw new Error("Failed to fetch popular books from BiblioCLI");
    return (await response.json()) as DiscoveryBook[];
  }
}
