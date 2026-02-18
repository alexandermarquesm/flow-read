import { useNavigate } from "react-router-dom";
import { Play } from "lucide-react";
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
];

export const Home = () => {
  const navigate = useNavigate();
  const { books, activeBookId } = useReader();

  const currentBook = books.find((b) => b.id === activeBookId) || books[0];

  return (
    <div className={styles.container}>
      {/* Top Main Section */}
      <div className={styles.mainContent}>
        {/* Left: Hero */}
        <div className={styles.hero}>
          <h1 className={styles.heroTitle}>
            Whispers <em>of the</em> Hearth
          </h1>
          <p className={styles.heroSubtitle}>
            "Find solace in stories, wrapped in warmth. Your personal sanctuary
            for reading."
          </p>
          <button
            onClick={() => navigate("/reading")}
            className={styles.ctaButton}
          >
            <Play size={20} fill="currentColor" />
            Continue Reading
          </button>
        </div>

        {/* Right: Current Reading Vertical Card */}
        <div className={styles.currentSection}>
          <div
            className={styles.currentCard}
            onClick={() => navigate("/reading")}
          >
            {/* Top Half: Book Cover as Image */}
            <div className={styles.cardImageContainer}>
              {currentBook?.coverUrl ? (
                <img src={currentBook.coverUrl} alt={currentBook.title} />
              ) : (
                // Fallback to illustration if no real cover
                <img src="/cozy-corner.png" alt="Cozy reading corner" />
              )}
            </div>

            {/* Bottom Half: Content with Real Data */}
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
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: New Arrivals */}
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
  );
};
