import sharp from "sharp";
import crypto from "crypto";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";

const CACHE_DIR = path.join(process.cwd(), "image-cache");

// Ensure cache directory exists
if (!existsSync(CACHE_DIR)) {
  fs.mkdir(CACHE_DIR, { recursive: true }).catch(console.error);
}

export class ImageController {
  async proxy(req: Request): Promise<Response> {
    const urlObj = new URL(req.url);
    const imageUrl = urlObj.searchParams.get("url");

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "URL parameter required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      // Create a unique hash for the image URL to use as filename
      const hash = crypto.createHash("md5").update(imageUrl).digest("hex");
      const cachedFilePath = path.join(CACHE_DIR, `${hash}.webp`);

      // 1. Check if we already have it in cache
      if (existsSync(cachedFilePath)) {
        const cachedImage = await fs.readFile(cachedFilePath);
        return new Response(cachedImage, {
          headers: {
            "Content-Type": "image/webp",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }

      // 2. Fetch the image from the external source
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 3. Compress and convert to WebP using sharp
      const optimizedImageBuffer = await sharp(buffer)
        .resize({ width: 300, withoutEnlargement: true }) // Typical book cover width
        .webp({ quality: 80 })
        .toBuffer();

      // 4. Save to cache asynchronously
      fs.writeFile(cachedFilePath, optimizedImageBuffer).catch((err) =>
        console.error("Failed to write image to cache:", err)
      );

      // 5. Return the optimized image
      return new Response(optimizedImageBuffer, {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch (error: any) {
      console.error("Image proxy error:", error);
      return new Response(JSON.stringify({ error: "Failed to process image" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
}
