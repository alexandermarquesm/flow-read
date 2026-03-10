import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Loader2 } from "lucide-react";
import { WaveDecoration } from "../../components/WaveDecoration";
import { useReader } from "../../context/ReaderContext";
import styles from "./Home.module.css";

export interface DiscoveryBook {
  source: string;
  title: string;
  author: string;
  language: string;
  year?: string;
  link: string;
  cover_url?: string;
  color?: string;
}

const FALLBACK_COLORS = ["#A8BCA1", "#8B9DA3", "#D4C4B7", "#98A6B0", "#DBCBBd"];

export const Home = () => {
  const navigate = useNavigate();
  const { books, activeBookId, addBook, selectBook } = useReader();
  const [popularBooks, setPopularBooks] = useState<DiscoveryBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    // 1. Try to load from cache
    const cached = localStorage.getItem("popular-books-cache");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPopularBooks(parsed);
          setLoading(false); // We have something to show, so hide loading (though we still fetch)
        }
      } catch (err) {
        console.error("Failed to parse cached popular books", err);
      }
    }

    const fetchPopular = async () => {
      try {
        const response = await fetch("http://127.0.0.1:4000/api/discovery/popular");
        if (response.ok) {
          const data = await response.json();
          const mapped = data.slice(0, 6).map((b: any, i: number) => ({
            ...b,
            color: FALLBACK_COLORS[i % FALLBACK_COLORS.length]
          }));
          setPopularBooks(mapped);
          localStorage.setItem("popular-books-cache", JSON.stringify(mapped));
        }
      } catch (err) {
        console.error("Failed to fetch popular books", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPopular();
  }, []);

  const handleBookClick = async (book: DiscoveryBook) => {
    if (downloadingId) return;
    
    // Check if we already have it
    const existing = books.find(b => b.title === book.title && b.author === book.author);
    if (existing) {
      selectBook(existing.id);
      navigate("/reading");
      return;
    }

    setDownloadingId(book.link);
    try {
      const response = await fetch(`http://127.0.0.1:4000/api/discovery/download?url=${encodeURIComponent(book.link)}`);
      if (!response.ok) throw new Error("Failed to download book");
      const data = await response.json();

      const content = data.formatted_content;
      const { title, author, chapters, suggested_start } = content;
      
      const startIndex = suggested_start?.chapter_index ?? 0;
      const narrativeChapters = chapters.slice(startIndex).filter((ch: any) => ch.is_narrative);
      
      const fullText = narrativeChapters.map((ch: any) => ch.paragraphs.join("\n\n")).join("\n\n---\n\n");
      
      const newBook = addBook(title, author, fullText, data.cover_url || book.cover_url, {
        chapters: narrativeChapters.map((ch: any, idx: number) => ({
          title: ch.title,
          startChar: 0,
          index: ch.index || idx
        }))
      });
 
      selectBook(newBook.id, newBook);
      navigate("/reading");
     } catch (err) {
      console.error("Error downloading book:", err);
    } finally {
      setDownloadingId(null);
    }
  };

  const currentBook = books.find((b) => b.id === activeBookId) || books[0];
  const heroBook = popularBooks[0] || null;

  return (
    <div className={styles.container}>
      {/* Top Main Section */}
      <div className={styles.mainContent}>
        {/* HERO SECTION (H): Title + Subtitle + Button */}
        <div className={styles.heroSection}>
          <div className={styles.heroContent}>
            <div className={styles.heroHeader}>
              <h1 className={styles.heroTitle}>
                {heroBook?.title || (loading ? "Carregando..." : "Descubra novos clássicos")}
              </h1>
              <p className={styles.heroAuthor}>
                {heroBook ? `${heroBook.author}` : (loading ? "" : "Explore a biblioteca")}
              </p>
            </div>
            <WaveDecoration className={styles.waveDecoration} />

            <div className={styles.heroContent}>
              <button
                onClick={() => heroBook ? handleBookClick(heroBook) : navigate("/reading")}
                className={styles.ctaButton}
                disabled={!!downloadingId}
              >
                {downloadingId === heroBook?.link ? (
                  <Loader2 size={20} className={styles.spin} />
                ) : (
                  <Play size={20} fill="currentColor" />
                )}
                {downloadingId === heroBook?.link ? "Loading..." : "Read Now"}
              </button>
            </div>
          </div>

          <div className={styles.heroImageContainer}>
            <img
              className={styles.heroImage}
              src={heroBook?.cover_url || ""}
              alt={heroBook?.title || "Hero Book"}
            />
            <p className={styles.heroSubtitle}>
              {heroBook ? "Discover great classics from Project Gutenberg." : ""}
            </p>
          </div>
        </div>

        {/* SIDEBAR (L): Book Card */}
        <div className={styles.currentSection}>
          <div
            className={styles.currentCard}
            onClick={() => navigate("/reading")}
          >
            <div className={styles.cardImageContainer}>
              <img src="/cozy-corner.png" alt="Cozy reading corner" />
            </div>

            <div className={styles.cardContent}>
              <div>
                <h3 className={styles.sectionLabel}>Currently Reading</h3>
                <p className={styles.currentTitle}>
                  {currentBook?.title || "No Book Selected"}
                </p>
              </div>

              <div className={styles.progressContainer}>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${currentBook?.progress || 0}%` }}
                  />
                </div>
                <div className={styles.progressText}>
                  <span>
                    {currentBook?.progress
                      ? Math.round(currentBook.progress)
                      : 0}
                    %
                  </span>
                  <span>100%</span>
                </div>
              </div>

              <p className={styles.dailyQuote}>
                Daily Dose of Comfort
                <br /> you hold in hands.
              </p>

              <button
                className={styles.cardButton}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/reading");
                }}
              >
                Continue Reading
              </button>
            </div>
          </div>
        </div>

        {/* NEW ARRIVALS (N): Full Width Bottom */}
        <div className={styles.arrivalsSection}>
          <div className={styles.arrivalsHeader}>
            <span className={styles.arrivalsLabel}>New Arrivals</span>
          </div>

          <div className={styles.arrivalsGrid}>
            {loading ? (
              <div className={styles.loadingState}>
                <Loader2 className={styles.spin} />
              </div>
            ) : (
              popularBooks.map((book) => (
                <div 
                  key={book.link} 
                  className={`${styles.arrivalCard} ${downloadingId === book.link ? styles.downloading : ""}`}
                  onClick={() => handleBookClick(book)}
                >
                  <div
                    className={styles.arrivalCover}
                    style={{ 
                      backgroundColor: book.color,
                      backgroundImage: book.cover_url ? `url(${book.cover_url})` : "none",
                      backgroundSize: "cover",
                      backgroundPosition: "center"
                    }}
                  >
                    {downloadingId === book.link && (
                      <div className={styles.cardOverlay}>
                        <Loader2 className={styles.spin} />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className={styles.arrivalTitle}>{book.title}</h4>
                    <p className={styles.arrivalAuthor}>{book.author}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
