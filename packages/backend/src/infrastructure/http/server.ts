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

log(`Starting backend server in ${config.env} mode on port ${config.port}`);

const getWelcomeMessageUseCase = new GetWelcomeMessageUseCase();
const ttsController = new TtsController();
const discoveryController = new DiscoveryController();
const imageController = new ImageController();

// --- Auth Setup ---
const userRepository = new PrismaUserRepository(prisma);
const jwtService = new BunJwtService(config.auth.jwtSecret, config.auth.jwtExpiresIn);

const providerServices = new Map<OAuthProvider, OAuthProviderService>();

if (config.auth.google.clientId && config.auth.google.clientSecret) {
  providerServices.set(
    "google",
    new GoogleOAuthProvider(
      config.auth.google.clientId,
      config.auth.google.clientSecret,
      config.auth.google.callbackUrl!,
    ),
  );
}

if (config.auth.github.clientId && config.auth.github.clientSecret) {
  providerServices.set(
    "github",
    new GithubOAuthProvider(
      config.auth.github.clientId,
      config.auth.github.clientSecret,
      config.auth.github.callbackUrl!,
    ),
  );
}

const loginUseCase = new OAuthLoginUseCase(userRepository, providerServices, jwtService);
const oauthController = new OAuthController(loginUseCase, providerServices, config.frontend.mainUrl);
// ------------------

Bun.serve({
  port: config.port,
  idleTimeout: 120, // Aumentado para 2 minutos para permitir que a IA do Python processe livros grandes
  async fetch(req) {
    const url = new URL(req.url);

    // CORS Headers: Support multiple origins from FRONTEND_URL
    const requestOrigin = req.headers.get("Origin")?.replace(/\/$/, "");
    
    // Check if origin is allowed
    const isAllowed = !requestOrigin || config.frontend.urls.includes(requestOrigin);
    
    // Use actual origin if allowed, otherwise fallback to first allowed origin
    const finalOrigin = isAllowed && requestOrigin ? req.headers.get("Origin")! : config.frontend.urls[0];

    const corsHeaders = {
      "Access-Control-Allow-Origin": finalOrigin,
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
          const isProd = config.env === "production";
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
