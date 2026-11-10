"use client";

import { useEffect } from "react";
import { RefreshIcon } from "../Icons";

export default function MobileVendorMoreSheet({
  isOpen,
  onClose,
  onSelectSales,
  onSelectFilter,
  onRefresh,
  completedCount = 0,
  cancelledCount = 0,
  selectedCanteen = null,
  onExit = null
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop mobile-more-sheet-backdrop"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        zIndex: 10000,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 0
      }}
    >
      <div
        className="mobile-more-sheet-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          background: "#ffffff",
          borderRadius: "24px 24px 0 0",
          padding: "16px 20px 32px 20px",
          boxShadow: "0 -10px 40px rgba(0, 0, 0, 0.25)",
          animation: "mobileSheetSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          maxHeight: "85vh",
          overflowY: "auto"
        }}
      >
        {/* iOS Drag Handle */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "14px" }}>
          <div style={{ width: "40px", height: "4px", background: "#cbd5e1", borderRadius: "999px" }} />
        </div>

        {/* Sheet Title */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
          <div>
            <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
              Console Actions & History
            </h4>
            <p style={{ margin: "2px 0 0", fontSize: "0.76rem", color: "#64748b" }}>
              {selectedCanteen?.name || "Canteen Operator Terminal"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              border: "none",
              background: "#f1f5f9",
              color: "#64748b",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            ✕
          </button>
        </div>

        {/* Actions Grid / List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* Item Sales Report */}
          <button
            type="button"
            onClick={() => {
              onSelectSales();
              onClose();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 14px",
              borderRadius: "12px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#0f172a",
              fontWeight: 700,
              fontSize: "0.9rem",
              cursor: "pointer",
              textAlign: "left"
            }}
          >
            <span style={{ fontSize: "1.25rem" }}>📊</span>
            <div style={{ flex: 1 }}>
              <div>Item-wise Sales Report</div>
              <small style={{ color: "#64748b", fontSize: "0.74rem" }}>View today & monthly revenue breakdown</small>
            </div>
            <span style={{ color: "#94a3b8" }}>›</span>
          </button>

          {/* Refresh Queue */}
          <button
            type="button"
            onClick={() => {
              if (onRefresh) onRefresh();
              onClose();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 14px",
              borderRadius: "12px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#0f172a",
              fontWeight: 700,
              fontSize: "0.9rem",
              cursor: "pointer",
              textAlign: "left"
            }}
          >
            <span style={{ fontSize: "1.25rem" }}>🔄</span>
            <div style={{ flex: 1 }}>
              <div>Sync & Refresh Orders</div>
              <small style={{ color: "#64748b", fontSize: "0.74rem" }}>Fetch latest live orders from database</small>
            </div>
            <span style={{ color: "#94a3b8" }}>›</span>
          </button>

          {/* Filter: Handed Over History */}
          <button
            type="button"
            onClick={() => {
              onSelectFilter("Completed");
              onClose();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 14px",
              borderRadius: "12px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#0f172a",
              fontWeight: 700,
              fontSize: "0.9rem",
              cursor: "pointer",
              textAlign: "left"
            }}
          >
            <span style={{ fontSize: "1.25rem" }}>✓</span>
            <div style={{ flex: 1 }}>
              <div>Handed Over Orders ({completedCount})</div>
              <small style={{ color: "#64748b", fontSize: "0.74rem" }}>View completed pickup history</small>
            </div>
            <span style={{ color: "#94a3b8" }}>›</span>
          </button>

          {/* Filter: Declined / Cancelled */}
          <button
            type="button"
            onClick={() => {
              onSelectFilter("Cancelled");
              onClose();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 14px",
              borderRadius: "12px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#dc2626",
              fontWeight: 700,
              fontSize: "0.9rem",
              cursor: "pointer",
              textAlign: "left"
            }}
          >
            <span style={{ fontSize: "1.25rem" }}>✕</span>
            <div style={{ flex: 1 }}>
              <div>Declined / Cancelled Orders ({cancelledCount})</div>
              <small style={{ color: "#64748b", fontSize: "0.74rem" }}>Review rejected order requests</small>
            </div>
            <span style={{ color: "#94a3b8" }}>›</span>
          </button>

          {/* Exit Console (if provided) */}
          {onExit && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onExit();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 14px",
                borderRadius: "12px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: "pointer",
                textAlign: "left",
                marginTop: "6px"
              }}
            >
              <span style={{ fontSize: "1.25rem" }}>🚪</span>
              <div style={{ flex: 1 }}>
                <div>Exit Vendor Console</div>
                <small style={{ color: "#991b1b", fontSize: "0.74rem" }}>Return to campus main screen</small>
              </div>
              <span style={{ color: "#f87171" }}>›</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

