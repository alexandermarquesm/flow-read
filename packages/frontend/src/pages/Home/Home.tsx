import { useNavigate } from "react-router-dom";
import { Play } from "lucide-react";
import { WaveDecoration } from "../../components/WaveDecoration";
import { useReader } from "../../context/ReaderContext";
import styles from "./Home.module.css";
// Mock Data for "New Arrivals"
const NEW_ARRIVALS = [
  {
    id: "mock1",
    title: "The Hidden Glade",
    author: "Elara Vance",
    color: "#A8BCA1",
  },
  { id: "mock2", title: "Midnight Tea", author: "Oliver S.", color: "#8B9DA3" },
  { id: "mock3", title: "Paper Boats", author: "Maya R.", color: "#D4C4B7" },
  {
    id: "mock4",
    title: "Winter's Song",
    author: "K.J. Weiss",
    color: "#98A6B0",
  },
  { id: "mock5", title: "Golden Hours", author: "Sarah J.", color: "#DBCBBd" },
  { id: "mock6", title: "Golden Hours", author: "Sarah J.", color: "#DBCBBd" },
];

export const Home = () => {
  const navigate = useNavigate();
  const { books, activeBookId } = useReader();

  const currentBook = books.find((b) => b.id === activeBookId) || books[0];

  return (
    <div className={styles.container}>
      {/* Top Main Section */}
      <div className={styles.mainContent}>
        {/* HERO SECTION (H): Title + Subtitle + Button */}
        <div className={styles.heroSection}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              A Ilíada <em>de Homero</em>
            </h1>
            <WaveDecoration className={styles.waveDecoration} />

            <div className={styles.heroContent}>
              <button
                onClick={() => navigate("/reading")}
                className={styles.ctaButton}
              >
                <Play size={20} fill="currentColor" />
                Read Now
              </button>
            </div>
          </div>

          <div className={styles.heroImageContainer}>
            <img
              className={styles.heroImage}
              src="https://m.media-amazon.com/images/I/91VS8lg9+QL._AC_UF1000,1000_QL80_.jpg"
              alt="Cozy reading corner"
            />
            <p className={styles.heroSubtitle}>
              "Like the generations of leaves, the lives of mortal men."
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
            {NEW_ARRIVALS.map((book) => (
              <div key={book.id} className={styles.arrivalCard}>
                <div
                  className={styles.arrivalCover}
                  style={{ backgroundColor: book.color }}
                ></div>
                <div>
                  <h4 className={styles.arrivalTitle}>{book.title}</h4>
                  <p className={styles.arrivalAuthor}>{book.author}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
