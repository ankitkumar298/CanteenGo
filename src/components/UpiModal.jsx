import { useState, useEffect } from "react";
import { CheckCircleIcon } from "./Icons";

export default function UpiModal({ isOpen, onClose, amount, onPaymentSuccess }) {
  const [copied, setCopied] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(299); // 5 min countdown
  const [paymentState, setPaymentState] = useState("idle"); // "idle" | "processing" | "success"

  useEffect(() => {
    if (!isOpen) {
      setSecondsRemaining(299);
      setPaymentState("idle");
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyVpa = () => {
    navigator.clipboard.writeText("canteengo@okaxis");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulatePayment = () => {
    setPaymentState("processing");
    setTimeout(() => {
      setPaymentState("success");
      setTimeout(() => {
        onPaymentSuccess();
      }, 700);
    }, 1200);
  };

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedExpiry = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="upi-modal-overlay" onClick={paymentState === "idle" ? onClose : undefined}>
      <div className="upi-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Top Bar */}
        <div className="upi-modal-header">
          <div className="upi-brand-block">
            <div className="upi-logo-wrap">
              <img src="/images/canteengo-logo.png" alt="canteenGo" className="upi-logo-img" />
            </div>
            <div>
              <div className="upi-brand-name">
                canteen<span>Go</span> Pay
              </div>
              <div className="upi-merchant-status">
                <span className="verified-shield">✓</span> Verified Canteen Merchant
              </div>
            </div>
          </div>
          <button
            type="button"
            className="upi-close-btn"
            onClick={onClose}
            disabled={paymentState !== "idle"}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Amount Card */}
        <div className="upi-amount-strip">
          <div className="amount-label">Payable Amount</div>
          <div className="amount-value">
            <span className="amount-rupee">₹</span>{amount}
          </div>
          <div className="order-context">Order for College Break • Instant Token Allocation</div>
        </div>

        {/* QR Code Section with Live Scanner Beam */}
        <div className="upi-qr-stage">
          <div className="upi-qr-card">
            {/* 4 Corner Scanner Brackets */}
            <span className="qr-corner qr-corner-tl"></span>
            <span className="qr-corner qr-corner-tr"></span>
            <span className="qr-corner qr-corner-bl"></span>
            <span className="qr-corner qr-corner-br"></span>

            {/* Scanning Laser Beam */}
            {paymentState === "idle" && <div className="qr-scan-beam"></div>}

            {/* Realistic High-Fidelity SVG QR Matrix */}
            <svg
              className="upi-qr-graphic"
              viewBox="0 0 200 200"
              width="190"
              height="190"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Background */}
              <rect width="200" height="200" fill="#ffffff" rx="12" />

              {/* Position Detection Squares - Top Left */}
              <rect x="14" y="14" width="46" height="46" rx="6" fill="#0f172a" />
              <rect x="22" y="22" width="30" height="30" rx="4" fill="#ffffff" />
              <rect x="29" y="29" width="16" height="16" rx="3" fill="#ea580c" />

              {/* Position Detection Squares - Top Right */}
              <rect x="140" y="14" width="46" height="46" rx="6" fill="#0f172a" />
              <rect x="148" y="22" width="30" height="30" rx="4" fill="#ffffff" />
              <rect x="155" y="29" width="16" height="16" rx="3" fill="#ea580c" />

              {/* Position Detection Squares - Bottom Left */}
              <rect x="14" y="140" width="46" height="46" rx="6" fill="#0f172a" />
              <rect x="22" y="148" width="30" height="30" rx="4" fill="#ffffff" />
              <rect x="29" y="155" width="16" height="16" rx="3" fill="#ea580c" />

              {/* Timing Patterns */}
              <rect x="66" y="20" width="6" height="6" fill="#0f172a" />
              <rect x="78" y="20" width="6" height="6" fill="#0f172a" />
              <rect x="90" y="20" width="6" height="6" fill="#0f172a" />
              <rect x="102" y="20" width="6" height="6" fill="#0f172a" />
              <rect x="114" y="20" width="6" height="6" fill="#0f172a" />
              <rect x="126" y="20" width="6" height="6" fill="#0f172a" />

              <rect x="20" y="66" width="6" height="6" fill="#0f172a" />
              <rect x="20" y="78" width="6" height="6" fill="#0f172a" />
              <rect x="20" y="90" width="6" height="6" fill="#0f172a" />
              <rect x="20" y="102" width="6" height="6" fill="#0f172a" />
              <rect x="20" y="114" width="6" height="6" fill="#0f172a" />
              <rect x="20" y="126" width="6" height="6" fill="#0f172a" />

              {/* Alignment pattern (Bottom Right) */}
              <rect x="145" y="145" width="24" height="24" rx="4" fill="#0f172a" />
              <rect x="151" y="151" width="12" height="12" rx="2" fill="#ffffff" />
              <rect x="154" y="154" width="6" height="6" rx="1" fill="#ea580c" />

              {/* Realistic Data Pixels Matrix */}
              <rect x="66" y="34" width="7" height="7" fill="#1e293b" />
              <rect x="80" y="34" width="14" height="7" fill="#1e293b" />
              <rect x="102" y="34" width="7" height="7" fill="#1e293b" />
              <rect x="116" y="34" width="14" height="7" fill="#1e293b" />

              <rect x="66" y="48" width="14" height="7" fill="#1e293b" />
              <rect x="87" y="48" width="7" height="7" fill="#1e293b" />
              <rect x="108" y="48" width="14" height="7" fill="#1e293b" />
              <rect x="129" y="48" width="7" height="7" fill="#1e293b" />

              <rect x="34" y="66" width="7" height="7" fill="#1e293b" />
              <rect x="48" y="66" width="14" height="7" fill="#1e293b" />
              <rect x="69" y="66" width="7" height="14" fill="#1e293b" />
              <rect x="83" y="66" width="14" height="7" fill="#1e293b" />
              <rect x="104" y="66" width="7" height="7" fill="#1e293b" />
              <rect x="118" y="66" width="14" height="7" fill="#1e293b" />
              <rect x="140" y="66" width="7" height="14" fill="#1e293b" />
              <rect x="154" y="66" width="14" height="7" fill="#1e293b" />

              <rect x="34" y="80" width="14" height="7" fill="#1e293b" />
              <rect x="55" y="80" width="7" height="7" fill="#1e293b" />
              <rect x="83" y="80" width="7" height="7" fill="#1e293b" />
              <rect x="111" y="80" width="14" height="7" fill="#1e293b" />
              <rect x="132" y="80" width="7" height="7" fill="#1e293b" />
              <rect x="168" y="80" width="7" height="14" fill="#1e293b" />

              <rect x="34" y="94" width="7" height="14" fill="#1e293b" />
              <rect x="48" y="94" width="14" height="7" fill="#1e293b" />
              <rect x="69" y="94" width="7" height="7" fill="#1e293b" />
              <rect x="125" y="94" width="7" height="7" fill="#1e293b" />
              <rect x="140" y="94" width="14" height="7" fill="#1e293b" />
              <rect x="161" y="94" width="7" height="7" fill="#1e293b" />

              <rect x="48" y="108" width="7" height="7" fill="#1e293b" />
              <rect x="62" y="108" width="14" height="7" fill="#1e293b" />
              <rect x="125" y="108" width="14" height="7" fill="#1e293b" />
              <rect x="147" y="108" width="7" height="7" fill="#1e293b" />
              <rect x="161" y="108" width="14" height="7" fill="#1e293b" />

              <rect x="34" y="122" width="14" height="7" fill="#1e293b" />
              <rect x="55" y="122" width="7" height="7" fill="#1e293b" />
              <rect x="76" y="122" width="14" height="7" fill="#1e293b" />
              <rect x="97" y="122" width="7" height="7" fill="#1e293b" />
              <rect x="111" y="122" width="14" height="7" fill="#1e293b" />
              <rect x="132" y="122" width="7" height="7" fill="#1e293b" />
              <rect x="154" y="122" width="7" height="7" fill="#1e293b" />
              <rect x="168" y="122" width="7" height="7" fill="#1e293b" />

              <rect x="66" y="136" width="7" height="7" fill="#1e293b" />
              <rect x="80" y="136" width="14" height="7" fill="#1e293b" />
              <rect x="102" y="136" width="7" height="7" fill="#1e293b" />
              <rect x="123" y="136" width="14" height="7" fill="#1e293b" />

              <rect x="66" y="150" width="14" height="7" fill="#1e293b" />
              <rect x="87" y="150" width="7" height="7" fill="#1e293b" />
              <rect x="108" y="150" width="14" height="7" fill="#1e293b" />
              <rect x="129" y="150" width="7" height="7" fill="#1e293b" />

              <rect x="66" y="164" width="7" height="7" fill="#1e293b" />
              <rect x="80" y="164" width="14" height="7" fill="#1e293b" />
              <rect x="102" y="164" width="7" height="7" fill="#1e293b" />
              <rect x="116" y="164" width="14" height="7" fill="#1e293b" />

              {/* Center Embedded Brand Badge */}
              <circle cx="100" cy="100" r="19" fill="#ffffff" />
              <circle cx="100" cy="100" r="16" fill="#ea580c" />
              <text
                x="100"
                y="105"
                fill="#ffffff"
                fontSize="12"
                fontWeight="900"
                textAnchor="middle"
                fontFamily="'Outfit', sans-serif"
              >
                Go
              </text>
            </svg>
          </div>

          {/* Expiry Pill */}
          <div className="upi-expiry-badge">
            <span className="pulse-dot-orange"></span>
            <span>QR active for: <strong>{formattedExpiry}</strong></span>
          </div>
        </div>

        {/* Supported UPI Apps Bar */}
        <div className="upi-apps-row">
          <span className="supported-apps-label">SCAN WITH ANY APP:</span>
          <div className="upi-app-chips">
            <span className="app-chip chip-gpay">GPay</span>
            <span className="app-chip chip-phonepe">PhonePe</span>
            <span className="app-chip chip-paytm">Paytm</span>
            <span className="app-chip chip-bhim">BHIM</span>
          </div>
        </div>

        {/* Copy UPI ID Bar */}
        <div className="upi-copy-strip">
          <div className="vpa-details">
            <span className="vpa-label">UPI ID</span>
            <strong className="vpa-text">canteengo@okaxis</strong>
          </div>
          <button type="button" className="btn-copy-vpa" onClick={handleCopyVpa}>
            {copied ? "✓ Copied" : "Copy UPI ID"}
          </button>
        </div>

        {/* Simulation / Payment Action Button with Live States */}
        <div className="upi-action-area">
          {paymentState === "idle" && (
            <button
              type="button"
              className="btn-upi-pay"
              onClick={handleSimulatePayment}
            >
              <CheckCircleIcon size={18} />
              <span>Simulate Successful UPI Payment</span>
            </button>
          )}

          {paymentState === "processing" && (
            <button type="button" className="btn-upi-pay processing" disabled>
              <span className="btn-upi-spinner"></span>
              <span>Connecting to bank UPI switch...</span>
            </button>
          )}

          {paymentState === "success" && (
            <button type="button" className="btn-upi-pay success" disabled>
              <CheckCircleIcon size={20} />
              <span>Payment Verified! Allocating Token...</span>
            </button>
          )}

          <div className="upi-security-note">
            <span>🔒 256-Bit Encrypted • Contactless College Express Token</span>
          </div>
        </div>
      </div>
    </div>
  );
}
