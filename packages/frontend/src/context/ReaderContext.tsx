import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  useSpeechSynthesis,
  type SpeechSettings,
} from "../hooks/useSpeechSynthesis";
import { processText, type TextSegment } from "../utils/textProcessor";
import { Toast } from "../components/Toast/Toast";

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  text: string;
  progress: number; // 0-100 roughly, or specific segment
  currentSegmentIndex: number;
  // Extended Metadata
  publicationDate?: string;
  genre?: string;
}

interface ReaderContextType {
  // Current Reading State
  text: string;
  setText: (text: string) => void;
  segments: TextSegment[];
  currentSegmentId: string | null;
  currentSegmentIndex: number;
  setCurrentSegmentIndex: (index: number) => void;
  currentWordCharIndex?: number;

  // Playback Control
  isPlaying: boolean;
  isPaused: boolean;
  isSynthesizing: boolean;
  play: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;

  // Settings & preferences
  highlightEnabled: boolean;
  setHighlightEnabled: (enabled: boolean) => void;
  settings: SpeechSettings;
  updateSettings: (newSettings: Partial<SpeechSettings>) => void;

  // Library Management
  books: Book[];
  activeBookId: string | null;
  addBook: (
    title: string,
    author: string,
    text: string,
    coverUrl?: string,
    metadata?: {
      publicationDate?: string;
      genre?: string;
    },
  ) => void;
  updateBook: (
    bookId: string,
    updates: Partial<Omit<Book, "id" | "progress" | "currentSegmentIndex">>,
  ) => void;
  selectBook: (bookId: string) => void;
  updateBookProgress: (bookId: string, segmentIndex: number) => void;
  showToast: (message: string) => void;
}

const ReaderContext = createContext<ReaderContextType | undefined>(undefined);

export const useReader = () => {
  const context = useContext(ReaderContext);
  if (!context) {
    throw new Error("useReader must be used within a ReaderProvider");
  }
  return context;
};

// Removed DEFAULT_BOOK constant

