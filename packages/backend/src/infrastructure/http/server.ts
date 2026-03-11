// import { serve } from "bun"; // Use global Bun
import { log, LOG_PREFIX } from "@flow-read/shared";
import { GetWelcomeMessageUseCase } from "../../core/use-cases/GetWelcomeMessage";
import { TtsController } from "./controllers/TtsController";
import { DiscoveryController } from "./controllers/DiscoveryController";
import { config } from "../../config/config";

const PORT = config.port;
const ENV = process.env.NODE_ENV || "development";

log(`Starting backend server in ${ENV} mode on port ${PORT}`);

const getWelcomeMessageUseCase = new GetWelcomeMessageUseCase();
const ttsController = new TtsController();
const discoveryController = new DiscoveryController();

Bun.serve({
  port: PORT,
  idleTimeout: 120, // Aumentado para 2 minutos para permitir que a IA do Python processe livros grandes
  async fetch(req) {
    const url = new URL(req.url);

    // CORS Headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === "/") {
      const message = getWelcomeMessageUseCase.execute();
      return new Response(
        JSON.stringify({
          message: message.content,
          env: ENV,
          logPrefix: LOG_PREFIX,
        }),
        {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        },
      );
    }

    // API Routes via Controller
    if (url.pathname === "/api/voices" && req.method === "GET") {
      const response = await ttsController.getVoices(req);
      // Append CORS to the response from controller
      Object.entries(corsHeaders).forEach(([k, v]) => {
        response.headers.set(k, v);
      });
      return response;
    }

    if (url.pathname === "/api/synthesize" && req.method === "POST") {
      const response = await ttsController.synthesize(req);
      Object.entries(corsHeaders).forEach(([k, v]) => {
        response.headers.set(k, v);
      });
      return response;
    }

    // Discovery Routes
    if (url.pathname === "/api/discovery/popular" && req.method === "GET") {
      const response = await discoveryController.popular(req);
      Object.entries(corsHeaders).forEach(([k, v]) => {
        response.headers.set(k, v);
      });
      return response;
    }

    if (url.pathname === "/api/discovery/search" && req.method === "GET") {
      const response = await discoveryController.search(req);
      Object.entries(corsHeaders).forEach(([k, v]) => {
        response.headers.set(k, v);
      });
      return response;
    }

    if (url.pathname === "/api/discovery/download" && req.method === "GET") {
      const response = await discoveryController.download(req);
      Object.entries(corsHeaders).forEach(([k, v]) => {
        response.headers.set(k, v);
      });
      return response;
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
});
