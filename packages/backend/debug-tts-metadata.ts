import { EdgeTTS } from "node-edge-tts";
import { readFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

async function testMetadata() {
  const tts = new EdgeTTS({
    voice: "pt-BR-FranciscaNeural",
    lang: "pt-BR",
    outputFormat: "audio-24khz-48kbitrate-mono-mp3",
    saveSubtitles: true,
  });

  const tempFile = join(process.cwd(), "test-metadata.mp3");
  const tempJson = tempFile + ".json";

  try {
    console.log(`Generating to ${tempFile}...`);
    await tts.ttsPromise("Olá, este é um teste de sincronização.", tempFile);

    console.log("Reading metadata...");
    const metadata = await readFile(tempJson, "utf-8");
    console.log("Metadata content:", metadata);

    // Cleanup
    await unlink(tempFile);
    await unlink(tempJson);
  } catch (e) {
    console.error("Error:", e);
  }
}

testMetadata();
