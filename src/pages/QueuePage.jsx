import { useState, useEffect, useRef, useMemo } from "react";
import StatusBadge from "../components/StatusBadge";
import { CAMPUS_CANTEENS } from "../data/canteens";
import { useAppContext } from "@/context/AppContext";
import {
  ChefIcon,
  BellIcon,
  ClockIcon,
  CheckCircleIcon,
  RefreshIcon,
  QueueIcon,
  SearchIcon,
  FlameIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  EyeIcon,
  EyeOffIcon,
  CartIcon
} from "../components/Icons";

export default function QueuePage({ setActiveTab, isVendorView = false, onVendorAction, selectedCanteen = null }) {
  const { canteens: ctxCanteens } = useAppContext();
  const canteensList = ctxCanteens && ctxCanteens.length > 0 ? ctxCanteens : CAMPUS_CANTEENS;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date().toLocaleTimeString());
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [activeCanteenFilter, setActiveCanteenFilter] = useState(() => {
    if (selectedCanteen?.id) return selectedCanteen.id;
    return "all";
  });

  useEffect(() => {
    if (selectedCanteen?.id) {
      setActiveCanteenFilter(selectedCanteen.id);
    }
  }, [selectedCanteen]);

  // Status Notification alert banner state
  const [liveNotification, setLiveNotification] = useState(null);
  const prevTrackedStatusRef = useRef(null);

  // Search & Filter state
  const [searchToken, setSearchToken] = useState(() => {
    try {
      return localStorage.getItem("canteenGo_lastToken") || "";
    } catch {
      return "";
    }
  });

  const [filterStage, setFilterStage] = useState("all"); // "all", "ready", "preparing", "pending"
  const [showPickupPin, setShowPickupPin] = useState(true);
  const [paperTokenInput, setPaperTokenInput] = useState("");

  // Student profile token shortcut
  const savedLastToken = (() => {
    try {
      return localStorage.getItem("canteenGo_lastToken") || "";
    } catch {
      return "";
    }
  })();

  const studentProfile = (() => {
    try {
      return JSON.parse(localStorage.getItem("canteenGo_studentProfile") || "null");
    } catch {
      return null;
    }
  })();

  const prevReadyCountRef = useRef(0);

  // Live Digital Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchQueueOrders();
  }, [activeCanteenFilter]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchQueueOrders(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, activeCanteenFilter]);

  // Audio Counter Chime when a new order turns Ready
  const playCounterChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      gain1.gain.setValueAtTime(0.18, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.3);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain2.gain.setValueAtTime(0.22, ctx.currentTime + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.12);
      osc2.stop(ctx.currentTime + 0.55);
    } catch {}
  };

  const fetchQueueOrders = async (isManual = false) => {
    try {
      if (isManual) setLoading(true);
      const canteenParam = activeCanteenFilter && activeCanteenFilter !== "all"
        ? `?canteenId=${activeCanteenFilter}`
        : "";
      const res = await fetch(`/api/orders${canteenParam}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
        setLastRefreshed(new Date().toLocaleTimeString());

        // Check if ready orders increased
        const readyCount = data.filter((o) => o.orderStatus === "Ready").length;
        if (readyCount > prevReadyCountRef.current && prevReadyCountRef.current !== 0) {
          playCounterChime();
        }
        prevReadyCountRef.current = readyCount;

        // Notification when tracked order changes state
        if (searchToken.trim() || savedLastToken) {
          const targetTok = (searchToken.trim() || savedLastToken).toLowerCase();
          const match = data.find(
            (o) =>
              o.tokenNumber?.toLowerCase() === targetTok ||
              o.tokenNumber?.toLowerCase() === `t-${targetTok}` ||
              o.tokenNumber?.toLowerCase().replace("t-", "") === targetTok
          );

          if (match && prevTrackedStatusRef.current && prevTrackedStatusRef.current !== match.orderStatus) {
            if (match.orderStatus === "Preparing") {
              setLiveNotification({
                type: "info",
                title: "Order Cooking In Kitchen",
                text: `Token ${match.tokenNumber} is now on the stove! Chef started preparing your food.`
              });
            } else if (match.orderStatus === "Ready") {
              setLiveNotification({
                type: "success",
                title: "Ready for Pickup!",
                text: `Token ${match.tokenNumber} is READY! Please head to Counter 1 to collect.`
              });
              playCounterChime();
            } else if (match.orderStatus === "Missed Pickup") {
              setLiveNotification({
                type: "warning",
                title: "Missed Pickup Notice",
                text: `Token ${match.tokenNumber} was called at Counter 1. Reschedule pickup anytime from Your Orders.`
              });
            } else if (match.orderStatus === "Completed") {
              setLiveNotification({
                type: "success",
                title: "Order Handed Over",
                text: `Token ${match.tokenNumber} has been verified and handed over. Enjoy your meal!`
              });
            }
          }

          if (match) {
            prevTrackedStatusRef.current = match.orderStatus;
          }
        }
      }
    } catch {
      // Ignore background network errors
    } finally {
      setLoading(false);
    }
  };

  const pendingOrders = orders.filter((o) => o.orderStatus === "Pending");
  const preparingOrders = orders.filter((o) => o.orderStatus === "Preparing");
  const readyOrders = orders.filter((o) => o.orderStatus === "Ready");
  const completedOrders = orders.filter((o) => o.orderStatus === "Completed").slice(0, 10);

  // Orders Ahead calculation (per Canteen)
  const getOrdersAhead = (targetOrder) => {
    if (!targetOrder || ["Ready", "Completed", "Missed Pickup"].includes(targetOrder.orderStatus)) return 0;
    if (targetOrder.orderStatus === "Preparing") return 0; // Currently cooking on stove
    const targetTime = new Date(targetOrder.createdAt).getTime();
    return orders.filter(
      (o) =>
        ["Pending", "Preparing"].includes(o.orderStatus) &&
        (!targetOrder.canteenName || !o.canteenName || o.canteenName === targetOrder.canteenName) &&
        new Date(o.createdAt).getTime() < targetTime
    ).length;
  };

  // Estimated Waiting Time calculation ("time dikhe")
  const getEstimatedWaitTime = (targetOrder) => {
    if (!targetOrder) return "0 mins";
    if (targetOrder.orderStatus === "Ready") return "Ready for Pickup Now! 🎉";
    if (targetOrder.orderStatus === "Completed") return "Order Delivered ✓";
    if (targetOrder.orderStatus === "Missed Pickup") return "Missed • Reschedule Needed";

    const ordersAhead = getOrdersAhead(targetOrder);
    if (targetOrder.orderStatus === "Preparing") {
      const remaining = targetOrder.delayMinutes ? 2 + targetOrder.delayMinutes : 3;
      return `~${remaining} mins remaining`;
    }

    // Pending: orders ahead * 3 mins + 2 mins prep
    const totalEst = Math.max(3, ordersAhead * 3 + 2);
    return `~${totalEst} mins`;
  };

  // Calculate step progress for tracked order (0 to 4)
  const getProgressStep = (status) => {
    switch (status) {
      case "Pending":
        return 1;
      case "Preparing":
        return 2;
      case "Ready":
        return 3;
      case "Completed":
        return 4;
      default:
        return 0;
    }
  };

  // =========================================================================
  // STUDENT VIEW RESOLVER: Resolve ONLY the logged-in student's orders
  // =========================================================================
  const studentMatchedOrders = useMemo(() => {
    return orders.filter((o) => {
      if (!o) return false;
      // 1. Matched by explicit search token if typed
      if (searchToken.trim()) {
        const q = searchToken.trim().toLowerCase();
        if (
          o.tokenNumber?.toLowerCase() === q ||
          o.tokenNumber?.toLowerCase() === `t-${q}` ||
          o.tokenNumber?.toLowerCase().replace("t-", "") === q
        ) {
          return true;
        }
      }
      // 2. Matched by logged-in student phone
      if (studentProfile?.phone && o.studentPhone && String(o.studentPhone).trim() === String(studentProfile.phone).trim()) {
        return true;
      }
      // 3. Matched by last placed token in localStorage
      if (savedLastToken && (o.tokenNumber === savedLastToken || o._id === savedLastToken)) {
        return true;
      }
      // 4. Matched by logged-in student email
      if (studentProfile?.email && o.studentEmail && o.studentEmail.toLowerCase() === studentProfile.email.toLowerCase()) {
        return true;
      }
      // 5. Matched by student name
      if (studentProfile?.name && o.studentName && o.studentName.trim().toLowerCase() === studentProfile.name.trim().toLowerCase()) {
        return true;
      }
      return false;
    });
  }, [orders, searchToken, studentProfile, savedLastToken]);

  // Active student orders (Pending, Preparing, Ready)
  const activeStudentOrders = useMemo(() => {
    return studentMatchedOrders.filter((o) => ["Pending", "Preparing", "Ready"].includes(o.orderStatus));
  }, [studentMatchedOrders]);

  // Past / completed student orders
  const pastStudentOrders = useMemo(() => {
    return studentMatchedOrders.filter((o) => ["Completed", "Missed Pickup"].includes(o.orderStatus));
  }, [studentMatchedOrders]);

  const [selectedStudentOrderId, setSelectedStudentOrderId] = useState(null);

  // The primary active order to display
  const currentStudentOrder = useMemo(() => {
    if (selectedStudentOrderId) {
      const match = studentMatchedOrders.find((o) => o._id === selectedStudentOrderId);
      if (match) return match;
    }
    return activeStudentOrders[0] || pastStudentOrders[0] || null;
  }, [selectedStudentOrderId, studentMatchedOrders, activeStudentOrders, pastStudentOrders]);

  // Calculations for current student order
  const currentOrdersAhead = currentStudentOrder ? getOrdersAhead(currentStudentOrder) : 0;
  const currentWaitTime = currentStudentOrder ? getEstimatedWaitTime(currentStudentOrder) : "";
  const currentProgressStep = currentStudentOrder ? getProgressStep(currentStudentOrder.orderStatus) : 0;

  // =========================================================================
  // VENDOR VIEW: Full Kiosk Swimlanes & Full Chronological Table
  // =========================================================================
  if (isVendorView) {
    return (
      <div className="queue-page-container">
        {/* Vendor Header */}
        <div className="page-header queue-header-flex">
          <div className="page-header-text">
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span className="section-pill">
                <ChefIcon size={14} /> Vendor Kiosk Board
              </span>
              <span className="live-clock-pill">
                <ClockIcon size={13} /> {currentTime}
              </span>
            </div>
            <h2 className="page-title">Cafeteria Kitchen Queue Board</h2>
            <p className="page-description">
              Kitchen order dispatch console. Monitor all student tokens across cooking and ready stages.
            </p>
          </div>

          {/* Sync Controls */}
          <div className="live-sync-badge">
            <label className="sync-toggle-label">
              <input
                type="checkbox"
                className="sync-checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              <span className="sync-dot"></span>
              <span>Live Sync</span>
            </label>
            <span className="sync-divider">|</span>
            <button
              className={`btn btn-secondary btn-sm btn-sync-refresh ${loading ? "is-syncing" : ""}`}
              onClick={() => fetchQueueOrders(true)}
              disabled={loading}
            >
              <RefreshIcon size={13} className={loading ? "spin-refresh" : ""} />
              <span className="sync-btn-label">{loading ? "Syncing..." : "Sync"}</span>
            </button>
          </div>
        </div>

        {/* Ready Calling Banner */}
        <div className="now-calling-banner">
          <div className="calling-banner-left">
            <div className="calling-badge-pulse">
              <BellIcon size={16} />
              <span>NOW CALLING • COUNTER 1</span>
            </div>
            <div className="calling-title-wrap">
              <h3 className="calling-title">
                {readyOrders.length > 0
                  ? `${readyOrders.length} Order${readyOrders.length > 1 ? "s" : ""} Ready for Pickup`
                  : "Kitchen Preparing Orders"}
              </h3>
            </div>
          </div>
          <div className="calling-token-chips">
            {readyOrders.map((ro) => (
              <div key={ro._id} className="ready-token-pill">
                <div className="ready-token-num">{ro.tokenNumber}</div>
                <div className="ready-token-details">
                  <span className="ready-items-tag">{ro.items.length} items</span>
                  <span className="ready-counter-tag">Counter 1</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3-Column Kiosk Board */}
        <div className="queue-board">
          <div className="queue-column queue-column-ready">
            <div className="column-header">
              <div className="column-title-wrap">
                <BellIcon size={18} />
                <h3>Ready for Pickup</h3>
              </div>
              <span className="column-badge count-ready">{readyOrders.length}</span>
            </div>
            <div className="queue-cards-list">
              {readyOrders.map((o) => (
                <div key={o._id} className="queue-card card-ready">
                  <div className="card-top-row">
                    <span className="token-huge-num">{o.tokenNumber}</span>
                    <span className="counter-tag">Counter 1</span>
                  </div>
                  <div className="order-items-snippet">
                    {o.items.map((it, idx) => (
                      <span key={idx}>{it.name} (×{it.quantity})</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="queue-column queue-column-preparing">
            <div className="column-header">
              <div className="column-title-wrap">
                <ChefIcon size={18} />
                <h3>Cooking in Kitchen</h3>
              </div>
              <span className="column-badge count-prep">{preparingOrders.length}</span>
            </div>
            <div className="queue-cards-list">
              {preparingOrders.map((o) => (
                <div key={o._id} className="queue-card card-prep">
                  <div className="card-top-row">
                    <span className="token-huge-num">{o.tokenNumber}</span>
                    <span className="eta-badge">~3 min</span>
                  </div>
                  <div className="order-items-snippet">
                    {o.items.map((it, idx) => (
                      <span key={idx}>{it.name} (×{it.quantity})</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="queue-column queue-column-pending">
            <div className="column-header">
              <div className="column-title-wrap">
                <ClockIcon size={18} />
                <h3>Next in Line</h3>
              </div>
              <span className="column-badge count-pending">{pendingOrders.length}</span>
            </div>
            <div className="queue-cards-list">
              {pendingOrders.map((o) => (
                <div key={o._id} className="queue-card card-pending">
                  <div className="card-top-row">
                    <span className="token-huge-num">{o.tokenNumber}</span>
                  </div>
                  <div className="order-items-snippet">
                    {o.items.map((it, idx) => (
                      <span key={idx}>{it.name} (×{it.quantity})</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Vendor Chronological Registry */}
        <div className="card" style={{ marginTop: "32px" }}>
          <div className="card-header">
            <h3 className="card-title">
              <span>🧾</span> Chronological Order Registry
            </h3>
            <span className="table-count-tag">Showing {orders.length} orders today</span>
          </div>
          <div className="table-container">
            <table className="order-table">
              <thead>
                <tr>
                  <th>Token No.</th>
                  <th>Student</th>
                  <th>Items Ordered</th>
                  <th>Total</th>
                  <th>Order Status</th>
                  <th>Payment</th>
                  <th>Order Time</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id}>
                    <td><span className="token-table-badge">{order.tokenNumber}</span></td>
                    <td><strong>{order.studentName}</strong></td>
                    <td>
                      {order.items.map((i, idx) => (
                        <div key={idx}>{i.name} × <strong>{i.quantity}</strong></div>
                      ))}
                    </td>
                    <td><strong>₹{order.totalAmount}</strong></td>
                    <td><StatusBadge status={order.orderStatus} type="order" /></td>
                    <td><StatusBadge status={order.paymentStatus} type="payment" /></td>
                    <td>{new Date(order.createdAt).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // REDESIGNED STUDENT LIVE QUEUE (ONLY Shows Student's Order + Time + Ahead)
  // No Chronological Order Registry & No Other Students' Orders!
  // =========================================================================
  return (
    <div className="student-queue-page">
      {/* 1. Header with Clock & Live Sync */}
      <div className="student-queue-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
            <span className="section-pill">
              <QueueIcon size={14} /> LIVE ORDER TRACKER
            </span>
            <span className="live-clock-pill">
              <ClockIcon size={13} /> {currentTime}
            </span>
          </div>
          <h2 className="page-title" style={{ fontSize: "1.75rem", margin: "2px 0 6px" }}>
            My Live Queue Tracker
          </h2>
          <p className="page-description" style={{ margin: 0, fontSize: "0.9rem" }}>
            Live status of your campus order. Watch your meal advance from kitchen stove to pickup counter.
          </p>
        </div>

        {/* Live Sync Controls */}
        <div className="live-sync-badge">
          <label className="sync-toggle-label" title="Live syncing with cafeteria kitchen every 4 seconds">
            <input
              type="checkbox"
              className="sync-checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span className="sync-dot"></span>
            <span>Live Kitchen Feed</span>
          </label>
          <span className="sync-divider">|</span>
          <button
            className={`btn btn-secondary btn-sm btn-sync-refresh ${loading ? "is-syncing" : ""}`}
            onClick={() => fetchQueueOrders(true)}
            disabled={loading}
            title="Refresh order status now"
          >
            <RefreshIcon size={13} className={loading ? "spin-refresh" : ""} />
            <span className="sync-btn-label">{loading ? "Syncing..." : "Sync"}</span>
          </button>
        </div>
      </div>

      {/* Real-time Status Alert Banner */}
      {liveNotification && (
        <div className={`queue-live-alert alert-${liveNotification.type}`}>
          <div className="alert-content-left">
            <span className="alert-bell-icon">🔔</span>
            <div>
              <strong>{liveNotification.title}</strong>
              <p>{liveNotification.text}</p>
            </div>
          </div>
          <button
            type="button"
            className="alert-dismiss-btn"
            onClick={() => setLiveNotification(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Multiple Active Orders Switcher Tabs (If student has placed multiple orders) */}
      {activeStudentOrders.length > 1 && (
        <div className="student-order-tabs-bar">
          <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#64748b" }}>
            Your Active Orders ({activeStudentOrders.length}):
          </span>
          {activeStudentOrders.map((ord) => {
            const isSelected = currentStudentOrder?._id === ord._id;
            return (
              <button
                key={ord._id}
                type="button"
                className={`student-order-tab-btn ${isSelected ? "active" : ""}`}
                onClick={() => setSelectedStudentOrderId(ord._id)}
              >
                <span className="student-tab-dot"></span>
                <span>Token {ord.tokenNumber}</span>
                <span style={{ opacity: 0.85, fontSize: "0.78rem" }}>({ord.orderStatus})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 2. MAIN ACTIVE ORDER TRACKER CARD */}
      {currentStudentOrder ? (
        <div className="student-tracker-hero">
          {/* Top Identity Row */}
          <div className="student-tracker-top">
            <div className="student-token-display">
              <div className="student-token-large">
                {currentStudentOrder.tokenNumber}
              </div>
              <div className="student-token-meta">
                <span className="student-token-label">DIGITAL TOKEN</span>
                <strong style={{ fontSize: "1rem", color: "#0f172a" }}>
                  {currentStudentOrder.studentName || studentProfile?.name || "Student Order"}
                </strong>
                <span className="student-token-time">
                  Placed at {new Date(currentStudentOrder.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>

            {/* Live Status Pill */}
            <div style={{ alignSelf: "center" }}>
              <StatusBadge status={currentStudentOrder.orderStatus} type="order" />
            </div>
          </div>

          {/* Dynamic Status Callout Banner */}
          <div style={{ marginBottom: "24px" }}>
            {currentStudentOrder.orderStatus === "Ready" && (
              <div className="status-notice notice-ready">
                <span className="notice-icon">🎉</span>
                <div>
                  <strong className="notice-title">READY FOR PICKUP AT COUNTER 1!</strong>
                  <p className="notice-hindi">
                    Aapka khana ready hai! Please head to Counter 1 and show your 4-digit PIN below to collect.
                  </p>
                </div>
              </div>
            )}
            {currentStudentOrder.orderStatus === "Preparing" && (
              <div className="status-notice notice-preparing">
                <span className="notice-icon">👨‍🍳</span>
                <div>
                  <strong className="notice-title">CHEF IS COOKING YOUR ORDER NOW!</strong>
                  <p className="notice-hindi">
                    Aapka khana stove par prepare ho raha hai. Fresh and hot, ready in just a few minutes!
                  </p>
                </div>
              </div>
            )}
            {currentStudentOrder.orderStatus === "Pending" && (
              <div className="status-notice notice-pending">
                <span className="notice-icon">⏳</span>
                <div>
                  <strong className="notice-title">ORDER REGISTERED IN KITCHEN QUEUE</strong>
                  <p className="notice-hindi">
                    Aapka order line me hai. Jaise hi chef cooking start karenge, status update ho jayega.
                  </p>
                </div>
              </div>
            )}
            {currentStudentOrder.orderStatus === "Completed" && (
              <div className="status-notice notice-completed">
                <span className="notice-icon">✅</span>
                <div>
                  <strong className="notice-title">ORDER DELIVERED & COLLECTED</strong>
                  <p className="notice-hindi">
                    Order safely verified and handed over. Enjoy your meal!
                  </p>
                </div>
              </div>
            )}
            {currentStudentOrder.orderStatus === "Missed Pickup" && (
              <div className="status-notice notice-missed">
                <span className="notice-icon">⚠️</span>
                <div>
                  <strong className="notice-title">MISSED PICKUP DETECTED</strong>
                  <p className="notice-hindi">
                    Aapka token call hua tha lekin counter se collect nahi ho paya. Visit "Your Orders" to reschedule.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 3. CORE HIGHLIGHT METRICS GRID ("time dikhe and kitane order ke baad aayega") */}
          <div className="queue-features-grid" style={{ marginBottom: "26px" }}>
            {/* METRIC 1: ESTIMATED TIME ("time dikhe") */}
            <div className="feature-stat-card card-eta">
              <div className="stat-card-header">
                <ClockIcon size={16} />
                <span>ESTIMATED TIME</span>
              </div>
              <div className="stat-card-value value-eta">
                {currentWaitTime}
              </div>
              <small className="stat-card-sub">
                {currentStudentOrder.orderStatus === "Ready"
                  ? "At pickup counter right now"
                  : currentStudentOrder.orderStatus === "Preparing"
                  ? "Actively on stove with chef"
                  : `Live estimate based on kitchen load`}
              </small>
            </div>

            {/* METRIC 2: ORDERS AHEAD ("kitane order ke baad aayega") */}
            <div className="feature-stat-card card-ahead">
              <div className="stat-card-header">
                <QueueIcon size={16} />
                <span>ORDERS AHEAD IN LINE</span>
              </div>
              <div className="stat-card-value value-ahead">
                {currentStudentOrder.orderStatus === "Preparing"
                  ? "0 (Cooking Now!)"
                  : currentStudentOrder.orderStatus === "Ready"
                  ? "0 (At Counter)"
                  : currentOrdersAhead === 0
                  ? "You're Next! (0 ahead)"
                  : `${currentOrdersAhead} Order${currentOrdersAhead > 1 ? "s" : ""} Ahead`}
              </div>
              <small className="stat-card-sub">
                {currentStudentOrder.orderStatus === "Ready"
                  ? "Your order is ready at the counter"
                  : currentStudentOrder.orderStatus === "Preparing"
                  ? "Your meal is actively on the stove"
                  : currentOrdersAhead === 0
                  ? "⭐ Chef starts cooking your meal next!"
                  : `Position #${currentOrdersAhead + 1} in kitchen queue`}
              </small>
            </div>

            {/* METRIC 3: PICKUP LOCATION & COUNTER */}
            <div className="feature-stat-card card-location">
              <div className="stat-card-header">
                <span>📍</span>
                <span>PICKUP LOCATION & COUNTER</span>
              </div>
              <div className="stat-card-value value-location">
                {currentStudentOrder.counterName || "Counter 1"}
              </div>
              <small className="stat-card-sub">
                {currentStudentOrder.canteenName || "Food Court near 34 Block"}
              </small>
            </div>
          </div>

          {/* 4. SECRET PICKUP PIN / OTP CODE */}
          {currentStudentOrder.pickupCode && (
            <div
              style={{
                background: "#f0fdf4",
                border: "1.5px solid #86efac",
                borderRadius: "14px",
                padding: "16px 20px",
                marginBottom: "26px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "14px"
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <ShieldCheckIcon size={18} style={{ color: "#16a34a" }} />
                  <span style={{ fontSize: "0.78rem", fontWeight: "800", color: "#15803d", letterSpacing: "0.05em" }}>
                    SECRET PICKUP PIN (OTP)
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#166534" }}>
                  Show this 4-digit PIN to counter staff to verify and receive your food.
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ display: "flex", gap: "6px" }}>
                  {showPickupPin ? (
                    String(currentStudentOrder.pickupCode).split("").map((digit, idx) => (
                      <span
                        key={idx}
                        style={{
                          width: "32px",
                          height: "38px",
                          background: "#ffffff",
                          border: "2px solid #22c55e",
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.3rem",
                          fontWeight: "900",
                          color: "#15803d",
                          boxShadow: "0 2px 4px rgba(34, 197, 94, 0.15)"
                        }}
                      >
                        {digit}
                      </span>
                    ))
                  ) : (
                    [0, 1, 2, 3].map((_, idx) => (
                      <span
                        key={idx}
                        style={{
                          width: "32px",
                          height: "38px",
                          background: "#e2e8f0",
                          border: "2px solid #cbd5e1",
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.3rem",
                          fontWeight: "900",
                          color: "#64748b"
                        }}
                      >
                        •
                      </span>
                    ))
                  )}
                </div>

                <button
                  type="button"
                  style={{
                    background: "#ffffff",
                    border: "1px solid #86efac",
                    borderRadius: "8px",
                    padding: "6px 10px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "0.8rem",
                    fontWeight: "700",
                    color: "#15803d"
                  }}
                  onClick={() => setShowPickupPin(!showPickupPin)}
                  title={showPickupPin ? "Hide PIN" : "Show PIN"}
                >
                  {showPickupPin ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
                  <span>{showPickupPin ? "Hide" : "Show"}</span>
                </button>
              </div>
            </div>
          )}

          {/* 5. 4-STAGE ANIMATED VISUAL PROGRESS STEPPER */}
          <div className="order-stepper-container" style={{ margin: "0 0 24px" }}>
            {/* Step 1: Placed */}
            <div className={`stepper-node ${currentProgressStep >= 1 ? "completed" : ""}`}>
              <div className="node-icon-circle">
                {currentProgressStep > 1 ? <CheckCircleIcon size={18} /> : "1"}
              </div>
              <div className="node-content">
                <span className="node-title">Order Received</span>
                <span className="node-sub">In queue</span>
              </div>
            </div>

            <div className={`stepper-connector ${currentProgressStep >= 2 ? "active" : ""}`}></div>

            {/* Step 2: Preparing */}
            <div className={`stepper-node ${currentProgressStep === 2 ? "current" : currentProgressStep > 2 ? "completed" : ""}`}>
              <div className="node-icon-circle">
                {currentProgressStep === 2 ? <FlameIcon size={18} /> : currentProgressStep > 2 ? <CheckCircleIcon size={18} /> : "2"}
              </div>
              <div className="node-content">
                <span className="node-title">Cooking in Kitchen</span>
                <span className="node-sub">On stove</span>
              </div>
            </div>

            <div className={`stepper-connector ${currentProgressStep >= 3 ? "active" : ""}`}></div>

            {/* Step 3: Ready */}
            <div className={`stepper-node ${currentProgressStep === 3 ? "current pulse-glow" : currentProgressStep > 3 ? "completed" : ""}`}>
              <div className="node-icon-circle">
                {currentProgressStep === 3 ? <BellIcon size={18} /> : currentProgressStep > 3 ? <CheckCircleIcon size={18} /> : "3"}
              </div>
              <div className="node-content">
                <span className="node-title">Ready for Pickup</span>
                <span className="node-sub">At Counter 1</span>
              </div>
            </div>

            <div className={`stepper-connector ${currentProgressStep >= 4 ? "active" : ""}`}></div>

            {/* Step 4: Handed Over */}
            <div className={`stepper-node ${currentProgressStep >= 4 ? "completed" : ""}`}>
              <div className="node-icon-circle">
                {currentProgressStep >= 4 ? <CheckCircleIcon size={18} /> : "4"}
              </div>
              <div className="node-content">
                <span className="node-title">Order Picked Up</span>
                <span className="node-sub">Handover done</span>
              </div>
            </div>
          </div>

          {/* 6. ORDERED ITEMS SUMMARY STRIP */}
          <div className="tracked-footer" style={{ borderTop: "1px solid #e2e8f0", paddingTop: "18px" }}>
            <div className="tracked-items-list">
              <span className="items-label">Ordered Items ({currentStudentOrder.items.length}):</span>
              {currentStudentOrder.items.map((item, idx) => (
                <span key={idx} className="tracked-item-chip">
                  <img
                    src={item.image || "/images/samosa.jpg"}
                    alt={item.name}
                    className="tracked-item-thumb"
                    onError={(e) => {
                      e.target.src = "/images/samosa.jpg";
                    }}
                  />
                  <span>{item.name} × <strong>{item.quantity}</strong></span>
                </span>
              ))}
            </div>

            <div className="tracked-meta-right">
              <div className="tracked-total">
                Total: ₹{currentStudentOrder.totalAmount}
                <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#64748b", marginLeft: "6px" }}>
                  ({currentStudentOrder.paymentStatus === "Paid" ? "✓ Paid" : "Cash at Counter"})
                </span>
              </div>
            </div>
          </div>

          {/* 7. QUICK ACTION BUTTONS */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "20px",
              paddingTop: "16px",
              borderTop: "1px dashed #e2e8f0",
              flexWrap: "wrap"
            }}
          >
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setActiveTab && setActiveTab("order")}
            >
              <CartIcon size={14} /> + Order More Food
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setActiveTab && setActiveTab("my-orders")}
            >
              View in Your Orders →
            </button>
          </div>
        </div>
      ) : (
        /* =========================================================================
           EMPTY STATE: When the student has NO active order in queue
           ========================================================================= */
        <div className="student-empty-state-card">
          <div className="student-empty-icon-wrap">
            🍽️
          </div>
          <h3 className="student-empty-title">
            No Active Orders in Queue
          </h3>
          <p className="student-empty-desc">
            You don't have any active food orders waiting in the kitchen queue right now. Choose delicious snacks, meals, or beverages from the menu to get your digital queue token!
          </p>
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: "12px 28px", fontSize: "1rem" }}
            onClick={() => setActiveTab && setActiveTab("order")}
          >
            <CartIcon size={18} /> Browse Menu & Order Food →
          </button>

          {/* Optional Paper Token Lookup */}
          <div className="student-empty-search-box">
            <span className="student-search-label">
              Have an offline token from the counter or another device?
            </span>
            <div className="student-search-row">
              <input
                type="text"
                className="form-input"
                placeholder="Enter Token No (e.g. T-121)..."
                value={paperTokenInput}
                onChange={(e) => setPaperTokenInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && paperTokenInput.trim()) {
                    setSearchToken(paperTokenInput.trim());
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flexShrink: 0 }}
                onClick={() => {
                  if (paperTokenInput.trim()) {
                    setSearchToken(paperTokenInput.trim());
                  }
                }}
              >
                Track Token
              </button>
            </div>
            {searchToken && (
              <button
                type="button"
                style={{
                  background: "none",
                  border: "none",
                  color: "#ea580c",
                  fontSize: "0.8rem",
                  marginTop: "8px",
                  cursor: "pointer",
                  textDecoration: "underline"
                }}
                onClick={() => {
                  setSearchToken("");
                  setPaperTokenInput("");
                }}
              >
                Clear Token Filter
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
