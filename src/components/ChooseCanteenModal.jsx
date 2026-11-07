import { useEffect, useState, useMemo, useRef } from "react";
import { CAMPUS_CANTEENS, isCanteenOpenNow } from "../data/canteens";
import { SortIcon } from "./Icons";
import { useAppContext } from "@/context/AppContext";

const CANTEEN_IMAGES = {
  "foodcourt-34": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80",
  "main-canteen": "https://images.unsplash.com/photo-1541123437800-1bb1317badc2?auto=format&fit=crop&w=300&q=80",
  "nk-foodcourt": "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=300&q=80",
  "library-cafe": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=300&q=80",
  "sac-canteen": "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=300&q=80",
  "sports-complex": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=300&q=80",
  default: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=300&q=80"
};

const SORT_OPTIONS = [
  { id: "recommended", label: "Recommended", icon: "⭐" },
  { id: "lowest_price", label: "Lowest Price", icon: "💰" },
  { id: "nearest", label: "Nearest", icon: "📍" }
];

export default function ChooseCanteenModal({
  isOpen,
  onClose,
  selectedCanteen,
  onSelectCanteen,
  targetItem = null,
  cartItems = [],
  canteens: propCanteens
}) {
  const { canteens: ctxCanteens } = useAppContext();
  const canteensList = propCanteens || (ctxCanteens && ctxCanteens.length > 0 ? ctxCanteens : CAMPUS_CANTEENS);

  const [activeItem, setActiveItem] = useState(targetItem);
  const [sortBy, setSortBy] = useState("recommended");
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef(null);
  const [liveStats, setLiveStats] = useState({});

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target)) {
        setIsSortDropdownOpen(false);
      }
    };
    if (isSortDropdownOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isSortDropdownOpen]);

  useEffect(() => {
    if (targetItem) {
      setActiveItem(targetItem);
    } else if (cartItems && cartItems.length > 0) {
      setActiveItem(cartItems[0]);
    }
  }, [targetItem, cartItems]);

  // Fetch real-time live kitchen stats from backend API
  useEffect(() => {
    if (isOpen) {
      fetchLiveStats();
    }
  }, [isOpen]);

  const fetchLiveStats = async () => {
    try {
      const res = await fetch("/api/canteens/stats");
      if (res.ok) {
        const data = await res.json();
        const map = {};
        data.forEach((item) => {
          map[item.canteenName] = item;
        });
        setLiveStats(map);
      }
    } catch {
      // Fallback gracefully to default canteen stats
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const currentItem = activeItem || (cartItems && cartItems.length > 0 ? cartItems[0] : null);
  const basePrice = Number(currentItem?.basePrice ?? currentItem?.price ?? 35);
  const itemQty = Number(currentItem?.quantity ?? 1);
  const displayItemImage = currentItem?.image || "/images/samosa.jpg";

  // List of cart items to display in the selector strip
  const itemsInCart = useMemo(() => {
    if (cartItems && cartItems.length > 0) {
      return cartItems;
    }
    if (currentItem) {
      return [currentItem];
    }
    return [];
  }, [cartItems, currentItem]);

  // Compute live data and dynamic sorting for canteens
  const sortedCanteens = useMemo(() => {
    let candidateCanteens = canteensList.filter((c) => c.id !== "all" && c.name !== "All Canteens");

    const list = candidateCanteens.map((canteen) => {
      const stats = liveStats[canteen.name] || {};
      const calculatedWait =
        typeof stats.waitMinutes === "number"
          ? stats.waitMinutes
          : canteen.prepMinutes || 6;
      const rushStatus = stats.rushStatus || canteen.rushStatus;
      const price = Math.max(5, basePrice + (canteen.priceOffset || 0));

      return {
        ...canteen,
        waitMinutes: calculatedWait,
        rushStatus,
        price
      };
    });

    if (sortBy === "lowest_price") {
      return [...list].sort((a, b) => a.price - b.price);
    }
    if (sortBy === "nearest") {
      return [...list].sort((a, b) => (a.distanceMeters || 100) - (b.distanceMeters || 100));
    }

    // Default: "recommended" (Open first, then lowest wait + price)
    return [...list].sort((a, b) => {
      const openA = isCanteenOpenNow(a).isOpen ? 0 : 1;
      const openB = isCanteenOpenNow(b).isOpen ? 0 : 1;
      if (openA !== openB) return openA - openB;

      const scoreA = a.waitMinutes * 1.5 + (a.distanceMeters || 100) * 0.05 + a.price;
      const scoreB = b.waitMinutes * 1.5 + (b.distanceMeters || 100) * 0.05 + b.price;
      return scoreA - scoreB;
    });
  }, [canteensList, sortBy, liveStats, basePrice]);

  // Calculate summary metrics
  const openCanteens = sortedCanteens.filter((c) => isCanteenOpenNow(c).isOpen);
  const bestPrice = openCanteens.length > 0 ? Math.min(...openCanteens.map((c) => c.price)) : basePrice;
  const maxSavings = Math.max(0, basePrice - bestPrice);

  if (!isOpen) return null;

  return (
    <div className="choose-canteen-overlay" onClick={onClose}>
      <div
        className="choose-canteen-modal light-theme-modal redesigned-comparison-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Pinned Top Container: Header, Cart switcher, Preview, and Sort */}
        <div className="choose-canteen-top-bar">
          {/* Modal Header */}
          <div className="choose-canteen-header">
            <div>
              <div className="canteen-modal-tag-pill">
                ⚖️ FOOD AVAILABILITY COMPARISON
              </div>
              <h3 className="choose-canteen-title">
                Available at {sortedCanteens.length} Canteen{sortedCanteens.length > 1 ? "s" : ""}
              </h3>
              <p className="choose-canteen-subtitle">
                Live availability and best options for:{" "}
                <strong className="active-item-title-highlight">{currentItem?.name || "Product"}</strong>{" "}
                (Qty: {itemQty})
              </p>
            </div>

            <button
              type="button"
              className="choose-canteen-close-btn"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Section 1: Cart Items Selection Row */}
          {itemsInCart.length > 0 && (
            <div className="compare-cart-items-container">
              <div className="compare-cart-header">
                <span className="cart-header-title">
                  🛒 YOUR CART ITEMS ({itemsInCart.length})
                </span>
                <span className="cart-header-hint">
                  Select a product to compare availability
                </span>
              </div>

              <div className="compare-cart-cards-row">
                {itemsInCart.map((ci) => {
                  const isSelected =
                    (currentItem?.menuItemId || currentItem?._id || currentItem?.name) ===
                    (ci.menuItemId || ci._id || ci.name);
                  return (
                    <button
                      key={ci.menuItemId || ci._id || ci.name}
                      type="button"
                      className={`compare-cart-card ${isSelected ? "selected" : ""}`}
                      onClick={() => {
                        setActiveItem({
                          menuItemId: ci.menuItemId || ci._id,
                          name: ci.name,
                          basePrice: ci.basePrice || ci.price,
                          price: ci.price,
                          image: ci.image,
                          quantity: ci.quantity || 1,
                          canteen: ci.canteen || selectedCanteen,
                          isFromCart: true
                        });
                      }}
                    >
                      <img
                        src={ci.image || "/images/samosa.jpg"}
                        alt={ci.name}
                        className="compare-card-thumb"
                        onError={(e) => {
                          e.target.src = "/images/samosa.jpg";
                        }}
                      />
                      <div className="compare-card-info">
                        <span className="compare-card-name">{ci.name}</span>
                        <span className="compare-card-meta">
                          <span className="compare-card-price">₹{ci.price}</span> • Qty: {ci.quantity || 1}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: 4-Column Summary Stats Banner */}
          <div className="compare-summary-banner">
            {/* Col 1: Product Name */}
            <div className="cs-col cs-col-product">
              <img
                src={displayItemImage}
                alt={currentItem?.name}
                className="cs-product-thumb"
                onError={(e) => {
                  e.target.src = "/images/samosa.jpg";
                }}
              />
              <div className="cs-text-wrap">
                <span className="cs-label">Comparing Availability For</span>
                <strong className="cs-value cs-val-name">{currentItem?.name || "Selected Item"}</strong>
              </div>
            </div>

            {/* Col 2: Best Price */}
            <div className="cs-col">
              <span className="cs-icon">🏷️</span>
              <div className="cs-text-wrap">
                <span className="cs-label">Best Price</span>
                <strong className="cs-value cs-val-green">₹{bestPrice}</strong>
              </div>
            </div>

            {/* Col 3: Max Save */}
            <div className="cs-col">
              <span className="cs-icon">⭐</span>
              <div className="cs-text-wrap">
                <span className="cs-label">Max Save</span>
                <strong className="cs-value cs-val-green">
                  {maxSavings > 0 ? `₹${maxSavings} per item` : "₹0"}
                </strong>
              </div>
            </div>

            {/* Col 4: Available At */}
            <div className="cs-col">
              <span className="cs-icon">📍</span>
              <div className="cs-text-wrap">
                <span className="cs-label">Available At</span>
                <strong className="cs-value cs-val-dark">{sortedCanteens.length} Canteens</strong>
              </div>
            </div>
          </div>

          {/* Section 3: Available Canteens Header & Sort */}
          <div className="canteen-sort-toolbar" ref={sortDropdownRef}>
            <div className="sort-toolbar-label-row">
              <div className="canteen-toolbar-heading">
                <span className="canteen-store-icon">🏪</span>
                <span className="sort-section-title">AVAILABLE CANTEENS</span>
              </div>

              <div className="sort-dropdown-container">
                <button
                  type="button"
                  className="sort-dropdown-trigger redesigned-sort-trigger"
                  onClick={() => setIsSortDropdownOpen((prev) => !prev)}
                  title="Change sort order"
                >
                  <span className="sort-trigger-text">
                    <strong className="sort-label-prefix">Sort: </strong>
                    <span className="sort-by-text-faded">
                      {SORT_OPTIONS.find((o) => o.id === sortBy)?.label || "Recommended"}
                    </span>
                  </span>
                  <span className="sort-icon-box">
                    <SortIcon size={14} />
                  </span>
                </button>

                {isSortDropdownOpen && (
                  <div className="sort-dropdown-card">
                    <div className="sort-card-header">SORT CANTEENS BY</div>
                    {SORT_OPTIONS.map((opt) => {
                      const isSelected = sortBy === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          className={`sort-dropdown-item ${isSelected ? "selected" : ""}`}
                          onClick={() => {
                            setSortBy(opt.id);
                            setIsSortDropdownOpen(false);
                          }}
                        >
                          <span className="sort-item-left">
                            <span className="sort-item-emoji">{opt.icon}</span>
                            <span className="sort-item-label">{opt.label}</span>
                          </span>
                          {isSelected && <span className="sort-item-check">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Scrollable Streamlined Horizontal Rows */}
        <div className="choose-canteen-list compare-canteen-rows-list">
          {sortedCanteens.map((canteen, idx) => {
            const currentItemCanteen = currentItem?.canteen || selectedCanteen;
            const isCurrent =
              currentItemCanteen?.id === canteen.id ||
              currentItemCanteen?.name === canteen.name;

            const canteenOpenState = isCanteenOpenNow(canteen);
            const isClosed = !canteenOpenState.isOpen;

            // Genuine price difference savings calculation
            const priceDiff = basePrice - canteen.price;
            const hasSavings = !isClosed && priceDiff > 0;
            const isRecommended = idx === 0 && !isClosed && sortBy === "recommended";

            const canteenImgUrl =
              CANTEEN_IMAGES[canteen.id] || canteen.image || CANTEEN_IMAGES.default;

            const walkingMinutes = canteen.walkingMinutes || 1;
            const distanceMeters = canteen.distanceMeters || 60;
            const waitMins = canteen.waitMinutes || 6;
            const openingHoursText = canteen.openingHours || "8:00 AM – 10:30 PM";

            return (
              <div
                key={canteen.id}
                className={`canteen-horizontal-row ${
                  isCurrent ? "is-current-selection" : ""
                } ${isClosed ? "is-canteen-closed" : ""} ${
                  isRecommended ? "is-canteen-recommended" : ""
                }`}
              >
                {/* Left Part: Canteen Building Photo + Details */}
                <div className="canteen-row-left">
                  <div className="canteen-photo-wrap">
                    <img
                      src={canteenImgUrl}
                      alt={canteen.name}
                      className="canteen-photo-thumb"
                      onError={(e) => {
                        e.target.src = CANTEEN_IMAGES.default;
                      }}
                    />
                  </div>

                  <div className="canteen-row-details">
                    {/* Line 1: Name + Recommended / Selected Badge */}
                    <div className="canteen-title-line">
                      <strong className="canteen-name-text">{canteen.name}</strong>
                      {isRecommended && (
                        <span className="canteen-recommended-pill">★ Recommended</span>
                      )}
                      {isCurrent && (
                        <span className="canteen-current-badge">✓ Selected</span>
                      )}
                    </div>

                    {/* Line 2: Location */}
                    <div className="canteen-location-line">
                      📍 {canteen.location || "Campus Block"}
                    </div>

                    {/* Line 3: Informational Chips Row */}
                    <div className="canteen-chips-row">
                      <span className="canteen-chip chip-walking">
                        🚶 {walkingMinutes} min walk ({distanceMeters} m)
                      </span>

                      {!isClosed ? (
                        <span className="canteen-chip chip-prep">
                          🕒 Est. Ready in ~{waitMins} mins
                        </span>
                      ) : (
                        <span className="canteen-chip chip-closed">
                          🔴 Closed
                        </span>
                      )}

                      <span className="canteen-chip chip-hours">
                        🕒 {isClosed ? (canteenOpenState.nextOpenText || canteen.openingHours || "Opens at 12:00 PM") : openingHoursText}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Part: Price, Savings Pill & Action Button */}
                <div className="canteen-row-right">
                  {!isClosed && (
                    <div className="canteen-pricing-col">
                      <div className="canteen-price-main">
                        {hasSavings && (
                          <span className="canteen-price-old">₹{basePrice}</span>
                        )}
                        <span className={`canteen-price-current ${hasSavings ? "price-discounted" : ""}`}>
                          ₹{canteen.price}
                        </span>
                      </div>
                      {hasSavings && (
                        <span className="canteen-savings-pill">
                          Save ₹{priceDiff} per item
                        </span>
                      )}
                    </div>
                  )}

                  <div className="canteen-action-col">
                    {isClosed ? (
                      <button
                        type="button"
                        className="btn-canteen-row btn-closed"
                        disabled
                        title="This canteen is currently closed"
                      >
                        Closed ⓘ
                      </button>
                    ) : isCurrent ? (
                      <button
                        type="button"
                        className="btn-canteen-row btn-selected"
                        disabled
                      >
                        ✓ Selected
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-canteen-row btn-choose"
                        onClick={() => onSelectCanteen(canteen, currentItem, canteen.price)}
                      >
                        Choose →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Bottom spacer so the last row is fully visible */}
          <div className="choose-canteen-bottom-spacer" />
        </div>
      </div>
    </div>
  );
}