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

export const useSpeechSynthesis = ({
  onEnd,
  onBoundary,
  onWarning,
}: UseSpeechSynthesisProps = {}) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch voices from backend
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const response = await fetch("http://localhost:4000/api/voices"); // Backend URL
        if (response.ok) {
          const data = await response.json();
          const mappedVoices = data.map((v: any) => ({
            name: v.name,
            voiceURI: v.id,
            lang: v.languageCode,
            default: false,
            localService: false,
          }));

          // Sort voices: Francisca first, then other Microsoft/Edge voices, then Gemini/others
          mappedVoices.sort((a: any, b: any) => {
            const isFranciscaA = a.name.includes("Francisca");
            const isFranciscaB = b.name.includes("Francisca");

            // 1. Francisca always at the top
            if (isFranciscaA && !isFranciscaB) return -1;
            if (!isFranciscaA && isFranciscaB) return 1;

            // 2. Microsoft/Edge voices come before Gemini/others
            const isEdgeA =
              a.voiceURI.startsWith("edge:") || a.name.includes("Microsoft");
            const isEdgeB =
              b.voiceURI.startsWith("edge:") || b.name.includes("Microsoft");

            if (isEdgeA && !isEdgeB) return -1;
            if (!isEdgeA && isEdgeB) return 1;

            // 3. Alphabetical for the rest
            return a.name.localeCompare(b.name);
          });

          setVoices(mappedVoices);
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
          return;
        }

        if (!response.ok) {
          throw new Error("TTS Request failed");
        }

        const data = await response.json();

        if (requestId !== requestRef.current) return;

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
    speak,
    pause,
    resume,
    cancel,
  };
};
