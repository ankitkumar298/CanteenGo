import { useState } from "react";
import { ShieldCheckIcon, CheckCircleIcon } from "./Icons";

export default function SecureHandoverModal({
  isOpen,
  order,
  onClose,
  onConfirmHandover
}) {
  const [inputCode, setInputCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [verifying, setVerifying] = useState(false);

  if (!isOpen || !order) return null;

  const handleVerify = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!inputCode.trim()) {
      setErrorMsg("Please enter the 4-digit verification code from student.");
      return;
    }

    try {
      setVerifying(true);
      await onConfirmHandover(order._id, inputCode.trim(), false);
      setInputCode("");
      onClose();
    } catch (err) {
      setErrorMsg(err.message || "Incorrect verification code. Handover rejected.");
    } finally {
      setVerifying(false);
    }
  };

  const handleBypass = async () => {
    if (window.confirm("Bypass verification code? Use only if student phone is off or dead.")) {
      try {
        setVerifying(true);
        await onConfirmHandover(order._id, "", true);
        setInputCode("");
        onClose();
      } catch (err) {
        setErrorMsg(err.message || "Failed to handover order.");
      } finally {
        setVerifying(false);
      }
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card secure-handover-card">
        <div className="modal-header secure-header">
          <div className="secure-title-wrap">
            <div className="secure-icon-badge">
              <ShieldCheckIcon size={24} />
            </div>
            <div>
              <h3 className="modal-title">Secure Pickup Verification</h3>
              <p className="modal-subtitle">
                Ask student for their 4-digit secret PIN before handing over food.
              </p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Order Details Preview */}
        <div className="secure-order-summary">
          <div className="secure-token-pill">
            <span className="token-label">TOKEN</span>
            <span className="token-val">{order.tokenNumber}</span>
          </div>

          <div className="secure-order-meta">
            <div>
              Student: <strong>{order.studentName}</strong>
            </div>
            <div className="secure-items-preview">
              {order.items?.map((it) => `${it.name} (×${it.quantity})`).join(", ")}
            </div>
            <div className="secure-price-tag">
              Total: <strong>₹{order.totalAmount}</strong> • {order.paymentStatus} ({order.paymentMethod})
            </div>
          </div>
        </div>

        {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

        {/* PIN Input Form */}
        <form onSubmit={handleVerify} className="secure-pin-form">
          <label className="form-label" style={{ textAlign: "center", display: "block" }}>
            Enter Student's 4-Digit Pickup PIN:
          </label>

          <div className="pin-input-container">
            <input
              type="text"
              maxLength="4"
              className="secure-pin-input"
              placeholder="••••"
              value={inputCode}
              onChange={(e) => {
                setErrorMsg("");
                setInputCode(e.target.value.replace(/\D/g, ""));
              }}
              autoFocus
            />
          </div>

          <p className="secure-hint">
            Student will see this code on their screen under <strong>"Your Orders"</strong> or their digital token slip.
          </p>

          <div className="secure-modal-actions">
            <button
              type="submit"
              className="btn btn-primary btn-verify-handover"
              disabled={verifying || inputCode.length < 4}
            >
              <CheckCircleIcon size={18} />
              <span>{verifying ? "Verifying..." : "Verify PIN & Complete Handover"}</span>
            </button>

            <button
              type="button"
              className="btn btn-outline btn-bypass"
              onClick={handleBypass}
              disabled={verifying}
              title="Use only if student cannot access their phone"
            >
              ⚡ Admin Bypass Verification
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
