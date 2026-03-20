import { SearchDiscoveryBooks } from "../../../core/use-cases/SearchDiscoveryBooks";
import { DownloadAndFormatBook } from "../../../core/use-cases/DownloadAndFormatBook";
import { GetPopularBooks } from "../../../core/use-cases/GetPopularBooks";
import { BiblioCliDiscoveryRepository } from "../../BiblioCliDiscoveryRepository";

const discoveryRepo = new BiblioCliDiscoveryRepository();
const searchUseCase = new SearchDiscoveryBooks(discoveryRepo);
const downloadUseCase = new DownloadAndFormatBook(discoveryRepo);
const popularUseCase = new GetPopularBooks(discoveryRepo);

// Simple In-Memory Cache
const POPULAR_CACHE: { data: any; lastFetch: number } = {
  data: null,
  lastFetch: 0,
};
const POPULAR_TTL_MS = 1000 * 60 * 30; // 30 minutes

export class DiscoveryController {
  async popular(req: Request): Promise<Response> {
    try {
      const now = Date.now();

      // Return from cache if valid
      if (POPULAR_CACHE.data && now - POPULAR_CACHE.lastFetch < POPULAR_TTL_MS) {
        return new Response(JSON.stringify(POPULAR_CACHE.data), {
          headers: { 
            "Content-Type": "application/json",
            "Cache-Control": `public, max-age=${POPULAR_TTL_MS / 1000}`
          },
        });
      }

      const results = await popularUseCase.execute();
      
      // Update cache
      POPULAR_CACHE.data = results;
      POPULAR_CACHE.lastFetch = now;

      return new Response(JSON.stringify(results), {
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": `public, max-age=${POPULAR_TTL_MS / 1000}`
        },
      });
    } catch (error: any) {
      // Fallback to cache if error and we have stale data
      if (POPULAR_CACHE.data) {
        console.warn("Returning stale cache due to error in popularUseCase");
        return new Response(JSON.stringify(POPULAR_CACHE.data), {
          headers: { "Content-Type": "application/json" },
        });
      }
      return this.handleError("popular", error);
    }
  }

  private handleError(operation: string, error: any): Response {
    if (error.message === "DISCOVERY_SERVICE_UNAVAILABLE") {
      return new Response(
        JSON.stringify({ 
          error: "BiblioCLI Discovery Service is currently offline",
          code: "SERVICE_OFFLINE",
          fallback: [] 
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    console.error(`Discovery ${operation} Error:`, error);
    return new Response(
      JSON.stringify({ error: `Internal error during ${operation}` }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  async search(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const query = url.searchParams.get("query");

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query parameter is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    try {
      const results = await searchUseCase.execute(query);
      return new Response(JSON.stringify(results), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      return this.handleError("search", error);
    }
  }

  async download(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const bookUrl = url.searchParams.get("url");

    if (!bookUrl) {
      return new Response(
        JSON.stringify({ error: "URL parameter is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    try {
      const data = await downloadUseCase.execute(bookUrl);
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      return this.handleError("download", error);
    }
  }
}
