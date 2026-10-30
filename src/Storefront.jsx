import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Coffee,
  Grid2X2,
  Heart,
  Leaf,
  LoaderCircle,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import { CartPanel, CheckoutModal } from "./OrderCheckout.jsx";
import { LanguageToggle, useLanguage } from "./i18n.jsx";
import "./storefront.css";

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:3000/api"
).replace(/\/$/, "");
const PRICE_RANGES = [
  { value: "", label: "Tất cả mức giá" },
  { value: "0:100000", label: "Dưới 100.000 ₫" },
  { value: "100000:200000", label: "100.000 – 200.000 ₫" },
  { value: "200000:", label: "Từ 200.000 ₫" },
];

async function getJson(path, signal) {
  const response = await fetch(API + path, { signal });
  const result = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(result.message || "Không thể tải dữ liệu cửa hàng.");
  return result;
}

function BookCover({ book, large = false, eager = false }) {
  const { t } = useLanguage();
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [book.cover_url]);
  const className = large ? "store-cover store-cover-large" : "store-cover";
  return book.cover_url && !failed ? (
    <img
      className={className}
      src={book.cover_url}
      alt={t("Bìa sách {title}", { title: book.title })}
      loading={eager ? "eager" : "lazy"}
      onError={() => setFailed(true)}
    />
  ) : (
    <div className={`${className} store-cover-empty`}>
      <BookOpen />
      <span>{book.title || "Mộc Bookstore"}</span>
    </div>
  );
}

function BookDetails({ book, onClose, loading, error, onAddToCart }) {
  const { t, money, categoryLabel } = useLanguage();
  const closeButton = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const keydown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const buttons = [
          ...closeButton.current
            .closest("section")
            .querySelectorAll("button:not(:disabled)"),
        ];
        if (event.shiftKey && document.activeElement === buttons[0]) {
          event.preventDefault();
          buttons.at(-1)?.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === buttons.at(-1)
        ) {
          event.preventDefault();
          buttons[0]?.focus();
        }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keydown);
      if (previous?.isConnected) previous.focus();
    };
  }, [onClose]);
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
          ref={closeButton}
          className="store-detail-close"
          onClick={onClose}
          aria-label={t("Đóng")}
        >
          <X />
        </button>
        <div className="store-detail-main">
          <div className="mp-detail-cover">
            <BookCover book={book} large />
          </div>
          <div className="store-detail-copy">
            <span className="store-category">
              {categoryLabel(book.category_name) || t("Sách")}
            </span>
            <h2 id="store-detail-title">{book.title}</h2>
            <p className="store-publisher">
              {book.authors || t("Chưa cập nhật tác giả")}
            </p>
            {loading && (
              <p className="store-detail-loading">
                <LoaderCircle className="spin" />
                {t("Đang tải thông tin sách…")}
              </p>
            )}
            {error && <p className="store-detail-error">{t(error)}</p>}
            <strong className="store-price">{money(book.price)}</strong>
            <p className="mp-detail-availability">
              {Number(book.stock_quantity) > 0 ? (
                <>
                  <CheckCircle2 size={15} />
                  {t("Còn hàng")}
                </>
              ) : (
                t("Tạm hết hàng")
              )}
            </p>
            <button
              className="primary store-add-cart"
              disabled={
                loading || Boolean(error) || Number(book.stock_quantity) < 1
              }
              onClick={() => onAddToCart(book)}
            >
              <ShoppingBag size={17} />
              {t("Thêm vào giỏ hàng")}
            </button>
            <dl className="store-book-meta">
              <div>
                <dt>{t("Tác giả")}</dt>
                <dd>{book.authors || "—"}</dd>
              </div>
              <div>
                <dt>{t("Thể loại")}</dt>
                <dd>{categoryLabel(book.category_name) || "—"}</dd>
              </div>
              <div>
                <dt>{t("Nhà xuất bản")}</dt>
                <dd>{book.publisher || "—"}</dd>
              </div>
              <div>
                <dt>{t("Năm xuất bản")}</dt>
                <dd>{book.publication_year || "—"}</dd>
              </div>
              <div>
                <dt>{t("Khối lượng")}</dt>
                <dd>{book.weight_grams ? `${book.weight_grams} g` : "—"}</dd>
              </div>
              <div>
                <dt>{t("Số lượng")}</dt>
                <dd>{book.stock_quantity ?? 0}</dd>
              </div>
            </dl>
          </div>
        </div>
        <div className="mp-description">
          <h3>{t("Về cuốn sách")}</h3>
          <p>{book.description || t("Sách chưa có phần giới thiệu.")}</p>
        </div>
      </section>
    </div>
  );
}

