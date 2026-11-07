import { useEffect, useState, useMemo, useRef } from "react";
import { CAMPUS_CANTEENS, isCanteenOpenNow } from "../data/canteens";
import { useAppContext } from "@/context/AppContext";

// High quality campus architecture photos matching the reference layout
const CANTEEN_IMAGES = {
  "foodcourt-34": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=320&q=80",
  "main-canteen": "https://images.unsplash.com/photo-1541123437800-1bb1317badc2?auto=format&fit=crop&w=320&q=80",
  "nk-foodcourt": "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=320&q=80",
  "library-cafe": "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=320&q=80",
  default: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=320&q=80"
};

const SORT_OPTIONS = [
  { id: "recommended", label: "Recommended", icon: "⭐" },
  { id: "lowest_price", label: "Lowest Price", icon: "💰" },
  { id: "nearest", label: "Nearest", icon: "📍" }
];

const SAMPLE_CART_ITEMS = [
  {
    name: "Cheese Maggi",
    basePrice: 35,
    price: 35,
    quantity: 1,
    image: "/images/maggi.jpg"
  },
  {
    name: "Cold Coffee",
    basePrice: 28,
    price: 28,
    quantity: 1,
    image: "/images/coffee.jpg"
  },
  {
    name: "Veg Burger",
    basePrice: 49,
    price: 49,
    quantity: 2,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=120&q=80"
  }
];

// Clean vector icons matching the reference screenshot exactly
function ScaleIcon({ size = 14, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10" />
      <path d="M12 3v18" />
      <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </svg>
  );
}

