"use client";

import { useState } from "react";
import { ShieldCheckIcon, CheckCircleIcon } from "./Icons";

export default function SecureHandoverModal({
  isOpen,
  order,
  onClose,
  onConfirmHandover,
  onMarkPaymentPaid,
  onCallOut
}) {
  const [inputCode, setInputCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [collectingPayment, setCollectingPayment] = useState(false);
  const [callingOut, setCallingOut] = useState(false);
  const [calledSuccess, setCalledSuccess] = useState(false);

  if (!isOpen || !order) return null;

  const isPaid = order.paymentStatus === "Paid";

  const handleCollectPayment = async () => {
    if (!onMarkPaymentPaid) return;
    try {
      setCollectingPayment(true);
      setErrorMsg("");
      await onMarkPaymentPaid(order._id);
    } catch (err) {
      setErrorMsg(err.message || "Failed to mark payment as Paid");
    } finally {
      setCollectingPayment(false);
    }
  };

  const handleCallOut = async () => {
    try {
      setCallingOut(true);
      setErrorMsg("");
      if (onCallOut) {
        await onCallOut(order._id);
      } else {
        await fetch(`/api/orders/${order._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callOut: true })
        });
      }
      setCalledSuccess(true);
      setTimeout(() => setCalledSuccess(false), 3500);
    } catch (err) {
      setErrorMsg("Failed to send call-out notification");
    } finally {
      setCallingOut(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!isPaid) {
      setErrorMsg(`Payment pending. Please collect ₹${order.totalAmount} before releasing order.`);
      return;
    }

    if (!inputCode.trim()) {
      setErrorMsg("Please enter the 4-digit verification PIN provided by the student.");
      return;
    }

    try {
      setVerifying(true);
      await onConfirmHandover(order._id, inputCode.trim(), false);
      setInputCode("");
      onClose();
    } catch (err) {
      setErrorMsg(err.message || "Invalid pickup code. Handover rejected.");
    } finally {
      setVerifying(false);
    }
  };

  const handleBypass = async () => {
    if (!isPaid) {
      setErrorMsg(`Cannot bypass. Payment of ₹${order.totalAmount} is still pending.`);
      return;
    }

    if (window.confirm("Bypass pickup verification code? (Use only if student cannot access their phone)")) {
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
        {/* Header */}
        <div className="secure-header">
          <div className="secure-title-wrap">
            <div className="secure-icon-badge" style={{ background: isPaid ? "#f0fdf4" : "#fff7ed", color: isPaid ? "#16a34a" : "#ea580c", borderColor: isPaid ? "#bbf7d0" : "#fed7aa" }}>
              <ShieldCheckIcon size={22} />
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: "1.15rem", margin: 0, fontWeight: 800 }}>
                Pickup Verification
              </h3>
              <p className="modal-subtitle" style={{ fontSize: "0.78rem", margin: "2px 0 0", color: "#64748b" }}>
                {isPaid
                  ? "Verify student's 4-digit PIN to complete handover."
                  : "Collect pending payment before verifying handover PIN."}
              </p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Order Details Preview with Fast Call-Out Button */}
        <div className="secure-order-summary" style={{ padding: "10px 14px", gap: "12px" }}>
          <div className="secure-token-pill" style={{ padding: "6px 12px" }}>
            <span className="token-label">TOKEN</span>
            <span className="token-val" style={{ fontSize: "1.25rem" }}>{order.tokenNumber}</span>
          </div>

          <div className="secure-order-meta">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, color: "#0f172a" }}>👤 {order.studentName}</span>
              <button
                type="button"
                className={`btn-kiosk-call ${calledSuccess ? "is-called" : ""}`}
                style={{
                  fontSize: "0.74rem",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background: calledSuccess ? "#16a34a" : "#0f172a",
                  flex: "unset"
                }}
                onClick={handleCallOut}
                disabled={callingOut}
                title="Send live call-out notification to student's phone"
              >
                <span>{calledSuccess ? "✓ Token Called!" : callingOut ? "Calling..." : "📢 Call Out Token"}</span>
              </button>
            </div>
            <div className="secure-items-preview" style={{ fontSize: "0.76rem" }}>
              {order.items?.map((it) => `${it.name} (×${it.quantity})`).join(", ")}
            </div>
            <div className="secure-price-tag" style={{ fontSize: "0.78rem", color: "#475569" }}>
              Bill Amount: <strong>₹{order.totalAmount}</strong> • Method: {order.paymentMethod}
            </div>
          </div>
        </div>

        {/* Payment Status Banner */}
        {!isPaid ? (
          <div className="handover-payment-alert-box is-unpaid" style={{ margin: 0, padding: "10px 12px" }}>
            <div className="payment-alert-left">
              <span className="payment-alert-icon" style={{ fontSize: "1.2rem" }}>⚠️</span>
              <div>
                <strong className="payment-alert-title" style={{ fontSize: "0.85rem" }}>
                  PAYMENT PENDING: ₹{order.totalAmount} ({order.paymentMethod})
                </strong>
                <p className="payment-alert-sub" style={{ fontSize: "0.74rem" }}>
                  Please collect payment from the student before releasing this food order.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-collect-now"
              style={{ fontSize: "0.78rem", padding: "6px 12px" }}
              onClick={handleCollectPayment}
              disabled={collectingPayment}
              title="Click after receiving cash or UPI payment from student"
            >
              💵 {collectingPayment ? "Updating..." : `Mark ₹${order.totalAmount} as Paid`}
            </button>
          </div>
        ) : (
          <div className="handover-payment-paid-box" style={{ margin: 0, padding: "8px 12px" }}>
            <CheckCircleIcon size={16} />
            <span>✓ Payment Verified (₹{order.totalAmount} • {order.paymentMethod})</span>
          </div>
        )}

        {errorMsg && (
          <div className="alert alert-error" style={{ margin: 0, padding: "8px 12px", fontSize: "0.8rem" }}>
            {errorMsg}
          </div>
        )}

        {/* PIN Input Form */}
        <form onSubmit={handleVerify} className="secure-pin-form" style={{ gap: "10px" }}>
          <label className="form-label" style={{ textAlign: "center", display: "block", fontSize: "0.82rem", margin: 0 }}>
            {isPaid
              ? "Enter Student's 4-Digit Pickup PIN:"
              : "🔒 Handover Locked (Collect Payment First):"}
          </label>

          <div className="pin-input-container">
            <input
              type="text"
              maxLength="4"
              className="secure-pin-input"
              style={{
                width: "180px",
                height: "46px",
                fontSize: "1.7rem",
                letterSpacing: "8px",
                opacity: !isPaid ? 0.45 : 1,
                cursor: !isPaid ? "not-allowed" : "text"
              }}
              placeholder="••••"
              value={inputCode}
              disabled={!isPaid || verifying}
              onChange={(e) => {
                setErrorMsg("");
                setInputCode(e.target.value.replace(/\D/g, ""));
              }}
              autoFocus={isPaid}
            />
          </div>

          <p className="secure-hint" style={{ fontSize: "0.74rem" }}>
            {isPaid
              ? "The student can find this 4-digit code on their digital token slip."
              : "Food handover button will unlock automatically once payment is marked as paid."}
          </p>

          <div className="secure-modal-actions" style={{ gap: "8px", marginTop: "4px" }}>
            <button
              type="submit"
              className="btn btn-primary btn-verify-handover"
              disabled={!isPaid || verifying || inputCode.length < 4}
              style={{
                padding: "9px 14px",
                fontSize: "0.88rem",
                opacity: !isPaid ? 0.5 : 1,
                cursor: !isPaid ? "not-allowed" : "pointer"
              }}
            >
              <CheckCircleIcon size={16} />
              <span>
                {verifying
                  ? "Verifying..."
                  : !isPaid
                  ? "🔒 Handover Locked (Unpaid)"
                  : "Verify PIN & Complete Handover"}
              </span>
            </button>

            <button
              type="button"
              className="btn btn-outline btn-bypass"
              onClick={handleBypass}
              disabled={!isPaid || verifying}
              style={{
                padding: "6px",
                fontSize: "0.76rem",
                opacity: !isPaid ? 0.4 : 1,
                cursor: !isPaid ? "not-allowed" : "pointer"
              }}
              title={!isPaid ? "Cannot bypass unpaid order" : "Use only if student phone is dead"}
            >
              ⚡ Admin Bypass Verification Code
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
