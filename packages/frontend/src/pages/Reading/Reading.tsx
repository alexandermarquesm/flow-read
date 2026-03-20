import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings as SettingsIcon,
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Maximize,
  MoreVertical,
  PanelLeftOpen,
  List,
  X,
} from "lucide-react";
import { useReader } from "../../context/ReaderContext";
import { Settings } from "../../components/Settings/Settings";
import { ActiveSegment } from "../../components/ActiveSegment/ActiveSegment";
import { Sidebar } from "../../components/Sidebar/Sidebar";
import { CoverImage, getImageUrl } from "../../components/CoverImage/CoverImage";
import styles from "./Reading.module.css";
import type { TextSegment } from "../../utils/textProcessor";

export const Reading = () => {
  const {
    books,
    activeBookId,
    segments,
    currentSegmentId,
    currentSegmentIndex,
    setCurrentSegmentIndex,
    currentWordCharIndex,
    isPlaying,
    isPaused,
    isSynthesizing,
    play,
    pause,
    resume,
    highlightEnabled,
    updateBookProgress,
  } = useReader();

  const currentBook = books.find((b) => b.id === activeBookId);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const activeRef = useRef<HTMLElement>(null);
  const textColumnRef = useRef<HTMLDivElement>(null);

  // Safeguard: if book not found
  if (!currentBook) {
    return (
      <div className={styles.container}>
        <Sidebar className={`${!isSidebarOpen ? styles.sidebarHidden : ""}`} />
        <div className={styles.mainContent}>
          <div className={styles.emptyStateContainer}>
            <BookOpen size={64} className={styles.emptyStateIcon} strokeWidth={1} />
            <h2 className={styles.emptyStateTitle}>Nenhum Livro Ativo</h2>
            <p className={styles.emptyStateSubtitle}>
              Você não possui uma leitura em andamento. Acesse sua biblioteca ou explore novos livros para dar início a uma aventura.
            </p>
            <Link to="/library" className={styles.emptyStateButton}>
              Ir para a Biblioteca
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // --- PAGINATION LOGIC ---
  const WORDS_PER_PAGE = 150;

  // 1. Calculate Total Words
  const totalWords = useMemo(() => {
    return segments.reduce((acc, segment) => {
      return acc + segment.text.trim().split(/\s+/).length;
    }, 0);
  }, [segments]);

  // 2. Calculate Total Pages
  const totalPages = Math.max(1, Math.ceil(totalWords / WORDS_PER_PAGE));

  // 3. Determine Initial Page based on Book Progress
  const [currentPage, setCurrentPage] = useState(1);
  const isInitialLoad = useRef(true);

  // Sync currentPage with book.currentSegmentIndex ON MOUNT or when segments load
  useEffect(() => {
    if (activeBookId && segments.length > 0 && isInitialLoad.current) {
      const initialIndex = currentBook.currentSegmentIndex || 0;

      // Calculate word position of current segment
      let wordPos = 0;
      for (let i = 0; i < initialIndex; i++) {
        wordPos += segments[i].text.trim().split(/\s+/).length;
      }

      const savedPage = Math.floor(wordPos / WORDS_PER_PAGE) + 1;
      setCurrentPage(savedPage);
      isInitialLoad.current = false;
    }
  }, [activeBookId, segments.length, currentBook.currentSegmentIndex]);

  // 4. Update Page when Reading (Auto-Advance)
  useEffect(() => {
    if (isPlaying && segments.length > 0) {
      // NOTE: We use the context's currentSegmentIndex, NOT the book's, for real-time play
      let wordPos = 0;
      for (let i = 0; i < currentSegmentIndex; i++) {
        wordPos += segments[i].text.trim().split(/\s+/).length;
      }

      const segmentStart = wordPos;

      const pageStartWord = (currentPage - 1) * WORDS_PER_PAGE;
      const pageEndWord = currentPage * WORDS_PER_PAGE;

      const isVisibleContent =
        segmentStart >= pageStartWord && segmentStart < pageEndWord;

      if (!isVisibleContent) {
        const readingPage = Math.floor(wordPos / WORDS_PER_PAGE) + 1;
        setCurrentPage(readingPage);
      }
    }
  }, [currentSegmentIndex, isPlaying, segments, currentPage]);

  // 5. Removed Redundant Persist effect to avoid infinite loops

  // 6. Get Visible Segments for Current Page
  const visibleSegments = useMemo(() => {
    const pageStartWord = (currentPage - 1) * WORDS_PER_PAGE;
    const pageEndWord = currentPage * WORDS_PER_PAGE;

    const pageSegments: TextSegment[] = [];
    let currentWordCount = 0;

    for (const segment of segments) {
      const segmentWordCount = segment.text.trim().split(/\s+/).length;
      const segmentStart = currentWordCount;

      if (segmentStart >= pageStartWord && segmentStart < pageEndWord) {
        pageSegments.push(segment);
      }
      currentWordCount += segmentWordCount;
      if (currentWordCount > pageEndWord) break;
    }
    return pageSegments;
  }, [currentPage, segments]);

  // Calculate Progress % for footer
  const progressPercentage = Math.round((currentPage / totalPages) * 100);

  // Animation Direction
  const [direction, setDirection] = useState(0);

  // Handle Manual Page Turn (UI Only)
  const handlePageTurn = useCallback(
    (moveDirection: "next" | "prev") => {
      let targetPage = currentPage;
      if (moveDirection === "next") {
        if (currentPage < totalPages) {
          setDirection(1);
          targetPage = currentPage + 1;
          setCurrentPage(targetPage);
        }
      } else {
        if (currentPage > 1) {
          setDirection(-1);
          targetPage = currentPage - 1;
          setCurrentPage(targetPage);
        }
      }

      if (targetPage !== currentPage && activeBookId && segments.length > 0) {
        // Sync audio position to the top of the newly turned page
        const pageStartWord = (targetPage - 1) * WORDS_PER_PAGE;
        let wordCount = 0;
        let targetIndex = 0;
        for (let i = 0; i < segments.length; i++) {
          const w = segments[i].text.trim().split(/\s+/).length;
          if (wordCount >= pageStartWord) {
            targetIndex = i;
            break;
          }
          wordCount += w;
        }
        setCurrentSegmentIndex(targetIndex);
        updateBookProgress(activeBookId, targetIndex);
      }
    },
    [
      currentPage,
      totalPages,
      activeBookId,
      segments,
      setCurrentSegmentIndex,
      updateBookProgress,
    ],
  );

  // Keyboard Navigation Support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent flipping pages if the user is typing in an input/textarea somewhere
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "ArrowRight") {
        handlePageTurn("next");
      } else if (e.key === "ArrowLeft") {
        handlePageTurn("prev");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePageTurn]);

  // Swipe support for mobile
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const distanceX = touchEndX - touchStartX.current;

    // minimum distance for swipe to trigger a page turn
    if (Math.abs(distanceX) > 50) {
      if (distanceX > 0) {
        // Swiped right - go to previous page
        handlePageTurn("prev");
      } else {
        // Swiped left - go to next page
        handlePageTurn("next");
      }
    }
    touchStartX.current = null;
  };

  // Scroll to top when page changes
  useEffect(() => {
    if (textColumnRef.current) {
      textColumnRef.current.scrollTop = 0;
    }
  }, [currentPage]);

  // Auto-scroll to active segment
  useEffect(() => {
    if (
      (isPlaying || !isPaused) &&
      activeRef.current &&
      textColumnRef.current
    ) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentSegmentIndex, isPlaying, isPaused]);

  // Animation Variants
  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      position: "relative" as const,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      position: "relative" as const,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      position: "absolute" as const,
      top: 0,
      width: "100%",
    }),
  };

  // --- CHAPTER TRACKING ---
  const currentChapter = useMemo(() => {
    if (!currentBook?.chapters || !segments[currentSegmentIndex]) return null;
    const currentStartChar = segments[currentSegmentIndex].startChar;

    let activeChapter = currentBook.chapters[0];
    for (const ch of currentBook.chapters) {
      if (ch.startChar <= currentStartChar) {
        activeChapter = ch;
      } else {
        break;
      }
    }
    return activeChapter;
  }, [currentBook?.chapters, segments, currentSegmentIndex]);

  // --- NAVIGATION HELPERS ---
  const handleJumpToChapter = useCallback(
    (startChar: number) => {
      if (!segments.length || !activeBookId) return;

      const targetIndex = segments.findIndex((s) => s.startChar >= startChar);
      if (targetIndex !== -1) {
        setCurrentSegmentIndex(targetIndex);
        updateBookProgress(activeBookId, targetIndex);

        // Calculate Page
        let wordPos = 0;
        for (let i = 0; i < targetIndex; i++) {
          wordPos += segments[i].text.trim().split(/\s+/).length;
        }
        const targetPage = Math.floor(wordPos / WORDS_PER_PAGE) + 1;
        setCurrentPage(targetPage);
        setIsTocOpen(false);
      }
    },
    [
      segments,
      activeBookId,
      setCurrentSegmentIndex,
      updateBookProgress,
      WORDS_PER_PAGE,
    ],
  );

  return (
    <div className={styles.container}>
      <Sidebar className={`${!isSidebarOpen ? styles.sidebarHidden : ""}`} />

      <div className={styles.mainContent}>
        <button
          className={`${styles.sidebarToggleBtn} ${!isSidebarOpen ? styles.sidebarToggleBtnVisible : ""}`}
          onClick={() => setIsSidebarOpen(true)}
          title="Show Sidebar"
        >
          <PanelLeftOpen size={20} />
        </button>

        <header className={styles.header}>
          <div className={styles.headerActions}>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={styles.iconButton}
            >
              <SettingsIcon size={18} />
            </button>
          </div>
        </header>

        {/* Navigation Arrows */}
        <button
          className={styles.navArrowLeft}
          onClick={() => handlePageTurn("prev")}
          title="Previous Page"
          disabled={currentPage <= 1}
          style={{ opacity: currentPage <= 1 ? 0.3 : 1 }}
        >
          <ChevronLeft size={32} />
        </button>
        <button
          className={styles.navArrowRight}
          onClick={() => handlePageTurn("next")}
          title="Next Page"
          disabled={currentPage >= totalPages}
          style={{ opacity: currentPage >= totalPages ? 0.3 : 1 }}
        >
          <ChevronRight size={32} />
        </button>

        {/* Grid Layout Wrapper */}
        <div className={styles.readingLayout}>
          {/* Row 1: Title */}
          <div className={styles.titleSection}>
            <h1 className={styles.bookTitle}>
              {currentBook.title || "Untitled Book"}
            </h1>
            <p className={styles.chapterSubtitle}>
              {currentChapter?.title
                ? currentChapter.title.toUpperCase()
                : currentBook.author
                  ? `BY ${currentBook.author.toUpperCase()}`
                  : "UNKNOWN AUTHOR"}
            </p>
          </div>

          {/* Row 2 Col 1: Text Content */}
          <div
            className={styles.textColumn}
            ref={textColumnRef}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <AnimatePresence
              initial={false}
              custom={direction}
              mode="popLayout"
            >
              <motion.div
                key={currentPage}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                }}
                className={styles.textWrapper}
              >
                <div className={styles.readableText}>
                  {visibleSegments.map((segment, index) => {
                    const isActive = currentSegmentId === segment.id;
                    const isFirst = index === 0;

                    if (isActive && highlightEnabled) {
                      return (
                        <span
                          key={segment.id}
                          id={segment.id}
                          ref={activeRef}
                          className={`${styles.activeSegment} ${isFirst ? styles.firstSegment : ""}`}
                        >
                          <ActiveSegment
                            text={segment.text}
                            currentIndex={currentWordCharIndex || 0}
                          />
                        </span>
                      );
                    }

                    return (
                      <span
                        key={segment.id}
                        id={segment.id}
                        className={`${styles.segment} ${isFirst ? styles.firstSegment : ""}`}
                      >
                        {segment.text}
                      </span>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Row 2 Col 2: Image (Aside) */}
          <aside className={styles.sidePanel}>
            {currentBook.coverUrl ? (
              <CoverImage
                src={getImageUrl(currentBook.coverUrl)}
                className={styles.bookCover}
                alt="Cover"
              />
            ) : (
              <div className={styles.bookCoverPlaceholder}>
                <BookOpen size={30} strokeWidth={1.5} />
                <span>No Cover</span>
              </div>
            )}

            {/* Wikipedia-style Info Box */}
            {/* Metadata Card */}
            <div className={styles.metadataCard}>
              {currentBook.author && (
                <div className={styles.metadataItem}>
                  <span className={styles.metadataLabel}>AUTHOR</span>
                  <span className={styles.metadataValue}>
                    {currentBook.author}
                  </span>
                </div>
              )}

              {currentBook.genre && (
                <div className={styles.metadataItem}>
                  <span className={styles.metadataLabel}>GENRE</span>
                  <span className={styles.metadataValue}>
                    {currentBook.genre}
                  </span>
                </div>
              )}

              {currentBook.publicationDate && (
                <div className={styles.metadataItem}>
                  <span className={styles.metadataLabel}>DATE</span>
                  <span className={styles.metadataValue}>
                    {currentBook.publicationDate}
                  </span>
                </div>
              )}
            </div>
          </aside>

          {/* Row 3: Footer */}
          <div className={styles.footer}>
            <div className={styles.footerCenterGroup}>
              <div className={styles.footerProgress}>
                <div className={styles.pageInfo}>
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
                <div className={styles.progressBarBg}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>

              <div className={styles.footerIcons}>
                <button
                  className={styles.iconButtonRound}
                  onClick={isPlaying ? (isPaused ? resume : pause) : play}
                  title={
                    isSynthesizing
                      ? "Carregando..."
                      : isPlaying
                        ? isPaused
                          ? "Continuar"
                          : "Pausar"
                        : "Play"
                  }
                  disabled={isSynthesizing}
                >
                  {isSynthesizing ? (
                    <div className={styles.spinner} />
                  ) : isPlaying && !isPaused ? (
                    <Pause size={20} fill="currentColor" />
                  ) : (
                    <Play
                      size={20}
                      fill="currentColor"
                      className={styles.playIconAdjust}
                    />
                  )}
                </button>

                <button
                  className={styles.iconButton}
                  title="Summary"
                  onClick={() => setIsTocOpen(true)}
                >
                  <List size={18} />
                </button>
                <button className={styles.iconButton} title="Options">
                  <MoreVertical size={18} />
                </button>
                <button
                  className={styles.iconButton}
                  title={isSidebarOpen ? "Maximize Reading" : "Show Sidebar"}
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                >
                  <Maximize size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* TABLE OF CONTENTS MODAL */}
      <AnimatePresence>
        {isTocOpen && (
          <div
            className={styles.tocOverlay}
            onClick={() => setIsTocOpen(false)}
          >
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className={styles.tocContent}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.tocHeader}>
                <h3>Contents</h3>
                <button onClick={() => setIsTocOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              <div className={styles.tocList}>
                {currentBook.chapters?.map((ch: any, idx: number) => {
                  const isActive = currentChapter?.index === idx;
                  return (
                    <div
                      key={idx}
                      className={`${styles.tocItem} ${isActive ? styles.tocItemActive : ""}`}
                      onClick={() => handleJumpToChapter(ch.startChar || 0)}
                    >
                      <div className={styles.tocItemTitle}>{ch.title}</div>
                      {isActive && <div className={styles.tocActiveDot} />}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
