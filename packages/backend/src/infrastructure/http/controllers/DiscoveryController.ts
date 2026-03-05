import { SearchDiscoveryBooks } from "../../../core/use-cases/SearchDiscoveryBooks";
import { DownloadAndFormatBook } from "../../../core/use-cases/DownloadAndFormatBook";
import { BiblioCliDiscoveryRepository } from "../../BiblioCliDiscoveryRepository";

const discoveryRepo = new BiblioCliDiscoveryRepository();
const searchUseCase = new SearchDiscoveryBooks(discoveryRepo);
const downloadUseCase = new DownloadAndFormatBook(discoveryRepo);

export class DiscoveryController {
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
    } catch (error) {
      console.error("Discovery Search Error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch from discovery source" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
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
    } catch (error) {
      console.error("Discovery Download Error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to download book content" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }
}
