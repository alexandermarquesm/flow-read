import { log, LOG_PREFIX } from "@flow-read/shared";
import { GetWelcomeMessageUseCase } from "../../use_cases/GetWelcomeMessage";
import { TtsController } from "../../adapters/controllers/TtsController";
import { DiscoveryController } from "../../adapters/controllers/DiscoveryController";
import { ImageController } from "../../adapters/controllers/ImageController";
import { config } from "../../config/config";
import { prisma } from "../database/prisma";
import { PrismaUserRepository } from "../../adapters/repositories/PrismaUserRepository";
import { BunJwtService } from "../security/BunJwtService";
import { GoogleOAuthProvider } from "../../adapters/gateways/oauth/GoogleOAuthProvider";
import { GithubOAuthProvider } from "../../adapters/gateways/oauth/GithubOAuthProvider";
import { OAuthLoginUseCase } from "../../use_cases/OAuthLoginUseCase";
import { OAuthController } from "../../adapters/controllers/OAuthController";
import type { OAuthProviderService } from "../../domain/services/OAuthProviderService";
import type { OAuthProvider } from "@flow-read/shared";

const PORT = config.port;
const ENV = process.env.NODE_ENV || "development";

log(`Starting backend server in ${ENV} mode on port ${PORT}`);

const getWelcomeMessageUseCase = new GetWelcomeMessageUseCase();
const ttsController = new TtsController();
const discoveryController = new DiscoveryController();
const imageController = new ImageController();

// --- Auth Setup ---
const JWT_SECRET = process.env.JWT_SECRET || "default_secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";


const userRepository = new PrismaUserRepository(prisma);
const jwtService = new BunJwtService(JWT_SECRET, JWT_EXPIRES_IN);

const providerServices = new Map<OAuthProvider, OAuthProviderService>();

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providerServices.set(
    "google",
    new GoogleOAuthProvider(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL || `http://localhost:${PORT}/api/auth/google/callback`,
    ),
  );
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providerServices.set(
    "github",
    new GithubOAuthProvider(
      process.env.GITHUB_CLIENT_ID,
      process.env.GITHUB_CLIENT_SECRET,
      process.env.GITHUB_CALLBACK_URL || `http://localhost:${PORT}/api/auth/github/callback`,
    ),
  );
}

const loginUseCase = new OAuthLoginUseCase(userRepository, providerServices, jwtService);
const oauthController = new OAuthController(loginUseCase, providerServices, FRONTEND_URL);
// ------------------

Bun.serve({
  port: PORT,
  idleTimeout: 120, // Aumentado para 2 minutos para permitir que a IA do Python processe livros grandes
  async fetch(req) {
    const url = new URL(req.url);

    // CORS Headers: Restrict to current request or frontend, with credentials enabled
    // CORS Headers: Support multiple origins from FRONTEND_URL
    const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173").split(",").map(o => o.trim());
    const requestOrigin = req.headers.get("Origin");
    
    // In production, strictly match against allowed origins. In dev, be more lenient.
    const isAllowed = !requestOrigin || allowedOrigins.includes(requestOrigin);
    const corsOrigin = (isAllowed && requestOrigin) ? requestOrigin : allowedOrigins[0];

    const corsHeaders = {
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
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

    // --- Auth Routes ---
    const authStartMatch = url.pathname.match(/^\/api\/auth\/(google|github)$/);
    if (authStartMatch && req.method === "GET") {
      const provider = authStartMatch[1] as OAuthProvider;
      const state = crypto.randomUUID();

      const authUrl = oauthController.getAuthUrl(provider, state);
      if (authUrl) {
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            Location: authUrl,
            "Set-Cookie": `oauth_state=${state}; HttpOnly; Path=/; Max-Age=3600; SameSite=Lax`,
          },
        });
      } else {
        return new Response(
          `Provider ${provider} is not configured on the backend.`,
          { status: 400, headers: corsHeaders },
        );
      }
    }

    const authCallbackMatch = url.pathname.match(/^\/api\/auth\/(google|github)\/callback$/);
    if (authCallbackMatch && req.method === "GET") {
      const provider = authCallbackMatch[1] as OAuthProvider;
      const code = url.searchParams.get("code");
      const urlState = url.searchParams.get("state");

      const cookieHeader = req.headers.get("Cookie");
      const cookieState = cookieHeader?.match(/oauth_state=([^;]+)/)?.[1];

      if (!urlState || urlState !== cookieState) {
        return new Response("Invalid state parameter. Potential CSRF attack.", {
          status: 400, headers: corsHeaders,
        });
      }

      if (!code) {
        return new Response("Missing code parameter", {
          status: 400, headers: corsHeaders,
        });
      }

      const result = await oauthController.handleCallback(provider, code);
      if (result) {
        const headers: Record<string, string> = {
          ...corsHeaders,
          Location: result.redirectUrl,
        };
        // Strong mitigation against XSS: Set the token in an HttpOnly, Secure cookie
        if (result.token) {
          const isProd = process.env.NODE_ENV === "production";
          headers["Set-Cookie"] = `auth_token=${result.token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax${isProd ? "; Secure" : ""}`;
        }
        return new Response(null, { status: 302, headers });
      }
      return new Response("Callback failed", {
        status: 500, headers: corsHeaders,
      });
    }
    // -------------------

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

    // Image Proxy Route
    if (url.pathname === "/api/image" && req.method === "GET") {
      const response = await imageController.proxy(req);
      Object.entries(corsHeaders).forEach(([k, v]) => {
        response.headers.set(k, v);
      });
      return response;
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
});
