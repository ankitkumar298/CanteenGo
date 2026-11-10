import { useEffect, useState, useMemo, useRef } from "react";
import { CAMPUS_CANTEENS, isCanteenOpenNow, getItemPriceForCanteen, isItemAvailableAtCanteen } from "../data/canteens";
import { ClockIcon, CheckCircleIcon, SortIcon, CartIcon } from "./Icons";
import { useAppContext } from "@/context/AppContext";

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
  canteens: propCanteens,
  menuItems: propMenuItems = []
}) {
  const { canteens: ctxCanteens } = useAppContext();
  const canteensList = propCanteens || (ctxCanteens && ctxCanteens.length > 0 ? ctxCanteens : CAMPUS_CANTEENS);

  const [dbMenuItems, setDbMenuItems] = useState(propMenuItems || []);
  const [imgError, setImgError] = useState(false);
  const [activeItem, setActiveItem] = useState(targetItem);
  const [sortBy, setSortBy] = useState("recommended");
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef(null);
  const [liveStats, setLiveStats] = useState({});
  const [loadingStats, setLoadingStats] = useState(false);

  // Touch / Pointer Drag-down & Exit Animation States
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const dragStartYRef = useRef(0);
  const currentDragYRef = useRef(0);
  const isClosingRef = useRef(false);

  const handleCloseWithAnimation = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsClosing(true);
    setDragOffset(0);

    setTimeout(() => {
      setIsClosing(false);
      isClosingRef.current = false;
      if (onClose) onClose();
    }, 280);
  };

  const handlePointerDown = (e) => {
    if (isClosingRef.current) return;
    if (e.button && e.button !== 0) return;
    const startY = e.clientY;
    dragStartYRef.current = startY;
    currentDragYRef.current = startY;
    setIsDragging(true);

    const onPointerMove = (moveEvt) => {
      currentDragYRef.current = moveEvt.clientY;
      const deltaY = moveEvt.clientY - startY;
      if (deltaY > 0) {
        setDragOffset(deltaY);
      } else {
        setDragOffset(deltaY * 0.15);
      }
    };

    const onPointerUp = (upEvt) => {
      setIsDragging(false);
      const deltaY = upEvt.clientY - startY;
      if (deltaY > 55) {
        handleCloseWithAnimation();
      } else {
        setDragOffset(0);
      }
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  const handleTouchStart = (e) => {
    if (isClosingRef.current) return;
    const startY = e.touches[0].clientY;
    dragStartYRef.current = startY;
    currentDragYRef.current = startY;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging || isClosingRef.current) return;
    const currentY = e.touches[0].clientY;
    currentDragYRef.current = currentY;
    const deltaY = currentY - dragStartYRef.current;
    if (deltaY > 0) {
      setDragOffset(deltaY);
    } else {
      setDragOffset(deltaY * 0.15);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging || isClosingRef.current) return;
    setIsDragging(false);
    const deltaY = currentDragYRef.current - dragStartYRef.current;
    if (deltaY > 55) {
      handleCloseWithAnimation();
    } else {
      setDragOffset(0);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setDragOffset(0);
      setIsDragging(false);
      isClosingRef.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    if (propMenuItems && propMenuItems.length > 0) {
      setDbMenuItems(propMenuItems);
    }
  }, [propMenuItems]);

  // Always refresh menu items when opened to have latest sold-out status per canteen
  useEffect(() => {
    if (isOpen) {
      fetch("/api/menu")
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setDbMenuItems(data);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

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
    setImgError(false);
    setActiveItem(targetItem);
  }, [targetItem]);

  // Fetch real-time live kitchen stats from backend API
  useEffect(() => {
    if (isOpen) {
      fetchLiveStats();
    }
  }, [isOpen]);

  const fetchLiveStats = async () => {
    try {
      setLoadingStats(true);
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
      // Fallback to static values if network is unavailable
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") handleCloseWithAnimation();
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

  // Match active item with full database item to ensure soldOutCanteens and canteenPrices are always present
  const resolvedActiveItem = useMemo(() => {
    if (!activeItem) return null;
    const match = dbMenuItems.find(
      (m) =>
        (activeItem.menuItemId && (m._id === activeItem.menuItemId || m.id === activeItem.menuItemId)) ||
        (activeItem._id && (m._id === activeItem._id || m.id === activeItem._id)) ||
        (m.name && activeItem.name && m.name.toLowerCase() === activeItem.name.toLowerCase())
    );
    if (match) {
      return {
        ...match,
        ...activeItem,
        soldOutCanteens: match.soldOutCanteens || activeItem.soldOutCanteens || [],
        canteenPrices: match.canteenPrices || activeItem.canteenPrices || {},
        availableCanteens: match.availableCanteens || activeItem.availableCanteens || []
      };
    }
    return activeItem;
  }, [activeItem, dbMenuItems]);

  const isItemMode = Boolean(resolvedActiveItem && resolvedActiveItem.name);
  const displayItemImage =
    !imgError && resolvedActiveItem?.image ? resolvedActiveItem.image : "/images/samosa.jpg";
  const basePrice = resolvedActiveItem?.basePrice ?? resolvedActiveItem?.price ?? 0;

  // Compute live data and dynamic sorting for canteens
  const sortedCanteens = useMemo(() => {
    // Filter out "all" placeholder — an item can only be picked up from a real campus canteen
    let candidateCanteens = canteensList.filter((c) => c.id !== "all" && c.name !== "All Canteens");

    // Filter canteens strictly to those where this item is offered AND NOT SOLD OUT
    if (isItemMode && resolvedActiveItem) {
      candidateCanteens = candidateCanteens.filter((c) => {
        // Exclude canteens where this item is marked Sold Out
        if (!isItemAvailableAtCanteen(resolvedActiveItem, c)) {
          return false;
        }

        const avail = resolvedActiveItem.availableCanteens;
        if (Array.isArray(avail) && avail.length > 0 && !avail.includes("all")) {
          return avail.includes(c.id || c.canteenId);
        } else if (resolvedActiveItem.canteenId && resolvedActiveItem.canteenId !== "all") {
          return (c.id || c.canteenId) === resolvedActiveItem.canteenId;
        }

        return true;
      });
    }

    const list = candidateCanteens.map((canteen) => {
      const stats = liveStats[canteen.name] || {};
      const ordersAhead =
        typeof stats.ordersAhead === "number" ? stats.ordersAhead : 0;
      const calculatedWait =
        typeof stats.waitMinutes === "number"
          ? stats.waitMinutes
          : canteen.prepMinutes;
      const rushStatus = stats.rushStatus || canteen.rushStatus;
      const price = getItemPriceForCanteen(resolvedActiveItem, canteen);
      const isAvailableAtCanteen = isItemAvailableAtCanteen(resolvedActiveItem, canteen);

      // Calculate approximate ready-by time
      const readyDate = new Date(Date.now() + calculatedWait * 60000);
      const readyByTime = readyDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });

      return {
        ...canteen,
        ordersAhead,
        waitMinutes: calculatedWait,
        rushStatus,
        price,
        isAvailable: isAvailableAtCanteen,
        readyByTime
      };
    });

    if (sortBy === "lowest_price") {
      return [...list].sort((a, b) => a.price - b.price);
    }
    if (sortBy === "nearest") {
      return [...list].sort((a, b) => a.distanceMeters - b.distanceMeters);
    }

    // Default: "recommended" (Balanced algorithm: low wait time + near location + high stock)
    return [...list].sort((a, b) => {
      const scoreA =
        a.waitMinutes * 1.5 + a.walkingMinutes * 2 - (a.stockCount || 0) * 0.1;
      const scoreB =
        b.waitMinutes * 1.5 + b.walkingMinutes * 2 - (b.stockCount || 0) * 0.1;
      return scoreA - scoreB;
    });
  }, [sortBy, liveStats, basePrice, resolvedActiveItem, isItemMode, canteensList]);

  // Comparison bar summary metrics
  const availableCanteenPrices = sortedCanteens
    .filter((c) => isCanteenOpenNow(c).isOpen && c.isAvailable)
    .map((c) => c.price);
  const bestPrice =
    availableCanteenPrices.length > 0
      ? Math.min(...availableCanteenPrices)
      : getItemPriceForCanteen(resolvedActiveItem, selectedCanteen) || basePrice;
  const currentItemPrice = getItemPriceForCanteen(resolvedActiveItem, resolvedActiveItem?.canteen || selectedCanteen);
  const maxSave = Math.max(0, currentItemPrice - bestPrice);

  if (!isOpen) return null;

  return (
    <div
      className={`choose-canteen-overlay ${isClosing ? "overlay-closing" : ""}`}
      onClick={handleCloseWithAnimation}
    >
      <div
        className={`choose-canteen-modal light-theme-modal ${isClosing ? "sheet-closing" : ""} ${isDragging ? "sheet-dragging" : ""}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: isClosing
            ? "translateY(100%)"
            : dragOffset > 0
            ? `translateY(${dragOffset}px)`
            : undefined,
          transition: isDragging
            ? "none"
            : "transform 0.28s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.22s ease"
        }}
        role="dialog"
        aria-modal="true"
      >
        {/* Touch / Pointer Drag handle zone for mobile bottom sheet */}
        <div
          className="sheet-drag-handle-zone choose-canteen-drag-zone"
          onPointerDown={handlePointerDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleCloseWithAnimation}
          role="button"
          tabIndex={0}
          aria-label="Drag down or tap to close"
          title="Drag down or tap to close"
        >
          <div className="sheet-drag-handle choose-canteen-drag-handle" />
        </div>

        {/* Pinned Top Container: Header, Cart switcher, Preview, and Sort */}
        <div className="choose-canteen-top-bar">
          {/* Modal Header */}
          <div className="choose-canteen-header">
            <div>
              <div className="canteen-modal-tag-pill">
                {isItemMode ? "FOOD AVAILABILITY COMPARISON" : "CAMPUS PICKUP HUBS"}
              </div>
              <h3 className="choose-canteen-title">
                {isItemMode
                  ? sortedCanteens.length > 0
                    ? `Available at ${sortedCanteens.length} Canteen${sortedCanteens.length > 1 ? "s" : ""}`
                    : "Sold Out at All Canteens"
                  : "Choose Campus Canteen"}
              </h3>
              <p className="choose-canteen-subtitle">
                {isItemMode
                  ? resolvedActiveItem?.isFromCart
                    ? `Showing live availability for your cart item: ${resolvedActiveItem?.name}`
                    : `Compare kitchen prep speed and distance for ${resolvedActiveItem?.name}`
                  : "Select where you want to order and pick up your hot food"}
              </p>
            </div>

            <button
              type="button"
              className="choose-canteen-close-btn"
              onClick={handleCloseWithAnimation}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Switch Between Products in Cart */}
          {cartItems && cartItems.length > 1 && (
            <div className="cart-item-switcher-box">
              <div className="switcher-title-row">
                <span className="switcher-icon-wrap">
                  <CartIcon size={14} className="switcher-cart-icon" />
                </span>
                <span className="switcher-title">Your Cart Items ({cartItems.length})</span>
              </div>
              <div className="switcher-chips-list">
                {cartItems.map((ci) => {
                  const isSelected = (activeItem?.menuItemId || activeItem?.name) === (ci.menuItemId || ci.name);
                  return (
                    <button
                      key={ci.menuItemId || ci.name}
                      type="button"
                      className={`cart-switcher-pill ${isSelected ? "active" : ""}`}
                      onClick={() => {
                        setImgError(false);
                        const matched = dbMenuItems.find(
                          (m) =>
                            (ci.menuItemId && (m._id === ci.menuItemId || m.id === ci.menuItemId)) ||
                            (m.name && ci.name && m.name.toLowerCase() === ci.name.toLowerCase())
                        );
                        setActiveItem({
                          ...(matched || {}),
                          menuItemId: ci.menuItemId,
                          name: ci.name,
                          basePrice: ci.basePrice || ci.price,
                          price: ci.price,
                          image: ci.image,
                          quantity: ci.quantity,
                          canteen: ci.canteen || selectedCanteen,
                          isFromCart: true,
                          soldOutCanteens: matched?.soldOutCanteens || ci.soldOutCanteens || [],
                          canteenPrices: matched?.canteenPrices || ci.canteenPrices || {}
                        });
                      }}
                    >
                      <img
                        src={ci.image || "/images/samosa.jpg"}
                        alt={ci.name}
                        className="pill-thumb"
                        onError={(e) => {
                          e.target.src = "/images/samosa.jpg";
                        }}
                      />
                      <span className="pill-text-wrap">
                        <span className="pill-name">{ci.name}</span>
                        <span className="pill-sub-row">
                          <span className="pill-price">₹{ci.price}</span>
                          <span className="pill-qty"> · Qty: {ci.quantity || 1}</span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Comparison Summary Bar with Metrics */}
          {isItemMode && (
            <div className="selected-item-preview-bar">
              <div className="preview-top-item-row">
                <img
                  src={displayItemImage}
                  alt={resolvedActiveItem?.name}
                  className="preview-item-thumb"
                  onError={() => setImgError(true)}
                />
                <div className="preview-item-info">
                  <span className="preview-item-label">Comparing Availability For</span>
                  <strong className="preview-item-name">{resolvedActiveItem?.name}</strong>
                </div>
                <div className="preview-base-price-badge">
                  <span>Base: </span><strong>₹{basePrice}</strong>
                </div>
              </div>

              <div className="preview-metrics-strip">
                <div className="preview-col-metric">
                  <span className="preview-metric-label">🟢 Best Price</span>
                  <strong className="preview-metric-value metric-green">₹{bestPrice}</strong>
                </div>
                <div className="preview-col-metric">
                  <span className="preview-metric-label">⭐ Max Save</span>
                  <strong className="preview-metric-value metric-orange">₹{maxSave}/item</strong>
                </div>
                <div className="preview-col-metric">
                  <span className="preview-metric-label">🏪 In Stock</span>
                  <strong className="preview-metric-value metric-blue">{sortedCanteens.length} Canteens</strong>
                </div>
              </div>
            </div>
          )}

          {/* COMPACT SORT TOOLBAR WITH FLOATING DROPDOWN CARD */}
          <div className="canteen-sort-toolbar" ref={sortDropdownRef}>
            <div className="sort-toolbar-label-row">
              <span className="sort-section-title">Available Canteens</span>

              <div className="sort-dropdown-container">
                <button
                  type="button"
                  className="sort-dropdown-trigger"
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
                    <SortIcon size={16} />
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

        {/* Scrollable List of Canteens */}
        <div className="choose-canteen-list">
          {sortedCanteens.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
              <div style={{ fontSize: "2.4rem", marginBottom: "8px" }}>🍽️</div>
              <p style={{ fontSize: "1.05rem", fontWeight: "700", color: "#17243A", margin: "0 0 6px 0" }}>
                Currently Sold Out at All Campus Canteens
              </p>
              <p style={{ fontSize: "0.84rem", margin: 0, color: "#64748b" }}>
                "{resolvedActiveItem?.name || "This item"}" is out of stock right now. Please select another item.
              </p>
            </div>
          ) : (
            sortedCanteens.map((canteen) => {
            const currentItemCanteen = activeItem?.canteen || selectedCanteen;
            const isCurrent =
              currentItemCanteen?.id === canteen.id ||
              currentItemCanteen?.name === canteen.name;

            const canteenOpenState = isCanteenOpenNow(canteen);
            const isClosed = !canteenOpenState.isOpen;
            const isSoldOut = !canteen.isAvailable;

            // Genuine price difference savings calculation
            const priceDiff = currentItemPrice - canteen.price;
            const hasSavings = isItemMode && !isCurrent && priceDiff > 0 && !isClosed && !isSoldOut;
            const cartQty = Number(activeItem?.quantity) || 1;
            const savingsText =
              cartQty > 1
                ? `Save ₹${priceDiff * cartQty} on ${cartQty} items`
                : `Save ₹${priceDiff} per item`;

            // Whole-cart savings if opened for cart without specific active item
            const currentCartTotal = cartItems.reduce((sum, ci) => sum + (Number(ci.price) * (Number(ci.quantity) || 1)), 0);
            const canteenCartTotal = cartItems.reduce((sum, ci) => {
              const cp = getItemPriceForCanteen(ci, canteen);
              return sum + (cp * (Number(ci.quantity) || 1));
            }, 0);
            const totalCartQty = cartItems.reduce((sum, ci) => sum + (Number(ci.quantity) || 1), 0);
            const cartSavings = currentCartTotal - canteenCartTotal;
            const hasWholeCartSavings = !isItemMode && !isCurrent && cartSavings > 0 && !isClosed;
            const cartSavingsText = totalCartQty > 1
              ? `Save ₹${cartSavings} on ${totalCartQty} items`
              : `Save ₹${cartSavings} on cart`;

            return (
              <div
                key={canteen.id}
                className={`choose-canteen-card ${
                  isCurrent ? "is-active-canteen" : ""
                } ${isClosed ? "is-closed-card" : ""} ${isSoldOut ? "is-item-sold-out is-closed-card" : ""}`}
              >
                {/* Active Canteen Badge */}
                {isCurrent && (
                  <div className="current-canteen-ribbon">
                    <CheckCircleIcon size={14} />
                    <span>{isItemMode ? "SELECTED FOR THIS ITEM" : "CURRENT PICKUP CANTEEN"}</span>
                  </div>
                )}

                <div className="choose-canteen-body">
                  {/* Left Avatar / Image */}
                  <div className="choose-canteen-thumb-wrap">
                    {isItemMode ? (
                      <img
                        src={displayItemImage}
                        alt={targetItem?.name || "Item"}
                        className="choose-canteen-thumb"
                        onError={() => setImgError(true)}
                      />
                    ) : (
                      <div
                        className="canteen-hub-avatar"
                        style={{
                          background: `linear-gradient(135deg, ${canteen.themeBg || "#ea580c"}22, ${canteen.themeBg || "#ea580c"}44)`,
                          borderColor: canteen.themeBg || "#ea580c"
                        }}
                      >
                        <span className="hub-emoji">{canteen.icon || "🏢"}</span>
                        <span
                          className="hub-tag"
                          style={{ color: canteen.themeBg || "#ea580c" }}
                        >
                          {canteen.tag}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="choose-canteen-info">
                    {/* Top Row: Canteen Name + Status/Closed Badge */}
                    <div className="canteen-name-row">
                      <h4 className="canteen-name">{canteen.name}</h4>
                      <div className="canteen-status-pills-wrap">
                        {isClosed ? (
                          <span className="canteen-closed-pill">
                            🔴 Closed • {canteenOpenState.nextOpenText || canteen.openingHours || "Closed"}
                          </span>
                        ) : isSoldOut ? (
                          <span className="canteen-closed-pill" style={{ background: "#fee2e2", color: "#dc2626", borderColor: "#fecaca" }}>
                            ✕ Sold Out
                          </span>
                        ) : (
                          <span
                            className={`canteen-rush-pill ${
                              canteen.rushStatus === "Less busy"
                                ? "rush-less"
                                : canteen.rushStatus === "Moderate"
                                ? "rush-moderate"
                                : "rush-busy"
                            }`}
                          >
                            {canteen.rushStatus}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Location & Directions */}
                    <div className="canteen-meta-location">
                      📍 <strong>{canteen.location}</strong> • {canteen.directions}
                    </div>

                    {/* Walking distance & Operating hours */}
                    <div className="canteen-meta-row-sub">
                      <span className="canteen-walking-pill">
                        {canteen.walkingText}
                      </span>
                      {canteen.openingHours && (
                        <span className="canteen-hours-sub">
                          ⏰ {canteen.openingHours}
                        </span>
                      )}
                    </div>

                    {/* Live Kitchen Preparation Details */}
                    {!isClosed && (
                      <div className="canteen-live-eta-box">
                        <div className="eta-badge-row">
                          <ClockIcon size={14} />
                          <strong>
                            Est. Ready in ~{canteen.waitMinutes} mins
                          </strong>
                          <span className="eta-ready-by">
                            (Approx. {canteen.readyByTime})
                          </span>
                        </div>
                        <div className="eta-breakdown-sub">
                          <span>{canteen.ordersAhead} orders ahead in queue</span>
                          <span>•</span>
                          <span>{canteen.counterDetails}</span>
                        </div>
                      </div>
                    )}

                    {/* Row: Price with strikethrough original & Savings */}
                    {isItemMode ? (
                      <div className="canteen-item-stats-row">
                        <div className="canteen-price-group">
                          {hasSavings && (
                            <span className="canteen-price-original">₹{currentItemPrice}</span>
                          )}
                          <div className="canteen-price-val">
                            ₹{canteen.price}
                          </div>
                          {hasSavings && (
                            <span className="canteen-saving-pill">
                              {savingsText}
                            </span>
                          )}
                        </div>
                        <div className="canteen-stock-row">
                          {isClosed ? (
                            <span className="stock-closed">Closed for ordering</span>
                          ) : canteen.isAvailable ? (
                            <span className="stock-green">
                              ✓ {canteen.stockCount} in stock
                            </span>
                          ) : (
                            <span className="stock-red">✕ Out of stock</span>
                          )}
                        </div>
                      </div>
                    ) : hasWholeCartSavings ? (
                      <div className="canteen-item-stats-row">
                        <div className="canteen-price-group">
                          <span className="canteen-saving-pill" title="Genuine savings for your cart items">
                            🏷️ {cartSavingsText}
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Footer Action Button */}
                <div className="choose-canteen-footer">
                  <button
                    type="button"
                    className={`btn-choose-this-canteen ${
                      isCurrent
                        ? "selected"
                        : isClosed || isSoldOut
                        ? "btn-canteen-closed"
                        : ""
                    }`}
                    onClick={() => {
                      if (!isCurrent && !isClosed && !isSoldOut) {
                        onSelectCanteen(canteen, activeItem, canteen.price);
                      }
                    }}
                    disabled={isCurrent || isClosed || isSoldOut}
                  >
                    {isCurrent
                      ? "✓ Currently Selected"
                      : isClosed
                      ? `✕ Closed (${canteenOpenState.nextOpenText || "Outside Hours"})`
                      : isSoldOut
                      ? "✕ Sold Out at this canteen"
                      : isItemMode
                      ? `Choose this canteen (₹${canteen.price})${hasSavings ? ` • ${savingsText}` : ""}`
                      : `Choose this canteen${hasWholeCartSavings ? ` • ${cartSavingsText}` : ""}`}
                  </button>
                </div>
              </div>
            );
          }))}

          {/* Bottom spacer so the last card & action button are 100% visible and accessible */}
          <div className="choose-canteen-bottom-spacer" />
        </div>
      </div>
    </div>
  );
}
