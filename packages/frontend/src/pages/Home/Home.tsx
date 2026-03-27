import { API_URL } from "../../config";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Loader2 } from "lucide-react";
import { WaveDecoration } from "../../components/WaveDecoration/WaveDecoration";
import { Button } from "../../components/Button/Button";
import { useReader } from "../../context/ReaderContext";
import {
  CoverImage,
  getImageUrl,
} from "../../components/CoverImage/CoverImage";
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
  const navigate = useNavigate(); // Could be reused, leaving it for now
  const { books, activeBookId, addBook, showToast } = useReader();
  const [popularBooks, setPopularBooks] = useState<DiscoveryBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // 1. Try to load from cache immediately
    const cached = localStorage.getItem("popular-books-cache");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPopularBooks(parsed);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to parse cached popular books", err);
      }
    }

    const fetchPopularWithRetry = async (retryCount = 0) => {
      try {
        const response = await fetch(`${API_URL}/api/discovery/popular`);
        if (mounted) {
          if (response.ok) {
            const data = await response.json();
            
            const mapped = (Array.isArray(data) ? data : []).slice(0, 6).map((b: any, i: number) => ({
              ...b,
              color: FALLBACK_COLORS[i % FALLBACK_COLORS.length],
            }));
            
            setPopularBooks(mapped);
            localStorage.setItem("popular-books-cache", JSON.stringify(mapped));
            setLoading(false);
          } else if (retryCount < 8) {
            setTimeout(() => fetchPopularWithRetry(retryCount + 1), 5000);
          } else {
            setLoading(false);
          }
        }
      } catch (err) {
        if (mounted) {
          if (retryCount < 8) {
            setTimeout(() => fetchPopularWithRetry(retryCount + 1), 5000);
          } else {
            setLoading(false);
          }
        }
      }
    };

    fetchPopularWithRetry();
    return () => {
      mounted = false;
    };
  }, []);

  const handleBookClick = async (book: DiscoveryBook) => {
    if (downloadingId) return;

    // 1. Check if we already have it in the library (by Title/Author)
    const existing = books.find(
      (b) =>
        b.title.toLowerCase().includes(book.title.toLowerCase()) &&
        b.author?.toLowerCase().includes(book.author?.toLowerCase() || ""),
    );

    if (existing) {
      showToast("Este livro já está na sua Library!", "info");
      return;
    }

    setDownloadingId(book.link);
    try {
      const response = await fetch(
        `${API_URL}/api/discovery/download?url=${encodeURIComponent(book.link)}`,
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.code === "SERVICE_OFFLINE") {
          showToast(
            "O serviço de busca de livros está offline. Verifique se o BiblioCLI está rodando.",
            "error",
          );
          return;
        }
        throw new Error("Failed to download book");
      }

      const data = await response.json();
      const content = data.formatted_content;

      // Pula metadados iniciais (TOC, Prefácios, etc) usando o índice sugerido
      const startIndex = content.suggested_start?.chapter_index ?? 0;

      // Reconstitui o texto e captura metadados de capítulos
      let currentLength = 0;
      const chaptersMetadata: {
        title: string;
        startChar: number;
        index: number;
      }[] = [];

      const narrativeChapters = content.chapters
        .slice(startIndex)
        .filter((ch: any) => ch.is_narrative);

      const fullText = narrativeChapters
        .map((ch: any) => {
          chaptersMetadata.push({
            title: ch.title,
            startChar: currentLength,
            index: ch.index,
          });
          const chText = ch.paragraphs.join("\n\n");
          currentLength += chText.length + 2; // +2 pelo join("\n\n")
          return chText;
        })
        .join("\n\n");

      // Aumenta a performance e aplica o padrão do Nexus
      addBook(
        content.title,
        content.author,
        fullText,
        data.cover_url || book.cover_url,
        {
          genre: "Discovery",
          publicationDate: data.year || book.year || "",
          chapters: chaptersMetadata,
        },
      );

      // Mostra a notificação amigável mantendo o usuário na Home
      showToast("Livro adicionado com sucesso à sua Library!", "success");
    } catch (err: any) {
      console.error("Error downloading book:", err);
      showToast(
        "Erro ao processar o livro. Tente novamente ou verifique se o servidor de busca está ativo.",
        "error",
      );
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
                {heroBook?.title ||
                  (loading ? "Carregando..." : "Descubra novos clássicos")}
              </h1>
              <p className={styles.heroAuthor}>
                {heroBook
                  ? `${heroBook.author}`
                  : loading
                    ? ""
                    : "Explore a biblioteca"}
              </p>
            </div>
            <WaveDecoration className={styles.waveDecoration} />

            <div className={styles.heroContent}>
              <Button
                variant="primary"
                onClick={() =>
                  heroBook ? handleBookClick(heroBook) : navigate("/reading")
                }
                disabled={!!downloadingId}
                icon={
                  downloadingId === heroBook?.link ? (
                    <Loader2 size={20} className={styles.spin} />
                  ) : (
                    <Play size={20} fill="currentColor" />
                  )
                }
              >
                {downloadingId === heroBook?.link ? "Loading..." : "Read Now"}
              </Button>
            </div>
          </div>

          <div className={styles.heroImageContainer}>
            <CoverImage
              className={styles.heroImage}
              src={getImageUrl(heroBook?.cover_url)}
              alt={heroBook?.title || "Hero Book"}
            />
            <p className={styles.heroSubtitle}>
              {heroBook
                ? "Discover great classics from Project Gutenberg."
                : ""}
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
              {currentBook?.coverUrl ? (
                <CoverImage
                  src={getImageUrl(currentBook.coverUrl)}
                  alt={`Capa do livro: ${currentBook.title}`}
                  className={styles.bookCoverImage}
                />
              ) : (
                <img src="/cozy-corner.png" alt="Cozy reading corner" />
              )}
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

              <Button
                variant="primary"
                size="sm"
                fullWidth
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/reading");
                }}
              >
                Continue Reading
              </Button>
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
                    style={{ backgroundColor: book.color }}
                  >
                    {book.cover_url && (
                      <CoverImage
                        src={getImageUrl(book.cover_url)}
                        alt={book.title}
                        loading="lazy"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    )}
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
