import { useState, useRef, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings as SettingsIcon,
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Share2,
  Maximize,
  MoreVertical,
  PanelLeftOpen,
} from "lucide-react";
import { useReader } from "../../context/ReaderContext";
import { Settings } from "../../components/Settings/Settings";
import { ActiveSegment } from "../../components/ActiveSegment/ActiveSegment";
import { Sidebar } from "../../components/Sidebar/Sidebar";
import styles from "./Reading.module.css";
import type { TextSegment } from "../../utils/textProcessor";

export const Reading = () => {
  const {
    books,
    activeBookId,
    segments,
    currentSegmentId,
    currentWordCharIndex,
    isPlaying,
    isPaused,
    play,
    pause,
    resume,
    highlightEnabled,
    updateBookProgress,
  } = useReader();

  const currentBook = books.find((b) => b.id === activeBookId);

  // Safeguard: if book not found
  if (!currentBook) {
    return (
      <div className={styles.notFoundContainer}>
        <h2 className={styles.notFoundTitle}>Book not found or loading...</h2>
        <Link to="/" className={styles.backLink}>
          Back to Library
        </Link>
      </div>
    );
  }

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const activeRef = useRef<HTMLElement>(null);
  const textColumnRef = useRef<HTMLDivElement>(null);

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
      const currentSegmentIndex = currentBook.currentSegmentIndex || 0;

      // Calculate word position of current segment
      let wordPos = 0;
      for (let i = 0; i < currentSegmentIndex; i++) {
        wordPos += segments[i].text.trim().split(/\s+/).length;
      }

      const savedPage = Math.floor(wordPos / WORDS_PER_PAGE) + 1;
      setCurrentPage(savedPage);
      isInitialLoad.current = false;
    }
  }, [activeBookId, segments.length]); // Added segments.length dependency

  // 4. Update Page when Reading (Auto-Advance)
  useEffect(() => {
    if (isPlaying && segments.length > 0) {
      const currentSegmentIndex = currentBook.currentSegmentIndex || 0;
      let wordPos = 0;
      for (let i = 0; i < currentSegmentIndex; i++) {
        wordPos += segments[i].text.trim().split(/\s+/).length;
      }
      const readingPage = Math.floor(wordPos / WORDS_PER_PAGE) + 1;

      if (readingPage !== currentPage) {
        setCurrentPage(readingPage);
      }
    }
  }, [currentBook.currentSegmentIndex, isPlaying, segments, WORDS_PER_PAGE]);

  // 5. Persist Page Change to Book Progress (Decoupled Side Effect)
  useEffect(() => {
    if (
      !isInitialLoad.current &&
      !isPlaying &&
      activeBookId &&
      segments.length > 0
    ) {
      // Find start segment of current page
      const pageStartWord = (currentPage - 1) * WORDS_PER_PAGE;
      let wordCount = 0;
      let targetIndex = 0;

      // Find segment that contains the start word
      for (let i = 0; i < segments.length; i++) {
        const w = segments[i].text.trim().split(/\s+/).length;
        // If this segment *ends* after the page start, it's the first segment (or overlaps start)
        if (wordCount + w > pageStartWord) {
          targetIndex = i;
          break;
        }
        wordCount += w;
      }

      // Only update if significantly different to avoid loops?
      // Actually, updating progress is safe as long as it doesn't force currentPage back.
      // And since currentPage drives this, it's fine.
      updateBookProgress(activeBookId, targetIndex);
    }
  }, [currentPage, activeBookId, segments, isPlaying]);

  // 6. Get Visible Segments for Current Page
  const visibleSegments = useMemo(() => {
    const pageStartWord = (currentPage - 1) * WORDS_PER_PAGE;
    const pageEndWord = currentPage * WORDS_PER_PAGE;

    const pageSegments: TextSegment[] = [];
    let currentWordCount = 0;

    for (const segment of segments) {
      const segmentWordCount = segment.text.trim().split(/\s+/).length;
      const segmentStart = currentWordCount;
      const segmentEnd = currentWordCount + segmentWordCount;

      if (segmentStart < pageEndWord && segmentEnd > pageStartWord) {
        pageSegments.push(segment);
      }
      currentWordCount += segmentWordCount;
      if (currentWordCount > pageEndWord) break;
    }
    return pageSegments;
  }, [currentPage, segments, WORDS_PER_PAGE]);

  // Calculate Progress % for footer
  const progressPercentage = Math.round(((currentPage - 1) / totalPages) * 100);

  // Animation Direction
  const [direction, setDirection] = useState(0);

  // Handle Manual Page Turn (UI Only)
  const handlePageTurn = (moveDirection: "next" | "prev") => {
    if (moveDirection === "next") {
      if (currentPage < totalPages) {
        setDirection(1);
        setCurrentPage((prev) => prev + 1);
      }
    } else {
      if (currentPage > 1) {
        setDirection(-1);
        setCurrentPage((prev) => prev - 1);
      }
    }
  };

  // Scroll to top when page changes
  useEffect(() => {
    if (textColumnRef.current) {
      textColumnRef.current.scrollTop = 0;
    }
  }, [currentPage]);

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
              {currentBook.author
                ? `BY ${currentBook.author.toUpperCase()}`
                : "UNKNOWN AUTHOR"}
            </p>
          </div>

          {/* Row 2 Col 1: Text Content */}
          <div className={styles.textColumn} ref={textColumnRef}>
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
              <img
                src={currentBook.coverUrl}
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
                {!isPlaying || isPaused ? (
                  <button
                    className={styles.iconButtonRound}
                    onClick={isPlaying ? resume : play}
                    title="Play"
                  >
                    <Play
                      size={20}
                      fill="currentColor"
                      className={styles.playIconAdjust}
                    />
                  </button>
                ) : (
                  <button
                    className={styles.iconButtonRound}
                    onClick={pause}
                    title="Pause"
                  >
                    <Pause size={20} fill="currentColor" />
                  </button>
                )}

                <button className={styles.iconButton} title="Share">
                  <Share2 size={18} />
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
    </div>
  );
};
