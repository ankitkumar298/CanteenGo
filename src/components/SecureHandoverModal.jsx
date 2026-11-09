"use client";

import { useState } from "react";
import { ShieldCheckIcon, CheckCircleIcon, CashIcon } from "./Icons";

export default function SecureHandoverModal({
  isOpen,
  order,
  onClose,
  onConfirmHandover,
  onMarkPaymentPaid
}) {
  const [inputCode, setInputCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [collectingPayment, setCollectingPayment] = useState(false);

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

  const handleVerify = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    // Unpaid check
    if (!isPaid) {
      setErrorMsg(`Payment Pending! Please collect ₹${order.totalAmount} before handing over food.`);
      return;
    }

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
    if (!isPaid) {
      setErrorMsg(`Cannot bypass! Payment of ₹${order.totalAmount} is still pending.`);
      return;
    }

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
            <div className="secure-icon-badge" style={{ background: isPaid ? "#16a34a" : "#ea580c" }}>
              <ShieldCheckIcon size={24} />
            </div>
            <div>
              <h3 className="modal-title">Secure Pickup Verification</h3>
              <p className="modal-subtitle">
                {isPaid
                  ? "Ask student for their 4-digit secret PIN before handing over food."
                  : "Collect pending payment first, then verify student's 4-digit PIN."}
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
              Total Amount: <strong>₹{order.totalAmount}</strong> • Method: {order.paymentMethod}
            </div>
          </div>
        </div>

        {/* CRITICAL: Payment Status Check & 1-Click Collection */}
        {!isPaid ? (
          <div className="handover-payment-alert-box is-unpaid">
            <div className="payment-alert-left">
              <span className="payment-alert-icon">🚨</span>
              <div>
                <strong className="payment-alert-title">
                  PAYMENT UNPAID: ₹{order.totalAmount} ({order.paymentMethod})
                </strong>
                <p className="payment-alert-sub">
                  Unpaid order ka food handover blocked hai. Student se ₹{order.totalAmount} collect karein aur "Mark Paid" karein.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-collect-now"
              onClick={handleCollectPayment}
              disabled={collectingPayment}
              title="Click after receiving cash or UPI payment from student"
            >
              💵 {collectingPayment ? "Updating..." : `Collect ₹${order.totalAmount} & Mark Paid`}
            </button>
          </div>
        ) : (
          <div className="handover-payment-paid-box">
            <CheckCircleIcon size={18} />
            <span>✓ Payment Verified & Received (₹{order.totalAmount} via {order.paymentMethod})</span>
          </div>
        )}

        {errorMsg && <div className="alert alert-error" style={{ marginBottom: "12px" }}>{errorMsg}</div>}

        {/* PIN Input Form (Disabled/Locked if Unpaid) */}
        <form onSubmit={handleVerify} className="secure-pin-form">
          <label className="form-label" style={{ textAlign: "center", display: "block" }}>
            {isPaid
              ? "Enter Student's 4-Digit Pickup PIN:"
              : "🔒 Handover Locked (Collect Payment Above First):"}
          </label>

          <div className="pin-input-container">
            <input
              type="text"
              maxLength="4"
              className="secure-pin-input"
              placeholder="••••"
              value={inputCode}
              disabled={!isPaid || verifying}
              style={{ opacity: !isPaid ? 0.45 : 1, cursor: !isPaid ? "not-allowed" : "text" }}
              onChange={(e) => {
                setErrorMsg("");
                setInputCode(e.target.value.replace(/\D/g, ""));
              }}
              autoFocus={isPaid}
            />
          </div>

          <p className="secure-hint">
            {isPaid
              ? "Student will see this 4-digit code on their screen under 'Your Orders' or digital token slip."
              : "Food handover button will unlock as soon as payment is marked as Paid."}
          </p>

          {!isPaid && (
            <div className="handover-locked-notice">
              ⚠️ Handover is blocked until ₹{order.totalAmount} payment is collected!
            </div>
          )}

          <div className="secure-modal-actions" style={{ marginTop: "16px" }}>
            <button
              type="submit"
              className="btn btn-primary btn-verify-handover"
              disabled={!isPaid || verifying || inputCode.length < 4}
              style={{ opacity: !isPaid ? 0.5 : 1, cursor: !isPaid ? "not-allowed" : "pointer" }}
            >
              <CheckCircleIcon size={18} />
              <span>
                {verifying
                  ? "Verifying..."
                  : !isPaid
                  ? "🔒 Handover Blocked (Unpaid)"
                  : "Verify PIN & Complete Handover"}
              </span>
            </button>

            <button
              type="button"
              className="btn btn-outline btn-bypass"
              onClick={handleBypass}
              disabled={!isPaid || verifying}
              style={{ opacity: !isPaid ? 0.4 : 1, cursor: !isPaid ? "not-allowed" : "pointer" }}
              title={!isPaid ? "Cannot bypass unpaid order" : "Use only if student phone is dead"}
            >
              ⚡ Admin Bypass Verification
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