function CartIconSvg({ size = 15, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}

function TagIconSvg({ size = 16, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
      <path d="M7 7h.01" />
    </svg>
  );
}

function StarIconSvg({ size = 16, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" className={className}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function PinIconSvg({ size = 16, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function StoreIconSvg({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
      <path d="M2 7h20" />
      <path d="M22 7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2" />
    </svg>
  );
}

function WalkingIconSvg({ size = 12, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="4" r="2" />
      <path d="m9 20 3-6-3-3 4-2 3 3 2-1" />
      <path d="m6 16 3-3" />
      <path d="m14 15 2 5" />
    </svg>
  );
}

function ClockIconSvg({ size = 12, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function CalendarIconSvg({ size = 12, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}

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
    } else {
      setActiveItem(SAMPLE_CART_ITEMS[0]);
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
      // Fallback to static values
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

  const currentItem = activeItem || (cartItems && cartItems.length > 0 ? cartItems[0] : SAMPLE_CART_ITEMS[0]);
  const basePrice = Number(currentItem?.basePrice ?? currentItem?.price ?? 35);
  const itemQty = Number(currentItem?.quantity ?? 1);
  const displayItemImage = currentItem?.image || "/images/maggi.jpg";

  // Build the list of cart items matching Image 2
  const displayCartItems = useMemo(() => {
    if (cartItems && cartItems.length >= 2) {
      return cartItems;
    }
    const primary = currentItem || SAMPLE_CART_ITEMS[0];
    const others = SAMPLE_CART_ITEMS.filter((s) => s.name.toLowerCase() !== primary.name.toLowerCase());
    return [primary, ...others].slice(0, 3);
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
      return [...list].sort((a, b) => (a.distanceMeters || 60) - (b.distanceMeters || 60));
    }

    // Default: "recommended" (Open canteens first, then lowest prep time & price)
    return [...list].sort((a, b) => {
      const openA = isCanteenOpenNow(a).isOpen ? 0 : 1;
      const openB = isCanteenOpenNow(b).isOpen ? 0 : 1;
      if (openA !== openB) return openA - openB;

      const scoreA = a.waitMinutes * 1.5 + (a.distanceMeters || 60) * 0.05 + a.price;
      const scoreB = b.waitMinutes * 1.5 + (b.distanceMeters || 60) * 0.05 + b.price;
      return scoreA - scoreB;
    });
  }, [canteensList, sortBy, liveStats, basePrice]);

  // Calculate metrics for Section 2
  const openCanteens = sortedCanteens.filter((c) => isCanteenOpenNow(c).isOpen);
  const bestPrice = openCanteens.length > 0 ? Math.min(...openCanteens.map((c) => c.price)) : basePrice;
  const maxSavings = Math.max(0, basePrice - bestPrice);

  if (!isOpen) return null;

  return (
    <div className="choose-canteen-overlay" onClick={onClose}>
      <div
        className="compare-dialog-box"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header */}
        <div className="cd-header">
          <div className="cd-header-left">
            <div className="cd-badge-pill">
              <ScaleIcon size={13} className="cd-scale-svg" />
              <span>FOOD AVAILABILITY COMPARISON</span>
            </div>
            <h2 className="cd-title">
              Available at {sortedCanteens.length} Canteens
            </h2>
            <p className="cd-subtitle">
              Live availability and best options for:{" "}
              <strong>{currentItem?.name || "Cheese Maggi"}</strong> (Qty: {itemQty})
            </p>
          </div>

          <button
            type="button"
            className="cd-close-circle"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Section 1: Your Cart Items Box */}
        <div className="cd-cart-box">
          <div className="cd-cart-box-top">
            <span className="cd-cart-title">
              <CartIconSvg size={15} className="cd-cart-icon-svg" />
              <span>YOUR CART ITEMS ({displayCartItems.length})</span>
            </span>
            <span className="cd-cart-hint">
              Select a product to compare availability
            </span>
          </div>

          <div className="cd-cart-items-row">
            {displayCartItems.map((ci) => {
              const isSelected =
                (currentItem?.menuItemId || currentItem?._id || currentItem?.name) ===
                (ci.menuItemId || ci._id || ci.name);
              return (
                <button
                  key={ci.name}
                  type="button"
                  className={`cd-product-card ${isSelected ? "is-selected" : ""}`}
                  onClick={() => {
                    setActiveItem({
                      ...ci,
                      isFromCart: true
                    });
                  }}
                >
                  <img
                    src={ci.image || "/images/maggi.jpg"}
                    alt={ci.name}
                    className="cd-prod-thumb"
                    onError={(e) => {
                      e.target.src = "/images/maggi.jpg";
                    }}
                  />
                  <div className="cd-prod-info">
                    <span className="cd-prod-name">{ci.name}</span>
                    <span className="cd-prod-meta">
                      <strong className="cd-prod-price">₹{ci.price}</strong> • Qty: {ci.quantity || 1}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: 4-Column Summary Stats Banner */}
        <div className="cd-summary-banner">
          {/* Column 1: Comparing Item */}
          <div className="cd-sb-col cd-sb-item">
            <img
              src={displayItemImage}
              alt={currentItem?.name}
              className="cd-sb-thumb"
              onError={(e) => {
                e.target.src = "/images/maggi.jpg";
              }}
            />
            <div className="cd-sb-text">
              <span className="cd-sb-label">Comparing Availability For</span>
              <strong className="cd-sb-val cd-sb-name">{currentItem?.name || "Cheese Maggi"}</strong>
            </div>
          </div>

          <div className="cd-sb-divider" />

          {/* Column 2: Best Price */}
          <div className="cd-sb-col">
            <TagIconSvg size={18} className="cd-sb-icon cd-icon-tag" />
            <div className="cd-sb-text">
              <span className="cd-sb-label">Best Price</span>
              <strong className="cd-sb-val cd-sb-green">₹{bestPrice}</strong>
            </div>
          </div>

          <div className="cd-sb-divider" />

          {/* Column 3: Max Save */}
          <div className="cd-sb-col">
            <StarIconSvg size={18} className="cd-sb-icon cd-icon-star" />
            <div className="cd-sb-text">
              <span className="cd-sb-label">Max Save</span>
              <strong className="cd-sb-val cd-sb-green">
                ₹{maxSavings > 0 ? maxSavings : 0} per item
              </strong>
            </div>
          </div>

          <div className="cd-sb-divider" />

          {/* Column 4: Available At */}
          <div className="cd-sb-col">
            <PinIconSvg size={18} className="cd-sb-icon cd-icon-pin" />
            <div className="cd-sb-text">
              <span className="cd-sb-label">Available At</span>
              <strong className="cd-sb-val cd-sb-dark">{sortedCanteens.length} Canteens</strong>
            </div>
          </div>
        </div>

        {/* Section 3: Available Canteens Bar & Sort Button */}
        <div className="cd-canteens-bar">
          <div className="cd-bar-heading">
            <StoreIconSvg size={18} className="cd-store-svg" />
            <span className="cd-heading-title">AVAILABLE CANTEENS</span>
          </div>

          <div className="cd-sort-wrap" ref={sortDropdownRef}>
            <button
              type="button"
              className="cd-sort-trigger"
              onClick={() => setIsSortDropdownOpen((prev) => !prev)}
            >
              <span>
                Sort: <strong>{SORT_OPTIONS.find((o) => o.id === sortBy)?.label || "Recommended"}</strong>
              </span>
              <span className="cd-sort-arrows">⇅</span>
            </button>

            {isSortDropdownOpen && (
              <div className="cd-sort-popover">
                <div className="cd-popover-title">SORT CANTEENS BY</div>
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`cd-popover-item ${sortBy === opt.id ? "active" : ""}`}
                    onClick={() => {
                      setSortBy(opt.id);
                      setIsSortDropdownOpen(false);
                    }}
                  >
                    <span>{opt.icon} {opt.label}</span>
                    {sortBy === opt.id && <span className="cd-check">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 4: 4 Streamlined Canteen Cards */}
        <div className="cd-canteens-list">
          {sortedCanteens.map((canteen, idx) => {
            const canteenOpenState = isCanteenOpenNow(canteen);
            const isClosed = !canteenOpenState.isOpen;
            const isRecommended = idx === 0 && !isClosed && sortBy === "recommended";
            const priceDiff = basePrice - canteen.price;
            const hasSavings = !isClosed && priceDiff > 0;

            // Persistent selected canteen detection
            const currentItemCanteenId = currentItem?.canteen?.id || currentItem?.canteenId;
            const selectedCanteenId = selectedCanteen?.id || selectedCanteen?.canteenId;
            const isCurrent =
              (currentItemCanteenId && currentItemCanteenId === canteen.id) ||
              (!currentItemCanteenId && selectedCanteenId === canteen.id) ||
              (!currentItemCanteenId && !selectedCanteenId && idx === 0);

            const canteenImgUrl =
              CANTEEN_IMAGES[canteen.id] || canteen.image || CANTEEN_IMAGES.default;

            const walkingMins = canteen.walkingMinutes || 1;
            const distMeters = canteen.distanceMeters || 60;
            const waitMins = canteen.waitMinutes || 6;
            const hoursDisplay = canteen.openingHours || "8:00 AM – 10:30 PM";

            return (
              <div
                key={canteen.id}
                className={`cd-canteen-row ${isRecommended ? "is-recommended" : ""} ${
                  isClosed ? "is-closed" : ""
                } ${isCurrent ? "is-current" : ""}`}
              >
                {/* Left: Building Photo + Info */}
                <div className="cd-row-left">
                  <div className="cd-row-thumb-box">
                    <img
                      src={canteenImgUrl}
                      alt={canteen.name}
                      className="cd-row-img"
                      onError={(e) => {
                        e.target.src = CANTEEN_IMAGES.default;
                      }}
                    />
                  </div>

                  <div className="cd-row-details">
                    <div className="cd-row-name-line">
                      <strong className="cd-canteen-name">{canteen.name}</strong>
                      {isCurrent ? (
                        <span className="cd-pill-selected">✓ Selected</span>
                      ) : isRecommended ? (
                        <span className="cd-pill-rec">★ Recommended</span>
                      ) : null}
                    </div>

                    <div className="cd-row-location">
                      📍 {canteen.location}
                    </div>

                    <div className="cd-row-chips">
                      <span className="cd-chip cd-chip-walk">
                        <WalkingIconSvg size={11} className="cd-chip-icon" />
                        <span>{walkingMins} min walk ({distMeters} m)</span>
                      </span>

                      {!isClosed ? (
                        <span className="cd-chip cd-chip-prep">
                          <ClockIconSvg size={11} className="cd-chip-icon" />
                          <span>Est. Ready in ~{waitMins} mins</span>
                        </span>
                      ) : (
                        <span className="cd-chip cd-chip-closed">
                          <span className="cd-chip-dot" />
                          <span>Closed</span>
                        </span>
                      )}

                      <span className="cd-chip cd-chip-hours">
                        <CalendarIconSvg size={11} className="cd-chip-icon" />
                        <span>{isClosed ? (canteenOpenState.nextOpenText || canteen.openingHours || "Opens at 12:00 PM") : hoursDisplay}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Vertical Divider Line */}
                <div className="cd-row-v-divider" />

                {/* Right: Price Stack & Button */}
                <div className="cd-row-right">
                  <div className="cd-row-pricing">
                    {!isClosed && (
                      <>
                        {hasSavings && (
                          <span className="cd-old-price">₹{basePrice}</span>
                        )}
                        <span className={`cd-cur-price ${hasSavings ? "is-discounted" : ""}`}>
                          ₹{canteen.price}
                        </span>
                        {hasSavings && (
                          <span className="cd-savings-pill">Save ₹{priceDiff} per item</span>
                        )}
                      </>
                    )}
                  </div>

                  <div className="cd-row-btn-wrap">
                    {isClosed ? (
                      <button
                        type="button"
                        className="cd-btn-closed"
                        disabled
                      >
                        Closed ⓘ
                      </button>
                    ) : isCurrent ? (
                      <button
                        type="button"
                        className="cd-btn-selected"
                        disabled
                        title="This canteen is currently selected"
                      >
                        ✓ Selected
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="cd-btn-choose"
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
        </div>
      </div>
    </div>
  );
}