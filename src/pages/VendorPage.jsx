import { useState, useEffect } from "react";
import StatusBadge from "../components/StatusBadge";
import { CAMPUS_CANTEENS } from "../data/canteens";
import { useAppContext } from "@/context/AppContext";
import {
  ChefIcon,
  RefreshIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  CheckCircleIcon,
  FlameIcon,
  ClockIcon,
  BellIcon,
  QueueIcon,
  ShieldCheckIcon,
  AlertTriangleIcon
} from "../components/Icons";
import QueuePage from "./QueuePage";
import SecureHandoverModal from "../components/SecureHandoverModal";

// Preset fast-pick image shortcuts for the vendor
const PHOTO_PRESETS = [
  { label: "Samosa", url: "/images/samosa.jpg" },
  { label: "Chai", url: "/images/chai.jpg" },
  { label: "Veg Patty", url: "/images/patty.jpg" },
  { label: "Paneer Roll", url: "/images/roll.jpg" },
  { label: "Cheese Maggi", url: "/images/maggi.jpg" },
  { label: "Cold Coffee", url: "/images/coffee.jpg" },
  { label: "Veg Sandwich", url: "/images/sandwich.jpg" }
];

export default function VendorPage({ onExitToHome }) {
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [activeVendorTab, setActiveVendorTab] = useState("orders");

  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  // Secure Pickup Verification Handover State
  const [selectedHandoverOrder, setSelectedHandoverOrder] = useState(null);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);

  const { canteens: ctxCanteens } = useAppContext();
  const canteensList = ctxCanteens && ctxCanteens.length > 0 ? ctxCanteens : CAMPUS_CANTEENS;

  const [selectedVendorCanteen, setSelectedVendorCanteen] = useState(() => {
    try {
      const saved = localStorage.getItem("canteenGo_vendorCanteen");
      if (saved) {
        const parsed = JSON.parse(saved);
        const match = canteensList.find((c) => (c.id || c.canteenId) === (parsed.id || parsed.canteenId));
        if (match) return match;
      }
    } catch {}
    return canteensList[0]; // Primary Canteen Hub
  });

  // Add Item Form State
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Hot Snacks");
  const [newItemCustomCategory, setNewItemCustomCategory] = useState("");
  const [newItemImage, setNewItemImage] = useState("/images/samosa.jpg");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemAvailable, setNewItemAvailable] = useState(true);

  // Edit Item State
  const [editingItemId, setEditingItemId] = useState(null);
  const [editPrice, setEditPrice] = useState("");
  const [editCategory, setEditCategory] = useState("");

  const fetchOrders = async (canteenToFetch) => {
    try {
      setLoadingOrders(true);
      // If canteenToFetch is an Event or not a valid object with an id, fallback to selectedVendorCanteen
      const targetCanteen =
        canteenToFetch && typeof canteenToFetch === "object" && typeof canteenToFetch.id === "string"
          ? canteenToFetch
          : selectedVendorCanteen;

      const canteenId = targetCanteen?.id;
      const canteenParam = canteenId ? `?canteenId=${encodeURIComponent(canteenId)}` : "";
      const res = await fetch(`/api/orders${canteenParam}`);
      if (!res.ok) throw new Error("Failed to load orders");
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchMenu = async () => {
    try {
      setLoadingMenu(true);
      const res = await fetch("/api/menu");
      if (!res.ok) throw new Error("Failed to load menu items");
      const data = await res.json();
      setMenuItems(data);
    } catch (err) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setLoadingMenu(false);
    }
  };

  useEffect(() => {
    fetchOrders(selectedVendorCanteen);
    fetchMenu();
  }, [selectedVendorCanteen]);

  const handleUpdateOrderStatus = async (orderId, nextStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderStatus: nextStatus })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update status");

      setMessage({ text: `Order updated to ${nextStatus}`, type: "success" });
      fetchOrders();
    } catch (err) {
      setMessage({ text: err.message, type: "error" });
    }
  };

  const handleInitiateHandover = (order) => {
    setSelectedHandoverOrder(order);
    setIsHandoverModalOpen(true);
  };

  const handleConfirmSecureHandover = async (orderId, pinCode, bypass) => {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderStatus: "Completed",
        verifyPickupCode: pinCode,
        bypassVerification: bypass
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to handover order");

    setMessage({ text: `✓ Order ${data.tokenNumber} verified & handed over!`, type: "success" });
    fetchOrders();
  };

  const handleTogglePaymentStatus = async (orderId, currentStatus) => {
    const nextStatus = currentStatus === "Paid" ? "Pending" : "Paid";
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: nextStatus })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update payment");

      setMessage({ text: `Payment status set to ${nextStatus}`, type: "success" });
      fetchOrders();
    } catch (err) {
      setMessage({ text: err.message, type: "error" });
    }
  };

  const handleAddMenuItem = async (e) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      setMessage({ text: "Item name cannot be empty", type: "error" });
      return;
    }
    const priceNum = parseFloat(newItemPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setMessage({ text: "Please enter a valid price", type: "error" });
      return;
    }

    const finalCategory =
      newItemCategory === "Custom"
        ? newItemCustomCategory.trim() || "Snacks"
        : newItemCategory;

    const assignedCanteenId = selectedVendorCanteen?.id || "foodcourt-34";
    const assignedCanteenName = selectedVendorCanteen?.name || "Food Court near 34 Block";
    const assignedAvailableCanteens = [assignedCanteenId];

    try {
      const res = await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newItemName.trim(),
          price: priceNum,
          category: finalCategory,
          image: newItemImage.trim() || "/images/samosa.jpg",
          description: newItemDescription.trim(),
          available: newItemAvailable,
          canteenId: assignedCanteenId,
          canteenName: assignedCanteenName,
          availableCanteens: assignedAvailableCanteens
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add menu item");

      setMessage({ text: `✓ Added "${data.name}" to ${assignedCanteenName}!`, type: "success" });
      setNewItemName("");
      setNewItemPrice("");
      setNewItemDescription("");
      setNewItemAvailable(true);
      fetchMenu();
    } catch (err) {
      setMessage({ text: err.message, type: "error" });
    }
  };

  const handleToggleAvailability = async (item) => {
    try {
      const res = await fetch(`/api/menu/${item._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available: !item.available })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update item");

      setMessage({
        text: `"${item.name}" is now ${!item.available ? "Available" : "Sold Out"}`,
        type: "success"
      });
      fetchMenu();
    } catch (err) {
      setMessage({ text: err.message, type: "error" });
    }
  };

  const handleSaveEdit = async (itemId) => {
    const priceNum = parseFloat(editPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setMessage({ text: "Please enter a valid price", type: "error" });
      return;
    }

    try {
      const res = await fetch(`/api/menu/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price: priceNum,
          category: editCategory
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update item");

      setMessage({ text: "Menu item updated successfully", type: "success" });
      setEditingItemId(null);
      setEditPrice("");
      fetchMenu();
    } catch (err) {
      setMessage({ text: err.message, type: "error" });
    }
  };

  const handleDeleteMenuItem = async (itemId, itemName) => {
    if (!window.confirm(`Are you sure you want to delete "${itemName}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/menu/${itemId}`, {
        method: "DELETE"
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete item");

      setMessage({ text: `"${itemName}" deleted from menu`, type: "success" });
      fetchMenu();
    } catch (err) {
      setMessage({ text: err.message, type: "error" });
    }
  };

  // Derive existing categories from MongoDB
  const existingCategories = [
    "Hot Snacks",
    "Beverages",
    "Meals & Wraps",
    ...new Set(menuItems.map((m) => m.category).filter(Boolean))
  ];
  const uniqueCategories = [...new Set(existingCategories)];

  const pendingCount = orders.filter((o) => o.orderStatus === "Pending").length;
  const preparingCount = orders.filter((o) => o.orderStatus === "Preparing").length;
  const readyCount = orders.filter((o) => o.orderStatus === "Ready").length;
  const totalRevenue = orders.reduce(
    (sum, o) => sum + (o.paymentStatus === "Paid" ? o.totalAmount : 0),
    0
  );

  const displayedMenuItems = menuItems.filter((item) => {
    const avail = item.availableCanteens || (item.canteenId ? [item.canteenId] : []);
    return (
      item.canteenId === selectedVendorCanteen?.id ||
      avail.includes(selectedVendorCanteen?.id) ||
      item.canteenId === "all" ||
      avail.includes("all")
    );
  });

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div className="page-header-text">
          <span className="section-pill">
            <ChefIcon size={14} /> Canteen Management Console
          </span>
          <h2 className="page-title">
            Canteen Vendor Dashboard
          </h2>
          <p className="page-description">
            Control live order preparation, advance queue stages, and manage canteen inventory dynamically.
          </p>
        </div>
        {onExitToHome && (
          <button
            type="button"
            className="btn btn-secondary btn-sm btn-vendor-logout"
            onClick={onExitToHome}
            title="Log out from this canteen console"
          >
            ← Log Out / Change Canteen
          </button>
        )}
      </div>

      {/* Specific Canteen Role Bar (Locked to logged-in canteen) */}
      <div className="vendor-canteen-switch-bar">
        <div className="vendor-canteen-info">
          <div className="vendor-canteen-icon-box" style={{ background: selectedVendorCanteen?.themeBg || "#ea580c" }}>
            <span>{selectedVendorCanteen?.icon || "🏢"}</span>
          </div>
          <div className="vendor-canteen-text">
            <div className="vendor-canteen-top-badge">
              <span className="hub-pill">SPECIFIC CANTEEN ROLE</span>
              <span className="counter-pill">{selectedVendorCanteen?.counter || "Counter 1"}</span>
            </div>
            <h3 className="vendor-canteen-name">{selectedVendorCanteen?.name || "Food Court near 34 Block"}</h3>
            <p className="vendor-canteen-sub">
              📍 {selectedVendorCanteen?.location} • {selectedVendorCanteen?.openingHours}
            </p>
          </div>
        </div>

        <div className="vendor-canteen-right-actions">
          <div className="vendor-terminal-status">
            <span className="terminal-live-dot"></span>
            <span>Active Counter Terminal</span>
          </div>
        </div>
      </div>

      {/* KPI Stats Bar with SVG Icons */}
      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-icon stat-icon-orange">
            <ClockIcon size={22} />
          </div>
          <div>
            <div className="stat-label">Total Orders</div>
            <div className="stat-value">{orders.length}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-amber">
            <FlameIcon size={22} />
          </div>
          <div>
            <div className="stat-label">Pending Orders</div>
            <div className="stat-value">{pendingCount}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-blue">
            <ChefIcon size={22} />
          </div>
          <div>
            <div className="stat-label">Cooking Now</div>
            <div className="stat-value">{preparingCount}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-green">
            <BellIcon size={22} />
          </div>
          <div>
            <div className="stat-label">Ready for Pickup</div>
            <div className="stat-value">{readyCount}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-purple">
            <span style={{ fontSize: "1.3rem", fontWeight: "800" }}>₹</span>
          </div>
          <div>
            <div className="stat-label">Paid Revenue</div>
            <div className="stat-value">₹{totalRevenue}</div>
          </div>
        </div>
      </div>

      {/* Flash Alert */}
      {message.text && (
        <div className={`alert ${message.type === "success" ? "alert-success" : "alert-error"}`}>
          <span>{message.text}</span>
          <button
            style={{ background: "none", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "1rem" }}
            onClick={() => setMessage({ text: "", type: "" })}
          >
            ✕
          </button>
        </div>
      )}

      {/* Switcher Tabs */}
      <div className="vendor-tabs-nav">
        <button
          className={`vendor-tab-btn ${activeVendorTab === "orders" ? "active" : ""}`}
          onClick={() => setActiveVendorTab("orders")}
        >
          <ClockIcon size={16} />
          <span>Live Orders Table ({orders.length})</span>
        </button>
        <button
          className={`vendor-tab-btn ${activeVendorTab === "queue" ? "active" : ""}`}
          onClick={() => setActiveVendorTab("queue")}
        >
          <QueueIcon size={16} />
          <span>Live Queue Display Board</span>
        </button>
        <button
          className={`vendor-tab-btn ${activeVendorTab === "menu" ? "active" : ""}`}
          onClick={() => setActiveVendorTab("menu")}
        >
          <ChefIcon size={16} />
          <span>Menu Inventory Management ({menuItems.length})</span>
        </button>
      </div>

      {/* Tab 1: Orders Management */}
      {activeVendorTab === "orders" && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Live Student Orders</h3>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => fetchOrders()}
              disabled={loadingOrders}
            >
              <RefreshIcon size={14} />
              <span>{loadingOrders ? "Refreshing..." : "Refresh Queue"}</span>
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="empty-vendor-state">
              <p>No orders received yet.</p>
              <small>Switch to "Student Order" tab to place a test order!</small>
            </div>
          ) : (
            <div className="table-container">
              <table className="order-table">
                <thead>
                  <tr>
                    <th>Token No.</th>
                    <th>Student Details</th>
                    <th>Items Ordered</th>
                    <th>Total</th>
                    <th>Order Status</th>
                    <th>Payment</th>
                    <th>Kitchen Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id}>
                      <td>
                        <span className="token-table-badge">
                          {order.tokenNumber}
                        </span>
                      </td>
                      <td>
                        <strong>{order.studentName}</strong>
                        <div className="table-timestamp">
                          {new Date(order.createdAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td>
                        <div className="table-items-cell">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="table-item-row">
                              <img
                                src={item.image || "/images/samosa.jpg"}
                                alt={item.name}
                                className="table-item-thumb"
                                onError={(e) => {
                                  e.target.src = "/images/samosa.jpg";
                                }}
                              />
                              <span>
                                {item.name} × <strong>{item.quantity}</strong>
                              </span>
                            </div>
                          ))}
                          {order.remarks && (
                            <div style={{ marginTop: "6px", fontSize: "0.78rem", color: "#b45309", background: "#fef3c7", padding: "3px 8px", borderRadius: "4px", border: "1px dashed #f59e0b", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <span>📝</span>
                              <strong>Note:</strong>
                              <span>{order.remarks}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <strong className="table-price">₹{order.totalAmount}</strong>
                      </td>
                      <td>
                        <StatusBadge status={order.orderStatus} type="order" />
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <StatusBadge status={order.paymentStatus} type="payment" />
                          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                            Via {order.paymentMethod}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="table-actions-stack">
                          {order.orderStatus === "Pending" && (
                            <button
                              className="btn btn-secondary btn-sm btn-action-step"
                              onClick={() => handleUpdateOrderStatus(order._id, "Preparing")}
                            >
                              <ChefIcon size={14} /> Mark Cooking
                            </button>
                          )}
                          {order.orderStatus === "Preparing" && (
                            <button
                              className="btn btn-success btn-sm btn-action-step"
                              onClick={() => handleUpdateOrderStatus(order._id, "Ready")}
                            >
                              <BellIcon size={14} /> Mark Ready
                            </button>
                          )}
                          {order.orderStatus === "Ready" && (
                            <>
                              <button
                                className="btn btn-primary btn-sm btn-action-step"
                                onClick={() => handleInitiateHandover(order)}
                              >
                                <ShieldCheckIcon size={14} /> Verify PIN & Handover
                              </button>
                              <button
                                className="btn btn-secondary btn-sm btn-action-step btn-mark-missed"
                                onClick={() => handleUpdateOrderStatus(order._id, "Missed Pickup")}
                                title="Mark missed pickup if student didn't collect in time"
                              >
                                <AlertTriangleIcon size={13} /> Missed Pickup
                              </button>
                            </>
                          )}
                          {order.orderStatus === "Missed Pickup" && (
                            <>
                              <button
                                className="btn btn-success btn-sm btn-action-step"
                                onClick={() => handleUpdateOrderStatus(order._id, "Ready")}
                              >
                                <RefreshIcon size={13} /> Restore to Ready
                              </button>
                              <button
                                className="btn btn-danger btn-sm btn-action-step"
                                onClick={() => handleUpdateOrderStatus(order._id, "Cancelled")}
                              >
                                ✕ Cancel Order
                              </button>
                            </>
                          )}
                          {order.orderStatus === "Completed" && (
                            <span className="table-collected-tag">
                              ✓ Collected
                            </span>
                          )}
                          {order.orderStatus === "Cancelled" && (
                            <span className="table-cancelled-tag">
                              ✕ Cancelled
                            </span>
                          )}

                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => handleTogglePaymentStatus(order._id, order.paymentStatus)}
                          >
                            {order.paymentStatus === "Paid" ? "Mark Unpaid" : "💵 Mark Paid"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Live Queue Board for Vendor */}
      {activeVendorTab === "queue" && (
        <div className="vendor-queue-container">
          <div className="vendor-queue-banner-notice">
            <div className="notice-left">
              <span className="section-pill">
                <QueueIcon size={14} /> Canteen Display Monitor Mode
              </span>
              <p className="notice-text">
                Live view of the student counter board. As a vendor, you can also advance orders directly using the action buttons on each card!
              </p>
            </div>
          </div>

          <QueuePage
            isVendorView={true}
            selectedCanteen={selectedVendorCanteen}
            onVendorAction={async (orderId, nextStatus) => {
              await handleUpdateOrderStatus(orderId, nextStatus);
            }}
          />
        </div>
      )}

      {/* Tab 3: Dynamic Menu Management */}
      {activeVendorTab === "menu" && (
        <div>
          {/* Add Item Dynamic Form */}
          <div className="card add-item-card">
            <h3 className="card-title" style={{ marginBottom: "16px" }}>
              <PlusIcon size={18} /> Add New Canteen Food Item
            </h3>

            <form onSubmit={handleAddMenuItem} className="add-menu-form">
              <div className="form-grid-4">
                <div className="form-group">
                  <label className="form-label" htmlFor="itemNameInput">Food Name:</label>
                  <input
                    id="itemNameInput"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Masala Dosa or Momos"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="itemPriceInput">Price (₹):</label>
                  <input
                    id="itemPriceInput"
                    type="number"
                    min="0"
                    className="form-input"
                    placeholder="e.g. 40"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category:</label>
                  <select
                    className="form-input"
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                  >
                    {uniqueCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="Custom">+ Add New Custom Category...</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Canteen (Current Hub):</label>
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1.5px solid #e2e8f0",
                      borderRadius: "10px",
                      padding: "10px 12px",
                      fontSize: "0.85rem",
                      fontWeight: "700",
                      color: "#1e293b",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <span>{selectedVendorCanteen?.icon || "🏢"}</span>
                    <span>{selectedVendorCanteen?.shortName || selectedVendorCanteen?.name}</span>
                  </div>
                </div>
              </div>

              {newItemCategory === "Custom" && (
                <div className="form-group" style={{ marginBottom: "16px" }}>
                  <label className="form-label">Type Custom Category Name:</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Chinese Snacks or South Indian"
                    value={newItemCustomCategory}
                    onChange={(e) => setNewItemCustomCategory(e.target.value)}
                  />
                </div>
              )}

              {/* Dynamic Photo URL with Quick Picker Chips */}
              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label">Item Image URL:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter image URL or pick a preset photo below"
                  value={newItemImage}
                  onChange={(e) => setNewItemImage(e.target.value)}
                />

                <div className="preset-photo-chips">
                  <span className="preset-label">Quick Photos:</span>
                  {PHOTO_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      className={`preset-chip ${newItemImage === p.url ? "selected" : ""}`}
                      onClick={() => setNewItemImage(p.url)}
                    >
                      <img src={p.url} alt={p.label} className="chip-img" />
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label">Short Description (Optional):</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Freshly fried crispy hot samosa served with tamarind chutney"
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                />
              </div>

              <div className="form-actions-bar">
                <label className="available-toggle-label">
                  <input
                    type="checkbox"
                    checked={newItemAvailable}
                    onChange={(e) => setNewItemAvailable(e.target.checked)}
                  />
                  <span>Ready in Stock (Available)</span>
                </label>

                <button type="submit" className="btn btn-primary btn-submit-item">
                  <PlusIcon size={16} /> Add Food to Menu
                </button>
              </div>
            </form>
          </div>

          {/* Active Canteen Menu Table */}
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <h3 className="card-title">
                Menu Inventory • {selectedVendorCanteen?.shortName || selectedVendorCanteen?.name} ({displayedMenuItems.length})
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => fetchMenu()} disabled={loadingMenu}>
                <RefreshIcon size={14} /> Refresh Menu
              </button>
            </div>

            <div className="table-container">
              <table className="order-table">
                <thead>
                  <tr>
                    <th>Item Photo & Name</th>
                    <th>Category</th>
                    <th>Canteen Hub</th>
                    <th>Price</th>
                    <th>Availability</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedMenuItems.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <div className="table-item-with-img">
                          <img
                            src={item.image || "/images/samosa.jpg"}
                            alt={item.name}
                            className="table-item-img"
                            onError={(e) => {
                              e.target.src = "/images/samosa.jpg";
                            }}
                          />
                          <div>
                            <strong className="table-item-title">{item.name}</strong>
                            {item.description && (
                              <div className="table-item-desc">{item.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="table-cat-badge">
                          {item.category || "Hot Snacks"}
                        </span>
                      </td>
                      <td>
                        <span className="canteen-tag-pill" style={{ fontSize: "0.74rem", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "4px 8px", borderRadius: "6px", fontWeight: "600", color: "#334155", display: "inline-block", whiteSpace: "nowrap" }}>
                          {item.canteenName || selectedVendorCanteen?.name || "34 Block Food Court"}
                        </span>
                      </td>
                      <td>
                        {editingItemId === item._id ? (
                          <div className="inline-edit-box">
                            <input
                              type="number"
                              min="0"
                              className="form-input"
                              style={{ width: "80px", padding: "4px 8px" }}
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                            />
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleSaveEdit(item._id)}
                            >
                              Save
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setEditingItemId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="price-display-wrap">
                            <strong className="table-price">₹{item.price}</strong>
                            <button
                              type="button"
                              className="btn-edit-icon"
                              title="Edit Price"
                              onClick={() => {
                                setEditingItemId(item._id);
                                setEditPrice(item.price);
                                setEditCategory(item.category || "Hot Snacks");
                              }}
                            >
                              <EditIcon size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={item.available} type="availability" />
                      </td>
                      <td>
                        <div className="table-item-actions">
                          <button
                            className={`btn btn-sm ${item.available ? "btn-secondary" : "btn-success"}`}
                            onClick={() => handleToggleAvailability(item)}
                          >
                            {item.available ? "Mark Sold Out" : "Mark Available"}
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteMenuItem(item._id, item.name)}
                            title="Delete Item"
                          >
                            <TrashIcon size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Secure Pickup Handover Modal */}
      <SecureHandoverModal
        isOpen={isHandoverModalOpen}
        order={selectedHandoverOrder}
        onClose={() => {
          setIsHandoverModalOpen(false);
          setSelectedHandoverOrder(null);
        }}
        onConfirmHandover={handleConfirmSecureHandover}
      />
    </div>
  );
}
