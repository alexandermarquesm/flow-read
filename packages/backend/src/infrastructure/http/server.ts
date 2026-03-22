import { log, LOG_PREFIX } from "@flow-read/shared";
import { GetWelcomeMessageUseCase } from "../../use_cases/GetWelcomeMessage";
import { TtsController } from "../../adapters/controllers/TtsController";
import { DiscoveryController } from "../../adapters/controllers/DiscoveryController";
import { ImageController } from "../../adapters/controllers/ImageController";
import { config } from "../../config/config";

log(`Starting backend server in ${config.env} mode on port ${config.port}`);

const getWelcomeMessageUseCase = new GetWelcomeMessageUseCase();
const ttsController = new TtsController();
const discoveryController = new DiscoveryController();
const imageController = new ImageController();

// --- Auth Setup (REMOVED) ---
// ------------------

Bun.serve({
  port: config.port,
  idleTimeout: 120,
  async fetch(req) {
    try {
      const url = new URL(req.url);

      const origin = req.headers.get("Origin");
      const allowedUrls = config.frontend.urls.map(u => u.replace(/\/$/, ""));
      const normalizedOrigin = origin?.replace(/\/$/, "");
      const corsOrigin = (normalizedOrigin && allowedUrls.includes(normalizedOrigin)) ? origin! : allowedUrls[0];

      const corsHeaders = {
        "Access-Control-Allow-Origin": corsOrigin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Credentials": "true",
      };

      // --- Health & Diagnostic ---
      if (url.pathname === "/api/health") {
        return new Response(JSON.stringify({ 
          status: "OK", 
          env: config.env,
          uptime: process.uptime(),
          version: "1.2.1-diagnostic"
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === "/") {
      const message = getWelcomeMessageUseCase.execute();
      return new Response(
        JSON.stringify({
          message: message.content,
          env: config.env,
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

    // --- Auth Routes (REMOVED) ---

    // API Routes via Controller
    if (url.pathname === "/api/voices" && req.method === "GET") {
      const response = await ttsController.getVoices(req);
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

    // Image Proxy Route
    if (url.pathname === "/api/image" && req.method === "GET") {
      const response = await imageController.proxy(req);
      Object.entries(corsHeaders).forEach(([k, v]) => {
        response.headers.set(k, v);
      });
      return response;
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.stack : String(err);
      log(`[CRITICAL ERROR] Unhandled exception: ${errorMsg}`);
      
      // Fallback CORS headers in case they weren't initialized
      const fallbackCors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*"
      };

      return new Response(JSON.stringify({ 
        error: "Internal Server Error", 
        message: err instanceof Error ? err.message : "Unknown error",
        stack: errorMsg 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...fallbackCors }
      });
    }
  },
});
