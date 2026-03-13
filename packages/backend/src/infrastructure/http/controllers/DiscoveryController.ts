import { SearchDiscoveryBooks } from "../../../core/use-cases/SearchDiscoveryBooks";
import { DownloadAndFormatBook } from "../../../core/use-cases/DownloadAndFormatBook";
import { GetPopularBooks } from "../../../core/use-cases/GetPopularBooks";
import { BiblioCliDiscoveryRepository } from "../../BiblioCliDiscoveryRepository";

const discoveryRepo = new BiblioCliDiscoveryRepository();
const searchUseCase = new SearchDiscoveryBooks(discoveryRepo);
const downloadUseCase = new DownloadAndFormatBook(discoveryRepo);
const popularUseCase = new GetPopularBooks(discoveryRepo);

export class DiscoveryController {
  async popular(req: Request): Promise<Response> {
    try {
      const results = await popularUseCase.execute();
      return new Response(JSON.stringify(results), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
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