function ProductCard({ book, onDetails, onAdd, added }) {
  const { t, money, categoryLabel } = useLanguage();
  const available = Number(book.stock_quantity) > 0;
  return (
    <article className="mp-product">
      <button
        className="mp-product-open"
        onClick={() => onDetails(book)}
        aria-label={t("Xem sách {title}", { title: book.title })}
      >
        <div className="mp-product-image">
          <BookCover book={book} />
          <span className="mp-view-detail">
            {t("Xem chi tiết")}
            <ArrowRight size={13} />
          </span>
        </div>
        <div className="mp-product-copy">
          <small>{categoryLabel(book.category_name) || t("Sách")}</small>
          <h3 title={book.title}>{book.title}</h3>
          <p className="mp-product-author" title={book.authors || ""}>
            {book.authors || t("Chưa cập nhật tác giả")}
          </p>
          <p className="mp-product-publisher">
            {book.publisher || t("Chưa cập nhật nhà xuất bản")}
          </p>
        </div>
      </button>
      <div className="mp-product-buy">
        <strong>{money(book.price)}</strong>
        <small className={available ? "available" : "unavailable"}>
          <span />
          {available ? t("Còn hàng") : t("Tạm hết")}
        </small>
        <button
          className={`mp-add-button ${added ? "is-added" : ""}`}
          disabled={!available}
          onClick={() => onAdd(book)}
          aria-label={t("Thêm {title} vào giỏ", { title: book.title })}
        >
          {added ? <Check size={16} /> : <ShoppingBag size={16} />}
          {added ? t("Đã thêm vào giỏ") : t("Thêm vào giỏ")}
        </button>
      </div>
    </article>
  );
}

