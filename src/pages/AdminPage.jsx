"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext";

export default function AdminPage() {
  const router = useRouter();
  const { refreshCanteens } = useAppContext();

  const [adminPin, setAdminPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");

  const [canteens, setCanteens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterTab, setFilterTab] = useState("Pending"); // Pending | Approved | Rejected | All
  const [statusBanner, setStatusBanner] = useState("");
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    try {
      const savedPin = sessionStorage.getItem("canteenGo_adminPin");
      if (savedPin) {
        setAdminPin(savedPin);
        setIsAuthenticated(true);
      }
    } catch {}
  }, []);

  const loadAllCanteens = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/canteens?includeAll=true");
      if (res.ok) {
        const data = await res.json();
        setCanteens(Array.isArray(data) ? data : []);
      }
    } catch {
      setStatusBanner("Failed to load canteen applications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAllCanteens();
    }
  }, [isAuthenticated]);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    setAuthError("");
    if (adminPin.trim() !== "admin123") {
      setAuthError("Invalid Admin Passcode. (Demo passcode: admin123)");
      return;
    }
    try {
      sessionStorage.setItem("canteenGo_adminPin", adminPin.trim());
    } catch {}
    setIsAuthenticated(true);
  };

  const handleDecision = async (canteenRecord, action) => {
    let reason = "";
    if (action === "reject") {
      const inputReason = window.prompt(
        `Reason for declining "${canteenRecord.name}"?`,
        "Incomplete campus vendor documentation"
      );
      if (inputReason === null) return;
      reason = inputReason;
    }

    setProcessingId(canteenRecord._id);
    setStatusBanner("");
    try {
      const res = await fetch(`/api/canteens/${canteenRecord._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          adminPin: adminPin.trim() || "admin123",
          reason
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatusBanner(data.message || "Action failed.");
        return;
      }

      setStatusBanner(data.message);
      await loadAllCanteens();
      if (refreshCanteens) refreshCanteens();
    } catch {
      setStatusBanner("Network error while updating approval status.");
    } finally {
      setProcessingId(null);
    }
  };

  const normalizedCanteens = canteens.map((c) => ({
    ...c,
    resolvedStatus:
      c.approvalStatus || (c.isApproved === false ? "Pending" : "Approved")
  }));

  const pendingCount = normalizedCanteens.filter((c) => c.resolvedStatus === "Pending").length;
  const approvedCount = normalizedCanteens.filter((c) => c.resolvedStatus === "Approved").length;
  const rejectedCount = normalizedCanteens.filter((c) => c.resolvedStatus === "Rejected").length;

  const displayedCanteens = normalizedCanteens.filter((c) =>
    filterTab === "All" ? true : c.resolvedStatus === filterTab
  );

  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: "420px", margin: "60px auto", padding: "24px", background: "#fff", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(15,23,42,0.06)" }}>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "2.2rem", marginBottom: "8px" }}>🛡️</div>
          <h2 style={{ margin: "0 0 6px", fontSize: "1.35rem", fontWeight: 800, color: "#0f172a" }}>
            College Admin Portal
          </h2>
          <p style={{ margin: 0, fontSize: "0.84rem", color: "#64748b" }}>
            Approve or review new campus canteen vendor applications
          </p>
        </div>

        {authError && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", padding: "10px 12px", borderRadius: "10px", fontSize: "0.82rem", fontWeight: 600, marginBottom: "14px" }}>
            ⚠️ {authError}
          </div>
        )}

        <form onSubmit={handleAdminLogin} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input
            type="password"
            placeholder="Enter Admin Passcode (Demo: admin123)"
            value={adminPin}
            onChange={(e) => setAdminPin(e.target.value)}
            style={{ padding: "12px 14px", borderRadius: "12px", border: "1.5px solid #cbd5e1", fontSize: "0.95rem", outline: "none" }}
            required
          />
          <button
            type="submit"
            style={{ padding: "12px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg, #ea580c, #c2410c)", color: "#fff", fontWeight: 800, fontSize: "0.95rem", cursor: "pointer" }}
          >
            Unlock Admin Dashboard
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            style={{ padding: "10px", borderRadius: "10px", border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontWeight: 700, fontSize: "0.84rem", cursor: "pointer" }}
          >
            ← Back to Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "20px 16px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" }}>
            🛡️ College Admin — Vendor Approvals
          </h1>
          <p style={{ margin: 0, fontSize: "0.86rem", color: "#64748b" }}>
            Only approved canteens become visible to students on CanteenGo
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            onClick={loadAllCanteens}
            style={{ padding: "8px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", background: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}
          >
            🔄 Refresh
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            style={{ padding: "8px 14px", borderRadius: "10px", border: "1px solid #fed7aa", background: "#fff7ed", color: "#ea580c", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}
          >
            ← Login Page
          </button>
        </div>
      </div>

      {statusBanner && (
        <div style={{ background: "#f0fdf4", border: "1px solid #86efac", color: "#15803d", padding: "12px 16px", borderRadius: "12px", fontWeight: 700, fontSize: "0.88rem", marginBottom: "16px" }}>
          {statusBanner}
        </div>
      )}

      {/* Summary Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "16px", padding: "14px 18px" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#b45309" }}>Pending Approval</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#92400e" }}>{pendingCount}</div>
        </div>
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "16px", padding: "14px 18px" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#15803d" }}>Approved (Live)</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#166534" }}>{approvedCount}</div>
        </div>
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "16px", padding: "14px 18px" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#b91c1c" }}>Rejected</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#991b1b" }}>{rejectedCount}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
        {["Pending", "Approved", "Rejected", "All"].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilterTab(tab)}
            style={{
              padding: "7px 16px",
              borderRadius: "999px",
              border: filterTab === tab ? "1px solid #ea580c" : "1px solid #e2e8f0",
              background: filterTab === tab ? "#ea580c" : "#ffffff",
              color: filterTab === tab ? "#ffffff" : "#475569",
              fontWeight: 700,
              fontSize: "0.82rem",
              cursor: "pointer"
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#64748b", fontWeight: 600 }}>
          Loading vendor requests...
        </div>
      ) : displayedCanteens.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", background: "#fff", borderRadius: "18px", border: "1px solid #e2e8f0", color: "#64748b", fontWeight: 600 }}>
          No canteens found in &ldquo;{filterTab}&rdquo; tab.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {displayedCanteens.map((c) => (
            <div
              key={c._id}
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "18px",
                padding: "18px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "16px",
                boxShadow: "0 4px 12px rgba(15,23,42,0.04)"
              }}
            >
              <div style={{ flex: 1, minWidth: "240px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "1.3rem" }}>{c.icon || "🏪"}</span>
                  <h3 style={{ margin: 0, fontSize: "1.08rem", fontWeight: 800, color: "#0f172a" }}>
                    {c.name}
                  </h3>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      padding: "3px 10px",
                      borderRadius: "999px",
                      background:
                        c.resolvedStatus === "Approved"
                          ? "#dcfce7"
                          : c.resolvedStatus === "Rejected"
                            ? "#fee2e2"
                            : "#fef3c7",
                      color:
                        c.resolvedStatus === "Approved"
                          ? "#15803d"
                          : c.resolvedStatus === "Rejected"
                            ? "#b91c1c"
                            : "#b45309"
                    }}
                  >
                    {c.resolvedStatus}
                  </span>
                </div>
                <div style={{ fontSize: "0.82rem", color: "#475569", display: "flex", flexWrap: "wrap", gap: "12px" }}>
                  <span>📍 {c.location || "Campus Block"}</span>
                  <span>🪟 {c.counter || "Counter 1"}</span>
                  <span>🕒 {c.openingHours || "9 AM - 9 PM"}</span>
                </div>
                {(c.ownerName || c.ownerPhone) && (
                  <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "6px" }}>
                    👤 Owner: <strong>{c.ownerName || "N/A"}</strong> • 📱 {c.ownerPhone || "N/A"}
                  </div>
                )}
                {c.resolvedStatus === "Rejected" && c.rejectionReason && (
                  <div style={{ fontSize: "0.78rem", color: "#dc2626", marginTop: "6px", fontWeight: 600 }}>
                    Reason: {c.rejectionReason}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {c.resolvedStatus !== "Approved" && (
                  <button
                    type="button"
                    disabled={processingId === c._id}
                    onClick={() => handleDecision(c, "approve")}
                    style={{
                      padding: "9px 16px",
                      borderRadius: "10px",
                      border: "none",
                      background: "#16a34a",
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: "0.82rem",
                      cursor: "pointer"
                    }}
                  >
                    {processingId === c._id ? "Updating..." : "✅ Approve & Go Live"}
                  </button>
                )}
                {c.resolvedStatus !== "Rejected" && (
                  <button
                    type="button"
                    disabled={processingId === c._id}
                    onClick={() => handleDecision(c, "reject")}
                    style={{
                      padding: "9px 16px",
                      borderRadius: "10px",
                      border: "1px solid #fecaca",
                      background: "#fef2f2",
                      color: "#dc2626",
                      fontWeight: 800,
                      fontSize: "0.82rem",
                      cursor: "pointer"
                    }}
                  >
                    ❌ Reject
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
