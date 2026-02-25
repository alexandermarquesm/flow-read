import { useState, useRef, useCallback, useEffect } from "react";

export interface SpeechSettings {
  pitch: number;
  rate: number;
  volume: number;
  voiceURI: string | null;
  playAudio?: boolean;
}

interface UseSpeechSynthesisProps {
  onBoundary?: (charIndex: number) => void;
  onEnd?: () => void;
  onWarning?: (message: string) => void;
}

export interface CustomVoice extends Partial<SpeechSynthesisVoice> {
  name: string;
  voiceURI: string;
  lang: string;
  provider: string;
}

export const useSpeechSynthesis = ({
  onEnd,
  onBoundary,
  onWarning,
}: UseSpeechSynthesisProps = {}) => {
  const [voices, setVoices] = useState<CustomVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch voices from backend
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const response = await fetch("http://localhost:4000/api/voices"); // Backend URL
        if (response.ok) {
          const data = await response.json();
          let mappedVoices = data.map((v: any) => ({
            name: v.name,
            voiceURI: v.id,
            lang: v.languageCode,
            provider: v.provider, // Include provider
            default: false,
            localService: false,
          }));

          // Filter and Curate voices
          mappedVoices = mappedVoices.filter((v: any) => {
            const l = v.lang.toLowerCase();
            const provider = v.provider;
            const name = v.name.toLowerCase();

            // 1. Azure restriction: Strictly only 3 specific high-quality voices
            if (provider === "azure") {
              // We want specific variants to avoid duplicates
              const isThalita =
                name.includes("thalita") && name.includes("dragon");
              const isLeila =
                name.includes("leila") && !name.includes("multilingual");
              const isAndrew =
                name.includes("andrew") &&
                (name.includes("multilingual") || name.includes("neural"));

              // Only keep the first match of each type if there are multiples
              return isThalita || isLeila || isAndrew;
            }

            // 2. Other providers: pt-BR, en-US, en-GB only
            return l === "pt-br" || l === "en-us" || l === "en-gb";
          });

          // Sort voices: Francisca (Edge) ALWAYS first, then group by provider
          mappedVoices.sort((a: any, b: any) => {
            const isFranciscaA =
              a.provider === "edge" && a.name.includes("Francisca");
            const isFranciscaB =
              b.provider === "edge" && b.name.includes("Francisca");

            if (isFranciscaA && !isFranciscaB) return -1;
            if (!isFranciscaA && isFranciscaB) return 1;

            // Custom order for Azure voices
            if (a.provider === "azure" && b.provider === "azure") {
              const azureOrder = ["thalita", "leila", "andrew"];
              const indexA = azureOrder.findIndex((n) =>
                a.name.toLowerCase().includes(n),
              );
              const indexB = azureOrder.findIndex((n) =>
                b.name.toLowerCase().includes(n),
              );
              return indexA - indexB;
            }

            // Group by provider for others
            if (a.provider !== b.provider) {
              return a.provider.localeCompare(b.provider);
            }

            // Alphabetical within same provider
            return a.name.localeCompare(b.name);
          });

          // Final cleanup: Ensure only ONE of each Azure voice (in case multiple variants matched)
          const finalVoices: CustomVoice[] = [];
          const azureSeen = new Set<string>();

          mappedVoices.forEach((v: CustomVoice) => {
            if (v.provider === "azure") {
              const azureOrder = ["thalita", "leila", "andrew"];
              const key = azureOrder.find((n) =>
                v.name.toLowerCase().includes(n),
              );
              if (key && !azureSeen.has(key)) {
                azureSeen.add(key);
                finalVoices.push(v);
              }
            } else {
              finalVoices.push(v);
            }
          });

          setVoices(finalVoices);
        }
      } catch (error) {
        console.error("Failed to fetch voices:", error);
      }
    };

    fetchVoices();
  }, []);

  const requestRef = useRef<number>(0);

  const cancel = useCallback(() => {
    requestRef.current++; // Invalidate pending requests
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  const speak = useCallback(
    async (text: string, settings: SpeechSettings, startIndex: number = 0) => {
      cancel();
      // Capture the current request ID after cancellation (which incremented it)
      // Actually, cancel() increments it. So we can just grasp the current value.
      // But wait, cancel() increments it.
      // So if I call speak() -> cancel() -> id=1.
      // Then await fetch.
      // If speak() called again -> cancel() -> id=2.
      // 1 !== 2, so first call aborts.
      // This is correct.

      const requestId = requestRef.current;

      if (!text) return;

      setIsSynthesizing(true);
      setIsSpeaking(true);
      setIsPaused(false);

      try {
        const textToSpeak = startIndex > 0 ? text.slice(startIndex) : text;
        const currentVolume = Math.min(Math.max(settings.volume, 0), 1);

        // If volume is 0, don't even fetch, just simulate speaking?
        // Or just let it play (it will be silent). Let's continue.

        const response = await fetch("http://localhost:4000/api/synthesize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: textToSpeak,
            voiceId: settings.voiceURI,
          }),
        });

        if (requestId !== requestRef.current) {
          // Request was cancelled or superseded
          setIsSynthesizing(false);
          return;
        }

        if (!response.ok) {
          setIsSynthesizing(false);
          throw new Error("TTS Request failed");
        }

        const data = await response.json();

        if (requestId !== requestRef.current) {
          setIsSynthesizing(false);
          return;
        }

        setIsSynthesizing(false);
        const { audio: audioData, marks, warning } = data;

        if (warning && onWarning) {
          onWarning(warning);
        }

        const audio = new Audio(audioData);

        // Apply settings
        audio.playbackRate = settings.rate;
        audio.volume = currentVolume;
        if (settings.playAudio === false) {
          audio.muted = true;
        }

        // Preserve audio ref
        audioRef.current = audio;

        // Synchronization logic
        let requestAnimationFrameId: number;
        let runningCharIndex = 0;

        // Pre-calculate char indices for marks
        const processedMarks = marks.map((m: any) => {
          // Backend now provides exact charStartIndex
          if (typeof m.charStartIndex === "number") {
            return m;
          }
          // Fallback for legacy or if missing
          const startIdx = runningCharIndex;
          runningCharIndex += m.part.length;
          return { ...m, charStartIndex: startIdx };
        });

        const syncLoop = () => {
          if (!audio || audio.paused || audio.ended) return;

          const currentTimeMs = audio.currentTime * 1000;
          let currentMark = processedMarks.find(
            (m: any) => currentTimeMs >= m.start && currentTimeMs <= m.end,
          );

          if (
            !currentMark &&
            processedMarks.length > 0 &&
            currentTimeMs <= processedMarks[0].end
          ) {
            currentMark = processedMarks[0];
          }

          if (currentMark && onBoundary) {
            const leadingSpaceMatch = currentMark.part.match(/^\s+/);
            const offset = leadingSpaceMatch ? leadingSpaceMatch[0].length : 0;
            onBoundary(startIndex + currentMark.charStartIndex + offset);
          }

          requestAnimationFrameId = requestAnimationFrame(syncLoop);
        };

        audio.onplay = () => {
          // Double check in case of very fast race
          if (requestId !== requestRef.current) {
            audio.pause();
            return;
          }
          syncLoop();
        };

        audio.onended = () => {
          cancelAnimationFrame(requestAnimationFrameId);
          setIsSpeaking(false);
          setIsPaused(false);
          if (onEnd) onEnd();
        };

        audio.onerror = (e) => {
          cancelAnimationFrame(requestAnimationFrameId);
          console.error("Audio playback error", e);
          setIsSpeaking(false);
          setIsPaused(false);
        };

        await audio.play();
      } catch (error) {
        // Only log error if not cancelled
        if (requestId === requestRef.current) {
          console.error("TTS Error:", error);
          setIsSpeaking(false);
          setIsPaused(false);
          setIsSynthesizing(false);
        }
      }
    },
    [cancel, onEnd, onBoundary],
  );

  const pause = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsPaused(true);
    }
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play();
      setIsPaused(false);
    }
  }, []);

  return {
    voices,
    isSpeaking,
    isPaused,
    isSynthesizing,
    speak,
    pause,
    resume,
    cancel,
  };
};
