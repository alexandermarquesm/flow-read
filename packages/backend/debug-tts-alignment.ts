import { EdgeTTS } from "node-edge-tts";
import { readFile, unlink } from "fs/promises";
import { join } from "path";

async function testAlignment() {
  const tts = new EdgeTTS({
    voice: "pt-BR-FranciscaNeural",
    lang: "pt-BR",
    saveSubtitles: true,
  });

  const tempFile = join(process.cwd(), "test-alignment.mp3");
  const tempJson = tempFile + ".json";
  const text = " Bem-vindo ao texto com espaço."; // Note leading space

  try {
    console.log(`Generating for text: '${text}'`);
    await tts.ttsPromise(text, tempFile);

    const metadata = await readFile(tempJson, "utf-8");
    const marks = JSON.parse(metadata);
    console.log("Marks:", JSON.stringify(marks, null, 2));

    // Cleanup
    await unlink(tempFile);
    await unlink(tempJson);
  } catch (e) {
    console.error("Error:", e);
  }
}

testAlignment();
