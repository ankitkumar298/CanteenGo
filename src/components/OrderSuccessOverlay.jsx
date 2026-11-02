import { useState, useEffect } from "react";
import StatusBadge from "./StatusBadge";
import { CheckCircleIcon, QueueIcon, PlusIcon, ShieldCheckIcon, ReceiptIcon } from "./Icons";

export default function OrderSuccessOverlay({
  isOpen,
  isSubmitting,
  order,
  onClose,
  onGoToYourOrders
}) {
  const [loadingStep, setLoadingStep] = useState(0);
  const [copiedToken, setCopiedToken] = useState(false);

  useEffect(() => {
    if (!isSubmitting) {
      setLoadingStep(0);
      return;
    }

    const t1 = setTimeout(() => setLoadingStep(1), 500);
    const t2 = setTimeout(() => setLoadingStep(2), 1100);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isSubmitting]);

  if (!isOpen) return null;

  const handleCopyToken = () => {
    if (order && order.tokenNumber) {
      navigator.clipboard.writeText(order.tokenNumber);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  return (
    <div className="order-overlay-backdrop">
      <div className="order-overlay-card">
        {/* PHASE 1: SUBMITTING / PLACING ORDER RADAR ANIMATION */}
        {isSubmitting && (
          <div className="placing-order-box">
            <div className="radar-spinner-container">
              <div className="radar-wave wave-1"></div>
              <div className="radar-wave wave-2"></div>
              <div className="radar-wave wave-3"></div>
              <div className="radar-center-icon">
                <img
                  src="/images/canteengo-logo.png"
                  alt="canteenGo"
                  className="radar-food-img"
                />
              </div>
            </div>

            <h3 className="placing-title">Placing Your Canteen Order</h3>

            <div className="placing-steps-wrap">
              <div className={`step-item ${loadingStep >= 0 ? "active" : ""}`}>
                <span className="step-dot"></span>
                <span>Connecting to canteen kitchen...</span>
              </div>
              <div className={`step-item ${loadingStep >= 1 ? "active" : ""}`}>
                <span className="step-dot"></span>
                <span>Verifying menu prices in MongoDB...</span>
              </div>
              <div className={`step-item ${loadingStep >= 2 ? "active" : ""}`}>
                <span className="step-dot"></span>
                <span>Allocating your safe pickup token...</span>
              </div>
            </div>

            <div className="order-progress-track">
              <div
                className="order-progress-fill"
                style={{
                  width: loadingStep === 0 ? "35%" : loadingStep === 1 ? "75%" : "98%"
                }}
              ></div>
            </div>

            <span className="placing-subhint">
              Generating your live queue pass • Please hold on
            </span>
          </div>
        )}

        {/* PHASE 2: ORDER CONFIRMED WITH LIVE DIGITAL TOKEN CARD */}
        {!isSubmitting && order && (
          <div className="placed-order-box">
            {/* Confetti particles */}
            <div className="confetti-container">
              <span className="confetti c1"></span>
              <span className="confetti c2"></span>
              <span className="confetti c3"></span>
              <span className="confetti c4"></span>
              <span className="confetti c5"></span>
              <span className="confetti c6"></span>
            </div>

            <div className="success-bounce-icon">
              <CheckCircleIcon size={38} className="check-svg" />
            </div>

            <h2 className="placed-title">Order Confirmed!</h2>
            <p className="placed-subtitle">
              Your order is sent to the canteen chef. Save your pickup token below:
            </p>

            {/* Futuristic Digital Kiosk Token Card */}
            <div className="digital-token-card">
              <div className="token-card-glow"></div>
              <div className="token-card-top">
                <span className="token-campus-tag">CANTEENGO EXPRESS TICKET</span>
                <span className="token-live-indicator">
                  <span className="live-dot"></span> LIVE TICKET
                </span>
              </div>

              <div className="token-number-display">
                <span className="token-prefix">TOKEN</span>
                <span className="token-huge-num">{order.tokenNumber}</span>
              </div>

              <div className="token-barcode-strip">
                <div className="barcode-bars">
                  <span></span><span></span><span></span><span></span><span></span>
                  <span></span><span></span><span></span><span></span><span></span>
                  <span></span><span></span><span></span><span></span><span></span>
                </div>
                <button
                  type="button"
                  className="btn-copy-token"
                  onClick={handleCopyToken}
                  title="Copy Token Number"
                >
                  {copiedToken ? "✓ Copied" : "Copy Token"}
                </button>
              </div>

              <div className="token-card-meta">
                <div className="token-meta-item">
                  <span className="meta-label">STUDENT</span>
                  <span className="meta-val">{order.studentName}</span>
                </div>
                <div className="token-meta-item">
                  <span className="meta-label">AMOUNT</span>
                  <span className="meta-val">₹{order.totalAmount}</span>
                </div>
                <div className="token-meta-item">
                  <span className="meta-label">PAYMENT</span>
                  <span className="meta-val">{order.paymentStatus} ({order.paymentMethod})</span>
                </div>
              </div>

              {order.pickupCode && (
                <div className="token-pickup-pin-box">
                  <div className="pin-title">
                    <ShieldCheckIcon size={14} />
                    <span>SECURE PICKUP PIN (OTP)</span>
                  </div>
                  <div className="pin-digits-wrap">
                    {order.pickupCode.split("").map((digit, i) => (
                      <span key={i} className="pin-digit-box">{digit}</span>
                    ))}
                  </div>
                  <small className="pin-help-text">Give this 4-digit PIN at Counter 1 to verify and collect your food.</small>
                </div>
              )}
            </div>

            {/* Ordered Items Summary */}
            <div className="placed-items-summary">
              <div className="summary-title">Items Ordered:</div>
              <div className="summary-pills">
                {order.items?.map((item, idx) => (
                  <span key={idx} className="summary-item-pill">
                    {item.name} <strong className="pill-qty">×{item.quantity}</strong>
                  </span>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="placed-actions">
              {onGoToYourOrders && (
                <button
                  type="button"
                  className="btn btn-primary btn-overlay-action"
                  onClick={() => {
                    onClose();
                    onGoToYourOrders();
                  }}
                >
                  <ReceiptIcon size={17} />
                  <span>Go to Your Orders</span>
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary btn-overlay-action"
                onClick={onClose}
              >
                <PlusIcon size={17} />
                <span>Order More Food</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