export const ReaderProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  /* Library State */
  const [books, setBooks] = useState<Book[]>(() => {
    const saved = localStorage.getItem("flow-read-books");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Clean up legacy mock data if present
        return parsed.filter((b: Book) => b.id !== "default-1");
      } catch (e) {
        console.error("Failed to parse books from local storage", e);
      }
    }
    return []; // Start empty
  });

  const [activeBookId, setActiveBookId] = useState<string | null>(() => {
    const saved = localStorage.getItem("flow-read-active-book");
    return saved || null;
  });

  // Persist Books
  useEffect(() => {
    localStorage.setItem("flow-read-books", JSON.stringify(books));
  }, [books]);

  // Persist Active Book ID
  useEffect(() => {
    if (activeBookId) {
      localStorage.setItem("flow-read-active-book", activeBookId);
    }
  }, [activeBookId]);

  // Active Reading State
  // We initialize text from the active book or empty
  const [text, setTextInternal] = useState("");
  const [segments, setSegments] = useState<TextSegment[]>([]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [currentSegmentId, setCurrentSegmentId] = useState<string | null>(null);

  // Track relative char index within the current segment for word highlighting
  const [currentWordCharIndex, setCurrentWordCharIndex] = useState<number>(-1);
  const [highlightEnabled, setHighlightEnabled] = useState(true);

  // Controls the "Auto-Advance" sequence mode
  const [isReadingSequence, setIsReadingSequence] = useState(false);

  const [settings, setSettings] = useState<SpeechSettings>({
    pitch: 1,
    rate: 1,
    volume: 1,
    voiceURI: "edge:pt-BR-FranciscaNeural", // Default to Edge Pt-BR
    playAudio: true,
  });

  // Track if we have initialized text from the active book to prevent overwrites
  const [isTextInitialized, setIsTextInitialized] = useState(false);

  // Load Book into active state when activeBookId changes
  useEffect(() => {
    const book = books.find((b) => b.id === activeBookId);
    if (book) {
      setTextInternal(book.text);
      setCurrentSegmentIndex(book.currentSegmentIndex);
      setIsTextInitialized(true);
    } else if (books.length > 0) {
      // If no active book but books exist, maybe select first?
      // For now, leave empty if ID matches nothing.
    }
  }, [activeBookId, books]);

  // Process text when it changes and sync to book
  useEffect(() => {
    const processed = processText(text);
    setSegments(processed);

    // Sync text back to the book object so it persists
    // ONLY if we have initialized the text (prevents wiping text on mount)
    if (activeBookId && isTextInitialized) {
      setBooks((prevBooks) => {
        let changed = false;
        const newBooks = prevBooks.map((b) => {
          if (b.id === activeBookId && b.text !== text) {
            changed = true;
            return { ...b, text };
          }
          return b;
        });
        return changed ? newBooks : prevBooks;
      });
    }
  }, [text, activeBookId, isTextInitialized]);

  // Sync ID with Index
  useEffect(() => {
    if (segments.length > 0) {
      // Clamp index
      const safeIndex = Math.min(
        Math.max(0, currentSegmentIndex),
        segments.length - 1,
      );
      if (safeIndex !== currentSegmentIndex) {
        setCurrentSegmentIndex(safeIndex);
      }

      if (segments[safeIndex]) {
        setCurrentSegmentId(segments[safeIndex].id);
        setCurrentWordCharIndex(-1);
      }
    } else {
      setCurrentSegmentId(null);
    }
  }, [currentSegmentIndex, segments]);

  // Handle what happens when a segment finishes
  const isReadingRef = useRef(isReadingSequence);
  useEffect(() => {
    isReadingRef.current = isReadingSequence;
  }, [isReadingSequence]);

  const handleSegmentEnd = useCallback(() => {
    if (isReadingRef.current) {
      setCurrentSegmentIndex((prev) => {
        const next = prev + 1;
        if (next < segments.length) {
          // Update progress in book
          return next;
        }
        // End of text
        setIsReadingSequence(false);
        return 0;
      });
      setCurrentWordCharIndex(-1);
    }
  }, [segments.length]);

  // Update book progress when index changes
  useEffect(() => {
    if (activeBookId) {
      setBooks((prevBooks) => {
        let changed = false;
        const newBooks = prevBooks.map((b) => {
          if (b.id === activeBookId) {
            const progress =
              segments.length > 0
                ? Math.round((currentSegmentIndex / segments.length) * 100)
                : 0;
            if (
              b.currentSegmentIndex !== currentSegmentIndex ||
              b.progress !== progress
            ) {
              changed = true;
              return { ...b, currentSegmentIndex, progress };
            }
          }
          return b;
        });
        return changed ? newBooks : prevBooks;
      });
    }
  }, [currentSegmentIndex, activeBookId, segments.length]);

  const handleBoundary = useCallback((charIndex: number) => {
    setCurrentWordCharIndex(charIndex);
  }, []);

  const {
    isSpeaking,
    isPaused,
    isSynthesizing,
    speak,
    pause: synthPause,
    resume: synthResume,
    cancel,
  } = useSpeechSynthesis({
    onEnd: handleSegmentEnd,
    onBoundary: handleBoundary,
    onWarning: (msg) => showToast(msg),
  });

  const [lastPlayedSegmentIndex, setLastPlayedSegmentIndex] = useState<
    number | null
  >(null);

  // Trigger speech when index changes
  useEffect(() => {
    if (isReadingSequence && segments[currentSegmentIndex] && !isPaused) {
      const textToSpeak = segments[currentSegmentIndex].text;
      setLastPlayedSegmentIndex(currentSegmentIndex);
      speak(textToSpeak, settings);
    }
  }, [
    currentSegmentIndex,
    isReadingSequence,
    segments,
    settings,
    speak,
    isPaused,
  ]);

  const play = () => {
    if (isPaused) {
      if (lastPlayedSegmentIndex !== currentSegmentIndex) {
        // User changed pages while paused. Don't resume old audio!
        cancel();
        setIsReadingSequence(true);
      } else {
        synthResume();
      }
      return;
    }
    setIsReadingSequence(true);
  };

  const pause = () => {
    synthPause();
  };

  const stop = () => {
    setIsReadingSequence(false);
    cancel();
  };

  const updateSettings = (newSettings: Partial<SpeechSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  // Library Functions
  const addBook = (
    title: string,
    author: string,
    text: string,
    coverUrl?: string,
    metadata?: {
      publicationDate?: string;
      genre?: string;
    },
  ) => {
    const newBook: Book = {
      id: Date.now().toString(),
      title,
      author,
      text,
      coverUrl,
      progress: 0,
      currentSegmentIndex: 0,
      ...metadata,
    };
    setBooks((prev) => [...prev, newBook]);
  };

  const selectBook = (bookId: string) => {
    stop(); // Stop current playback

    // Force reload text from book to ensure latest edits are applied
    // This handles the case where we navigate from Library after editing
    const book = books.find((b) => b.id === bookId);
    if (book) {
      setTextInternal(book.text);
      setCurrentSegmentIndex(book.currentSegmentIndex);
    }

    setActiveBookId(bookId);
  };

  const updateBook = (
    bookId: string,
    updates: Partial<Omit<Book, "id" | "progress" | "currentSegmentIndex">>,
  ) => {
    // Immediate state update if we are editing the currently active book
    if (bookId === activeBookId && updates.text !== undefined) {
      setTextInternal(updates.text);
    }

    setBooks((prev) =>
      prev.map((b) => (b.id === bookId ? { ...b, ...updates } : b)),
    );
  };

  const updateBookProgress = (bookId: string, segmentIndex: number) => {
    setBooks((prev) =>
      prev.map((b) =>
        b.id === bookId ? { ...b, currentSegmentIndex: segmentIndex } : b,
      ),
    );
  };

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
  };

  return (
    <ReaderContext.Provider
      value={{
        text,
        setText: setTextInternal,
        segments,
        currentSegmentId,
        currentSegmentIndex,
        setCurrentSegmentIndex,
        currentWordCharIndex,
        isPlaying: isReadingSequence || isSpeaking,
        isPaused,
        isSynthesizing,
        highlightEnabled,
        setHighlightEnabled,
        settings,
        updateSettings,
        play,
        pause,
        resume: synthResume,
        stop,
        // Library
        books,
        activeBookId,
        addBook,
        updateBook,
        selectBook,
        updateBookProgress,
        // Utils
        showToast,
      }}
    >
      {children}
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
    </ReaderContext.Provider>
  );
};
