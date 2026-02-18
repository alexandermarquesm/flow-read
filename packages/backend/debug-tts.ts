import { EdgeTTS } from "node-edge-tts";
import { writeFileSync } from "fs";

async function testTTS() {
  console.log("Starting node-edge-tts test...");
  try {
    const tts = new EdgeTTS({
      voice: "pt-BR-FranciscaNeural",
      lang: "pt-BR",
      outputFormat: "audio-24khz-48kbitrate-mono-mp3",
      saveSubtitles: false,
    });

    console.log("Generating audio...");
    // node-edge-tts usually writes to file, but maybe we can stream or catch buffer?
    // Checking library source would help, but let's try to write to a file first to verify connection.
    await tts.ttsPromise("Olá, teste de conexão.", "./test-output.mp3");
    console.log("Audio generated successfully to test-output.mp3");
  } catch (e) {
    console.error("Test Failed:", e);
  }
}

testTTS();
