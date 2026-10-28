import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronDown,
  LoaderCircle,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:3000/api"
).replace(/\/$/, "");
const money = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

async function getJson(path) {
  const response = await fetch(API + path);
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(data.message || "Không thể tải dữ liệu cửa hàng.");
  return data;
}

function BookCover({ book, large = false }) {
  return book.cover_url ? (
    <img
      className={large ? "store-cover store-cover-large" : "store-cover"}
      src={book.cover_url}
      alt={"Bìa sách " + book.title}
      loading="lazy"
    />
  ) : (
    <div
      className={
        large
          ? "store-cover store-cover-large store-cover-empty"
          : "store-cover store-cover-empty"
      }
    >
      <BookOpen />
      <span>Mộc Bookstore</span>
    </div>
  );
}

function BookDetails({ book, onClose, loading, error }) {
  return (
    <div
      className="store-modal-shade"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="store-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="store-detail-title"
      >
        <button
          className="store-detail-close"
          type="button"
          onClick={onClose}
          aria-label="Đóng"
        >
          <X />
        </button>
        <div className="store-detail-main">
          <BookCover book={book} large />
          <div className="store-detail-copy">
            <span className="store-category">
              {book.category_name || "Sách"}
            </span>
            <h2 id="store-detail-title">{book.title}</h2>
            <p className="store-publisher">
              {book.publisher || "Chưa cập nhật nhà xuất bản"}
            </p>
            {loading && (
              <p className="store-detail-loading">
                <LoaderCircle className="spin" /> Đang tải thông tin sách…
              </p>
            )}
            {error && <p className="store-detail-error">{error}</p>}
            <strong className="store-price">{money(book.price)}</strong>
            <p className="store-description">
              {book.description || "Sách chưa có phần giới thiệu."}
            </p>
            <dl className="store-book-meta">
              <div>
                <dt>Tác giả</dt>
                <dd>{book.authors || "Chưa cập nhật"}</dd>
              </div>
              <div>
                <dt>Thể loại</dt>
                <dd>{book.category_name || "—"}</dd>
              </div>
              <div>
                <dt>Nhà xuất bản</dt>
                <dd>{book.publisher || "—"}</dd>
              </div>
              <div>
                <dt>Năm xuất bản</dt>
                <dd>{book.publication_year || "—"}</dd>
              </div>
              <div>
                <dt>Khối lượng</dt>
                <dd>{book.weight_grams ? book.weight_grams + " g" : "—"}</dd>
              </div>
              <div>
                <dt>Tình trạng</dt>
                <dd>
                  {Number(book.stock_quantity) > 0
                    ? "Còn " + book.stock_quantity + " cuốn"
                    : "Tạm hết hàng"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function Storefront({ onLogin, accountLabel = "Đăng nhập" }) {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 12, total: 0 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadCount, setReloadCount] = useState(0);
  const [error, setError] = useState("");
  const [selectedBook, setSelectedBook] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    let active = true;
    getJson("/categories")
      .then((data) => active && setCategories(data.data || []))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), limit: "12" });
    if (search) params.set("search", search);
    if (category) params.set("category_id", category);
    setLoading(true);
    setError("");
    getJson("/books?" + params.toString())
      .then((data) => {
        if (!active) return;
        setBooks(data.data || []);
        setMeta(data.meta || { page, limit: 12, total: 0 });
      })
      .catch((requestError) => active && setError(requestError.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [page, search, category, reloadCount]);

  async function showDetails(book) {
    setSelectedBook(book);
    setDetailLoading(true);
    setDetailError("");
    try {
      const data = await getJson("/books/" + book.id);
      setSelectedBook(data.data || book);
    } catch (requestError) {
      setDetailError(requestError.message);
    } finally {
      setDetailLoading(false);
    }
  }

  const pageCount = Math.max(1, Math.ceil(meta.total / (meta.limit || 12)));

  return (
    <main className="storefront">
      <header className="store-header">
        <a className="brand store-brand" href="#top" aria-label="Mộc Bookstore">
          <i>
            <BookOpen />
          </i>{" "}
          mộc<span>.</span>
        </a>
        <nav className="store-nav">
          <a href="#books">Sách</a>
          <a href="#about">Về Mộc</a>
        </nav>
        <button className="store-login" onClick={onLogin}>
          <ShieldCheck size={16} /> {accountLabel}
        </button>
      </header>

      <section className="store-hero" id="top">
        <div className="store-hero-copy">
          <span className="store-kicker">KHÔNG GIAN CỦA NHỮNG CÂU CHUYỆN</span>
          <h1>
            Mỗi cuốn sách
            <br />
            mở ra một <em>thế giới.</em>
          </h1>
          <p>
            Chậm lại một chút, chọn một câu chuyện hay và để mỗi trang sách dẫn
            lối bạn đến những điều mới mẻ.
          </p>
          <a className="store-hero-link" href="#books">
            Khám phá tủ sách <ArrowRight size={16} />
          </a>
        </div>
        <div className="store-hero-art" aria-hidden="true">
          <div className="store-art-glow" />
          <div className="store-book-stack">
            <BookOpen />
            <span>MỘC</span>
          </div>
          <div className="store-art-caption">ĐỌC CHẬM. SỐNG SÂU.</div>
        </div>
      </section>

      <section className="store-catalog" id="books">
        <div className="store-section-heading">
          <div>
            <span className="store-kicker">GÓC SÁCH NHÀ MỘC</span>
            <h2>Chọn cuốn sách tiếp theo</h2>
            <p>{meta.total} đầu sách đang chờ bạn khám phá.</p>
          </div>
          <div className="store-catalog-mark">
            <BookOpen /> TỦ SÁCH MỘC
          </div>
        </div>
        <div className="store-toolbar">
          <form
            className="store-search"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setSearch(searchInput.trim());
            }}
          >
            <Search size={17} />
            <input
              aria-label="Tìm sách"
              placeholder="Tìm theo tên sách…"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <button type="submit">Tìm sách</button>
          </form>
          <label className="store-category-filter">
            <span>Thể loại</span>
            <select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả thể loại</option>
              {categories.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <ChevronDown size={15} />
          </label>
        </div>

        {error && (
          <div className="store-state store-error">
            {error}
            <button onClick={() => setReloadCount((current) => current + 1)}>
              Thử tải lại
            </button>
          </div>
        )}
        {loading ? (
          <div className="store-state">
            <LoaderCircle className="spin" /> Đang tải sách…
          </div>
        ) : !error && books.length === 0 ? (
          <div className="store-state">
            Chưa tìm thấy sách phù hợp. Thử tìm với từ khóa khác nhé.
          </div>
        ) : (
          !error && (
            <div className="store-grid">
              {books.map((book, index) => (
                <button
                  className="store-card"
                  key={book.id}
                  onClick={() => showDetails(book)}
                >
                  <div className={"store-card-image tone-" + (index % 5)}>
                    <BookCover book={book} />
                    <span className="store-card-category">
                      {book.category_name || "Sách"}
                    </span>
                  </div>
                  <div className="store-card-info">
                    <h3>{book.title}</h3>
                    <p className="store-card-authors">
                      {book.authors
                        ? `Tác giả: ${book.authors}`
                        : "Chưa cập nhật tác giả"}
                    </p>
                    <p>{book.publisher || "Nhà xuất bản đang cập nhật"}</p>
                    <div className="store-card-bottom">
                      <strong>{money(book.price)}</strong>
                      <span>
                        {Number(book.stock_quantity) > 0
                          ? "Còn hàng"
                          : "Tạm hết"}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )
        )}

        <div className="store-pagination">
          <span>
            Trang {page} / {pageCount}
          </span>
          <div>
            <button
              aria-label="Trang trước"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
            >
              <ArrowLeft size={16} />
            </button>
            <button
              aria-label="Trang sau"
              disabled={page >= pageCount || loading}
              onClick={() => setPage((current) => current + 1)}
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      <section className="store-about" id="about">
        <div>
          <span className="store-kicker">MỘC BOOKSTORE</span>
          <h2>Một góc nhỏ cho người yêu sách.</h2>
        </div>
        <p>
          Tìm thấy những cuốn sách truyền cảm hứng, tác phẩm kinh điển và câu
          chuyện mới cho hành trình đọc của bạn.
        </p>
      </section>
      <footer className="store-footer">
        <a className="brand store-brand" href="#top">
          <i>
            <BookOpen />
          </i>{" "}
          mộc<span>.</span>
        </a>
        <span>© 2026 Mộc Bookstore · Đọc chậm. Sống sâu.</span>
        <button onClick={onLogin}>{accountLabel}</button>
      </footer>
      {selectedBook && (
        <BookDetails
          book={selectedBook}
          loading={detailLoading}
          error={detailError}
          onClose={() => {
            setSelectedBook(null);
            setDetailError("");
          }}
        />
      )}
    </main>
  );
}
