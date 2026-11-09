import { useState, useEffect, useRef, useMemo } from "react";
import StatusBadge from "../components/StatusBadge";
import { CAMPUS_CANTEENS, getItemPriceForCanteen, isItemAvailableAtCanteen } from "../data/canteens";
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
  AlertTriangleIcon,
  UploadIcon,
  ImageIcon,
  SearchIcon,
  VolumeIcon
} from "../components/Icons";
import QueuePage from "./QueuePage";
import SecureHandoverModal from "../components/SecureHandoverModal";
import DeclineOrderModal from "../components/DeclineOrderModal";
import VendorLiveQueueBoard from "../components/VendorLiveQueueBoard";

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

  // View mode: "cards" (KDS kitchen cards) or "table"
  const [viewMode, setViewMode] = useState("cards");

  // Search & Filter state for orders
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Menu Search
  const [menuSearchQuery, setMenuSearchQuery] = useState("");

  // Sound chime settings & synthesis
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem("canteenGo_vendorSound") !== "false";
    } catch {
      return true;
    }
  });

  // Auto-refresh timer state
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshCountdown, setRefreshCountdown] = useState(10);

  // Secure Pickup Handover & Decline Modals
  const [selectedHandoverOrder, setSelectedHandoverOrder] = useState(null);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);

  const [selectedDeclineOrder, setSelectedDeclineOrder] = useState(null);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);

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
    return canteensList[0];
  });

  // Track previous pending count to trigger audio alert for incoming orders
  const prevPendingCountRef = useRef(null);

  // Synthesize kitchen chime bell using Web Audio API (100% reliable, zero external files)
  const playKitchenChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      // Harmonious double chime: E5 (659Hz) -> A5 (880Hz)
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.setValueAtTime(880.0, now + 0.14);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.7);
    } catch {}
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem("canteenGo_vendorSound", String(next));
    } catch {}
    if (next) {
      playKitchenChime();
      setMessage({ text: "🔔 Kitchen audio notifications enabled!", type: "success" });
    } else {
      setMessage({ text: "🔕 Kitchen audio notifications muted", type: "info" });
    }
  };

  // Add Item Form State
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Hot Snacks");
  const [newItemCustomCategory, setNewItemCustomCategory] = useState("");
  const [newItemImage, setNewItemImage] = useState("/images/samosa.jpg");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemAvailable, setNewItemAvailable] = useState(true);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage({ text: "Please select a valid image file (PNG, JPG, WEBP, etc.)", type: "error" });
      return;
    }

    setIsUploadingImage(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (!dataUrl) {
        setIsUploadingImage(false);
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 800;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.82);
          setNewItemImage(compressed);
          setImageLoadError(false);
          setIsUploadingImage(false);
          setMessage({ text: `Image "${file.name}" uploaded successfully!`, type: "success" });
        } catch {
          setNewItemImage(dataUrl);
          setImageLoadError(false);
          setIsUploadingImage(false);
        }
      };
      img.onerror = () => {
        setNewItemImage(dataUrl);
        setImageLoadError(false);
        setIsUploadingImage(false);
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      setIsUploadingImage(false);
      setMessage({ text: "Failed to read image file. Please try another image.", type: "error" });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Edit Item State
  const [editingItemId, setEditingItemId] = useState(null);
  const [editPrice, setEditPrice] = useState("");
  const [editCategory, setEditCategory] = useState("");

  const fetchOrders = async (canteenToFetch, isBackground = false) => {
    try {
      if (!isBackground) setLoadingOrders(true);
      const targetCanteen =
        canteenToFetch && typeof canteenToFetch === "object" && typeof canteenToFetch.id === "string"
          ? canteenToFetch
          : selectedVendorCanteen;

      const canteenId = targetCanteen?.id;
      const canteenParam = canteenId ? `?canteenId=${encodeURIComponent(canteenId)}` : "";
      const res = await fetch(`/api/orders${canteenParam}`);
      if (!res.ok) throw new Error("Failed to load orders");
      const data = await res.json();

      // Check if a brand-new Pending order has arrived
      const currentPendingCount = data.filter((o) => o.orderStatus === "Pending").length;
      if (prevPendingCountRef.current !== null && currentPendingCount > prevPendingCountRef.current) {
        playKitchenChime();
        setMessage({ text: "⚡ New order request received! Please Accept or Decline.", type: "success" });
      }
      prevPendingCountRef.current = currentPendingCount;

      setOrders(data);
    } catch (err) {
      if (!isBackground) {
        setMessage({ text: err.message, type: "error" });
      }
    } finally {
      if (!isBackground) setLoadingOrders(false);
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

  // Initial load
  useEffect(() => {
    fetchOrders(selectedVendorCanteen);
    fetchMenu();
  }, [selectedVendorCanteen]);

  // Auto-refresh countdown effect (every 10 seconds)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          fetchOrders(selectedVendorCanteen, true);
          return 10;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedVendorCanteen]);

  // Order state update (Accept, Ready, etc.)
  const handleUpdateOrderStatus = async (orderId, nextStatus, extraPayload = {}) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderStatus: nextStatus, ...extraPayload })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update status");

      if (nextStatus === "Preparing") {
        setMessage({ text: `✓ Order ${data.tokenNumber || ""} Accepted! Now cooking in kitchen.`, type: "success" });
      } else if (nextStatus === "Ready") {
        setMessage({ text: `✓ Order ${data.tokenNumber || ""} marked Ready for counter pickup!`, type: "success" });
      } else {
        setMessage({ text: `Order updated to ${nextStatus}`, type: "success" });
      }

      fetchOrders(selectedVendorCanteen, true);
    } catch (err) {
      setMessage({ text: err.message, type: "error" });
    }
  };

  // Decline Order Workflow
  const handleInitiateDecline = (order) => {
    setSelectedDeclineOrder(order);
    setIsDeclineModalOpen(true);
  };

  const handleConfirmDeclineOrder = async (orderId, reason) => {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderStatus: "Cancelled",
        cancellationReason: reason
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to decline order");

    setMessage({
      text: `✕ Order ${data.tokenNumber || ""} declined with reason: "${reason}". Student notified.`,
      type: "info"
    });
    fetchOrders(selectedVendorCanteen, true);
  };

  // Secure Pickup Handover Workflow
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
    fetchOrders(selectedVendorCanteen, true);
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
      fetchOrders(selectedVendorCanteen, true);
    } catch (err) {
      setMessage({ text: err.message, type: "error" });
    }
  };

  // Menu Management
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
      const currentAvail = isItemAvailableAtCanteen(item, selectedVendorCanteen);
      const nextAvail = !currentAvail;
      const canteenId = selectedVendorCanteen?.id;

      const res = await fetch(`/api/menu/${item._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canteenId: canteenId,
          canteenAvailable: nextAvail
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update item");

      const canteenName = selectedVendorCanteen?.shortName || selectedVendorCanteen?.name || "this canteen";
      setMessage({
        text: `"${item.name}" is now ${nextAvail ? "Available (In Stock)" : "Sold Out (Out of Stock)"} at ${canteenName}!`,
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
      const canteenId = selectedVendorCanteen?.id;
      const res = await fetch(`/api/menu/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canteenId: canteenId,
          canteenPrice: priceNum,
          price: priceNum,
          category: editCategory
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update item");

      const canteenName = selectedVendorCanteen?.shortName || selectedVendorCanteen?.name || "this canteen";
      setMessage({ text: `Price for "${data.name}" set to ₹${priceNum} at ${canteenName}!`, type: "success" });
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

  const existingCategories = [
    "Hot Snacks",
    "Beverages",
    "Meals & Wraps",
    ...new Set(menuItems.map((m) => m.category).filter(Boolean))
  ];
  const uniqueCategories = [...new Set(existingCategories)];

  // Order Counts & Metrics
  const pendingCount = orders.filter((o) => o.orderStatus === "Pending").length;
  const preparingCount = orders.filter((o) => o.orderStatus === "Preparing").length;
  const readyCount = orders.filter((o) => o.orderStatus === "Ready").length;
  const completedCount = orders.filter((o) => o.orderStatus === "Completed").length;
  const cancelledCount = orders.filter((o) => o.orderStatus === "Cancelled").length;
  const totalRevenue = orders.reduce(
    (sum, o) => sum + (o.paymentStatus === "Paid" ? o.totalAmount : 0),
    0
  );

  // Filtered Orders based on Search & Status
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Status filter
      if (statusFilter !== "all" && order.orderStatus !== statusFilter) {
        return false;
      }

      // Search Query filter
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const tokenMatch = order.tokenNumber?.toLowerCase().includes(query);
        const nameMatch = order.studentName?.toLowerCase().includes(query);
        const itemMatch = order.items?.some((it) => it.name?.toLowerCase().includes(query));
        if (!tokenMatch && !nameMatch && !itemMatch) return false;
      }

      return true;
    });
  }, [orders, statusFilter, searchQuery]);

  // Displayed Menu Items for current canteen
  const displayedMenuItems = useMemo(() => {
    const list = menuItems.filter((item) => {
      const avail = item.availableCanteens || (item.canteenId ? [item.canteenId] : []);
      return (
        item.canteenId === selectedVendorCanteen?.id ||
        avail.includes(selectedVendorCanteen?.id) ||
        item.canteenId === "all" ||
        avail.includes("all")
      );
    });

    if (menuSearchQuery.trim()) {
      const q = menuSearchQuery.trim().toLowerCase();
      return list.filter(
        (it) => it.name?.toLowerCase().includes(q) || it.category?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [menuItems, selectedVendorCanteen, menuSearchQuery]);

  // Helper for human-readable time elapsed
  const getTimeElapsed = (dateString) => {
    if (!dateString) return "";
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ago`;
  };

  return (
    <div>
      {/* Top Header Row with Title, Live Auto-Refresh & Audio Notification Controls */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div className="page-header-text">
          <span className="section-pill">
            <ChefIcon size={14} /> Canteen Management Console
          </span>
          <h2 className="page-title">
            Canteen Vendor Dashboard
          </h2>
          <p className="page-description">
            Accept incoming student orders, manage live cooking queues, and update canteen menu inventory in real time.
          </p>
        </div>

        {/* Live Controls: Sound Toggle, Auto-refresh Countdown, and Logout */}
        <div className="vendor-live-controls">
          <button
            type="button"
            className={`vendor-chime-toggle ${soundEnabled ? "active" : ""}`}
            onClick={toggleSound}
            title={soundEnabled ? "Sound Alert is ON. Click to mute" : "Sound Alert is MUTED. Click to enable"}
          >
            <VolumeIcon size={16} />
            <span>{soundEnabled ? "Sound: ON" : "Sound: Muted"}</span>
          </button>

          <div className={`vendor-auto-pill ${!autoRefresh ? "paused" : ""}`}>
            <span className="pulse-indicator"></span>
            <span>
              {autoRefresh ? `Auto in ${refreshCountdown}s` : "Auto-sync Paused"}
            </span>
            <button
              type="button"
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "#64748b", textDecoration: "underline", padding: 0 }}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? "Pause" : "Resume"}
            </button>
          </div>

          {onExitToHome && (
            <button
              type="button"
              className="btn-vendor-logout"
              onClick={onExitToHome}
              title="Log out from this canteen console"
            >
              ← Exit Console
            </button>
          )}
        </div>
      </div>

      {/* Specific Canteen Role Bar */}
      <div className="vendor-canteen-switch-bar">
        <div className="vendor-canteen-info">
          <div className="vendor-canteen-icon-box" style={{ background: selectedVendorCanteen?.themeBg || "#ea580c" }}>
            <span>{selectedVendorCanteen?.icon || "🏢"}</span>
          </div>
          <div className="vendor-canteen-text">
            <div className="vendor-canteen-top-badge">
              <span className="hub-pill">CANTEEN OPERATOR TERMINAL</span>
              <span className="counter-pill">{selectedVendorCanteen?.counter || "Counter 1"}</span>
            </div>
            <h3 className="vendor-canteen-name">{selectedVendorCanteen?.name || "Campus Canteen"}</h3>
            <p className="vendor-canteen-sub">
              📍 {selectedVendorCanteen?.location} • Hours: {selectedVendorCanteen?.openingHours}
            </p>
          </div>
        </div>

        <div className="vendor-canteen-right-actions">
          <div className="vendor-terminal-status">
            <span className="terminal-live-dot"></span>
            <span>Live Kitchen Terminal Active</span>
          </div>
        </div>
      </div>

      {/* KPI Stats Bar with Instant Visual Counts */}
      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-icon stat-icon-orange">
            <ClockIcon size={22} />
          </div>
          <div>
            <div className="stat-label">Total Received</div>
            <div className="stat-value">{orders.length}</div>
          </div>
        </div>

        <div className="stat-card" style={{ borderColor: pendingCount > 0 ? "#f97316" : "" }}>
          <div className="stat-icon stat-icon-amber">
            <FlameIcon size={22} />
          </div>
          <div>
            <div className="stat-label">New Requests</div>
            <div className="stat-value" style={{ color: pendingCount > 0 ? "#ea580c" : "" }}>
              {pendingCount}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-blue">
            <ChefIcon size={22} />
          </div>
          <div>
            <div className="stat-label">In Kitchen Cooking</div>
            <div className="stat-value">{preparingCount}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-green">
            <BellIcon size={22} />
          </div>
          <div>
            <div className="stat-label">Ready at Counter</div>
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

      {/* Flash Alert Banner */}
      {message.text && (
        <div className={`alert ${message.type === "success" ? "alert-success" : message.type === "info" ? "alert-info" : "alert-error"}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{message.text}</span>
          <button
            style={{ background: "none", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "1rem" }}
            onClick={() => setMessage({ text: "", type: "" })}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Switcher Navigation Tabs */}
      <div className="vendor-tabs-nav">
        <button
          className={`vendor-tab-btn ${activeVendorTab === "orders" ? "active" : ""}`}
          onClick={() => setActiveVendorTab("orders")}
        >
          <ClockIcon size={16} />
          <span>Live Orders Console ({orders.length})</span>
          {pendingCount > 0 && (
            <span className="chip-pulse-badge" style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: "999px" }}>
              {pendingCount} NEW
            </span>
          )}
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

      {/* =========================================================================
          TAB 1: LIVE ORDERS CONSOLE (With KDS Card View, Accept/Decline, Search)
          ========================================================================= */}
      {activeVendorTab === "orders" && (
        <div>
          {/* Controls Bar: Search + Status Filter Chips + View Mode Switcher */}
          <div className="vendor-orders-controls-bar">
            {/* Search Input */}
            <div className="vendor-search-wrap">
              <span className="search-icon">
                <SearchIcon size={16} />
              </span>
              <input
                type="text"
                className="vendor-search-input"
                placeholder="Search Token (e.g. 127), Student, or Item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="vendor-clear-search-btn"
                  onClick={() => setSearchQuery("")}
                >
                  ✕
                </button>
              )}
            </div>

            {/* View Mode Toggle: Card View vs Table View */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div className="vendor-view-toggle-group">
                <button
                  type="button"
                  className={`btn-view-toggle ${viewMode === "cards" ? "active" : ""}`}
                  onClick={() => setViewMode("cards")}
                  title="Card View (Kitchen Display System)"
                >
                  📋 Card View
                </button>
                <button
                  type="button"
                  className={`btn-view-toggle ${viewMode === "table" ? "active" : ""}`}
                  onClick={() => setViewMode("table")}
                  title="Table View (Data List)"
                >
                  📄 Table View
                </button>
              </div>

              <button
                className="btn btn-secondary btn-sm"
                onClick={() => fetchOrders()}
                disabled={loadingOrders}
                title="Refresh queue manually"
              >
                <RefreshIcon size={14} />
                <span>{loadingOrders ? "Refreshing..." : "Refresh"}</span>
              </button>
            </div>
          </div>

          {/* Status Filter Chips */}
          <div className="vendor-status-chips">
            <button
              type="button"
              className={`status-chip ${statusFilter === "all" ? "active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              <span>All Orders</span>
              <span className="status-chip-count">{orders.length}</span>
            </button>

            <button
              type="button"
              className={`status-chip chip-pending ${statusFilter === "Pending" ? "active" : ""}`}
              onClick={() => setStatusFilter("Pending")}
            >
              <span>⚡ New Requests</span>
              <span className={`status-chip-count ${pendingCount > 0 ? "chip-pulse-badge" : ""}`}>
                {pendingCount}
              </span>
            </button>

            <button
              type="button"
              className={`status-chip ${statusFilter === "Preparing" ? "active" : ""}`}
              onClick={() => setStatusFilter("Preparing")}
            >
              <span>👨‍🍳 Cooking</span>
              <span className="status-chip-count">{preparingCount}</span>
            </button>

            <button
              type="button"
              className={`status-chip ${statusFilter === "Ready" ? "active" : ""}`}
              onClick={() => setStatusFilter("Ready")}
            >
              <span>🔔 Ready for Pickup</span>
              <span className="status-chip-count">{readyCount}</span>
            </button>

            <button
              type="button"
              className={`status-chip ${statusFilter === "Completed" ? "active" : ""}`}
              onClick={() => setStatusFilter("Completed")}
            >
              <span>✓ Handed Over</span>
              <span className="status-chip-count">{completedCount}</span>
            </button>

            <button
              type="button"
              className={`status-chip ${statusFilter === "Cancelled" ? "active" : ""}`}
              onClick={() => setStatusFilter("Cancelled")}
            >
              <span>✕ Declined / Cancelled</span>
              <span className="status-chip-count">{cancelledCount}</span>
            </button>
          </div>

          {/* Empty State */}
          {filteredOrders.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>🍽️</div>
              <h4 style={{ margin: "0 0 6px", fontSize: "1.1rem", color: "#0f172a" }}>
                {searchQuery || statusFilter !== "all"
                  ? "No matching orders found"
                  : "No orders received yet"}
              </h4>
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.85rem" }}>
                {searchQuery || statusFilter !== "all"
                  ? "Try resetting filters or search query to view all orders."
                  : "New student orders will ring a kitchen chime and appear right here automatically."}
              </p>
            </div>
          ) : viewMode === "cards" ? (
            /* =========================================================
               KDS CARD VIEW (Kitchen Display System - Touch Friendly)
               ========================================================= */
            <div className="vendor-kds-grid">
              {filteredOrders.map((order) => {
                const isPending = order.orderStatus === "Pending";
                const isPreparing = order.orderStatus === "Preparing";
                const isReady = order.orderStatus === "Ready";
                const isMissed = order.orderStatus === "Missed Pickup";
                const isCompleted = order.orderStatus === "Completed";
                const isCancelled = order.orderStatus === "Cancelled";

                const cardStatusClass = isPending
                  ? "status-pending"
                  : isPreparing
                  ? "status-preparing"
                  : isReady
                  ? "status-ready"
                  : isMissed
                  ? "status-missed"
                  : isCancelled
                  ? "status-cancelled"
                  : "status-completed";

                return (
                  <div key={order._id} className={`kds-card ${cardStatusClass}`}>
                    {/* Header */}
                    <div className="kds-card-header">
                      <div>
                        <div className="kds-token-badge">{order.tokenNumber}</div>
                        <span className="kds-time-ago">
                          Ordered {getTimeElapsed(order.createdAt)}
                        </span>
                      </div>
                      <div className="kds-meta-right">
                        <StatusBadge status={order.orderStatus} type="order" />
                        <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="kds-card-body">
                      {/* Student info */}
                      <div className="kds-student-info">
                        <span className="kds-student-name">
                          👤 {order.studentName}
                        </span>
                        {order.studentPhone && (
                          <span className="kds-student-phone">📞 {order.studentPhone}</span>
                        )}
                      </div>

                      {/* Items list */}
                      <div className="kds-items-list">
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="kds-item-row">
                            <div className="kds-item-left">
                              <img
                                src={item.image || "/images/samosa.jpg"}
                                alt={item.name}
                                className="kds-item-img"
                                onError={(e) => {
                                  e.target.src = "/images/samosa.jpg";
                                }}
                              />
                              <span className="kds-item-name">{item.name}</span>
                            </div>
                            <span className="kds-item-qty">× {item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      {/* Remarks / Special Notes */}
                      {order.remarks && (
                        <div className="kds-remarks-box">
                          <span>📝</span>
                          <div>
                            <strong>Student Note:</strong> {order.remarks}
                          </div>
                        </div>
                      )}

                      {/* Cancellation Reason if Cancelled */}
                      {isCancelled && order.cancellationReason && (
                        <div className="kds-cancellation-banner">
                          ✕ Reason: {order.cancellationReason}
                        </div>
                      )}
                    </div>

                    {/* Footer with Billing & Action Buttons */}
                    <div className="kds-card-footer">
                      <div className="kds-billing-row">
                        <div>
                          <span style={{ fontSize: "0.74rem", color: "#64748b", textTransform: "uppercase", display: "block" }}>
                            Total Bill
                          </span>
                          <span className="kds-total-amount">₹{order.totalAmount}</span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{
                              fontSize: "0.76rem",
                              padding: "4px 10px",
                              fontWeight: "800",
                              color: order.paymentStatus === "Paid" ? "#16a34a" : "#dc2626",
                              borderColor: order.paymentStatus === "Paid" ? "#86efac" : "#fca5a5",
                              background: order.paymentStatus === "Paid" ? "#f0fdf4" : "#fef2f2"
                            }}
                            onClick={() => handleTogglePaymentStatus(order._id, order.paymentStatus)}
                            title="Click to toggle payment status"
                          >
                            {order.paymentStatus === "Paid" ? "✓ Paid" : `🔴 Unpaid (₹${order.totalAmount})`}
                          </button>
                        </div>
                      </div>

                      {/* Action Buttons based on status */}
                      {isPending && (
                        <div className="kds-actions-grid two-cols">
                          <button
                            type="button"
                            className="btn-kds-accept"
                            onClick={() => handleUpdateOrderStatus(order._id, "Preparing")}
                            title="Accept order and move to kitchen queue"
                          >
                            <ChefIcon size={16} /> Accept Order
                          </button>
                          <button
                            type="button"
                            className="btn-kds-decline"
                            onClick={() => handleInitiateDecline(order)}
                            title="Decline order with reason"
                          >
                            ✕ Decline
                          </button>
                        </div>
                      )}

                      {isPreparing && (
                        <div className="kds-actions-grid">
                          <button
                            type="button"
                            className="btn-kds-ready"
                            onClick={() => handleUpdateOrderStatus(order._id, "Ready")}
                            title="Food cooked! Mark ready for student counter pickup"
                          >
                            <BellIcon size={16} /> Mark Ready for Pickup
                          </button>
                        </div>
                      )}

                      {isReady && (
                        <div className="kds-actions-grid two-cols">
                          <button
                            type="button"
                            className="btn-kds-verify"
                            style={{
                              background: order.paymentStatus !== "Paid" ? "#dc2626" : "#ea580c"
                            }}
                            onClick={() => handleInitiateHandover(order)}
                            title={
                              order.paymentStatus !== "Paid"
                                ? `⚠️ Collect ₹${order.totalAmount} before handover!`
                                : "Student at counter: verify PIN and complete handover"
                            }
                          >
                            <ShieldCheckIcon size={16} />
                            <span>
                              {order.paymentStatus !== "Paid"
                                ? `Collect ₹${order.totalAmount} & Handover`
                                : "Verify PIN & Handover"}
                            </span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: "0.8rem", padding: "9px 8px" }}
                            onClick={() => handleUpdateOrderStatus(order._id, "Missed Pickup")}
                            title="Student didn't collect in time"
                          >
                            <AlertTriangleIcon size={13} /> Missed Pickup
                          </button>
                        </div>
                      )}

                      {isMissed && (
                        <div className="kds-actions-grid two-cols">
                          <button
                            type="button"
                            className="btn btn-success btn-sm"
                            onClick={() => handleUpdateOrderStatus(order._id, "Ready")}
                          >
                            <RefreshIcon size={13} /> Restore to Ready
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleInitiateDecline(order)}
                          >
                            ✕ Cancel Order
                          </button>
                        </div>
                      )}

                      {isCompleted && (
                        <div style={{ textAlign: "center", fontSize: "0.82rem", fontWeight: "700", color: "#16a34a", padding: "6px" }}>
                          ✓ Order Handed Over & Completed
                        </div>
                      )}

                      {isCancelled && (
                        <div style={{ textAlign: "center", fontSize: "0.82rem", fontWeight: "700", color: "#dc2626", padding: "6px" }}>
                          ✕ Declined by Kitchen
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* =========================================================
               TABLE VIEW (Compact Data Grid)
               ========================================================= */
            <div className="card">
              <div className="table-container">
                <table className="order-table">
                  <thead>
                    <tr>
                      <th>Token No.</th>
                      <th>Student Details</th>
                      <th>Items Ordered</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Payment</th>
                      <th>Kitchen Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order._id}>
                        <td>
                          <span className="token-table-badge">{order.tokenNumber}</span>
                        </td>
                        <td>
                          <strong>{order.studentName}</strong>
                          <div className="table-timestamp">
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • {getTimeElapsed(order.createdAt)}
                          </div>
                        </td>
                        <td>
                          <div className="table-items-cell">
                            {order.items?.map((item, idx) => (
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
                              <div style={{ marginTop: "4px", fontSize: "0.76rem", color: "#b45309", background: "#fef3c7", padding: "2px 6px", borderRadius: "4px", border: "1px dashed #f59e0b" }}>
                                <strong>Note:</strong> {order.remarks}
                              </div>
                            )}
                            {order.orderStatus === "Cancelled" && order.cancellationReason && (
                              <div style={{ marginTop: "4px", fontSize: "0.76rem", color: "#dc2626", background: "#fee2e2", padding: "2px 6px", borderRadius: "4px" }}>
                                <strong>Declined:</strong> {order.cancellationReason}
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
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: "0.74rem", padding: "2px 6px" }}
                            onClick={() => handleTogglePaymentStatus(order._id, order.paymentStatus)}
                          >
                            {order.paymentStatus === "Paid" ? "✓ Paid" : "💵 Unpaid"}
                          </button>
                        </td>
                        <td>
                          <div className="table-actions-stack">
                            {order.orderStatus === "Pending" && (
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button
                                  className="btn btn-success btn-sm btn-action-step"
                                  onClick={() => handleUpdateOrderStatus(order._id, "Preparing")}
                                >
                                  <ChefIcon size={13} /> Accept
                                </button>
                                <button
                                  className="btn btn-danger btn-sm btn-action-step"
                                  onClick={() => handleInitiateDecline(order)}
                                >
                                  ✕ Decline
                                </button>
                              </div>
                            )}
                            {order.orderStatus === "Preparing" && (
                              <button
                                className="btn btn-primary btn-sm btn-action-step"
                                onClick={() => handleUpdateOrderStatus(order._id, "Ready")}
                              >
                                <BellIcon size={13} /> Mark Ready
                              </button>
                            )}
                            {order.orderStatus === "Ready" && (
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button
                                  className="btn btn-primary btn-sm btn-action-step"
                                  onClick={() => handleInitiateHandover(order)}
                                >
                                  <ShieldCheckIcon size={13} /> Verify PIN
                                </button>
                                <button
                                  className="btn btn-secondary btn-sm btn-action-step"
                                  onClick={() => handleUpdateOrderStatus(order._id, "Missed Pickup")}
                                >
                                  Missed
                                </button>
                              </div>
                            )}
                            {order.orderStatus === "Missed Pickup" && (
                              <button
                                className="btn btn-success btn-sm btn-action-step"
                                onClick={() => handleUpdateOrderStatus(order._id, "Ready")}
                              >
                                <RefreshIcon size={13} /> Restore
                              </button>
                            )}
                            {order.orderStatus === "Completed" && (
                              <span className="table-collected-tag">✓ Handed Over</span>
                            )}
                            {order.orderStatus === "Cancelled" && (
                              <span style={{ fontSize: "0.78rem", fontWeight: "700", color: "#dc2626" }}>
                                ✕ Declined
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: LIVE QUEUE DISPLAY MONITOR (For Canteen TV / Wall Screen)
          ========================================================================= */}
      {activeVendorTab === "queue" && (
        <div className="vendor-queue-container">
          <VendorLiveQueueBoard
            orders={orders}
            selectedCanteen={selectedVendorCanteen}
            onVendorAction={async (orderId, nextStatus) => {
              if (nextStatus === "Completed") {
                const targetOrder = orders.find((o) => o._id === orderId);
                if (targetOrder) {
                  handleInitiateHandover(targetOrder);
                  return;
                }
              }
              await handleUpdateOrderStatus(orderId, nextStatus);
            }}
            onRefresh={() => fetchOrders(selectedVendorCanteen, true)}
            loading={loadingOrders}
          />
        </div>
      )}

      {/* =========================================================================
          TAB 3: DYNAMIC MENU INVENTORY (Fast 1-Click Stock Toggle & Add Form)
          ========================================================================= */}
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

              {/* Dynamic Photo Upload / Online URL / Live Preview */}
              <div className="form-group" style={{ marginBottom: "18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label className="form-label" style={{ margin: 0 }}>Item Image (Online URL or File Upload):</label>
                  {newItemImage && (
                    <button
                      type="button"
                      className="btn-link-clear"
                      onClick={() => {
                        setNewItemImage("");
                        setImageLoadError(false);
                      }}
                      title="Clear current photo"
                    >
                      Clear Image
                    </button>
                  )}
                </div>

                <div className="image-input-upload-row">
                  <div className="image-url-input-wrap">
                    <input
                      type="text"
                      className={`form-input ${imageLoadError ? "input-has-error" : ""}`}
                      placeholder="Paste online image link (https://...) or upload a file"
                      value={newItemImage}
                      onChange={(e) => {
                        setNewItemImage(e.target.value);
                        setImageLoadError(false);
                      }}
                    />
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleImageFileUpload}
                  />

                  <button
                    type="button"
                    className="btn btn-secondary btn-upload-image"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    title="Choose an image file from your device"
                  >
                    <UploadIcon size={16} />
                    <span>{isUploadingImage ? "Uploading..." : "Upload Image"}</span>
                  </button>
                </div>

                {/* Real-time Image Render & Live Preview Card */}
                {newItemImage && newItemImage.trim() !== "" && (
                  <div className={`item-image-preview-card ${imageLoadError ? "has-error" : ""}`}>
                    <div className="preview-media-box">
                      {imageLoadError ? (
                        <div className="preview-error-placeholder">
                          <ImageIcon size={26} />
                          <span>Broken Link</span>
                        </div>
                      ) : (
                        <img
                          src={newItemImage}
                          alt="Food item preview"
                          className="preview-food-img"
                          onLoad={() => setImageLoadError(false)}
                          onError={() => setImageLoadError(true)}
                        />
                      )}
                    </div>

                    <div className="preview-meta-info">
                      <div className="preview-title-row">
                        <span className="preview-label">Live Image Preview</span>
                        {!imageLoadError && (
                          <span className="preview-badge-success">
                            <CheckCircleIcon size={13} /> Loaded & Ready
                          </span>
                        )}
                        {imageLoadError && (
                          <span className="preview-badge-error">
                            ⚠️ Unable to load
                          </span>
                        )}
                      </div>

                      <p className="preview-source-text">
                        {newItemImage.startsWith("data:") ? (
                          <span>📁 Uploaded from Device (Saved locally)</span>
                        ) : newItemImage.startsWith("http") ? (
                          <span className="text-truncate" title={newItemImage}>
                            🔗 Online Web Link: {newItemImage.length > 55 ? `${newItemImage.slice(0, 55)}...` : newItemImage}
                          </span>
                        ) : (
                          <span>🖼️ Preset Photo: {newItemImage}</span>
                        )}
                      </p>

                      {imageLoadError && (
                        <p className="preview-error-hint">
                          This URL failed to load. Make sure the link is a direct public image link (e.g. .jpg, .png) or click <strong>Upload Image</strong>.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Photos Preset Chips */}
                <div className="preset-photo-chips" style={{ marginTop: "12px" }}>
                  <span className="preset-label">Quick Photos:</span>
                  {PHOTO_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      className={`preset-chip ${newItemImage === p.url ? "selected" : ""}`}
                      onClick={() => {
                        setNewItemImage(p.url);
                        setImageLoadError(false);
                      }}
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

          {/* Active Canteen Menu Table with Fast In-Stock/Out-of-Stock Toggle */}
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h3 className="card-title" style={{ margin: 0 }}>
                  Menu Inventory • {selectedVendorCanteen?.shortName || selectedVendorCanteen?.name} ({displayedMenuItems.length})
                </h3>
                <small style={{ color: "#64748b" }}>
                  1-Click instant Out-of-Stock toggle & price manager for this counter
                </small>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Filter menu items..."
                  style={{ width: "200px", padding: "6px 10px", fontSize: "0.85rem" }}
                  value={menuSearchQuery}
                  onChange={(e) => setMenuSearchQuery(e.target.value)}
                />
                <button className="btn btn-secondary btn-sm" onClick={() => fetchMenu()} disabled={loadingMenu}>
                  <RefreshIcon size={14} /> Refresh
                </button>
              </div>
            </div>

            <div className="table-container">
              <table className="order-table">
                <thead>
                  <tr>
                    <th>Item Photo & Name</th>
                    <th>Category</th>
                    <th>Canteen Hub</th>
                    <th>Price</th>
                    <th>Stock Status (1-Click Toggle)</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedMenuItems.map((item) => {
                    const itemPriceAtCanteen = getItemPriceForCanteen(item, selectedVendorCanteen);
                    const isAvailAtCanteen = isItemAvailableAtCanteen(item, selectedVendorCanteen);

                    return (
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
                            {selectedVendorCanteen?.shortName || item.canteenName || selectedVendorCanteen?.name || "34 Block Food Court"}
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
                              <strong className="table-price">₹{itemPriceAtCanteen}</strong>
                              <button
                                type="button"
                                className="btn-edit-icon"
                                title={`Edit Price for ${selectedVendorCanteen?.shortName || "this canteen"}`}
                                onClick={() => {
                                  setEditingItemId(item._id);
                                  setEditPrice(itemPriceAtCanteen);
                                  setEditCategory(item.category || "Hot Snacks");
                                }}
                              >
                                <EditIcon size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`stock-toggle-btn ${isAvailAtCanteen ? "in-stock" : "out-stock"}`}
                            onClick={() => handleToggleAvailability(item)}
                            title="Click to toggle stock status instantly"
                          >
                            <span>{isAvailAtCanteen ? "● In Stock" : "○ Sold Out"}</span>
                          </button>
                        </td>
                        <td>
                          <div className="table-item-actions">
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Secure Pickup Handover Modal with Unpaid Protection & 1-Click Collection */}
      <SecureHandoverModal
        isOpen={isHandoverModalOpen}
        order={selectedHandoverOrder}
        onClose={() => {
          setIsHandoverModalOpen(false);
          setSelectedHandoverOrder(null);
        }}
        onConfirmHandover={handleConfirmSecureHandover}
        onMarkPaymentPaid={async (orderId) => {
          await handleTogglePaymentStatus(orderId, "Pending");
          setSelectedHandoverOrder((prev) => (prev ? { ...prev, paymentStatus: "Paid" } : null));
        }}
      />

      {/* Decline Order Modal */}
      <DeclineOrderModal
        isOpen={isDeclineModalOpen}
        order={selectedDeclineOrder}
        onClose={() => {
          setIsDeclineModalOpen(false);
          setSelectedDeclineOrder(null);
        }}
        onConfirmDecline={handleConfirmDeclineOrder}
      />
    </div>
  );
}
