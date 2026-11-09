"use client";

import { useState, useMemo } from "react";
import { CheckCircleIcon } from "./Icons";

export default function VendorSalesReportModal({
  isOpen,
  onClose,
  orders = [],
  selectedCanteen = null
}) {
  const [period, setPeriod] = useState("today"); // "today" | "monthly" | "all"
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("revenue-desc"); // "revenue-desc" | "qty-desc" | "name-asc" | "price-desc"

  if (!isOpen) return null;

  const targetCanteenId = selectedCanteen?.id || selectedCanteen?.canteenId;
  const targetCanteenName = selectedCanteen?.name || selectedCanteen?.shortName;

  // Filter orders strictly for the selected canteen and exclude cancelled orders
  const scopedCanteenOrders = useMemo(() => {
    return orders.filter((order) => {
      // Exclude cancelled/declined orders from sales totals
      if (order.orderStatus === "Cancelled") return false;

      // Scoped canteen check
      if (targetCanteenId && order.canteenId) {
        if (order.canteenId === targetCanteenId) return true;
      }
      if (targetCanteenId && order.items && order.items.length > 0) {
        const hasItemFromCanteen = order.items.some((it) => it.canteenId === targetCanteenId);
        if (hasItemFromCanteen) return true;
      }
      if (targetCanteenName && order.canteenName) {
        const orderCanteenLower = order.canteenName.toLowerCase().trim();
        const targetCanteenLower = targetCanteenName.toLowerCase().trim();
        if (orderCanteenLower.includes(targetCanteenLower) || targetCanteenLower.includes(orderCanteenLower)) {
          return true;
        }
      }
      // If order has no explicit canteenId/name tag, it belongs to the fetched scope
      return true;
    });
  }, [orders, targetCanteenId, targetCanteenName]);

  // Filter by selected time period
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();

    return scopedCanteenOrders.filter((order) => {
      if (!order.createdAt) return true;
      const orderDate = new Date(order.createdAt);

      if (period === "today") {
        return (
          orderDate.getFullYear() === currentYear &&
          orderDate.getMonth() === currentMonth &&
          orderDate.getDate() === currentDate
        );
      }

      if (period === "monthly") {
        return (
          orderDate.getFullYear() === currentYear &&
          orderDate.getMonth() === currentMonth
        );
      }

      return true; // "all"
    });
  }, [scopedCanteenOrders, period]);

  // Aggregate item-wise sales and high-level KPIs
  const { itemsList, totalRevenue, totalUnitsSold, cashRevenue, onlineRevenue, paidRevenue, pendingRevenue } = useMemo(() => {
    const map = {};
    let rev = 0;
    let units = 0;
    let cash = 0;
    let online = 0;
    let paid = 0;
    let pending = 0;

    filteredOrders.forEach((order) => {
      const orderTotal = Number(order.totalAmount) || 0;
      rev += orderTotal;

      if (order.paymentMethod === "Cash") {
        cash += orderTotal;
      } else {
        online += orderTotal;
      }

      if (order.paymentStatus === "Paid") {
        paid += orderTotal;
      } else {
        pending += orderTotal;
      }

      if (Array.isArray(order.items)) {
        order.items.forEach((item) => {
          // If item belongs to another canteen, skip
          if (item.canteenId && targetCanteenId && item.canteenId !== targetCanteenId) {
            return;
          }

          const rawName = (item.name || "Unnamed Item").trim();
          const itemQty = Number(item.quantity) || 1;
          const itemPrice = Number(item.price) || 0;
          const itemSubtotal = itemQty * itemPrice;

          units += itemQty;

          if (!map[rawName]) {
            map[rawName] = {
              name: rawName,
              price: itemPrice,
              image: item.image || "/images/samosa.jpg",
              category: item.category || "Canteen Item",
              quantity: 0,
              revenue: 0,
              orderAppearances: 0
            };
          }

          map[rawName].quantity += itemQty;
          map[rawName].revenue += itemSubtotal;
          map[rawName].orderAppearances += 1;
        });
      }
    });

    const list = Object.values(map).map((item) => ({
      ...item,
      percentage: rev > 0 ? Math.round((item.revenue / rev) * 100) : 0
    }));

    return {
      itemsList: list,
      totalRevenue: rev,
      totalUnitsSold: units,
      cashRevenue: cash,
      onlineRevenue: online,
      paidRevenue: paid,
      pendingRevenue: pending
    };
  }, [filteredOrders, targetCanteenId]);

  // Search and Sort
  const displayedItems = useMemo(() => {
    let result = [...itemsList];

    if (itemSearchQuery.trim()) {
      const query = itemSearchQuery.toLowerCase().trim();
      result = result.filter(
        (it) =>
          it.name.toLowerCase().includes(query) ||
          it.category.toLowerCase().includes(query)
      );
    }

    result.sort((a, b) => {
      if (sortBy === "revenue-desc") return b.revenue - a.revenue;
      if (sortBy === "qty-desc") return b.quantity - a.quantity;
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      if (sortBy === "price-desc") return b.price - a.price;
      return 0;
    });

    return result;
  }, [itemsList, itemSearchQuery, sortBy]);

  const topSellingItem = itemsList.length > 0
    ? [...itemsList].sort((a, b) => b.quantity - a.quantity)[0]
    : null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card sales-report-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "840px",
          width: "95%",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden"
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#ffffff"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: selectedCanteen?.themeBg || "#ea580c",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.3rem",
                color: "#ffffff"
              }}
            >
              {selectedCanteen?.icon || "📊"}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>
                  Item-wise Sales Report
                </h3>
                <span
                  style={{
                    background: "#f1f5f9",
                    color: "#0f172a",
                    padding: "2px 8px",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: 700
                  }}
                >
                  {selectedCanteen?.name || "Selected Canteen"}
                </span>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                Detailed revenue and quantity breakdown by food item for this canteen only.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "#f1f5f9",
              border: "none",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              cursor: "pointer",
              fontSize: "1.1rem",
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {/* Period Selection Controls */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              marginBottom: "20px"
            }}
          >
            <div
              style={{
                display: "inline-flex",
                background: "#f1f5f9",
                borderRadius: "12px",
                padding: "4px",
                gap: "4px"
              }}
            >
              <button
                type="button"
                onClick={() => setPeriod("today")}
                style={{
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  background: period === "today" ? "#ffffff" : "transparent",
                  color: period === "today" ? "#0f172a" : "#64748b",
                  boxShadow: period === "today" ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s ease"
                }}
              >
                📅 Today&apos;s Sales
              </button>

              <button
                type="button"
                onClick={() => setPeriod("monthly")}
                style={{
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  background: period === "monthly" ? "#ffffff" : "transparent",
                  color: period === "monthly" ? "#0f172a" : "#64748b",
                  boxShadow: period === "monthly" ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s ease"
                }}
              >
                🗓️ This Month ({new Date().toLocaleString("en-US", { month: "short" })})
              </button>

              <button
                type="button"
                onClick={() => setPeriod("all")}
                style={{
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  background: period === "all" ? "#ffffff" : "transparent",
                  color: period === "all" ? "#0f172a" : "#64748b",
                  boxShadow: period === "all" ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s ease"
                }}
              >
                ⏳ All Time
              </button>
            </div>

            <div style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 600 }}>
              Showing {filteredOrders.length} {filteredOrders.length === 1 ? "order" : "orders"} in {period === "today" ? "Today" : period === "monthly" ? "This Month" : "All Time"}
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: "14px",
              marginBottom: "24px"
            }}
          >
            {/* Total Revenue */}
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "14px",
                padding: "16px"
              }}
            >
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>
                Total Revenue
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "#15803d", marginTop: "4px" }}>
                ₹{totalRevenue.toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize: "0.74rem", color: "#166534", marginTop: "4px" }}>
                Paid: ₹{paidRevenue} • Pending: ₹{pendingRevenue}
              </div>
            </div>

            {/* Total Units Sold */}
            <div
              style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "14px",
                padding: "16px"
              }}
            >
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#1e40af", textTransform: "uppercase" }}>
                Items Sold
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "#2563eb", marginTop: "4px" }}>
                {totalUnitsSold} <span style={{ fontSize: "1rem", fontWeight: 600 }}>units</span>
              </div>
              <div style={{ fontSize: "0.74rem", color: "#1e40af", marginTop: "4px" }}>
                Across {itemsList.length} menu items
              </div>
            </div>

            {/* Orders Count */}
            <div
              style={{
                background: "#fdf4ff",
                border: "1px solid #f5d0fe",
                borderRadius: "14px",
                padding: "16px"
              }}
            >
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#86198f", textTransform: "uppercase" }}>
                Orders Processed
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "#a21caf", marginTop: "4px" }}>
                {filteredOrders.length}
              </div>
              <div style={{ fontSize: "0.74rem", color: "#86198f", marginTop: "4px" }}>
                Avg ticket: ₹{filteredOrders.length > 0 ? Math.round(totalRevenue / filteredOrders.length) : 0}
              </div>
            </div>

            {/* Payment Method Split */}
            <div
              style={{
                background: "#fff7ed",
                border: "1px solid #fed7aa",
                borderRadius: "14px",
                padding: "16px"
              }}
            >
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#9a3412", textTransform: "uppercase" }}>
                Payment Channels
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#c2410c", marginTop: "8px" }}>
                💵 Cash: ₹{cashRevenue}
              </div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#ea580c", marginTop: "2px" }}>
                💳 UPI / Online: ₹{onlineRevenue}
              </div>
            </div>
          </div>

          {/* Top Selling Highlight (if exists) */}
          {topSellingItem && (
            <div
              style={{
                background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "12px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                marginBottom: "20px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "1.5rem" }}>⭐</span>
                <div>
                  <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Top Selling Item ({period === "today" ? "Today" : period === "monthly" ? "This Month" : "All Time"})
                  </div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>
                    {topSellingItem.name} — {topSellingItem.quantity} plates sold (₹{topSellingItem.revenue.toLocaleString("en-IN")})
                  </div>
                </div>
              </div>

              <span
                style={{
                  background: "#dcfce7",
                  color: "#166534",
                  padding: "4px 10px",
                  borderRadius: "20px",
                  fontSize: "0.75rem",
                  fontWeight: 800
                }}
              >
                {topSellingItem.percentage}% of canteen revenue
              </span>
            </div>
          )}

          {/* Search & Sort Controls for Items */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              marginBottom: "16px"
            }}
          >
            <div style={{ position: "relative", flex: "1 1 240px", maxWidth: "360px" }}>
              <input
                type="text"
                placeholder="Search food item..."
                value={itemSearchQuery}
                onChange={(e) => setItemSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 14px 8px 34px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  outline: "none"
                }}
              />
              <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>
                🔍
              </span>
              {itemSearchQuery && (
                <button
                  type="button"
                  onClick={() => setItemSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer"
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: "7px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  color: "#0f172a",
                  cursor: "pointer",
                  outline: "none"
                }}
              >
                <option value="revenue-desc">Highest Revenue (₹)</option>
                <option value="qty-desc">Most Quantity Sold</option>
                <option value="name-asc">Item Name (A-Z)</option>
                <option value="price-desc">Unit Price (High to Low)</option>
              </select>
            </div>
          </div>

          {/* Item Breakdown Table / List */}
          {displayedItems.length === 0 ? (
            <div
              style={{
                padding: "48px 20px",
                textAlign: "center",
                background: "#f8fafc",
                borderRadius: "14px",
                border: "1px dashed #cbd5e1"
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🍽️</div>
              <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#334155" }}>
                No item sales recorded for {period === "today" ? "today" : period === "monthly" ? "this month" : "this period"}
              </h4>
              <p style={{ margin: "6px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                {itemSearchQuery
                  ? `No items matched "${itemSearchQuery}". Try clearing search.`
                  : "Completed student orders for this canteen will populate item sales here automatically."}
              </p>
            </div>
          ) : (
            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                overflow: "hidden",
                background: "#ffffff"
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ padding: "10px 16px", fontSize: "0.75rem", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                      Item Details
                    </th>
                    <th style={{ padding: "10px 16px", fontSize: "0.75rem", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                      Unit Price
                    </th>
                    <th style={{ padding: "10px 16px", fontSize: "0.75rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", textAlign: "center" }}>
                      Quantity Sold
                    </th>
                    <th style={{ padding: "10px 16px", fontSize: "0.75rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", textAlign: "right" }}>
                      Total Revenue
                    </th>
                    <th style={{ padding: "10px 16px", fontSize: "0.75rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", width: "160px" }}>
                      Revenue Share
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayedItems.map((item, index) => (
                    <tr
                      key={item.name}
                      style={{
                        borderBottom: index < displayedItems.length - 1 ? "1px solid #f1f5f9" : "none",
                        transition: "background 0.15s ease"
                      }}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <img
                            src={item.image}
                            alt={item.name}
                            onError={(e) => {
                              e.target.src = "/images/samosa.jpg";
                            }}
                            style={{
                              width: "38px",
                              height: "38px",
                              borderRadius: "8px",
                              objectFit: "cover",
                              border: "1px solid #e2e8f0"
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>
                              {item.name}
                            </div>
                            <div style={{ fontSize: "0.74rem", color: "#64748b" }}>
                              {item.category} • Ordered in {item.orderAppearances} {item.orderAppearances === 1 ? "order" : "orders"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "12px 16px", fontSize: "0.85rem", fontWeight: 600, color: "#334155" }}>
                        ₹{item.price}
                      </td>

                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <span
                          style={{
                            background: "#f1f5f9",
                            color: "#0f172a",
                            padding: "4px 10px",
                            borderRadius: "12px",
                            fontWeight: 800,
                            fontSize: "0.85rem",
                            display: "inline-block"
                          }}
                        >
                          {item.quantity} units
                        </span>
                      </td>

                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <strong style={{ fontSize: "0.95rem", color: "#16a34a", fontWeight: 800 }}>
                          ₹{item.revenue.toLocaleString("en-IN")}
                        </strong>
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div
                            style={{
                              flex: 1,
                              background: "#e2e8f0",
                              height: "8px",
                              borderRadius: "4px",
                              overflow: "hidden"
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(100, Math.max(item.percentage, 2))}%`,
                                background: item.percentage > 30 ? "#16a34a" : item.percentage > 15 ? "#0284c7" : "#f59e0b",
                                height: "100%",
                                borderRadius: "4px"
                              }}
                            />
                          </div>
                          <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#64748b", minWidth: "32px" }}>
                            {item.percentage}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid #e2e8f0",
            background: "#f8fafc",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px"
          }}
        >
          <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
            🔒 Scoped strictly to <strong>{selectedCanteen?.name || "this canteen"}</strong>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            style={{ fontWeight: 700 }}
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}
