import { useState, useEffect } from "react";
import { CAMPUS_CANTEENS } from "../data/canteens";
import {
  ChefIcon,
  LockIcon,
  KeyIcon,
  EyeIcon,
  EyeOffIcon,
  ShieldCheckIcon,
  CheckCircleIcon
} from "./Icons";

export default function VendorLoginModal({ isOpen, onClose, onSuccess }) {
  const [selectedCanteenId, setSelectedCanteenId] = useState(() => {
    try {
      const saved = localStorage.getItem("canteenGo_vendorCanteen");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.id) return parsed.id;
      }
    } catch {}
    return CAMPUS_CANTEENS[0].id;
  });

  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setPin("");
      setError("");
      // Lock background scroll
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentCanteenObj =
    CAMPUS_CANTEENS.find((c) => c.id === selectedCanteenId) || CAMPUS_CANTEENS[0];

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!pin.trim()) {
      setError("Please enter your staff PIN.");
      return;
    }

    // Valid PINs: 1234 (default demo staff PIN) or 9999 (super-admin PIN) or 0000
    const validPins = ["1234", "9999", "0000", currentCanteenObj?.staffPin || "1234"];

    if (!validPins.includes(pin.trim())) {
      setError("Incorrect PIN. Please use default staff PIN: 1234");
      return;
    }

    // Successful login
    try {
      if (rememberMe) {
        localStorage.setItem(
          "canteenGo_vendorSession",
          JSON.stringify({
            canteenId: selectedCanteenId,
            canteenName: currentCanteenObj.name,
            loggedInAt: Date.now()
          })
        );
      }
      localStorage.setItem("canteenGo_vendorCanteen", JSON.stringify(currentCanteenObj));
    } catch {}

    if (onSuccess) {
      onSuccess(currentCanteenObj);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="vendor-login-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header */}
        <div className="vendor-login-header">
          <div className="vendor-login-avatar" style={{ background: currentCanteenObj?.themeBg || "#ea580c" }}>
            <ChefIcon size={26} />
          </div>
          <div className="vendor-login-title-wrap">
            <span className="vendor-login-pill">CANTEEN STAFF CONSOLE</span>
            <h3 className="vendor-login-title">Canteen Vendor Login</h3>
            <p className="vendor-login-sub">
              Select your canteen counter and enter your security PIN to manage orders.
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </div>

        {error && (
          <div className="vendor-login-error-banner">
            <span>⚠️ {error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="vendor-login-form">
          {/* Step 1: Select Canteen */}
          <div className="form-group" style={{ marginBottom: "16px" }}>
            <label className="vendor-field-label">
              <span>1. Select Canteen Hub:</span>
              <span className="required-star">*</span>
            </label>
            <div className="vendor-select-container">
              <select
                className="vendor-canteen-dropdown-input"
                value={selectedCanteenId}
                onChange={(e) => {
                  setSelectedCanteenId(e.target.value);
                  setError("");
                }}
              >
                {CAMPUS_CANTEENS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name} — {c.counter}
                  </option>
                ))}
              </select>
            </div>

            {/* Visual Selected Canteen Summary Card */}
            <div className="vendor-canteen-preview-box">
              <span className="preview-icon">{currentCanteenObj.icon}</span>
              <div className="preview-details">
                <strong className="preview-name">{currentCanteenObj.name}</strong>
                <span className="preview-meta">
                  {currentCanteenObj.counter} • {currentCanteenObj.location}
                </span>
              </div>
              <span className="preview-status-pill">Active Hub</span>
            </div>
          </div>

          {/* Step 2: Staff Security PIN */}
          <div className="form-group" style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label className="vendor-field-label" style={{ marginBottom: 0 }}>
                <span>2. Staff Security PIN:</span>
                <span className="required-star">*</span>
              </label>
              <span className="vendor-pin-demo-hint">
                Default PIN: <strong>1234</strong>
              </span>
            </div>

            <div className="vendor-pin-input-wrap">
              <span className="input-left-icon">
                <LockIcon size={18} />
              </span>
              <input
                type={showPin ? "text" : "password"}
                maxLength={6}
                inputMode="numeric"
                autoFocus
                className="vendor-pin-input"
                placeholder="Enter 4-digit staff PIN (e.g. 1234)"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError("");
                }}
              />
              <button
                type="button"
                className="input-eye-toggle"
                onClick={() => setShowPin(!showPin)}
                tabIndex={-1}
                title={showPin ? "Hide PIN" : "Show PIN"}
              >
                {showPin ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
              </button>
            </div>
          </div>

          {/* Remember this Device */}
          <div className="vendor-remember-row">
            <label className="vendor-checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember this canteen on this device</span>
            </label>
          </div>

          {/* Submit Action */}
          <button type="submit" className="btn btn-primary btn-vendor-login-submit">
            <KeyIcon size={16} />
            <span>Enter Vendor Dashboard →</span>
          </button>

          <div className="vendor-login-footer-info">
            <ShieldCheckIcon size={14} />
            <span>Authorized canteen staff only • Live kitchen terminal</span>
          </div>
        </form>
      </div>
    </div>
  );
}

