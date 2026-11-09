"use client";

import { useEffect, useRef } from "react";
import {
  CartIcon,
  PlusIcon,
  MinusIcon,
  CashIcon,
  QrIcon,
  LocationPinIcon,
  ClockIcon
} from "./Icons";
import { getItemEstimateTime, isCanteenOpenNow } from "../data/canteens";

export default function MobileStudentCartSheet({
  isOpen,
  onClose,
  cart = [],
  cartTotal = 0,
  onIncrease,
  onDecrease,
  onRemove,
  studentName = "",
  setStudentName,
  studentProfile,
  remarks = "",
  setRemarks,
  paymentMethod = "Cash",
  setPaymentMethod,
  onSubmit,
  submitting = false,
  selectedCanteen,
  currentCanteen,
  isCartCanteenClosed = false,
  cartClosedCanteens = [],
  onOpenCanteenModal,
  liveStatsMap = {}
}) {
  const sheetRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalItemsCount = cart.reduce((sum, it) => sum + (it.quantity || 1), 0);

  return (
    <div className="mobile-cart-backdrop" onClick={onClose}>
      <div
        className="mobile-cart-sheet"
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Order Cart"
      >
        {/* Drag handle / touch bar indicator */}
        <div className="sheet-drag-handle" onClick={onClose} />

        {/* Sheet Header */}
        <div className="mobile-cart-header">
          <div className="mobile-cart-header-title">
            <CartIcon size={20} className="mobile-cart-icon" />
            <h3>Your Cart</h3>
            {totalItemsCount > 0 && (
              <span className="mobile-cart-count-pill">{totalItemsCount}</span>
            )}
          </div>
          <button
            type="button"
            className="mobile-cart-close-btn"
            onClick={onClose}
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Cart Content */}
        <div className="mobile-cart-body">
          {cart.length === 0 ? (
            <div className="mobile-empty-cart">
              <div className="mobile-empty-cart-icon">
                <CartIcon size={44} />
              </div>
              <h4>Your Cart is Empty</h4>
              <p>Add some delicious snacks or beverages from the menu.</p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={onClose}
                style={{ marginTop: "12px", borderRadius: "10px" }}
              >
                Browse Menu
              </button>
            </div>
          ) : (
            <>
              {/* Pickup Canteen Banner */}
              <div className="mobile-cart-canteen-pill">
                <div className="mobile-canteen-left">
                  <LocationPinIcon size={18} className="mobile-canteen-pin" />
                  <div className="mobile-canteen-details">
                    <span className="mobile-canteen-label">PICKUP HUB</span>
                    <strong className="mobile-canteen-name">
                      {selectedCanteen?.shortName || selectedCanteen?.name || "Campus Canteen"}
                    </strong>
                    <span className="mobile-canteen-counter">
                      {selectedCanteen?.counter || "Counter 1"}
                      {selectedCanteen?.walkingMinutes && ` • 🚶 ${selectedCanteen.walkingMinutes} min walk`}
                    </span>
                  </div>
                </div>
                {onOpenCanteenModal && (
                  <button
                    type="button"
                    className="mobile-canteen-change-btn"
                    onClick={() => onOpenCanteenModal(cart[0])}
                  >
                    Change
                  </button>
                )}
              </div>

              {/* Items List */}
              <div className="mobile-cart-items-list">
                {cart.map((item) => {
                  const estTime = getItemEstimateTime(item, item.canteen || selectedCanteen, liveStatsMap);
                  const isClosed = !isCanteenOpenNow(item.canteen || selectedCanteen).isOpen;

                  return (
                    <div key={item.menuItemId} className="mobile-cart-item-row">
                      <img
                        src={item.image || "/images/samosa.jpg"}
                        alt={item.name}
                        className="mobile-cart-item-img"
                        onError={(e) => {
                          e.target.src = "/images/samosa.jpg";
                        }}
                      />

                      <div className="mobile-cart-item-info">
                        <div className="mobile-cart-item-name-row">
                          <strong className="mobile-cart-item-name">{item.name}</strong>
                          {isClosed && (
                            <span className="mobile-closed-tag">Closed</span>
                          )}
                        </div>

                        <div className="mobile-cart-item-meta">
                          <span className="mobile-cart-item-price">₹{item.price}</span>
                          {estTime && (
                            <span className="mobile-cart-prep-time">
                              <ClockIcon size={11} /> {estTime}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stepper (+ / -) */}
                      <div className="mobile-cart-stepper">
                        <button
                          type="button"
                          className="mobile-stepper-btn"
                          onClick={() => onDecrease(item.menuItemId)}
                          aria-label="Decrease quantity"
                        >
                          <MinusIcon size={12} />
                        </button>
                        <span className="mobile-stepper-qty">{item.quantity}</span>
                        <button
                          type="button"
                          className="mobile-stepper-btn"
                          onClick={() => onIncrease(item.menuItemId)}
                          aria-label="Increase quantity"
                        >
                          <PlusIcon size={12} />
                        </button>
                      </div>

                      <button
                        type="button"
                        className="mobile-item-remove-btn"
                        onClick={() => onRemove(item.menuItemId)}
                        aria-label="Remove item"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Bill Details */}
              <div className="mobile-cart-summary-box">
                <div className="summary-line">
                  <span>Items Subtotal</span>
                  <span>₹{cartTotal}</span>
                </div>
                <div className="summary-line highlight">
                  <span>To Pay</span>
                  <span className="summary-total-price">₹{cartTotal}</span>
                </div>
              </div>

              {/* Student Name (if not logged in) */}
              {!studentProfile?.phone && (
                <div className="mobile-form-group">
                  <label className="mobile-form-label" htmlFor="mobileStudentName">
                    Student Name (For Token Call):
                  </label>
                  <input
                    id="mobileStudentName"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Ankit Verma"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                  />
                </div>
              )}

              {/* Cooking Remarks / Special Instructions */}
              <div className="mobile-form-group">
                <label className="mobile-form-label" htmlFor="mobileOrderRemarks">
                  <span>📝 Cooking Note:</span>
                  <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Optional</span>
                </label>
                <input
                  id="mobileOrderRemarks"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Extra spicy, bina pyaz, pack separately..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  maxLength={140}
                />
              </div>

              {/* Payment Method Selector */}
              <div className="mobile-form-group">
                <label className="mobile-form-label">Payment Option:</label>
                <div className="mobile-payment-options">
                  <div
                    className={`mobile-pay-card ${paymentMethod === "Cash" ? "selected" : ""}`}
                    onClick={() => setPaymentMethod("Cash")}
                  >
                    <CashIcon size={20} className="pay-card-icon" />
                    <div>
                      <div className="pay-card-title">Cash Counter</div>
                      <div className="pay-card-sub">Pay at pickup counter</div>
                    </div>
                  </div>

                  <div
                    className={`mobile-pay-card ${paymentMethod === "UPI" ? "selected" : ""}`}
                    onClick={() => setPaymentMethod("UPI")}
                  >
                    <QrIcon size={20} className="pay-card-icon" />
                    <div>
                      <div className="pay-card-title">UPI QR Code</div>
                      <div className="pay-card-sub">Instant scan & pay</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Canteen Closed Alert */}
              {isCartCanteenClosed && (
                <div className="mobile-canteen-closed-banner">
                  ⚠️ Canteen is currently closed. You cannot place orders right now.
                </div>
              )}
            </>
          )}
        </div>

        {/* Sticky Sheet Bottom Action Button */}
        {cart.length > 0 && (
          <div className="mobile-cart-footer">
            <button
              type="button"
              className="btn btn-primary btn-mobile-checkout"
              onClick={onSubmit}
              disabled={submitting || isCartCanteenClosed}
            >
              {submitting ? (
                <span>Placing Order...</span>
              ) : isCartCanteenClosed ? (
                <span>Canteen Closed</span>
              ) : paymentMethod === "UPI" ? (
                <span>Scan UPI QR • ₹{cartTotal} →</span>
              ) : (
                <span>Place Order • ₹{cartTotal} →</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
