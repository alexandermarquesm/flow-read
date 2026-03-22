import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
// import { API_URL } from "../config"; // Removed auth
import {
  useSpeechSynthesis,
  type SpeechSettings,
  type CustomVoice,
} from "../hooks/useSpeechSynthesis";
import { processTextAsync, type TextSegment } from "../utils/textProcessor";
import { Toast } from "../components/Toast/Toast";
// import type { OAuthUser } from "@flow-read/shared"; // Removed auth

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
  chapters?: { title: string; startChar: number; index: number }[];
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
  isProcessingText?: boolean;
  play: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;

  // Settings & preferences
  highlightEnabled: boolean;
  setHighlightEnabled: (enabled: boolean) => void;
  settings: SpeechSettings;
  updateSettings: (newSettings: Partial<SpeechSettings>) => void;
  voices: CustomVoice[];
  loadVoices: () => Promise<void>;

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
      chapters?: { title: string; startChar: number; index: number }[];
    },
  ) => Book;
  updateBook: (
    bookId: string,
    updates: Partial<Omit<Book, "id" | "progress" | "currentSegmentIndex">>,
  ) => void;
  selectBook: (bookId: string, providedBook?: Book) => void;
  updateBookProgress: (bookId: string, segmentIndex: number) => void;
  removeBook: (bookId: string) => void;
  showToast: (message: string, type?: "info" | "success" | "warning" | "error") => void;

  // Auth State (REMOVED)
  // user: OAuthUser | null;
  // token: string | null;
  // login: (user: OAuthUser, token?: string) => void;
  // logout: () => void;
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

