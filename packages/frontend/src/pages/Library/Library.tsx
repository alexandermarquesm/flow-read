import { API_URL } from "../../config";
import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Plus,
  X,
  Pencil,
  Play,
  ImageOff,
  DownloadCloud,
  Compass,
  AlertCircle,
} from "lucide-react";
import { useReader } from "../../context/ReaderContext";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/Button/Button";
import styles from "./Library.module.css";

type FilterType = "all" | "unread" | "reading" | "read";

export const Library = () => {
  const { books, selectBook, addBook, updateBook, removeBook, showToast } = useReader();
  const navigate = useNavigate();

  // UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [publicationDate, setPublicationDate] = useState("");
  const [genre, setGenre] = useState("");

  // Error tracking for images
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // --- NEXUS DISCOVERY STATE ---
  const [isDiscoveryMode, setIsDiscoveryMode] = useState(false);
  const [discoveryResults, setDiscoveryResults] = useState<any[]>([]);
  const [isDiscoveryLoading, setIsDiscoveryLoading] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);

  // Filtered Books Logic
  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      // 1. Search Filter
      const matchesSearch =
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // 2. Tab Filter
      // Calculate progress safely (default to 0 if undefined)
      const progress = book.progress || 0;
      const index = book.currentSegmentIndex || 0;

      if (activeFilter === "unread") return progress === 0 && index === 0;
      if (activeFilter === "reading") return (progress > 0 || index > 0) && progress < 100;
      if (activeFilter === "read") return progress >= 100;

      return true; // 'all'
    });
  }, [books, searchQuery, activeFilter]);

  // Filtered Discovery Results (Nexus) - Also respects the active tabs!
  const filteredDiscoveryResults = useMemo(() => {
    if (!isDiscoveryMode) return [];
    
    return discoveryResults.filter((result) => {
      // Check if book already exists in library to determine its virtual progress
      const existingBook = books.find(b => b.title.toLowerCase() === result.title.toLowerCase());
      
      if (activeFilter === "all") return true;

      if (!existingBook) {
        // If not in library, it's 'unread' (0 progress)
        return activeFilter === "unread";
      }

      // If in library, check its actual progress
      const progress = existingBook.progress || 0;
      const index = existingBook.currentSegmentIndex || 0;

      if (activeFilter === "unread") return progress === 0 && index === 0;
      if (activeFilter === "reading") return (progress > 0 || index > 0) && progress < 100;
      if (activeFilter === "read") return progress >= 100;

      return true;
    });
  }, [discoveryResults, activeFilter, isDiscoveryMode, books]);

  const handleBookClick = (bookId: string) => {
    selectBook(bookId);
    navigate("/reading");
  };

  const handleImageError = (bookId: string) => {
    setImageErrors((prev) => ({ ...prev, [bookId]: true }));
  };

  // Close on ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsModalOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  // --- NEXUS SEARCH LOGIC ---
  const handleNexusSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsDiscoveryLoading(true);
    setDiscoveryError(null);
    try {
      const response = await fetch(
        `${API_URL}/api/discovery/search?query=${encodeURIComponent(searchQuery)}`,
      );
      if (!response.ok) throw new Error("Falha ao buscar na API Nexus.");
      const data = await response.json();
      setDiscoveryResults(data);
    } catch (err: any) {
      setDiscoveryError(err.message);
    } finally {
      setIsDiscoveryLoading(false);
    }
  };

  const handleDownloadBook = async (url: string) => {
    setDownloadingUrl(url);
    try {
      const response = await fetch(
        `${API_URL}/api/discovery/download?url=${encodeURIComponent(url)}`,
      );
      if (!response.ok) throw new Error("Erro ao baixar conteúdo do livro.");

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

      addBook(content.title, content.author, fullText, data.cover_url, {
        genre: "Discovery",
        publicationDate: data.year || "", // Usa o ano real se disponível
        chapters: chaptersMetadata,
      });

      showToast("Livro adicionado com sucesso à sua Library!", "success");

      setIsDiscoveryMode(false);
      setSearchQuery("");
      setDiscoveryResults([]);
    } catch (err: any) {
      console.error(err);
      showToast(`Erro ao baixar livro: ${err.message}`, "error");
    } finally {
      setDownloadingUrl(null);
    }
  };

  // --- Modal & Form Logic (Kept mostly same, just clean-up) ---
  const openAddModal = () => {
    setEditingBookId(null);
    setTitle("");
    setAuthor("");
    setText("");
    setCoverUrl("");
    setPublicationDate("");
    setGenre("");
    setIsModalOpen(true);
  };

  const openEditModal = (e: React.MouseEvent, book: any) => {
    e.stopPropagation();
    setEditingBookId(book.id);
    setTitle(book.title);
    setAuthor(book.author);
    setText(book.text);
    setCoverUrl(book.coverUrl || "");
    setPublicationDate(book.publicationDate || "");
    setGenre(book.genre || "");

    if (book.coverUrl) {
      setImageErrors((prev) => {
        const newState = { ...prev };
        delete newState[book.id];
        return newState;
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !text) return;

    const newCoverUrl = coverUrl.trim();
    const metadata = { publicationDate, genre };

    if (editingBookId) {
      updateBook(editingBookId, {
        title,
        author: author || "Unknown",
        text,
        coverUrl: newCoverUrl,
        ...metadata,
      });
    } else {
      addBook(title, author || "Unknown", text, newCoverUrl, metadata);
    }
    setIsModalOpen(false);
  };

  return (
    <div className={styles.container}>
      {/* HEADER SECTION */}
      <div className={styles.header}>
        {/* Top Row: Title */}
        <div className={styles.headerTop}>
          <h1 className={styles.title}>My Library</h1>
        </div>

        {/* Controls Row: Filters & Search/Nexus Toggle */}
        <div className={styles.controls}>
          <div className={styles.filters}>
            <button
              className={styles.filterBtn}
              data-active={activeFilter === "all"}
              onClick={() => setActiveFilter("all")}
            >
              All
            </button>
            <button
              className={styles.filterBtn}
              data-active={activeFilter === "unread"}
              onClick={() => setActiveFilter("unread")}
            >
              Unread
            </button>
            <button
              className={styles.filterBtn}
              data-active={activeFilter === "reading"}
              onClick={() => setActiveFilter("reading")}
            >
              Reading Now
            </button>
            <button
              className={styles.filterBtn}
              data-active={activeFilter === "read"}
              onClick={() => setActiveFilter("read")}
            >
              Read
            </button>
          </div>

          <div className={styles.searchContainer}>
            <div className={styles.nexusToggle}>
              <button
                className={styles.nexusToggleBtn}
                data-active={!isDiscoveryMode}
                onClick={() => setIsDiscoveryMode(false)}
              >
                Local
              </button>
              <button
                className={styles.nexusToggleBtn}
                data-active={isDiscoveryMode}
                onClick={() => setIsDiscoveryMode(true)}
              >
                Nexus
              </button>
            </div>

            <form
              onSubmit={
                isDiscoveryMode ? handleNexusSearch : (e) => e.preventDefault()
              }
              className={styles.searchInputWrapper}
            >
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                placeholder={
                  isDiscoveryMode
                    ? "Busca Global (Autores/Livros)..."
                    : "Buscar na minha estante"
                }
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {isDiscoveryLoading && (
                <div className={styles.nexusSpinnerSmall} />
              )}
            </form>
          </div>
        </div>
      </div>

      {/* BOOK GRID */}
      {!isDiscoveryMode ? (
        <div className={styles.grid}>
          {filteredBooks.map((book) => {
            const hasValidCover = book.coverUrl && !imageErrors[book.id];

            return (
              <div
                key={book.id}
                className={styles.bookItem}
                onClick={() => handleBookClick(book.id)}
              >
                {/* Cover Image Wrapper */}
                <div className={styles.coverWrapper}>
                  {/* Status Ribbon */}
                  <div
                    className={`${styles.statusRibbon} ${
                      (book.progress || 0) >= 100
                        ? styles.ribbonRead
                        : (book.progress || 0) > 0 || (book.currentSegmentIndex || 0) > 0
                          ? styles.ribbonReading
                          : styles.ribbonUnread
                    }`}
                  >
                    {(book.progress || 0) >= 100
                      ? "Read"
                      : (book.progress || 0) > 0 || (book.currentSegmentIndex || 0) > 0
                        ? `${Math.round(book.progress || 0)}%`
                        : "New"}
                  </div>

                  {hasValidCover ? (
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className={styles.coverImage}
                      onError={() => handleImageError(book.id)}
                    />
                  ) : (
                    <div className={styles.noCoverContainer}>
                      <ImageOff size={32} />
                      <span className={styles.noCoverText}>No Cover</span>
                    </div>
                  )}

                  {/* Delete Button (Always visible on hover) */}
                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        window.confirm(
                          `Excluir "${book.title}" da sua biblioteca?`,
                        )
                      ) {
                        removeBook(book.id);
                      }
                    }}
                    title="Remover Livro"
                  >
                    <X size={14} />
                  </button>

                  {/* Hover Actions */}
                  <div className={styles.bookActions}>
                    <button
                      className={styles.actionBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBookClick(book.id);
                      }}
                      title="Read"
                    >
                      <Play size={20} fill="currentColor" />
                    </button>
                    <button
                      className={styles.actionBtn}
                      onClick={(e) => openEditModal(e, book)}
                      title="Edit"
                    >
                      <Pencil size={18} />
                    </button>
                  </div>
                </div>

                {/* Book Info Below Cover (No Card BG) */}
                <div className={styles.bookInfo}>
                  <h3 className={styles.bookTitle}>{book.title}</h3>
                  <p className={styles.bookAuthor}>by {book.author}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.discoverySection}>
          <h2 className={styles.discoveryTitle}>
            <Compass size={24} /> Discovery Nexus
          </h2>

          {discoveryError && (
            <div className={styles.errorMsg}>
              <AlertCircle size={18} /> {discoveryError}
            </div>
          )}

          {isDiscoveryLoading ? (
            <div className={styles.emptyDiscovery}>
              <div className={styles.nexusSpinnerLarge} />
              <p>Escaneando fontes literárias...</p>
            </div>
          ) : filteredDiscoveryResults.length > 0 ? (
            <div className={styles.resultsGrid}>
              {filteredDiscoveryResults.map((result, idx) => {
                const isAlreadyInLibrary = books.some(
                  (b) => b.title.toLowerCase() === result.title.toLowerCase(),
                );

                return (
                  <div key={idx} className={styles.resultCard}>
                    <div className={styles.resultCoverWrapper}>
                      {result.cover_url && !imageErrors[`discovery-${idx}`] ? (
                        <img
                          src={result.cover_url}
                          alt={result.title}
                          className={styles.resultCover}
                          onError={() =>
                            setImageErrors((prev) => ({
                              ...prev,
                              [`discovery-${idx}`]: true,
                            }))
                          }
                        />
                      ) : (
                        <div className={styles.resultNoCover}>
                          <ImageOff size={24} />
                        </div>
                      )}
                      <span className={styles.resultSourceBadge}>
                        {result.source}
                      </span>
                    </div>

                    <div className={styles.resultContent}>
                      <h3 className={styles.resultTitle}>{result.title}</h3>
                      <p className={styles.resultAuthor}>
                        by {result.author || "Unknown"}
                      </p>

                      <div className={styles.resultFooter}>
                        <span className={styles.resultLang}>
                          {result.language}
                          {result.year && ` • ${result.year}`}
                        </span>

                        {isAlreadyInLibrary ? (
                          <Button
                            variant="added"
                            size="sm"
                            icon={<Play size={16} fill="currentColor" />}
                            title="Já está na sua biblioteca"
                          >
                            Adicionado
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={downloadingUrl === result.link}
                            onClick={() => handleDownloadBook(result.link)}
                            icon={downloadingUrl === result.link ? (
                              <span className={styles.loadingSpinner}></span>
                            ) : (
                              <DownloadCloud size={16} />
                            )}
                          >
                            {downloadingUrl === result.link ? "" : "Adicionar"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyDiscovery}>
              <p>Digite algo acima e pressione Enter para buscar no Nexus.</p>
            </div>
          )}
        </div>
      )}

      {/* Floating Add Button */}
      <button
        className={styles.addFloatingBtn}
        onClick={openAddModal}
        title="Add Book"
      >
        <Plus size={32} />
      </button>

      {/* Modal Window */}
      {isModalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className={styles.closeModalBtn}
            >
              <X size={24} />
            </button>

            <h2 className={styles.modalTitle}>
              {editingBookId ? "Edit Book" : "Add New Book"}
            </h2>

            <form onSubmit={handleSubmit} className={styles.formContainer}>
              {/* Form inputs */}
              <div className={styles.formRow}>
                <div>
                  <label className={styles.label}>Title</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className={styles.input}
                  />
                </div>
                <div>
                  <label className={styles.label}>Author</label>
                  <input
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div>
                  <label className={styles.label}>Genre</label>
                  <input
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className={styles.input}
                  />
                </div>
                <div>
                  <label className={styles.label}>Date</label>
                  <input
                    value={publicationDate}
                    onChange={(e) => setPublicationDate(e.target.value)}
                    className={styles.input}
                  />
                </div>
              </div>

              <div>
                <label className={styles.label}>Cover URL</label>
                <input
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="https://..."
                  className={styles.input}
                />
              </div>

              <div>
                <label className={styles.label}>Text Content</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  required
                  rows={6}
                  className={styles.textarea}
                />
              </div>

              <div className={styles.submitBtnContainer}>
                <Button type="submit" variant="primary">
                  {editingBookId ? "Save Changes" : "Add to Library"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
