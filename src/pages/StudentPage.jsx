import { useState, useEffect, useMemo } from "react";
import MenuCard from "../components/MenuCard";
import StatusBadge from "../components/StatusBadge";
import UpiModal from "../components/UpiModal";
import OrderSuccessOverlay from "../components/OrderSuccessOverlay";
import ChooseCanteenModal from "../components/ChooseCanteenModal";
import { CAMPUS_CANTEENS, DEFAULT_CANTEEN, getCanteenItemPrice, isCanteenOpenNow } from "../data/canteens";
import {
  SearchIcon,
  FlameIcon,
  CartIcon,
  SparklesIcon,
  ClockIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  CashIcon,
  QrIcon,
  QueueIcon,
  ReceiptIcon,
  LocationPinIcon
} from "../components/Icons";

export default function StudentPage({
  setActiveTab,
  cart: externalCart,
  setCart: externalSetCart,
  studentProfile,
  onOpenProfile,
  onLogout
}) {
  const [menu, setMenu] = useState([]);
  const [internalCart, setInternalCart] = useState(() => {
    try {
      const saved = localStorage.getItem("canteenGo_studentCart");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const rawCart = externalCart !== undefined ? externalCart : internalCart;
  const cart = Array.isArray(rawCart) ? rawCart : [];
  const setCart = externalSetCart !== undefined ? externalSetCart : setInternalCart;
  const [studentName, setStudentName] = useState(() => studentProfile?.name || "");
  const [remarks, setRemarks] = useState(() => {
    try {
      return localStorage.getItem("canteenGo_orderRemarks") || "";
    } catch {}
    return "";
  });
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  useEffect(() => {
    try {
      if (remarks) {
        localStorage.setItem("canteenGo_orderRemarks", remarks);
      } else {
        localStorage.removeItem("canteenGo_orderRemarks");
      }
    } catch {}
  }, [remarks]);

  // Selected Canteen State (Defaults to "Food Court near 34 Block")
  const [selectedCanteen, setSelectedCanteen] = useState(() => {
    try {
      const saved = localStorage.getItem("canteenGo_selectedCanteen");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.name) return parsed;
      }
    } catch {}
    return DEFAULT_CANTEEN;
  });
  const currentCanteen = selectedCanteen?.name ? selectedCanteen : DEFAULT_CANTEEN;
  const currentCanteenStatus = isCanteenOpenNow(currentCanteen);

  // Check if any item in cart is from a currently closed canteen
  const cartClosedCanteens = useMemo(() => {
    const map = new Map();
    cart.forEach((item) => {
      const itemCanteen = item.canteen || currentCanteen;
      const status = isCanteenOpenNow(itemCanteen);
      if (!status.isOpen) {
        map.set(itemCanteen.name, { canteen: itemCanteen, status });
      }
    });
    return Array.from(map.values());
  }, [cart, currentCanteen]);

  const isCartCanteenClosed = !currentCanteenStatus.isOpen || cartClosedCanteens.length > 0;
  const [isCanteenModalOpen, setIsCanteenModalOpen] = useState(false);
  const [canteenModalItem, setCanteenModalItem] = useState(null);

  const handleSelectCanteen = (newCanteen, targetItem, computedPrice) => {
    setIsCanteenModalOpen(false);
    setCanteenModalItem(null);

    if (!newCanteen) return;

    // Per-item canteen selection: update or add specific item with chosen canteen & dynamic price
    if (targetItem && (targetItem.menuItemId || targetItem._id)) {
      const targetId = targetItem.menuItemId || targetItem._id;
      const base = targetItem.basePrice || targetItem.price;
      const finalPrice =
        typeof computedPrice === "number"
          ? computedPrice
          : getCanteenItemPrice(base, newCanteen);

      setCart((prevCart) => {
        const existingIndex = prevCart.findIndex(
          (ci) => ci.menuItemId === targetId
        );

        if (existingIndex > -1) {
          const updated = [...prevCart];
          updated[existingIndex] = {
            ...updated[existingIndex],
            canteen: newCanteen,
            price: finalPrice,
            basePrice: base
          };
          return updated;
        } else {
          return [
            ...prevCart,
            {
              menuItemId: targetId,
              name: targetItem.name,
              basePrice: base,
              price: finalPrice,
              quantity: 1,
              image: targetItem.image || "/images/samosa.jpg",
              canteen: newCanteen
            }
          ];
        }
      });

      setSuccessMessage(`📍 Changed ${targetItem.name} to ${newCanteen.name} (₹${finalPrice})`);
      setTimeout(() => setSuccessMessage(""), 3500);
      return;
    }

    // Default global canteen switch (e.g. from top header)
    setSelectedCanteen(newCanteen);
    try {
      localStorage.setItem("canteenGo_selectedCanteen", JSON.stringify(newCanteen));
    } catch {}
    setSuccessMessage(`📍 Pickup canteen set to ${newCanteen.name}`);
    setTimeout(() => setSuccessMessage(""), 3500);
  };

  useEffect(() => {
    if (studentProfile?.name) {
      setStudentName(studentProfile.name);
    }
  }, [studentProfile]);

  const [loadingMenu, setLoadingMenu] = useState(true);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [lastPlacedOrder, setLastPlacedOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [isUpiModalOpen, setIsUpiModalOpen] = useState(false);

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      setLoadingMenu(true);
      const res = await fetch("/api/menu");
      if (!res.ok) throw new Error("Could not load canteen menu");
      const data = await res.json();
      setMenu(data);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoadingMenu(false);
    }
  };

  // Add Item to Cart
  const handleAddToCart = (item) => {
    setErrorMessage("");
    setSuccessMessage("");

    const itemCanteen = selectedCanteen?.name ? selectedCanteen : DEFAULT_CANTEEN;
    const basePrice = item.price;
    const finalPrice = getCanteenItemPrice(basePrice, itemCanteen);

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (ci) => ci.menuItemId === item._id
      );

      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex].quantity += 1;
        return updated;
      } else {
        return [
          ...prevCart,
          {
            menuItemId: item._id,
            name: item.name,
            basePrice: basePrice,
            price: finalPrice,
            quantity: 1,
            image: item.image || "/images/samosa.jpg",
            canteen: itemCanteen
          }
        ];
      }
    });
  };

  // Increase quantity from card or cart
  const handleIncreaseQuantity = (menuItemId) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.menuItemId === menuItemId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  // Decrease quantity from card or cart
  const handleDecreaseQuantity = (menuItemId) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.menuItemId === menuItemId) {
            return { ...item, quantity: item.quantity - 1 };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveFromCart = (menuItemId) => {
    setCart((prevCart) => prevCart.filter((item) => item.menuItemId !== menuItemId));
  };

  // 1-Click Dynamic Fast-Break Combo: adds multiple real DB items
  const handleAddDynamicCombo = (itemsToAdd) => {
    setErrorMessage("");
    setSuccessMessage("");

    const itemCanteen = selectedCanteen?.name ? selectedCanteen : DEFAULT_CANTEEN;

    setCart((prevCart) => {
      let updatedCart = [...prevCart];
      itemsToAdd.forEach(({ item, qty }) => {
        const existingIndex = updatedCart.findIndex((ci) => ci.menuItemId === item._id);
        const basePrice = item.price;
        const finalPrice = getCanteenItemPrice(basePrice, itemCanteen);

        if (existingIndex > -1) {
          updatedCart[existingIndex].quantity += qty;
        } else {
          updatedCart.push({
            menuItemId: item._id,
            name: item.name,
            basePrice: basePrice,
            price: finalPrice,
            quantity: qty,
            image: item.image || "/images/samosa.jpg",
            canteen: itemCanteen
          });
        }
      });
      return updatedCart;
    });

    setSuccessMessage("⚡ Fast Combo added to cart!");
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const submitOrderToServer = async (paidOnline = false) => {
    try {
      setIsUpiModalOpen(false);
      setIsOverlayOpen(true);
      setSubmittingOrder(true);

      const distinctCanteens = Array.from(
        new Set(
          cart.map(
            (i) => i.canteen?.name || selectedCanteen?.name || "Food Court near 34 Block"
          )
        )
      );
      const canteenSummary = distinctCanteens.join(", ");
      const counterSummary = Array.from(
        new Set(
          cart.map(
            (i) => i.canteen?.counter || selectedCanteen?.counter || "Counter 1"
          )
        )
      ).join(", ");

      const orderPayload = {
        studentName: studentName.trim() || studentProfile?.name || "Student",
        studentEmail: studentProfile?.email || "",
        studentPhone: studentProfile?.phone || "",
        paymentMethod,
        remarks: remarks.trim(),
        canteenId: selectedCanteen?.id || cart[0]?.canteen?.id || "foodcourt-34",
        canteenName: canteenSummary || selectedCanteen?.name || "Food Court near 34 Block",
        counterName: counterSummary || selectedCanteen?.counter || "Counter 1 (Fast Dispatch)",
        items: cart.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: item.price,
          canteenId: item.canteen?.id || selectedCanteen?.id || "foodcourt-34",
          canteenName: item.canteen?.name || selectedCanteen?.name || "Food Court near 34 Block",
          counterName: item.canteen?.counter || selectedCanteen?.counter || "Counter 1"
        }))
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to place order");
      }

      if (paidOnline) {
        await fetch(`/api/orders/${data._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentStatus: "Paid" })
        });
        data.paymentStatus = "Paid";
      }

      // Smooth transition to token card
      setTimeout(() => {
        setLastPlacedOrder(data);
        setSubmittingOrder(false);
        setSuccessMessage(`Order Placed! Your Pickup Token is ${data.tokenNumber}`);
        setCart([]);
        setRemarks("");
        try {
          localStorage.removeItem("canteenGo_studentCart");
          localStorage.removeItem("canteenGo_orderRemarks");
        } catch {}
        try {
          localStorage.setItem("canteenGo_lastToken", data.tokenNumber);
          const myIds = JSON.parse(localStorage.getItem("canteenGo_myOrderIds") || "[]");
          if (!myIds.includes(data._id)) {
            myIds.unshift(data._id);
            localStorage.setItem("canteenGo_myOrderIds", JSON.stringify(myIds));
          }
        } catch {
          // localStorage fallback
        }
      }, 1000);
    } catch (err) {
      setErrorMessage(err.message);
      setIsOverlayOpen(false);
      setSubmittingOrder(false);
    }
  };

  const handlePlaceOrderClick = (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const activeName = studentName.trim() || studentProfile?.name?.trim();
    if (!activeName) {
      if (onOpenProfile) onOpenProfile();
      setErrorMessage("Please enter your name or student profile to place an order.");
      return;
    }

    if (cart.length === 0) {
      setErrorMessage("Your cart is empty. Please add items from the menu.");
      return;
    }

    if (isCartCanteenClosed) {
      const closedNames = cartClosedCanteens.length > 0
        ? cartClosedCanteens.map((c) => c.canteen.name).join(", ")
        : currentCanteen.name;
      setErrorMessage(`Cannot place order: ${closedNames} is currently closed. Please change your pickup canteen.`);
      return;
    }

    if (paymentMethod === "UPI") {
      setIsUpiModalOpen(true);
    } else {
      submitOrderToServer(false);
    }
  };

  // DYNAMIC CATEGORIES: Extracted directly from menu items in MongoDB
  const dynamicCategories = [
    "All",
    ...new Set(menu.map((i) => i.category || "Snacks").filter(Boolean))
  ];

  // Dynamic filter by canteen, category & search query
  const filteredMenu = menu.filter((item) => {
    // Multi-canteen availability check
    const currentCanteenId = selectedCanteen?.id || "foodcourt-34";
    const itemAvailableCanteens = Array.isArray(item.availableCanteens) && item.availableCanteens.length > 0
      ? item.availableCanteens
      : (item.canteenId ? [item.canteenId] : ["all"]);

    const matchesCanteen =
      !currentCanteenId ||
      item.canteenId === "all" ||
      item.canteenId === currentCanteenId ||
      itemAvailableCanteens.includes("all") ||
      itemAvailableCanteens.includes(currentCanteenId);

    if (!matchesCanteen) return false;

    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === "All" || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // DYNAMIC COMBOS: Computed dynamically from real available database items with strict separation
  const isBeverage = (i) =>
    i.category?.toLowerCase().includes("beverage") ||
    i.name.toLowerCase().includes("chai") ||
    i.name.toLowerCase().includes("coffee") ||
    i.name.toLowerCase().includes("tea") ||
    i.name.toLowerCase().includes("shake");

  // Drinks are strictly beverages
  const drinksList = menu.filter((i) => i.available && isBeverage(i));
  // Snacks are strictly solid food items (never beverage)
  const snacksList = menu.filter((i) => i.available && !isBeverage(i));

  // Combo 1: Primary snack + primary drink (guaranteed 2 distinct items)
  const comboPair1 =
    snacksList.length > 0 && drinksList.length > 0
      ? [
          { item: snacksList[0], qty: 2 },
          { item: drinksList[0], qty: 1 }
        ]
      : null;

  // Combo 2: Secondary snack + secondary drink (strictly distinct items)
  const snack2 = snacksList[1] || snacksList[0];
  const drink2 = drinksList[1] || drinksList[0];
  const comboPair2 =
    snack2 && drink2 && snack2._id !== drink2._id
      ? [
          { item: snack2, qty: 1 },
          { item: drink2, qty: 1 }
        ]
      : null;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-text">
          <span className="section-pill">
            <FlameIcon size={14} /> Contactless Canteen Hub
          </span>
          <h2 className="page-title">
            Student Canteen Ordering
          </h2>
          <p className="page-description">
            Pre-order your recess snacks, skip the crowded counter, and collect your hot food with your live digital token.
          </p>
        </div>
      </div>



      {/* Alerts */}
      {errorMessage && <div className="alert alert-error">{errorMessage}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}

      {/* Animated Order Success Modal */}
      <OrderSuccessOverlay
        isOpen={isOverlayOpen}
        isSubmitting={submittingOrder}
        order={lastPlacedOrder}
        onClose={() => setIsOverlayOpen(false)}
        onGoToYourOrders={() => setActiveTab && setActiveTab("my-orders")}
      />

      {/* Active Token Bar with Go to Your Orders button */}
      {lastPlacedOrder && (
        <div className="active-token-floating-bar">
          <div className="active-bar-left">
            <span className="active-pill">ACTIVE TOKEN</span>
            <strong className="active-num">{lastPlacedOrder.tokenNumber}</strong>
            <span className="active-desc">• Placed for {lastPlacedOrder.studentName}</span>
          </div>
          <div className="active-bar-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setActiveTab && setActiveTab("my-orders")}
            >
              <ReceiptIcon size={14} />
              <span>View in Your Orders →</span>
            </button>
          </div>
        </div>
      )}

      {/* UPI QR Payment Modal */}
      <UpiModal
        isOpen={isUpiModalOpen}
        onClose={() => setIsUpiModalOpen(false)}
        amount={cartTotal}
        onPaymentSuccess={() => submitOrderToServer(true)}
      />

      {/* DYNAMIC QUICK-BREAK COMBOS (Constructed from active DB items) */}
      {(comboPair1 || comboPair2) && (
        <section className="combos-section">
          <div className="combos-header">
            <div className="combos-title-wrap">
              <SparklesIcon size={20} className="combos-sparkle" />
              <h3 className="combos-title">Student Fast-Break Combos</h3>
            </div>
            <span className="combos-badge">1-CLICK INSTANT PAIRINGS</span>
          </div>

          <div className="combos-grid">
            {comboPair1 && (
              <div className="combo-card-modern">
                <div className="combo-images-overlap">
                  <img src={comboPair1[0].item.image || "/images/samosa.jpg"} alt={comboPair1[0].item.name} className="combo-img img-back" />
                  <img src={comboPair1[1].item.image || "/images/chai.jpg"} alt={comboPair1[1].item.name} className="combo-img img-front" />
                </div>
                <div className="combo-info">
                  <h4 className="combo-name">Recess Classic Pairing</h4>
                  <p className="combo-desc">
                    {comboPair1[0].item._id === comboPair1[1].item._id
                      ? `${comboPair1[0].qty + comboPair1[1].qty}× ${comboPair1[0].item.name}`
                      : `${comboPair1[0].qty}× ${comboPair1[0].item.name} + ${comboPair1[1].qty}× ${comboPair1[1].item.name}`}
                  </p>
                  <div className="combo-price-tag">
                    ₹{comboPair1[0].item.price * comboPair1[0].qty + comboPair1[1].item.price * comboPair1[1].qty}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm btn-add-combo"
                  onClick={() => handleAddDynamicCombo(comboPair1)}
                >
                  <PlusIcon size={14} /> Add Combo
                </button>
              </div>
            )}

            {comboPair2 && (
              <div className="combo-card-modern">
                <div className="combo-images-overlap">
                  <img src={comboPair2[0].item.image || "/images/patty.jpg"} alt={comboPair2[0].item.name} className="combo-img img-back" />
                  <img src={comboPair2[1].item.image || "/images/coffee.jpg"} alt={comboPair2[1].item.name} className="combo-img img-front" />
                </div>
                <div className="combo-info">
                  <h4 className="combo-name">Study Fuel Express</h4>
                  <p className="combo-desc">
                    {comboPair2[0].item._id === comboPair2[1].item._id
                      ? `${comboPair2[0].qty + comboPair2[1].qty}× ${comboPair2[0].item.name}`
                      : `${comboPair2[0].qty}× ${comboPair2[0].item.name} + ${comboPair2[1].qty}× ${comboPair2[1].item.name}`}
                  </p>
                  <div className="combo-price-tag">
                    ₹{comboPair2[0].item.price * comboPair2[0].qty + comboPair2[1].item.price * comboPair2[1].qty}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm btn-add-combo"
                  onClick={() => handleAddDynamicCombo(comboPair2)}
                >
                  <PlusIcon size={14} /> Add Combo
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Main Grid: Menu on Left, Cart on Right */}
      <div className="grid-2">
        {/* Left Column: Menu Items */}
        <div>
          <div className="card">
            {/* Search and Category Filter Toolbar */}
            <div className="menu-toolbar">
              <div className="search-input-wrap">
                <SearchIcon size={18} className="search-icon" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search snacks, beverages, rolls..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    className="clear-search-btn"
                    onClick={() => setSearchQuery("")}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Dynamic Filter Chips extracted from Database */}
              <div className="category-scroll-chips">
                {dynamicCategories.map((cat) => (
                  <button
                    key={cat}
                    className={`cat-chip ${selectedCategory === cat ? "active" : ""}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu List State */}
            {loadingMenu ? (
              <div className="menu-loading-state">
                <div className="loading-spinner"></div>
                <p>Loading fresh canteen items from MongoDB...</p>
              </div>
            ) : filteredMenu.length === 0 ? (
              <div className="empty-menu-state">
                <p>No food items found matching "{searchQuery}".</p>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: "10px" }}
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("All");
                  }}
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="menu-grid">
                {filteredMenu.map((item) => {
                  const cartItem = cart.find((ci) => ci.menuItemId === item._id);
                  const quantityInCart = cartItem ? cartItem.quantity : 0;

                  return (
                    <MenuCard
                      key={item._id}
                      item={item}
                      cartQuantity={quantityInCart}
                      onAddToCart={handleAddToCart}
                      onIncrease={handleIncreaseQuantity}
                      onDecrease={handleDecreaseQuantity}
                      onOpenCanteenModal={(clickedItem) => {
                        setCanteenModalItem(clickedItem);
                        setIsCanteenModalOpen(true);
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Cart & Checkout Form */}
        <div>
          <div className="card sticky-cart-card">
            <div className="card-header">
              <div className="cart-header-title">
                <CartIcon size={20} />
                <h3>Your Cart ({totalCartCount})</h3>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  className="btn-clear-cart"
                  onClick={() => setCart([])}
                >
                  <TrashIcon size={14} /> Clear
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="empty-cart-view">
                <div className="empty-cart-icon-wrap">
                  <CartIcon size={40} />
                </div>
                <h4>Your cart is empty</h4>
                <p>Select delicious hot snacks or combos from the menu to get started.</p>
              </div>
            ) : (
              <div>
                <ul className="cart-list">
                  {cart.map((item) => (
                    <li key={item.menuItemId} className="cart-item">
                      <img
                        src={item.image || "/images/samosa.jpg"}
                        alt={item.name}
                        className="cart-item-thumb"
                        onError={(e) => {
                          e.target.src = "/images/samosa.jpg";
                        }}
                      />
                      <div className="cart-item-details">
                        <span className="cart-item-title">{item.name}</span>
                        <button
                          type="button"
                          className="cart-item-canteen-link"
                          onClick={() => {
                            setCanteenModalItem({
                              menuItemId: item.menuItemId,
                              name: item.name,
                              basePrice: item.basePrice || item.price,
                              price: item.price,
                              image: item.image,
                              quantity: item.quantity,
                              canteen: item.canteen || currentCanteen,
                              isFromCart: true
                            });
                            setIsCanteenModalOpen(true);
                          }}
                          title="Click to change canteen for this item"
                        >
                          <span>{item.canteen?.name || currentCanteen.name}</span>
                          {!isCanteenOpenNow(item.canteen || currentCanteen).isOpen && (
                            <span className="cart-item-closed-badge">🔴 Closed</span>
                          )}
                        </button>
                        <span className="cart-item-pricing">
                          ₹{item.price} × {item.quantity} = <strong>₹{item.price * item.quantity}</strong>
                        </span>
                      </div>

                      <div className="cart-item-stepper">
                        <button
                          type="button"
                          className="stepper-btn"
                          onClick={() => handleDecreaseQuantity(item.menuItemId)}
                        >
                          <MinusIcon size={12} />
                        </button>
                        <span className="stepper-value">{item.quantity}</span>
                        <button
                          type="button"
                          className="stepper-btn"
                          onClick={() => handleIncreaseQuantity(item.menuItemId)}
                        >
                          <PlusIcon size={12} />
                        </button>
                      </div>

                      <button
                        type="button"
                        className="btn-remove-item"
                        onClick={() => handleRemoveFromCart(item.menuItemId)}
                        title="Remove"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>

                {/* Subtotal Box */}
                <div className="cart-total-box">
                  <div className="total-row">
                    <span>Subtotal</span>
                    <span>₹{cartTotal}</span>
                  </div>
                  <div className="total-row total-highlight">
                    <span>Total Amount</span>
                    <span className="total-price">₹{cartTotal}</span>
                  </div>
                </div>

                {/* Checkout Form */}
                <form onSubmit={handlePlaceOrderClick} className="checkout-form">
                  {/* Selected Canteen in Cart */}
                  <div className="cart-canteen-info-pill">
                    <div className="cart-canteen-left">
                      <div className="cart-canteen-pin-badge" title="Pickup Location Hub">
                        <LocationPinIcon size={22} className="cart-canteen-pin-svg" />
                      </div>
                      <div className="cart-canteen-content">
                        {(() => {
                          const distinctCanteens = Array.from(
                            new Map(
                              cart.map((ci) => {
                                const c = ci.canteen || currentCanteen;
                                return [c.id || c.name, c];
                              })
                            ).values()
                          );
                          const isMultiCanteen = distinctCanteens.length > 1;

                          return (
                            <>
                              <div className="cart-canteen-header-tag">
                                <span className="cart-canteen-label">
                                  {isMultiCanteen
                                    ? `PICKUP CANTEENS (${distinctCanteens.length})`
                                    : "PICKUP CANTEEN"}
                                </span>
                                <span className={`cart-canteen-status-dot ${isCartCanteenClosed ? "is-closed" : ""}`}>
                                  {!isCartCanteenClosed ? (
                                    <>
                                      <span className="pulse-dot"></span> Active
                                    </>
                                  ) : (
                                    <>
                                      <span className="closed-dot"></span> Closed ({currentCanteenStatus.nextOpenText || currentCanteen.openingHours || "Unavailable"})
                                    </>
                                  )}
                                </span>
                              </div>

                              {isMultiCanteen ? (
                                <div className="multi-canteen-tags-wrap">
                                  {distinctCanteens.map((c) => (
                                    <span key={c.id || c.name} className="canteen-mini-chip">
                                      📍 {c.shortName || c.name}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <strong className="cart-canteen-name">
                                  {currentCanteen.name}
                                </strong>
                              )}

                              <div className="cart-canteen-counter">
                                {isMultiCanteen ? (
                                  <span>Collect items at each respective counter</span>
                                ) : (
                                  <>
                                    <span>{currentCanteen.counter}</span>
                                    {currentCanteen.walkingMinutes && (
                                      <span className="canteen-walk-badge">
                                        🚶 {currentCanteen.walkingMinutes} min walk
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-change-canteen-pill"
                      onClick={() => {
                        if (cart.length > 0) {
                          const firstCartItem = cart[0];
                          const fullItem = menu.find((m) => m._id === firstCartItem.menuItemId);
                          setCanteenModalItem({
                            menuItemId: firstCartItem.menuItemId,
                            name: firstCartItem.name,
                            basePrice: firstCartItem.basePrice || firstCartItem.price,
                            price: firstCartItem.price,
                            image: firstCartItem.image || fullItem?.image || "",
                            quantity: firstCartItem.quantity,
                            canteen: firstCartItem.canteen || currentCanteen,
                            isFromCart: true
                          });
                        } else {
                          setCanteenModalItem(null);
                        }
                        setIsCanteenModalOpen(true);
                      }}
                      title="Click to change pickup canteen"
                    >
                      Change
                    </button>
                  </div>
                  {!studentProfile?.phone && (
                    <div className="form-group">
                      <label className="form-label" htmlFor="studentNameInput">
                        Student Name (For Token Call):
                      </label>
                      <input
                        id="studentNameInput"
                        type="text"
                        className="form-input"
                        placeholder="e.g. Ankit Verma"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Special Remarks / Instructions with Placeholder */}
                  <div className="form-group cart-remarks-group">
                    <label className="form-label" htmlFor="orderRemarksInput" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>📝 Cooking Remarks / Note:</span>
                      <span style={{ fontSize: "0.75rem", fontWeight: "normal", color: "#94a3b8" }}>Optional</span>
                    </label>
                    <input
                      id="orderRemarksInput"
                      type="text"
                      className="form-input cart-remarks-input"
                      placeholder="e.g. Extra spicy, bina pyaz, less sugar, pack separately..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      maxLength={140}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Select Payment Option:</label>
                    <div className="payment-options-grid">
                      <div
                        className={`payment-option-card ${paymentMethod === "Cash" ? "selected" : ""}`}
                        onClick={() => setPaymentMethod("Cash")}
                      >
                        <CashIcon size={24} className="pay-icon" />
                        <div>
                          <div className="pay-title">Cash Counter</div>
                          <div className="pay-sub">Pay at pickup</div>
                        </div>
                      </div>

                      <div
                        className={`payment-option-card ${paymentMethod === "UPI" ? "selected" : ""}`}
                        onClick={() => setPaymentMethod("UPI")}
                      >
                        <QrIcon size={24} className="pay-icon" />
                        <div>
                          <div className="pay-title">UPI QR Code</div>
                          <div className="pay-sub">Fast Scan & Pay</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isCartCanteenClosed && (
                    <div className="cart-canteen-closed-banner">
                      <div className="closed-banner-left">
                        <span className="closed-alert-icon">⚠️</span>
                        <div>
                          <strong className="closed-banner-title">
                            {cartClosedCanteens.length > 0
                              ? `${cartClosedCanteens.map((c) => c.canteen.name).join(", ")} is Closed`
                              : `${currentCanteen.name} is Closed`}
                          </strong>
                          <p className="closed-banner-desc">
                            {cartClosedCanteens.length > 0
                              ? cartClosedCanteens.map((c) => `${c.canteen.name}: ${c.status.nextOpenText || c.canteen.openingHours}`).join(" • ")
                              : `${currentCanteenStatus.nextOpenText || currentCanteen.openingHours || "Closed for ordering"}`}
                            . You cannot place orders while closed.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-switch-to-open"
                        onClick={() => {
                          if (cart.length > 0) {
                            const firstCartItem = cart[0];
                            const fullItem = menu.find((m) => m._id === firstCartItem.menuItemId);
                            setCanteenModalItem({
                              menuItemId: firstCartItem.menuItemId,
                              name: firstCartItem.name,
                              basePrice: firstCartItem.basePrice || firstCartItem.price,
                              price: firstCartItem.price,
                              image: firstCartItem.image || fullItem?.image || "",
                              quantity: firstCartItem.quantity,
                              canteen: firstCartItem.canteen || currentCanteen,
                              isFromCart: true
                            });
                          }
                          setIsCanteenModalOpen(true);
                        }}
                      >
                        Switch Canteen →
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    className={`btn btn-primary btn-checkout ${isCartCanteenClosed ? "btn-checkout-disabled-closed" : ""}`}
                    disabled={submittingOrder || isCartCanteenClosed}
                    title={isCartCanteenClosed ? "Canteen is currently closed" : "Confirm & Place Order"}
                  >
                    {isCartCanteenClosed ? (
                      <span>✕ Canteen Closed ({currentCanteenStatus.nextOpenText || "Outside Hours"})</span>
                    ) : (
                      <>
                        <span>Confirm & Place Order (₹{cartTotal})</span>
                        <span className="btn-arrow">→</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Choose Canteen Modal (Light Orange-White Theme & Dynamic Sorting) */}
      <ChooseCanteenModal
        isOpen={isCanteenModalOpen}
        onClose={() => {
          setIsCanteenModalOpen(false);
          setCanteenModalItem(null);
        }}
        selectedCanteen={selectedCanteen}
        onSelectCanteen={handleSelectCanteen}
        targetItem={canteenModalItem}
        cartItems={cart}
      />
    </div>
  );
}