export default function Storefront({
  onLogin,
  accountLabel = "Đăng nhập",
  token = "",
  user = null,
  onViewOrders,
  onOrderCreated,
}) {
  const { t, categoryLabel } = useLanguage();
  const [books, setBooks] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryError, setCategoryError] = useState(false);
  const [meta, setMeta] = useState({ page: 1, limit: 12, total: 0 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [allCategories, setAllCategories] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reloadCount, setReloadCount] = useState(0);
  const [error, setError] = useState("");
  const [selectedBook, setSelectedBook] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const detailRequest = useRef(null);
  const cartStorageKey = user?.id ? `book-cart-${user.id}` : "book-cart-guest";
  const [cart, setCart] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(cartStorageKey) || "[]");
      return Array.isArray(saved)
        ? saved.filter(
            (item) =>
              item?.id && Number.isInteger(item.quantity) && item.quantity > 0,
          )
        : [];
    } catch {
      return [];
    }
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [cartNotice, setCartNotice] = useState(null);
  const [addedId, setAddedId] = useState(null);
  const addedTimer = useRef(null);
  const catalog = useRef(null);
  const filterPanel = useRef(null);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const pageCount = Math.max(1, Math.ceil(meta.total / (meta.limit || 12)));
  const selectedCategory = categories.find(
    (item) => String(item.id) === category,
  );
  const activeFilterCount =
    Number(Boolean(category)) + Number(Boolean(priceRange)) + Number(inStock);

  useEffect(() => {
    localStorage.setItem(cartStorageKey, JSON.stringify(cart));
  }, [cartStorageKey, cart]);
  useEffect(
    () => () => {
      clearTimeout(addedTimer.current);
      detailRequest.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (!filtersOpen) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    filterPanel.current?.querySelector("button")?.focus();
    const closeOnDesktop = () => {
      if (window.innerWidth > 650) setFiltersOpen(false);
    };
    const keydown = (event) => {
      if (event.key === "Escape") setFiltersOpen(false);
      if (event.key === "Tab") {
        const controls = [
          ...filterPanel.current.querySelectorAll("button, input"),
        ];
        const first = controls[0],
          last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("resize", closeOnDesktop);
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("resize", closeOnDesktop);
      document.removeEventListener("keydown", keydown);
      if (previous?.isConnected) previous.focus();
    };
  }, [filtersOpen]);
  useEffect(() => {
    const controller = new AbortController();
    setCategoryError(false);
    getJson("/categories", controller.signal)
      .then((result) => setCategories(result.data || []))
      .catch((error) => {
        if (error.name !== "AbortError") setCategoryError(true);
      });
    getJson("/books?page=1&limit=6", controller.signal)
      .then((result) => {
        const items = result.data || [];
        setFeatured(
          [
            ...items.filter((book) => book.cover_url),
            ...items.filter((book) => !book.cover_url),
          ].slice(0, 3),
        );
      })
      .catch(() => {});
    return () => controller.abort();
  }, [reloadCount]);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      page: String(page),
      limit: "12",
      sort,
    });
    if (search) params.set("search", search);
    if (category) params.set("category_id", category);
    if (priceRange) {
      const [min, max] = priceRange.split(":");
      if (min) params.set("min_price", min);
      if (max) params.set("max_price", max);
    }
    if (inStock) params.set("in_stock", "1");
    setLoading(true);
    setError("");
    getJson(`/books?${params}`, controller.signal)
      .then((result) => {
        setBooks(result.data || []);
        setMeta(result.meta || { page, limit: 12, total: 0 });
      })
      .catch((error) => {
        if (error.name !== "AbortError") setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, search, category, priceRange, inStock, sort, reloadCount]);

  function scrollToCatalog() {
    catalog.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function chooseCategory(value) {
    setCategory(String(value));
    setPage(1);
    setFiltersOpen(false);
    scrollToCatalog();
  }
  function resetFilters() {
    setCategory("");
    setPriceRange("");
    setInStock(false);
    setSearch("");
    setSearchInput("");
    setSort("newest");
    setPage(1);
  }
  function submitSearch(event) {
    event.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
    scrollToCatalog();
  }
  const closeDetails = useCallback(() => {
    detailRequest.current?.abort();
    setSelectedBook(null);
    setDetailError("");
  }, []);
  async function showDetails(book) {
    detailRequest.current?.abort();
    const controller = new AbortController();
    detailRequest.current = controller;
    setSelectedBook(book);
    setDetailLoading(true);
    setDetailError("");
    try {
      const result = await getJson(`/books/${book.id}`, controller.signal);
      setSelectedBook(result.data || book);
    } catch (error) {
      if (error.name !== "AbortError") setDetailError(error.message);
    } finally {
      if (!controller.signal.aborted) setDetailLoading(false);
    }
  }
  function addToCart(book) {
    if (Number(book.stock_quantity) < 1) return;
    if (!token) {
      closeDetails();
      onLogin?.();
      return;
    }
    const existing = cart.find((item) => item.id === book.id);
    if (existing && existing.quantity >= Number(book.stock_quantity)) {
      setCartNotice({
        key: "Giỏ hàng đã có đủ số lượng sách hiện có.",
        type: "warning",
      });
      return;
    }
    setCart((current) => {
      const existing = current.find((item) => item.id === book.id);
      return existing
        ? current.map((item) =>
            item.id === book.id
              ? {
                  ...book,
                  quantity: Math.min(
                    item.quantity + 1,
                    Number(book.stock_quantity),
                  ),
                }
              : item,
          )
        : [...current, { ...book, quantity: 1 }];
    });
    closeDetails();
    setAddedId(book.id);
    setCartNotice({ key: "Đã thêm sách vào giỏ hàng.", type: "success" });
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setAddedId(null), 2200);
  }
  function changePage(next) {
    setPage(next);
    scrollToCatalog();
  }

  return (
    <main className="storefront marketplace" id="top">
      <a className="mp-skip" href="#books">
        {t("Đến danh sách sách")}
      </a>
      <div className="mp-top-strip">
        <div>
          <span>
            <Leaf size={13} />
            {t("Đọc chậm. Sống sâu.")}
          </span>
          <span>
            <Truck size={14} />
            {t("Giao hàng tận nơi")}
          </span>
        </div>
      </div>
      <header className="store-header mp-header">
        <div className="mp-header-main">
          <a
            className="brand store-brand"
            href="#top"
            aria-label="Mộc Bookstore"
          >
            <i>
              <BookOpen />
            </i>
            mộc<span>.</span>
          </a>
          <form className="mp-search" role="search" onSubmit={submitSearch}>
            <Search size={20} />
            <input
              aria-label={t("Tìm sách")}
              placeholder={t("Tìm cuốn sách bạn muốn đọc…")}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
            {searchInput && (
              <button
                type="button"
                className="mp-search-clear"
                onClick={() => {
                  setSearchInput("");
                  if (search) {
                    setSearch("");
                    setPage(1);
                  }
                }}
                aria-label={t("Xóa tìm kiếm")}
              >
                <X size={16} />
              </button>
            )}
            <button className="mp-search-submit" type="submit">
              {t("Tìm kiếm")}
            </button>
          </form>
          <div className="store-header-actions mp-header-actions">
            <LanguageToggle />
            <button className="mp-header-action mp-account" onClick={onLogin}>
              <UserRound size={22} />
              <span>{t(accountLabel)}</span>
            </button>
            <button
              className="mp-header-action mp-cart"
              onClick={() => setCartOpen(true)}
              aria-label={t("Giỏ hàng ({count})", { count: cartCount })}
            >
              <span className="mp-cart-icon">
                <ShoppingBag size={23} />
                {cartCount > 0 && <b>{cartCount}</b>}
              </span>
              <span>{t("Giỏ hàng")}</span>
            </button>
          </div>
        </div>
        <nav className="mp-nav" aria-label={t("Điều hướng cửa hàng")}>
          <a href="#books">{t("Sách")}</a>
          <a href="#about">{t("Về Mộc")}</a>
          {token && user?.role === "customer" && (
            <button className="mp-nav-orders" onClick={onViewOrders}>
              <PackageCheck size={16} />
              {t("Đơn hàng của tôi")}
            </button>
          )}
        </nav>
      </header>

      <div className="mp-container">
        <section className="mp-discover" aria-labelledby="mp-discover-title">
          <div className="mp-hero-banner">
            <div className="mp-hero-copy">
              <span className="mp-eyebrow">
                <span />
                {t("TRẠM DỪNG CỦA NGƯỜI YÊU SÁCH")}
              </span>
              <h1 id="mp-discover-title">
                {t("Lật một trang sách,")}
                <br />
                <em>{t("mở một thế giới.")}</em>
              </h1>
              <p>
                {t(
                  "Từ những câu chuyện nhỏ đến những ý tưởng lớn. Tìm cuốn sách dành riêng cho bạn tại Mộc.",
                )}
              </p>
              <a className="mp-hero-cta" href="#books">
                {t("Khám phá ngay")}
                <ArrowRight size={17} />
              </a>
              <div className="mp-hero-note">
                <span />
                <span />
                <span />
                {t("Mỗi ngày, một chút cảm hứng mới")}
              </div>
            </div>
            <div className="mp-hero-visual" aria-hidden="true">
              <span className="mp-hero-orbit" />
              <Sparkles className="mp-hero-sparkle" />
              <span className="mp-hero-star">✦</span>
              <div className="mp-hero-books">
                {featured.length ? (
                  featured.slice(0, 3).map((book, index) => (
                    <div className={`mp-hero-book book-${index}`} key={book.id}>
                      <BookCover book={book} eager />
                    </div>
                  ))
                ) : (
                  <div className="mp-illustrated-book">
                    <BookOpen />
                    <span>MỘC</span>
                    <small>{t("ĐỌC CHẬM. SỐNG SÂU.")}</small>
                  </div>
                )}
              </div>
              <span className="mp-hero-seal">
                {t("Một cuốn sách hay")}
                <Heart size={17} />
                {t("Một ngày thật khác")}
              </span>
            </div>
          </div>
          <div className="mp-feature-panels">
            <button
              className="mp-editorial-card"
              onClick={() => {
                resetFilters();
                scrollToCatalog();
              }}
            >
              <span>
                <Sparkles size={15} />
                {t("VỪA LÊN KỆ")}
              </span>
              <h2>
                {t("Cuốn sách tiếp theo")}
                <br />
                {t("đang chờ bạn.")}
              </h2>
              <span className="mp-editorial-link">
                {t("Xem sách mới")}
                <ArrowRight size={16} />
              </span>
              <BookOpen className="mp-panel-icon" />
            </button>
            <a className="mp-reading-card" href="#about">
              <Coffee size={25} />
              <span>
                <b>{t("Chậm lại một chút.")}</b>
                <small>{t("Dành thời gian cho điều bạn yêu.")}</small>
              </span>
              <ChevronRight size={18} />
            </a>
          </div>
        </section>

        <section
          className="mp-catalog"
          id="books"
          ref={catalog}
          aria-labelledby="mp-catalog-title"
        >
          <div className="mp-catalog-heading">
            <div>
              <span className="mp-eyebrow">{t("TỦ SÁCH NHÀ MỘC")}</span>
              <h2 id="mp-catalog-title">
                {search
                  ? t("Kết quả tìm kiếm")
                  : selectedCategory
                    ? categoryLabel(selectedCategory.name)
                    : t("Tìm một cuốn sách, thêm một niềm vui")}
              </h2>
              <p aria-live="polite">
                {loading
                  ? t("Đang tải sách…")
                  : t("{count} cuốn sách dành cho bạn", {
                      count: error ? 0 : meta.total,
                    })}
                {search && <> · “{search}”</>}
              </p>
            </div>
            <span className="mp-heading-decoration">
              <Sprout size={36} strokeWidth={1.2} />
            </span>
          </div>
          {cartNotice && (
            <div className={`mp-cart-notice ${cartNotice.type}`} role="status">
              <CheckCircle2 size={18} />
              <span>{t(cartNotice.key, cartNotice.params)}</span>
              <button onClick={() => setCartOpen(true)}>
                {t("Xem giỏ hàng")}
                <ArrowRight size={14} />
              </button>
              <button
                onClick={() => setCartNotice(null)}
                aria-label={t("Đóng")}
              >
                <X size={15} />
              </button>
            </div>
          )}
          <div className="mp-catalog-layout">
            {filtersOpen && (
              <button
                className="mp-filter-backdrop"
                onClick={() => setFiltersOpen(false)}
                aria-label={t("Đóng bộ lọc")}
                tabIndex={-1}
              />
            )}
            <aside
              ref={filterPanel}
              className={`mp-filter-sidebar ${filtersOpen ? "is-open" : ""}`}
              id="mp-filters"
              role={filtersOpen ? "dialog" : undefined}
              aria-modal={filtersOpen || undefined}
              aria-label={t("Bộ lọc sách")}
            >
              <div className="mp-filter-title">
                <SlidersHorizontal size={17} />
                <h3>{t("Bộ lọc tìm kiếm")}</h3>
                {activeFilterCount > 0 && (
                  <button onClick={resetFilters}>{t("Xóa lọc")}</button>
                )}
                <button
                  className="mp-filter-close"
                  onClick={() => setFiltersOpen(false)}
                  aria-label={t("Đóng bộ lọc")}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="mp-filter-group">
                <h4>{t("Thể loại")}</h4>
                <div className="mp-category-list">
                  <button
                    className={!category ? "active" : ""}
                    onClick={() => chooseCategory("")}
                    aria-pressed={!category}
                  >
                    <Grid2X2 size={15} />
                    {t("Tất cả sách")}
                    {!category && <Check size={14} />}
                  </button>
                  {(allCategories ? categories : categories.slice(0, 8)).map(
                    (item) => (
                      <button
                        key={item.id}
                        className={category === String(item.id) ? "active" : ""}
                        aria-pressed={category === String(item.id)}
                        onClick={() => chooseCategory(item.id)}
                      >
                        {categoryLabel(item.name)}
                        {category === String(item.id) && <Check size={14} />}
                      </button>
                    ),
                  )}
                </div>
                {categories.length > 8 && (
                  <button
                    className="mp-more-categories"
                    onClick={() => setAllCategories(!allCategories)}
                  >
                    {allCategories ? t("Thu gọn") : t("Xem tất cả thể loại")}
                    <ChevronDown
                      size={14}
                      className={allCategories ? "rotated" : ""}
                    />
                  </button>
                )}
                {categoryError && (
                  <button
                    className="mp-more-categories"
                    onClick={() => setReloadCount((value) => value + 1)}
                  >
                    {t("Thử tải lại")}
                  </button>
                )}
              </div>
              <fieldset className="mp-filter-group">
                <legend>{t("Khoảng giá")}</legend>
                {PRICE_RANGES.map((range) => (
                  <label className="mp-radio" key={range.value}>
                    <input
                      type="radio"
                      name="price-range"
                      value={range.value}
                      checked={priceRange === range.value}
                      onChange={() => {
                        setPriceRange(range.value);
                        setPage(1);
                      }}
                    />
                    <span>{t(range.label)}</span>
                  </label>
                ))}
              </fieldset>
              <div className="mp-filter-group">
                <h4>{t("Tình trạng")}</h4>
                <label className="mp-radio">
                  <input
                    type="checkbox"
                    checked={inStock}
                    onChange={(event) => {
                      setInStock(event.target.checked);
                      setPage(1);
                    }}
                  />
                  <span>{t("Chỉ hiện sách còn hàng")}</span>
                </label>
              </div>
              <div className="mp-filter-note">
                <BookOpen size={26} strokeWidth={1.4} />
                <b>{t("Chọn bằng trái tim.")}</b>
                <p>{t("Cuốn sách phù hợp luôn đáng để chờ đợi.")}</p>
              </div>
              <button
                className="mp-apply-filters"
                onClick={() => setFiltersOpen(false)}
              >
                {t("Xem kết quả")}
                <ArrowRight size={15} />
              </button>
            </aside>
            <div className="mp-results">
              <div className="mp-catalog-toolbar">
                <button
                  className="mp-mobile-filter"
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  aria-expanded={filtersOpen}
                  aria-controls="mp-filters"
                >
                  <SlidersHorizontal size={16} />
                  {t("Bộ lọc")}
                  {activeFilterCount > 0 && <b>{activeFilterCount}</b>}
                </button>
                <label className="mp-sort">
                  <span>{t("Sắp xếp:")}</span>
                  <select
                    value={sort}
                    onChange={(event) => {
                      setSort(event.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="newest">{t("Mới nhất")}</option>
                    <option value="price_asc">{t("Giá: Thấp đến cao")}</option>
                    <option value="price_desc">{t("Giá: Cao đến thấp")}</option>
                    <option value="title_asc">{t("Tên sách: A – Z")}</option>
                  </select>
                  <ChevronDown size={14} />
                </label>
              </div>
              {(activeFilterCount > 0 || search) && (
                <div className="mp-active-filters">
                  {search && (
                    <button
                      onClick={() => {
                        setSearch("");
                        setSearchInput("");
                        setPage(1);
                      }}
                    >
                      “{search}”<X size={13} />
                    </button>
                  )}
                  {selectedCategory && (
                    <button onClick={() => chooseCategory("")}>
                      {categoryLabel(selectedCategory.name)}
                      <X size={13} />
                    </button>
                  )}
                  {priceRange && (
                    <button
                      onClick={() => {
                        setPriceRange("");
                        setPage(1);
                      }}
                    >
                      {t(
                        PRICE_RANGES.find((range) => range.value === priceRange)
                          .label,
                      )}
                      <X size={13} />
                    </button>
                  )}
                  {inStock && (
                    <button
                      onClick={() => {
                        setInStock(false);
                        setPage(1);
                      }}
                    >
                      {t("Còn hàng")}
                      <X size={13} />
                    </button>
                  )}
                  <button className="mp-clear-all" onClick={resetFilters}>
                    {t("Xóa tất cả")}
                  </button>
                </div>
              )}
              <div aria-busy={loading}>
                {loading ? (
                  <div
                    className="mp-product-grid mp-skeletons"
                    aria-label={t("Đang tải sách…")}
                  >
                    {Array.from({ length: 8 }, (_, index) => (
                      <div className="mp-skeleton" key={index}>
                        <div />
                        <span />
                        <span />
                        <span />
                      </div>
                    ))}
                  </div>
                ) : error ? (
                  <div className="mp-empty">
                    <BookOpen />
                    <h3>{t("Chưa thể tải tủ sách")}</h3>
                    <p>{t(error)}</p>
                    <button
                      className="primary"
                      onClick={() => setReloadCount((value) => value + 1)}
                    >
                      {t("Thử tải lại")}
                    </button>
                  </div>
                ) : books.length === 0 ? (
                  <div className="mp-empty">
                    <Search />
                    <h3>{t("Chưa tìm thấy cuốn sách phù hợp")}</h3>
                    <p>
                      {t(
                        "Thử đổi từ khóa hoặc bớt bộ lọc để khám phá thêm nhé.",
                      )}
                    </p>
                    <button className="primary" onClick={resetFilters}>
                      {t("Xem tất cả sách")}
                    </button>
                  </div>
                ) : (
                  <div className="mp-product-grid">
                    {books.map((book) => (
                      <ProductCard
                        key={book.id}
                        book={book}
                        onDetails={showDetails}
                        onAdd={addToCart}
                        added={addedId === book.id}
                      />
                    ))}
                  </div>
                )}
              </div>
              {!loading && !error && meta.total > 0 && (
                <nav
                  className="mp-pagination"
                  aria-label={t("Phân trang sách")}
                >
                  <span>
                    {t("Hiển thị {from}–{to} trong {total} sách", {
                      from: (page - 1) * meta.limit + 1,
                      to: Math.min(page * meta.limit, meta.total),
                      total: meta.total,
                    })}
                  </span>
                  <div>
                    <button
                      disabled={page <= 1}
                      onClick={() => changePage(page - 1)}
                      aria-label={t("Trang trước")}
                    >
                      <ArrowLeft size={16} />
                    </button>
                    {Array.from(
                      new Set(
                        [1, page - 1, page, page + 1, pageCount].filter(
                          (value) => value > 0 && value <= pageCount,
                        ),
                      ),
                    )
                      .sort((a, b) => a - b)
                      .map((value, index, values) => (
                        <span key={value}>
                          {index > 0 && value - values[index - 1] > 1 && (
                            <span className="mp-page-gap">…</span>
                          )}
                          <button
                            className={value === page ? "active" : ""}
                            aria-current={value === page ? "page" : undefined}
                            onClick={() => changePage(value)}
                          >
                            {value}
                          </button>
                        </span>
                      ))}
                    <button
                      disabled={page >= pageCount}
                      onClick={() => changePage(page + 1)}
                      aria-label={t("Trang sau")}
                    >
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </nav>
              )}
            </div>
          </div>
        </section>
        <section
          className="mp-service-strip"
          aria-label={t("Mua sắm cùng Mộc")}
        >
          <div>
            <BookOpen />
            <span>
              <b>{t("Một tủ sách, nhiều lựa chọn")}</b>
              <small>{t("Khám phá theo thể loại yêu thích")}</small>
            </span>
          </div>
          <div>
            <Truck />
            <span>
              <b>{t("Giao hàng tận nơi")}</b>
              <small>{t("Theo dõi đơn ngay trong tài khoản")}</small>
            </span>
          </div>
          <div>
            <ShieldCheck />
            <span>
              <b>{t("An tâm mua sắm")}</b>
              <small>{t("Thông tin tài khoản được bảo vệ")}</small>
            </span>
          </div>
        </section>
        <section className="mp-about" id="about">
          <div>
            <span className="mp-eyebrow">{t("MỘC · MỘT GÓC AN YÊN")}</span>
            <h2>
              {t("Sách hay ở lại.")}
              <br />
              <em>{t("Những điều đẹp cũng vậy.")}</em>
            </h2>
          </div>
          <div>
            <p>
              {t(
                "Một góc nhỏ cho người yêu sách. Mộc tin rằng mỗi cuốn sách đều có một người đang chờ để gặp. Có thể là bạn, trong một ngày rất đỗi bình thường.",
              )}
            </p>
            <a href="#books">
              {t("Tìm cuốn sách của bạn")}
              <ArrowRight size={16} />
            </a>
          </div>
          <Leaf className="mp-about-leaf" />
        </section>
      </div>
      <footer className="store-footer">
        <span>© 2026 Mộc Bookstore · {t("Đọc chậm. Sống sâu.")}</span>
      </footer>
      <a className="mp-back-top" href="#top" aria-label={t("Về đầu trang")}>
        <ArrowDown size={18} />
      </a>
      {selectedBook && (
        <BookDetails
          book={selectedBook}
          loading={detailLoading}
          error={detailError}
          onClose={closeDetails}
          onAddToCart={addToCart}
        />
      )}
      {cartOpen && (
        <CartPanel
          cart={cart}
          setCart={setCart}
          onClose={() => setCartOpen(false)}
          onCheckout={() => {
            setCartOpen(false);
            if (token) setCheckoutOpen(true);
            else onLogin?.();
          }}
        />
      )}
      {checkoutOpen && (
        <CheckoutModal
          cart={cart}
          token={token}
          user={user}
          onClose={() => setCheckoutOpen(false)}
          onComplete={(order) => {
            setCart([]);
            setCheckoutOpen(false);
            setCartNotice({
              key: "Đặt hàng thành công: {code}",
              params: { code: order?.order_code || "" },
              type: "success",
            });
            onOrderCreated?.(order);
          }}
        />
      )}
    </main>
  );
}
