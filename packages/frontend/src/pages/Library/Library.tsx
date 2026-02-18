import { useState, useMemo, useEffect } from "react";
import { Search, Plus, X, Pencil, Play, ImageOff } from "lucide-react";
import { useReader } from "../../context/ReaderContext";
import { useNavigate } from "react-router-dom";
import styles from "./Library.module.css";

type FilterType = "all" | "unread" | "reading";

export const Library = () => {
  const { books, selectBook, addBook, updateBook } = useReader();
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

  // Filtered Books Logic
  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      // 1. Search Filter
      const matchesSearch =
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // 2. Tab Filter
      if (activeFilter === "unread") return book.progress === 0;
      if (activeFilter === "reading")
        return book.progress > 0 && book.progress < 100;

      return true; // 'all'
    });
  }, [books, searchQuery, activeFilter]);

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
        {/* Top Row: Title & Search */}
        <div className={styles.headerTop}>
          <h1 className={styles.title}>My Library</h1>

          <div className={styles.searchContainer}>
            <span className={styles.allBooksLabel}>All Books</span>
            <div className={styles.searchInputWrapper}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search"
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Controls Row: Filters & Sort */}
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
          </div>

          <button className={styles.sortBtn}>
            Sort <Search size={16} />
          </button>
        </div>
      </div>

      {/* BOOK GRID */}
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
                <button type="submit" className={styles.submitBtn}>
                  {editingBookId ? "Save Changes" : "Add to Library"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