export const ReaderProvider = ({ children }: { children: ReactNode }) => {
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

  // Auth State (REMOVED)

  // 1. Persist Books with DEBOUNCE and error handling
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem("flow-read-books", JSON.stringify(books));
      } catch (e) {
        console.error("Persistence Error:", e);
      }
    }, 1000); // Wait 1s of stability before saving
    return () => clearTimeout(timer);
  }, [books]);

  // 2. Persist Active Book ID with higher priority
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

  // References to avoid effect loops
  const booksRef = useRef(books);
  useEffect(() => {
    booksRef.current = books;
  }, [books]);

  // Load Book into active state ONLY when activeBookId changes
  // We use a separate effect for the initial load and when the ID explicitly changes
  useEffect(() => {
    if (!activeBookId) {
      setIsTextInitialized(false);
      setTextInternal("");
      return;
    }

    const currentBook = booksRef.current.find((b) => b.id === activeBookId);
    if (currentBook) {
      // Use functional updates to ensure we have latest state but don't depend on it in the array
      setTextInternal(currentBook.text);
      setCurrentSegmentIndex(currentBook.currentSegmentIndex);
      setIsTextInitialized(true);
    }
  }, [activeBookId]); // ONLY depend on ID change

  const [isProcessingText, setIsProcessingText] = useState(false);

  // Process text when it changes
  useEffect(() => {
    let active = true;

    if (!text) {
      setSegments([]);
      return;
    }

    const processData = async () => {
      setIsProcessingText(true);
      try {
        const processed = await processTextAsync(text);
        if (active) {
          setSegments(processed);
        }
      } catch (err) {
        console.error("Failed to process text", err);
      } finally {
        if (active) setIsProcessingText(false);
      }
    };

    processData();

    return () => {
      active = false;
    };
  }, [text]);

  // 4. Sync current text/index back to the SPECIFIC book in the library
  // This is the "save" mechanism. It MUST be stable.
  const lastSyncRef = useRef<{text: string; index: number; bookId: string} | null>(null);

  useEffect(() => {
    if (activeBookId && isTextInitialized) {
      // Don't sync if segments aren't ready yet or the length is fundamentally wrong for the text
      if (text.length > 100 && segments.length === 0) return;

      // Use segments.length - 1 so reaching the absolute last segment equals 100%
      const progress = segments.length > 0
        ? Math.round((currentSegmentIndex / Math.max(1, segments.length - 1)) * 100)
        : 0;

      // Prevent redundant syncs
      if (
        lastSyncRef.current?.bookId === activeBookId &&
        lastSyncRef.current?.text === text &&
        lastSyncRef.current?.index === currentSegmentIndex
      ) {
        return;
      }

      setBooks((prevBooks) => {
        const bookIndex = prevBooks.findIndex(b => b.id === activeBookId);
        if (bookIndex === -1) return prevBooks;
        
        const b = prevBooks[bookIndex];
        if (b.text === text && b.currentSegmentIndex === currentSegmentIndex && b.progress === progress) {
          return prevBooks;
        }

        const updatedBooks = [...prevBooks];
        updatedBooks[bookIndex] = { ...b, text, currentSegmentIndex, progress };
        lastSyncRef.current = { text, index: currentSegmentIndex, bookId: activeBookId };
        return updatedBooks;
      });
    }
  }, [text, currentSegmentIndex, segments.length, activeBookId, isTextInitialized]);

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
        return prev;
      });
      setCurrentWordCharIndex(-1);
    }
  }, [segments.length]);

  // (Combined into the effect above for stability)

  const handleBoundary = useCallback((charIndex: number) => {
    // In React 18, rapid state updates inside requestAnimationFrame can be transition-batched
    // or block the main thread from painting if the tree is heavy.
    // We wrap this non-critical UI update in startTransition so it doesn't block audio.
    React.startTransition(() => {
      setCurrentWordCharIndex(charIndex);
    });
  }, []);

  const {
    voices,
    loadVoices,
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
      chapters?: { title: string; startChar: number; index: number }[];
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
    return newBook;
  };

  const selectBook = (bookId: string, providedBook?: Book) => {
    stop(); // Stop current playback

    // If we have the book object directly (e.g. just downloaded), use it immediately
    const book = providedBook || books.find((b) => b.id === bookId);
    
    if (book) {
      // Set text and index immediately to avoid delay or sync issues
      setTextInternal(book.text);
      setCurrentSegmentIndex(book.currentSegmentIndex);
      setIsTextInitialized(true);
    } else {
      setIsTextInitialized(false);
    }

    // Set active ID last to trigger effects with initialized state
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
    // Update local context state first
    if (bookId === activeBookId) {
      setCurrentSegmentIndex(segmentIndex);
    }

    // Then update books library
    setBooks((prev) =>
      prev.map((b) =>
        b.id === bookId ? { ...b, currentSegmentIndex: segmentIndex } : b,
      ),
    );
  };

  const removeBook = (bookId: string) => {
    if (bookId === activeBookId) {
      setActiveBookId(null);
      setTextInternal("");
    }
    setBooks((prev) => prev.filter((b) => b.id !== bookId));
  };

  // Toast Notification State
  const [toastState, setToastState] = useState<{message: string; type: "info" | "success" | "warning" | "error"} | null>(null);

  const showToast = (message: string, type: "info" | "success" | "warning" | "error" = "info") => {
    setToastState({ message, type });
  };


  const value = React.useMemo(() => ({
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
    isProcessingText,
    highlightEnabled,
    setHighlightEnabled,
    settings,
    updateSettings,
    voices,
    loadVoices,
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
    removeBook,
    // Utils
    showToast,
  }), [
    text, segments, currentSegmentId, currentSegmentIndex, currentWordCharIndex,
    isSpeaking, isPaused, isSynthesizing, isProcessingText, highlightEnabled, settings, voices, loadVoices,
    books, activeBookId, showToast
  ]);


  return (
    <ReaderContext.Provider value={value}>
      {children}
      {toastState && (
        <Toast 
          message={toastState.message} 
          type={toastState.type}
          onClose={() => setToastState(null)} 
        />
      )}
    </ReaderContext.Provider>
  );
};
