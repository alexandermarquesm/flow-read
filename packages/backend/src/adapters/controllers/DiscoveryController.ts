import fs from "fs";
import path from "path";
import { SearchDiscoveryBooks } from "../../use_cases/SearchDiscoveryBooks";
import { DownloadAndFormatBook } from "../../use_cases/DownloadAndFormatBook";
import { GetPopularBooks } from "../../use_cases/GetPopularBooks";
import { BiblioCliDiscoveryRepository } from "../gateways/discovery/BiblioCliDiscoveryRepository";

const discoveryRepo = new BiblioCliDiscoveryRepository();
const searchUseCase = new SearchDiscoveryBooks(discoveryRepo);
const downloadUseCase = new DownloadAndFormatBook(discoveryRepo);
const popularUseCase = new GetPopularBooks(discoveryRepo);

// Simple In-Memory Cache
const POPULAR_CACHE: { data: any; lastFetch: number } = {
  data: null,
  lastFetch: 0,
};
const POPULAR_TTL_MS = 30 * 60 * 1000;

const LOCAL_BOOKS_MAP: Record<string, string> = {
  "https://www.gutenberg.org/ebooks/84": "Shelley Mary Wollstonecraft/Frankenstein or the modern prometheus.json",
  "https://www.gutenberg.org/ebooks/45304": "Augustine of Hippo Saint/The City of God Volume I.json",
  "https://www.gutenberg.org/ebooks/768": "Brontë Emily/Wuthering Heights.json",
  "https://www.gutenberg.org/ebooks/2701": "Melville Herman/Moby Dick Or The Whale.json",
  "https://www.gutenberg.org/ebooks/1342": "Austen Jane/Pride and Prejudice.json",
  "https://www.gutenberg.org/ebooks/1513": "Shakespeare William/Romeo and Juliet.json",
};

export class DiscoveryController {
  async popular(req: Request): Promise<Response> {
    const now = Date.now();
    
    // 1. Tentar cache em memória primeiro (se for produção ou se o cache for muito recente)
    if (POPULAR_CACHE.data && now - POPULAR_CACHE.lastFetch < POPULAR_TTL_MS) {
      return new Response(JSON.stringify(POPULAR_CACHE.data), {
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": `public, max-age=${POPULAR_TTL_MS / 1000}`
        },
      });
    }

    try {
      // 2. Tentar o serviço de descoberta (seja Local 8000 ou Vercel Prod)
      const results = await popularUseCase.execute();
      
      if (Array.isArray(results) && results.length > 0) {
        POPULAR_CACHE.data = results;
        POPULAR_CACHE.lastFetch = now;
        return new Response(JSON.stringify(results), {
          headers: { 
            "Content-Type": "application/json",
            "Cache-Control": `public, max-age=${POPULAR_TTL_MS / 1000}`
          },
        });
      }
      
      // Se retornar vazio, cai no fallback local
      throw new Error("EMPTY_RESULTS");
    } catch (error: any) {
      // 3. Fallback inteligente: Se o serviço estiver offline ou der erro, usa os locais
      console.warn(`⚠️ [Discovery] Popular books service error, using local fallback. Error: ${error.message}`);
      const localResults = await this.getLocalPopularBooks();
      return new Response(JSON.stringify(localResults), {
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  private async getLocalPopularBooks() {
    return Object.entries(LOCAL_BOOKS_MAP).map(([url, filePath]) => {
      const fullPath = path.join(process.cwd(), "ebooks", filePath);
      try {
        if (!fs.existsSync(fullPath)) return null;
        const content = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
        
        const pgId = url.split("/").pop();
        const cover_url = pgId ? `https://www.gutenberg.org/cache/epub/${pgId}/pg${pgId}.cover.medium.jpg` : null;

        return {
          source: "(Local Cache)",
          title: content.title,
          author: content.author,
          language: "English",
          link: url,
          year: "Classic",
          cover_url: cover_url,
        };
      } catch (e) {
        return null;
      }
    }).filter((b): b is any => b !== null);
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
      // 1. Tentar primeiro o serviço externo (BiblioCLI local ou Vercel)
      // Isso permite testar a integração real na porta 8000
      const data = await downloadUseCase.execute(bookUrl);
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      // 2. Se falhar (offline), tenta o cache local para os 6 clássicos
      if (LOCAL_BOOKS_MAP[bookUrl]) {
        const localPath = path.join(process.cwd(), "ebooks", LOCAL_BOOKS_MAP[bookUrl]);
        if (fs.existsSync(localPath)) {
          const content = fs.readFileSync(localPath, "utf-8");
          console.log(`📦 [LOCAL CACHE] Serving book from disk due to service error: ${LOCAL_BOOKS_MAP[bookUrl]}`);
          return new Response(content, {
            headers: { "Content-Type": "application/json" },
          });
        }
      }
      
      // Se não for um clássico ou o arquivo local não existir, propaga o erro
      return this.handleError("download", error);
    }
  }
}
