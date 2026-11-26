"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import TimeSlotPicker from "./TimeSlotPicker";
import {
  CartIcon,
  ClockIcon,
  CheckCircleIcon,
  UserIcon,
  PhoneIcon,
  EditIcon,
  QrIcon,
  CashIcon,
  LocationPinIcon,
  ArrowRightIcon,
  TicketIcon
} from "./Icons";
import { getItemEstimateTime } from "../data/canteens";

export default function DesktopCheckoutModal({
  isOpen,
  onClose,
  cart = [],
  cartTotal = 0,
  studentName = "",
  setStudentName,
  studentPhone = "",
  setStudentPhone,
  studentProfile,
  remarks = "",
  setRemarks,
  paymentMethod = "UPI",
  setPaymentMethod,
  selectedCanteen,
  currentCanteen,
  liveStatsMap = {},
  onPlaceOrder,
  onViewInOrders,
  onTrackInQueue
}) {
  // Step navigation:
  // 1: Confirm Items (Non-editable review)
  // 2: Student Details & Mobile Number (with edit option) & Payment Mode
  // 3: Payment (UPI QR or Cash Confirmation)
  // "ordering": 4-second animated real ordering progress
  // "placed": Digital token placed card
  const [step, setStep] = useState(1);
  const [localName, setLocalName] = useState(() => (studentName || studentProfile?.name || "").trim());
  const [localPhone, setLocalPhone] = useState(() => (studentPhone || studentProfile?.phone || "").trim());
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [selectedPickupSlot, setSelectedPickupSlot] = useState("");
  const [slotError, setSlotError] = useState("");

  // UPI payment state
  const [upiSecondsRemaining, setUpiSecondsRemaining] = useState(299);
  const [upiPaymentState, setUpiPaymentState] = useState("idle"); // "idle" | "processing" | "success"
  const [copiedVpa, setCopiedVpa] = useState(false);

  // Ordering 4-second animation state
  const [loadingStep, setLoadingStep] = useState(0);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [canteenNotes, setCanteenNotes] = useState({});
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancellingStage, setCancellingStage] = useState(0);
  const isCodBlocked =
    studentProfile?.codStatus === "temporarily_blocked" ||
    studentProfile?.codStatus === "prepaid_only" ||
    (studentProfile?.noShowCount !== undefined && studentProfile?.noShowCount >= 3);

  const canteenGroups = useMemo(() => {
    const map = {};
    for (const item of cart) {
      const c =
        item.canteen?.id && item.canteen?.id !== "all"
          ? item.canteen
          : selectedCanteen?.id !== "all"
          ? selectedCanteen
          : currentCanteen || {
              id: "foodcourt-34",
              name: "Sports Complex Canteen",
              shortName: "Sports Complex Canteen",
              counter: "Counter 1"
            };
      const cId = c.id || c.canteenId || "foodcourt-34";
      if (!map[cId]) {
        map[cId] = {
          canteenId: cId,
          canteen: c,
          name: c.shortName || c.name || "Canteen",
          counter: c.counter || "Counter 1",
          items: []
        };
      }
      map[cId].items.push(item);
    }
    return Object.values(map);
  }, [cart, selectedCanteen, currentCanteen]);

  // Reset or initialize when opened
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setLocalName((studentName || studentProfile?.name || "").trim());
      const p = (studentPhone || studentProfile?.phone || "").trim();
      setLocalPhone(p);
      setIsEditingPhone(!p); // If no phone is present, open in edit mode automatically
      setNameError("");
      setPhoneError("");
      setSelectedPickupSlot("");
      setSlotError("");
      setUpiSecondsRemaining(299);
      setUpiPaymentState("idle");
      setPlacedOrder(null);
      setLoadingStep(0);
      setShowCancelConfirm(false);
      setCancellingStage(0);
    }
  }, [isOpen]);

  // Keep synced with parent state if it updates
  useEffect(() => {
    if (studentName) setLocalName(studentName);
  }, [studentName]);

  useEffect(() => {
    if (studentPhone) setLocalPhone(studentPhone);
  }, [studentPhone]);

  // 5-min timer for UPI in Step 3
  useEffect(() => {
    if (!isOpen || step !== 3 || paymentMethod !== "UPI") return;
    const timer = setInterval(() => {
      setUpiSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, step, paymentMethod]);

  // Escape key to close unless ordering or cancelling
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && step !== "ordering" && step !== "cancelling") {
        handleCloseModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, step, showCancelConfirm]);

  const [isClosing, setIsClosing] = useState(false);

  const performCloseModal = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setShowCancelConfirm(false);
      setCancellingStage(0);
      onClose();
    }, 220);
  };

  const handleCloseModal = () => {
    if (step === "ordering" || step === "cancelling" || isClosing) return;
    if (step === 2 || step === 3) {
      setShowCancelConfirm(true);
      return;
    }
    performCloseModal();
  };

  const handleConfirmCancelOrder = () => {
    setShowCancelConfirm(false);
    setCancellingStage(0);
    setStep("cancelling");
    setTimeout(() => {
      setCancellingStage(1);
    }, 750);
    setTimeout(() => {
      performCloseModal();
    }, 1450);
  };

  if (!isOpen) return null;

  const activeCanteenName =
    selectedCanteen?.name || currentCanteen?.name || "Sports Complex Canteen";
  const activeCanteenCounter =
    selectedCanteen?.counter || currentCanteen?.counter || "Counter 1";

  const totalItemsCount = cart.reduce((sum, it) => sum + (it.quantity || 1), 0);

  const formatTimer = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleCopyVpa = () => {
    try {
      navigator.clipboard.writeText("canteengo@okaxis");
      setCopiedVpa(true);
      setTimeout(() => setCopiedVpa(false), 2000);
    } catch {}
  };

  // Step 1 -> Step 2
  const handleProceedToStep2 = () => {
    if (cart.length === 0) return;
    setStep(2);
  };

  // Step 2 -> Step 3
  const handleProceedToStep3 = () => {
    const trimmedName = (localName || "").trim();
    if (!trimmedName) {
      setNameError("Please enter your name for token callout.");
      return;
    }
    setNameError("");

    // Validate phone number (optional or 10 digits)
    const cleanPhone = (localPhone || "").replace(/\D/g, "");
    if (cleanPhone && cleanPhone.length !== 10) {
      setPhoneError("Please enter a valid 10-digit mobile number (e.g. 9876543210).");
      return;
    }
    setPhoneError("");

    setSlotError("");

    if (setStudentName) setStudentName(trimmedName);
    if (setStudentPhone) setStudentPhone(cleanPhone);
    try {
      if (cleanPhone) localStorage.setItem("canteenGo_studentPhone", cleanPhone);
    } catch {}

    setStep(3);
  };

  // Real ordering stages across 4 seconds (1 second each)
  const ORDERING_STAGES = [
    {
      icon: "📡",
      title: `Sending Order to ${activeCanteenName}...`,
      subtitle: "Connecting directly with live kitchen terminal",
      progress: "33%"
    },
    {
      icon: "🕒",
      title: `Scheduling Pickup (${selectedPickupSlot || "Time Slot"})...`,
      subtitle: "Registering your requested collection window",
      progress: "66%"
    },
    {
      icon: "📋",
      title: "Order Sent for Vendor Approval!",
      subtitle: "Awaiting canteen confirmation • Token will issue on acceptance",
      progress: "100%"
    }
  ];

  // Execute Order with 4-second animation
  const handleExecuteOrder = async (isPaidOnline = false) => {
    setStep("ordering");
    setLoadingStep(0);

    const animStartTime = Date.now();
    const t1 = setTimeout(() => setLoadingStep(1), 1000);
    const t2 = setTimeout(() => setLoadingStep(2), 2000);
    const t3 = setTimeout(() => setLoadingStep(3), 3000);

    try {
      const trimmedName = (localName || studentName || studentProfile?.name || "Student").trim();
      const cleanPhone = (localPhone || studentPhone || studentProfile?.phone || "").replace(/\D/g, "");

      let orderRes = null;
      if (onPlaceOrder) {
        orderRes = await onPlaceOrder(isPaidOnline, {
          studentName: trimmedName,
          studentPhone: cleanPhone,
          remarks: (remarks || "").trim(),
          canteenNotes: canteenNotes,
          paymentMethod: isPaidOnline ? "UPI" : paymentMethod,
          pickupSlot: (selectedPickupSlot?.trim() || "Immediate Pickup")
        });
      }

      const elapsed = Date.now() - animStartTime;
      const remainingTime = Math.max(0, 4000 - elapsed);

      setTimeout(() => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        setPlacedOrder(
          orderRes || {
            _id: "order-" + Date.now(),
            tokenNumber: null,
            orderStatus: "Pending Approval",
            vendorApprovalStatus: "Pending",
            pickupSlot: (selectedPickupSlot?.trim() || "Immediate Pickup"),
            studentName: trimmedName,
            studentPhone: cleanPhone,
            paymentMethod: isPaidOnline ? "UPI" : paymentMethod,
            canteenName: activeCanteenName,
            counterName: activeCanteenCounter,
            items: cart,
            totalAmount: cartTotal
          }
        );
        setStep("placed");
      }, remainingTime);
    } catch (err) {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      alert(err.message || "Failed to place order. Please try again.");
      setStep(paymentMethod === "UPI" ? 3 : 2);
    }
  };

  const handleSimulateUpi = () => {
    setUpiPaymentState("processing");
    setTimeout(() => {
      setUpiPaymentState("success");
      setTimeout(() => {
        handleExecuteOrder(true);
      }, 500);
    }, 1100);
  };

  return (
    <div
      className={`desktop-checkout-backdrop ${isClosing ? "closing" : ""}`}
      onClick={step === "ordering" || step === "cancelling" ? undefined : handleCloseModal}
      role="dialog"
      aria-modal="true"
      aria-label="Desktop Checkout Overlay"
    >
      <div
        className={`desktop-checkout-card ${isClosing ? "closing" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="desktop-checkout-header">
          <div className="desktop-checkout-brand">
            <span className="brand-dot"></span>
            <strong>canteen<span>Go</span> Express Checkout</strong>
          </div>
          {step !== "ordering" && step !== "cancelling" && (
            <button
              type="button"
              className="desktop-checkout-close-btn"
              onClick={handleCloseModal}
              title={step === 2 || step === 3 ? "Cancel order" : "Close checkout"}
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </div>

        {/* 3-Step Progress Indicator (Visible in Steps 1, 2, 3) */}
        {(step === 1 || step === 2 || step === 3) && cart.length > 0 && (
          <div className="desktop-step-tracker">
            <div className={`desktop-step-node ${step === 1 ? "active" : "completed"}`}>
              <div className="desktop-step-badge">1</div>
              <span className="desktop-step-label">Confirm Items</span>
            </div>
            <div className={`desktop-step-line ${step >= 2 ? "active" : ""}`} />
            <div className={`desktop-step-node ${step === 2 ? "active" : step > 2 ? "completed" : ""}`}>
              <div className="desktop-step-badge">2</div>
              <span className="desktop-step-label">Details & Pay</span>
            </div>
            <div className={`desktop-step-line ${step >= 3 ? "active" : ""}`} />
            <div className={`desktop-step-node ${step === 3 ? "active" : ""}`}>
              <div className="desktop-step-badge">3</div>
              <span className="desktop-step-label">{paymentMethod === "UPI" ? "UPI QR Pay" : "Cash Pay"}</span>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="desktop-checkout-body">
          {/* =========================================================================
              STEP 1: CONFIRM ITEMS (NON-EDITABLE VERIFICATION VIEW)
              ========================================================================= */}
          {step === 1 && (
            <div className="desktop-step-panel step-1-panel">
              <div className="desktop-step-intro">
                <div>
                  <h3 className="desktop-step-title">Step 1: Confirm Your Items</h3>
                  <p className="desktop-step-sub">
                    {totalItemsCount} {totalItemsCount === 1 ? "item" : "items"} in cart • Review & verify order details
                  </p>
                </div>
                <div className="desktop-canteen-pill-badge">
                  <LocationPinIcon size={14} />
                  <span>{activeCanteenName}</span>
                  <span className="counter-tag">{activeCanteenCounter}</span>
                </div>
              </div>

              {/* Non-Editable Items List */}
              <div className="desktop-confirm-items-list">
                {cart.map((item) => {
                  const estTime = getItemEstimateTime(item, item.canteen || currentCanteen, liveStatsMap);
                  const itemCanteenName = item.canteen?.name || activeCanteenName;

                  return (
                    <div key={item.menuItemId} className="desktop-confirm-item-row">
                      <img
                        src={item.image || "/images/samosa.jpg"}
                        alt={item.name}
                        className="desktop-confirm-item-img"
                        onError={(e) => {
                          e.target.src = "/images/samosa.jpg";
                        }}
                      />
                      <div className="desktop-confirm-item-info">
                        <div className="desktop-confirm-title-row">
                          <strong className="desktop-confirm-item-name">{item.name}</strong>
                          {estTime && (
                            <span className="desktop-confirm-prep-time">
                              <ClockIcon size={12} /> {estTime}
                            </span>
                          )}
                        </div>
                        <span className="desktop-confirm-canteen-tag">{itemCanteenName}</span>
                        <div className="desktop-confirm-price-row">
                          <span>₹{item.price} × {item.quantity} = </span>
                          <strong>₹{item.price * item.quantity}</strong>
                        </div>
                      </div>
                      {/* Non-editable Qty badge */}
                      <div className="desktop-confirm-qty-badge">
                        <span>Qty: {item.quantity}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bill Summary */}
              <div className="desktop-bill-summary-card">
                <div className="bill-row">
                  <span>Items Subtotal</span>
                  <span>₹{cartTotal}</span>
                </div>
                <div className="bill-row">
                  <span>Canteen Convenience Fee</span>
                  <span className="fee-free">FREE (₹0)</span>
                </div>
                <div className="bill-row total-highlight">
                  <span>To Pay</span>
                  <span className="total-amount">₹{cartTotal}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="desktop-actions-row">
                <button
                  type="button"
                  className="btn-secondary-edit"
                  onClick={handleCloseModal}
                  title="Close modal to edit items in sidebar cart"
                >
                  ← Edit in Cart
                </button>
                <button
                  type="button"
                  className="btn-primary-proceed"
                  onClick={handleProceedToStep2}
                >
                  <span>Confirm Items & Proceed (₹{cartTotal})</span>
                  <ArrowRightIcon size={16} />
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              STEP 2: STUDENT DETAILS + MOBILE NUMBER (WITH EDIT OPTION) + PAYMENT MODE
              ========================================================================= */}
          {step === 2 && (
            <div className="desktop-step-panel step-2-panel">
              <div className="desktop-step-intro">
                <div>
                  <h3 className="desktop-step-title">Step 2: Student Details & Payment</h3>
                  <p className="desktop-step-sub">
                    Verify token callout name, mobile number, and payment method
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-back-link"
                  onClick={() => setStep(1)}
                >
                  ← Back to Items
                </button>
              </div>

              <div className="desktop-form-grid">
                {/* 1. Student Name */}
                <div className="desktop-form-group">
                  <label className="desktop-field-label" htmlFor="desktopStudentName">
                    <UserIcon size={16} className="label-icon" />
                    <span>Your Name (For Token Callout):</span>
                  </label>
                  <input
                    id="desktopStudentName"
                    type="text"
                    className={`form-input desktop-input ${nameError ? "input-error" : ""}`}
                    placeholder="e.g. Ankit Verma"
                    value={localName}
                    onChange={(e) => {
                      setLocalName(e.target.value);
                      if (nameError) setNameError("");
                    }}
                    autoFocus
                  />
                  {nameError ? (
                    <span className="field-error-msg">{nameError}</span>
                  ) : (
                    <span className="field-hint-msg">
                      This name will be called out at {activeCanteenCounter} when food is ready.
                    </span>
                  )}
                </div>

                {/* 2. Mobile Number (With Edit Option) */}
                <div className="desktop-form-group mobile-phone-card">
                  <div className="field-label-row">
                    <label className="desktop-field-label" htmlFor="desktopStudentPhone">
                      <PhoneIcon size={16} className="label-icon" />
                      <span>Mobile Number (For Order SMS & Alerts):</span>
                    </label>
                    {isEditingPhone ? (
                      <button
                        type="button"
                        className="btn-edit-toggle save"
                        onClick={() => {
                          const clean = (localPhone || "").replace(/\D/g, "");
                          if (clean && clean.length !== 10) {
                            setPhoneError("Enter a valid 10-digit mobile number");
                          } else {
                            setPhoneError("");
                            setIsEditingPhone(false);
                            if (setStudentPhone) setStudentPhone(clean);
                            try {
                              if (clean) localStorage.setItem("canteenGo_studentPhone", clean);
                            } catch {}
                          }
                        }}
                      >
                        ✓ Done
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-edit-toggle"
                        onClick={() => setIsEditingPhone(true)}
                        title="Click to change mobile number"
                      >
                        <EditIcon size={13} /> Edit Number
                      </button>
                    )}
                  </div>

                  {isEditingPhone ? (
                    <div className="phone-input-container">
                      <span className="phone-country-code">🇮🇳 +91</span>
                      <input
                        id="desktopStudentPhone"
                        type="tel"
                        className={`form-input phone-text-input ${phoneError ? "input-error" : ""}`}
                        placeholder="98765 43210"
                        maxLength={10}
                        value={localPhone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                          setLocalPhone(val);
                          if (phoneError) setPhoneError("");
                        }}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div
                      className="phone-display-card"
                      onClick={() => setIsEditingPhone(true)}
                      title="Click to edit mobile number"
                    >
                      <div className="phone-display-content">
                        <span className="phone-flag">🇮🇳 +91</span>
                        <strong className="phone-number-value">
                          {localPhone
                            ? `${localPhone.slice(0, 5)} ${localPhone.slice(5)}`
                            : "Click to add mobile number"}
                        </strong>
                      </div>
                      <span className="phone-edit-pill">
                        <EditIcon size={12} /> Edit
                      </span>
                    </div>
                  )}

                  {phoneError ? (
                    <span className="field-error-msg">{phoneError}</span>
                  ) : (
                    <span className="field-hint-msg">
                      Instant pickup notifications and token alerts will be sent to this number.
                    </span>
                  )}
                </div>

                {/* 2B. Preferred Pickup Time Slot Selection */}
                <div className="desktop-form-group timeslot-group-wrap">
                  <TimeSlotPicker
                    selectedSlot={selectedPickupSlot}
                    onSelectSlot={(slot) => {
                      setSelectedPickupSlot(slot);
                      if (slotError) setSlotError("");
                    }}
                    canteen={selectedCanteen || currentCanteen}
                    error={slotError}
                  />
                </div>

                {/* 3. Cooking Remarks / Special Instructions */}
                {canteenGroups.length > 1 ? (
                  <div className="desktop-form-group">
                    <label className="desktop-field-label">
                      <span>📝 Cooking Notes per Canteen:</span>
                      <span style={{ fontSize: "0.74rem", fontWeight: "400", color: "#64748b", marginLeft: "6px" }}>
                        (Each note goes strictly to its own canteen)
                      </span>
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
                      {canteenGroups.map((grp) => (
                        <div
                          key={grp.canteenId}
                          style={{
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: "10px",
                            padding: "10px 12px"
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginBottom: "6px"
                            }}
                          >
                            <strong
                              style={{
                                fontSize: "0.84rem",
                                color: "#0f172a",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px"
                              }}
                            >
                              <span>📍 {grp.name}</span>
                              <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: "500" }}>
                                ({grp.counter})
                              </span>
                            </strong>
                            <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                              {grp.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                            </span>
                          </div>
                          <input
                            type="text"
                            className="form-input desktop-input"
                            placeholder={`Note for ${grp.name} (e.g. less spicy, pack separately)...`}
                            value={canteenNotes[grp.canteenId] || ""}
                            onChange={(e) =>
                              setCanteenNotes((prev) => ({ ...prev, [grp.canteenId]: e.target.value }))
                            }
                            maxLength={140}
                            style={{ fontSize: "0.82rem", padding: "8px 12px" }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="desktop-form-group">
                    <label className="desktop-field-label" htmlFor="desktopCookingNote">
                      <span>📝 Cooking Note / Remarks (Optional):</span>
                    </label>
                    <input
                      id="desktopCookingNote"
                      type="text"
                      className="form-input desktop-input"
                      placeholder="e.g. Extra spicy, less sugar, pack separately..."
                      value={remarks}
                      onChange={(e) => setRemarks && setRemarks(e.target.value)}
                      maxLength={140}
                    />
                  </div>
                )}

                {/* 4. Payment Mode Selection */}
                <div className="desktop-form-group">
                  <label className="desktop-field-label">Select Mode of Payment:</label>
                  <div className="desktop-payment-grid">
                    {/* UPI Option */}
                    <div
                      className={`desktop-payment-card ${paymentMethod === "UPI" ? "selected" : ""}`}
                      onClick={() => setPaymentMethod && setPaymentMethod("UPI")}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="payment-radio-circle">
                        <span className={`radio-dot ${paymentMethod === "UPI" ? "active" : ""}`} />
                      </div>
                      <div className="payment-icon-wrap upi">
                        <QrIcon size={24} />
                      </div>
                      <div className="payment-info">
                        <div className="payment-title-row">
                          <strong>UPI QR Code</strong>
                          <span className="instant-badge">Instant Token</span>
                        </div>
                        <span className="payment-desc">Scan with GPay, PhonePe, Paytm, BHIM</span>
                      </div>
                    </div>

                    {/* Cash Option */}
                    <div
                      className={`desktop-payment-card ${paymentMethod === "Cash" && !isCodBlocked ? "selected" : ""} ${isCodBlocked ? "disabled" : ""}`}
                      onClick={() => {
                        if (isCodBlocked) return;
                        setPaymentMethod && setPaymentMethod("Cash");
                      }}
                      role="button"
                      tabIndex={0}
                      style={isCodBlocked ? { opacity: 0.55, cursor: "not-allowed", background: "#f8fafc" } : {}}
                    >
                      <div className="payment-radio-circle">
                        <span className={`radio-dot ${paymentMethod === "Cash" && !isCodBlocked ? "active" : ""}`} />
                      </div>
                      <div className="payment-icon-wrap cash">
                        <CashIcon size={24} />
                      </div>
                      <div className="payment-info">
                        <div className="payment-title-row">
                          <strong>Cash Counter</strong>
                          {isCodBlocked ? (
                            <span className="instant-badge" style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5" }}>
                              🚫 Temporarily Blocked
                            </span>
                          ) : (
                            <span className="cash-badge">Pay at Counter</span>
                          )}
                        </div>
                        <span className="payment-desc">
                          {isCodBlocked
                            ? "Cash on Pickup restricted due to verified no-shows. Please pay via UPI."
                            : "Pay cash when collecting your food token"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2 Actions */}
              <div className="desktop-actions-row">
                <button
                  type="button"
                  className="btn-secondary-edit"
                  onClick={() => setStep(1)}
                >
                  ← Back to Step 1
                </button>
                <button
                  type="button"
                  className="btn-primary-proceed"
                  onClick={handleProceedToStep3}
                >
                  <span>
                    Proceed to {paymentMethod === "UPI" ? "UPI Payment" : "Cash Confirmation"} (₹{cartTotal})
                  </span>
                  <ArrowRightIcon size={16} />
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              STEP 3: UPI QR PAY OR CASH COUNTER CONFIRMATION
              ========================================================================= */}
          {step === 3 && (
            <div className="desktop-step-panel step-3-panel">
              <div className="desktop-step-intro">
                <div>
                  <h3 className="desktop-step-title">
                    {paymentMethod === "UPI" ? "Step 3: Scan UPI QR Code" : "Step 3: Confirm Cash Counter Order"}
                  </h3>
                  <p className="desktop-step-sub">
                    {paymentMethod === "UPI"
                      ? "Scan QR with any UPI app to generate instant food token"
                      : "Pay cash at the counter upon food collection"}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-back-link"
                  onClick={() => setStep(2)}
                >
                  ← Change Details
                </button>
              </div>

              {paymentMethod === "UPI" ? (
                /* Redesigned CanteenGo Pay Modal (Desktop) */
                <div className="desktop-upi-pay-container">
                  <div className="desktop-upi-card">
                    <div className="desktop-upi-brand-row">
                      <div className="brand-logo-badge">
                        <img src="/images/canteengo-logo.png" alt="canteenGo" className="brand-logo-img" />
                      </div>
                      <div className="brand-titles">
                        <span className="brand-title">canteen<strong>Go</strong> Pay</span>
                        <span className="brand-verified">✓ Verified Canteen Merchant</span>
                      </div>
                    </div>

                    <div className="desktop-upi-amount-box">
                      <span className="amount-label">PAYABLE AMOUNT</span>
                      <strong className="amount-val">₹{cartTotal}</strong>
                      <span className="amount-sub">Instant Token Allocation • College Express</span>
                    </div>

                    {/* QR Code Container */}
                    <div className="desktop-upi-qr-card">
                      <div className="desktop-upi-qr-frame">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=canteengo@okaxis%26pn=canteenGo%26am=${cartTotal}%26cu=INR`}
                          alt="canteenGo Payment QR"
                          className="desktop-upi-qr-img"
                        />
                        <div className="desktop-upi-qr-center-pill">Go</div>
                      </div>
                    </div>

                    {/* Timer */}
                    <div className="desktop-upi-timer-pill">
                      <span className="timer-pulsing-dot" />
                      <span>QR active for: <strong>{formatTimer(upiSecondsRemaining)}</strong></span>
                    </div>

                    {/* Supported Apps */}
                    <div className="desktop-upi-apps-row">
                      <span className="apps-label">SCAN WITH ANY APP:</span>
                      <div className="apps-badges">
                        <span className="app-chip chip-gpay">GPay</span>
                        <span className="app-chip chip-phonepe">PhonePe</span>
                        <span className="app-chip chip-paytm">Paytm</span>
                        <span className="app-chip chip-bhim">BHIM</span>
                      </div>
                    </div>

                    {/* UPI ID Copy Card */}
                    <div className="desktop-upi-id-box">
                      <div className="vpa-text-wrap">
                        <span className="vpa-label">UPI ID</span>
                        <span className="vpa-val">canteengo@okaxis</span>
                      </div>
                      <button
                        type="button"
                        className="btn-copy-vpa"
                        onClick={handleCopyVpa}
                      >
                        {copiedVpa ? "✓ Copied" : "Copy UPI ID"}
                      </button>
                    </div>

                    {/* Simulate Button */}
                    <button
                      type="button"
                      className={`btn-simulate-upi ${upiPaymentState !== "idle" ? "processing" : ""}`}
                      onClick={handleSimulateUpi}
                      disabled={upiPaymentState !== "idle"}
                    >
                      {upiPaymentState === "processing" ? (
                        <span>Processing Payment Simulation...</span>
                      ) : upiPaymentState === "success" ? (
                        <span>✓ Payment Successful!</span>
                      ) : (
                        <span>✓ Simulate Successful UPI Payment</span>
                      )}
                    </button>

                    <div className="desktop-upi-security-note">
                      🔒 256-Bit Encrypted • Contactless College Express Token
                    </div>
                  </div>
                </div>
              ) : (
                /* Cash Option Confirmation */
                <div className="desktop-cash-confirm-container">
                  <div className="cash-confirm-card">
                    <div className="cash-confirm-icon-wrap">
                      <CashIcon size={42} />
                    </div>
                    <h4>Cash on Counter Collection</h4>
                    <p className="cash-confirm-desc">
                      You have selected to pay in cash. Please keep <strong>₹{cartTotal}</strong> in cash ready at{" "}
                      <strong>{activeCanteenCounter} ({activeCanteenName})</strong> when your token is called.
                    </p>
                    <div className="cash-order-summary-box">
                      <div className="cash-sum-row">
                        <span>Items Count:</span>
                        <strong>{totalItemsCount} items</strong>
                      </div>
                      <div className="cash-sum-row">
                        <span>Pickup Canteen:</span>
                        <strong>{activeCanteenName}</strong>
                      </div>
                      <div className="cash-sum-row">
                        <span>Pickup Counter:</span>
                        <strong>{activeCanteenCounter}</strong>
                      </div>
                      <div className="cash-sum-row highlight">
                        <span>Cash to Pay:</span>
                        <strong>₹{cartTotal}</strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-confirm-cash-order"
                      onClick={() => handleExecuteOrder(false)}
                    >
                      <span>Confirm Order & Generate Token (₹{cartTotal})</span>
                      <ArrowRightIcon size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              STEP "ordering": PROFESSIONAL FOOD APP ORDERING EXPERIENCE
              ========================================================================= */}
          {step === "ordering" && (
            <div className="desktop-ordering-animation-panel">
              <div className="desktop-ordering-card">
                <div className="food-loader-stage" aria-hidden="true">
                  <div className="food-orbit-ring"></div>
                  <div className="food-pulse-ring ring-1"></div>
                  <div className="food-pulse-ring ring-2"></div>

                  <div className="food-cloche-badge">
                    <div className="food-steam-group">
                      <span className="steam-wisp w1"></span>
                      <span className="steam-wisp w2"></span>
                      <span className="steam-wisp w3"></span>
                    </div>
                    <svg
                      className="food-cloche-svg"
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 17h18" />
                      <path d="M5 17a7 7 0 0 1 14 0" fill="rgba(255,255,255,0.16)" />
                      <path d="M12 7V5" />
                      <circle cx="12" cy="4" r="1" fill="#ffffff" />
                      <path d="M2 19.5h20" strokeOpacity="0.85" />
                    </svg>
                  </div>
                </div>

                <div className="placing-kicker">LIVE KITCHEN SYNC</div>
                <h3 className="placing-title">
                  {ORDERING_STAGES[Math.min(loadingStep, ORDERING_STAGES.length - 1)]?.title}
                </h3>

                <div className="placing-steps-wrap" style={{ width: "100%" }}>
                  {[
                    `Sending order to ${activeCanteenName}`,
                    `Locking pickup (${selectedPickupSlot || "Immediate Pickup"})`,
                    "Allocating your live queue pass"
                  ].map((label, idx) => {
                    const isDone = loadingStep > idx;
                    const isActive = loadingStep === idx;
                    return (
                      <div
                        key={label}
                        className={`step-item ${isDone ? "done" : ""} ${isActive ? "active" : ""}`}
                      >
                        <span className="step-status-icon">
                          {isDone ? (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : isActive ? (
                            <span className="step-spinner"></span>
                          ) : (
                            <span className="step-dot"></span>
                          )}
                        </span>
                        <span className="step-text">{label}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="order-progress-track">
                  <div
                    className="order-progress-fill"
                    style={{
                      width: ORDERING_STAGES[Math.min(loadingStep, ORDERING_STAGES.length - 1)]?.progress || "100%"
                    }}
                  />
                </div>

                <div className="ordering-canteen-callout">
                  <span className="ordering-live-pulse-dot" />
                  <span>
                    Communicating with <strong>{activeCanteenName}</strong> • {activeCanteenCounter}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              STEP "cancelling": PROFESSIONAL ORDER CANCELLING ANIMATION
              ========================================================================= */}
          {step === "cancelling" && (
            <div className="desktop-ordering-animation-panel">
              <div className="desktop-ordering-card">
                <div className={`cancel-anim-stage ${cancellingStage === 1 ? "cancelled" : ""}`} aria-hidden="true">
                  <div className="cancel-orbit-ring"></div>
                  <div className="cancel-pulse-ring"></div>
                  <div className="cancel-badge-circle">
                    {cancellingStage === 0 ? (
                      <span className="cancel-ring-spinner"></span>
                    ) : (
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line className="cancel-cross-line l1" x1="18" y1="6" x2="6" y2="18" />
                        <line className="cancel-cross-line l2" x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    )}
                  </div>
                </div>

                <div className="cancel-kicker">
                  {cancellingStage === 0 ? "CANCELLING ORDER" : "ORDER CANCELLED"}
                </div>
                <h3 className="placing-title" style={{ marginBottom: "6px" }}>
                  {cancellingStage === 0 ? "Cancelling your checkout..." : "Order Cancelled"}
                </h3>
                <p className="ordering-stage-subtitle-text" style={{ marginBottom: "18px" }}>
                  {cancellingStage === 0
                    ? "Discarding selected slot and payment session safely"
                    : "No charges were applied. Your cart items are still saved."}
                </p>

                <div className="cancel-progress-track">
                  <div
                    className="cancel-progress-fill"
                    style={{ width: cancellingStage === 0 ? "55%" : "100%" }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              STEP "placed": ORDER PLACED SUCCESS TOKEN VIEW
              ========================================================================= */}
          {step === "placed" && placedOrder && (
            <div className="desktop-order-placed-panel">
              <div className="desktop-placed-card">
                <div className="placed-celebration-badge" style={!placedOrder.tokenNumber ? { background: "#fffbeb", color: "#b45309", borderColor: "#fde68a" } : undefined}>
                  <CheckCircleIcon size={32} />
                  <span>{placedOrder.tokenNumber ? "Order Successfully Placed!" : "Order Submitted for Vendor Approval!"}</span>
                </div>

                {placedOrder.tokenNumber ? (
                  <div className="placed-token-hero">
                    <span className="token-label">YOUR PICKUP TOKEN</span>
                    <div className="token-number-badge">
                      #{placedOrder.tokenNumber}
                    </div>
                    <span className="token-callout-hint">
                      Please listen for token #{placedOrder.tokenNumber} called for{" "}
                      <strong>{placedOrder.studentName || localName}</strong>
                    </span>
                  </div>
                ) : (
                  <div className="placed-token-hero pending-hero" style={{ background: "#fff7ed", border: "1.5px dashed #fdba74", borderRadius: "16px", padding: "18px 14px", margin: "16px 0" }}>
                    <span className="token-label" style={{ color: "#c2410c", fontWeight: 800 }}>TOKEN NUMBER STATUS</span>
                    <div className="token-number-badge pending-badge" style={{ background: "#ea580c", color: "#fff", fontSize: "1.25rem", padding: "8px 20px", borderRadius: "99px", display: "inline-block", margin: "8px auto" }}>
                      ⏳ Awaiting Vendor Acceptance
                    </div>
                    <span className="token-callout-hint" style={{ color: "#7c2d12", display: "block", marginTop: "6px" }}>
                      Your order is waiting for approval by <strong>{placedOrder.canteenName || activeCanteenName}</strong>. A token number will appear automatically as soon as accepted!
                    </span>
                  </div>
                )}

                <div className="placed-meta-grid">
                  <div className="meta-card highlight-slot" style={{ border: "1.5px solid #fdba74", background: "#fff7ed" }}>
                    <span className="meta-label" style={{ color: "#ea580c", fontWeight: 800 }}>Scheduled Pickup Slot</span>
                    <strong className="meta-val" style={{ color: "#9a3412", fontSize: "1rem" }}>
                      🕒 {placedOrder.pickupSlot || selectedPickupSlot}
                    </strong>
                    <span className="meta-sub">Please collect during this slot</span>
                  </div>
                  <div className="meta-card">
                    <span className="meta-label">Pickup Location</span>
                    <strong className="meta-val">{placedOrder.canteenName || activeCanteenName}</strong>
                    <span className="meta-sub">{placedOrder.counterName || activeCanteenCounter}</span>
                  </div>
                  <div className="meta-card">
                    <span className="meta-label">Kitchen Status</span>
                    <strong className="meta-val">
                      {placedOrder.orderStatus === "Accepted"
                        ? "Accepted by Kitchen"
                        : placedOrder.orderStatus === "Pending Approval"
                        ? "Pending Approval"
                        : "Preparing"}
                    </strong>
                    <span className="meta-sub">Freshly prepared on acceptance</span>
                  </div>
                  <div className="meta-card">
                    <span className="meta-label">Payment Status</span>
                    <strong className="meta-val">
                      {placedOrder.paymentMethod === "UPI" ? "Paid Online (UPI)" : "Pay Cash at Counter"}
                    </strong>
                    <span className="meta-sub">Total: ₹{cartTotal}</span>
                  </div>
                  {localPhone && (
                    <div className="meta-card">
                      <span className="meta-label">Order SMS Alerts</span>
                      <strong className="meta-val">+91 {localPhone}</strong>
                      <span className="meta-sub">SMS confirmation dispatched</span>
                    </div>
                  )}
                </div>

                <div className="placed-actions-row">
                  <button
                    type="button"
                    className="btn-track-queue"
                    onClick={() => {
                      onClose();
                      if (onTrackInQueue) onTrackInQueue();
                    }}
                  >
                    <span>Track in Live Queue 📊</span>
                  </button>
                  <button
                    type="button"
                    className="btn-view-orders"
                    onClick={() => {
                      onClose();
                      if (onViewInOrders) onViewInOrders();
                    }}
                  >
                    <span>View in Your Orders →</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cancel Order Confirmation Alert */}
        {showCancelConfirm && (
          <div className="cancel-confirm-overlay" role="alertdialog" aria-modal="true" aria-labelledby="cancel-alert-title">
            <div className="cancel-confirm-dialog">
              <div className="cancel-confirm-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h4 id="cancel-alert-title" className="cancel-confirm-title">Cancel this order?</h4>
              <p className="cancel-confirm-desc">
                You are on Step {step} of checkout. Cancelling will discard your selected slot and payment progress.
              </p>
              <div className="cancel-confirm-actions">
                <button
                  type="button"
                  className="cancel-keep-btn"
                  onClick={() => setShowCancelConfirm(false)}
                >
                  Keep Ordering
                </button>
                <button
                  type="button"
                  className="cancel-yes-btn"
                  onClick={handleConfirmCancelOrder}
                >
                  Yes, Cancel Order
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

