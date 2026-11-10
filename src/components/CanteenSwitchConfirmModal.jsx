import { useEffect } from "react";
import { AlertTriangleIcon } from "./Icons";

export default function CanteenSwitchConfirmModal({
  isOpen,
  onClose,
  currentCanteen,
  targetCanteen,
  cart,
  cartTotal,
  onKeepCart,
  onTransferCart,
  onClearCartAndSwitch
}) {
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

  if (!isOpen || !targetCanteen) return null;

  const safeCart = Array.isArray(cart) ? cart : [];
  const totalItemsCount = safeCart.reduce((sum, it) => sum + (it.quantity || 1), 0);

  return (
    <div className="canteen-confirm-overlay" onClick={onClose}>
      <div
        className="canteen-confirm-modal card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header Alert */}
        <div className="canteen-confirm-icon-wrap">
          <AlertTriangleIcon size={32} />
        </div>

        <h3 className="canteen-confirm-title">
          Multi-Canteen Cart Detected
        </h3>

        <p className="canteen-confirm-subtitle">
          Ek order sirf ek canteen se pick up kiya ja sakta hai.
        </p>

        {/* Current Cart Summary Box */}
        <div className="canteen-confirm-cart-summary">
          <div className="summary-canteen-row">
            <span className="summary-label">Current Canteen:</span>
            <strong className="summary-canteen-name">
              📍 {currentCanteen?.name || "Previous Canteen"}
            </strong>
          </div>

          <div className="summary-items-pill">
            <span>🛒 {totalItemsCount} items in cart</span>
            <span>Total: ₹{cartTotal}</span>
          </div>

          <div className="summary-target-row">
            <span className="summary-label">Switching to:</span>
            <strong className="summary-target-name">
              ➡️ {targetCanteen.name} ({targetCanteen.counter})
            </strong>
          </div>
        </div>

        <p className="canteen-confirm-question">
          Aap apna cart kaise manage karna chahte hain?
        </p>

        {/* Action Options */}
        <div className="canteen-confirm-actions">
          {/* Option 1: Transfer Cart */}
          <button
            type="button"
            className="btn-confirm-action btn-transfer"
            onClick={onTransferCart}
          >
            <div className="action-btn-text">
              <strong>Switch & Transfer Cart</strong>
              <small>Nayi canteen par switch karein aur cart items ko wahan order karein</small>
            </div>
            <span className="action-arrow">→</span>
          </button>

          {/* Option 2: Clear Cart & Start Fresh */}
          <button
            type="button"
            className="btn-confirm-action btn-clear"
            onClick={onClearCartAndSwitch}
          >
            <div className="action-btn-text">
              <strong>Switch Canteen & Clear Cart</strong>
              <small>Cart empty karein aur {targetCanteen.name} se fresh menu order karein</small>
            </div>
            <span className="action-arrow">🗑️</span>
          </button>

          {/* Option 3: Keep Current Cart */}
          <button
            type="button"
            className="btn-confirm-action btn-keep"
            onClick={onKeepCart}
          >
            <div className="action-btn-text">
              <strong>Keep Current Cart & Canteen</strong>
              <small>Switch cancel karein aur {currentCanteen?.name} ka order continue rakhein</small>
            </div>
            <span className="action-arrow">✕</span>
          </button>
        </div>
      </div>
    </div>
  );
}

