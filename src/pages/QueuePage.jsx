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

  const isMyOrder = (order) => {
    if (!order) return false;
    if (savedLastToken && (order.tokenNumber === savedLastToken || order._id === savedLastToken)) return true;
    if (studentProfile?.phone && order.studentPhone && String(order.studentPhone) === String(studentProfile.phone)) return true;
    if (searchToken && order.tokenNumber?.toUpperCase() === searchToken.trim().toUpperCase()) return true;
    return false;
  };

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

  // Find user's tracked order if search token is entered
  const trackedOrder = searchToken.trim()
    ? orders.find(
        (o) =>
          o.tokenNumber?.toLowerCase() === searchToken.trim().toLowerCase() ||
          o.tokenNumber?.toLowerCase() === `t-${searchToken.trim().toLowerCase()}` ||
          o.tokenNumber?.toLowerCase().replace("t-", "") === searchToken.trim().toLowerCase()
      )
    : null;

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
      return `Approx. ${remaining} minutes`;
    }

    // Pending: orders ahead * 3 mins + 2 mins prep
    const totalEst = Math.max(3, ordersAhead * 3 + 2);
    return `Approx. ${totalEst} minutes`;
  };

  // Delay Indicator check
  const checkIsDelayed = (targetOrder) => {
    if (!targetOrder || ["Ready", "Completed", "Missed Pickup"].includes(targetOrder.orderStatus)) return null;
    const elapsedMins = Math.floor((Date.now() - new Date(targetOrder.createdAt).getTime()) / 60000);
    const expected = targetOrder.estimatedPrepTime || 8;
    if (targetOrder.delayMinutes > 0) {
      return { isDelayed: true, extraMinutes: targetOrder.delayMinutes };
    }
    if (elapsedMins > expected) {
      const extra = Math.max(3, elapsedMins - expected + 2);
      return { isDelayed: true, extraMinutes: extra };
    }
    return null;
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

  const trackedOrdersAhead = trackedOrder ? getOrdersAhead(trackedOrder) : 0;
  const trackedWaitTime = trackedOrder ? getEstimatedWaitTime(trackedOrder) : "";
  const trackedDelayInfo = trackedOrder ? checkIsDelayed(trackedOrder) : null;

  // =========================================================================
  // VENDOR VIEW: RESTORED EXACT ORIGINAL FULL KITCHEN BOARD WITH ACTION BUTTONS & REGISTRY
  // =========================================================================
  if (isVendorView) {
    return (

    <div className="queue-page-container">
      {/* 0. HIGH-TECH KIOSK / DISPLAY HEADER BAR */}
      <div className="page-header queue-header-flex">
        <div className="page-header-text">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span className="section-pill">
              <BellIcon size={14} /> Smart Live Queue Board
            </span>
            <span className="live-clock-pill">
              <ClockIcon size={13} /> {currentTime}
            </span>
          </div>
          <h2 className="page-title">
            Cafeteria Live Token Display
          </h2>
          <p className="page-description">
            Real-time kitchen order dispatch system. Watch your token advance from cooking to pickup counter.
          </p>
        </div>

        {/* Sync Controls */}
        <div className="live-sync-badge">
          <label className="sync-toggle-label" title="Automatically fetches updates every 4 seconds">
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
            title="Manual sync now"
          >
            <RefreshIcon size={13} className={loading ? "spin-refresh" : ""} />
            <span className="sync-btn-label">{loading ? "Syncing..." : "Sync"}</span>
          </button>
        </div>
      </div>

      {/* FEATURE 3: REAL-TIME STATUS NOTIFICATION ALERT */}
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

      {/* 1. HERO CALLING BANNER: NOW SERVING AT COUNTER 1 */}
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
                <p className="calling-sub">
                  {readyOrders.length > 0
                    ? "Tokens below are packed and ready at Counter 1. Please present your token number for pickup."
                    : "Orders are currently being prepared in the kitchen. Tokens will appear here once ready."}
                </p>
              </div>
            </div>

            {/* Ready Token Chips with Smooth Hover and Click-to-Track */}
            <div className="calling-token-chips">
              {readyOrders.length === 0 ? (
                <div className="no-ready-callout">
                  <span>Chef is cooking • Next token: </span>
                  <strong>{preparingOrders[0]?.tokenNumber || pendingOrders[0]?.tokenNumber || "None"}</strong>
                </div>
              ) : (
                readyOrders.map((ro) => (
                  <div
                    key={ro._id}
                    className="ready-token-pill"
                    onClick={() => setSearchToken(ro.tokenNumber)}
                    title="Click to track your order stage"
                  >
                    <div className="ready-token-num">{ro.tokenNumber}</div>
                    <div className="ready-token-details">
                      <span className="ready-items-tag">{ro.items.length} item{ro.items.length > 1 ? "s" : ""}</span>
                      <span className="ready-counter-tag">Counter 1</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 2. DEDICATED INTERACTIVE TOKEN FINDER & ORDER JOURNEY */}
          <div className="token-tracker-section">
            <div className="tracker-input-wrapper">
              <div className="tracker-search-box">
                <SearchIcon size={20} className="tracker-search-icon" />
                <input
                  type="text"
                  className="tracker-input"
                  placeholder="Enter Token Number to track your live order stage (e.g. T-112 or 112)..."
                  value={searchToken}
                  onChange={(e) => setSearchToken(e.target.value)}
                />
                {searchToken && (
                  <button
                    type="button"
                    className="btn-clear-tracker"
                    onClick={() => {
                      setSearchToken("");
                      try {
                        localStorage.removeItem("canteenGo_lastToken");
                      } catch {}
                    }}
                  >
                    ✕ Clear
                  </button>
                )}
              </div>

              {/* Quick Shortcuts */}
              <div className="quick-token-shortcuts">
                {savedLastToken && (
                  <button
                    type="button"
                    className="shortcut-chip shortcut-my-active"
                    onClick={() => setSearchToken(savedLastToken)}
                    title="Track your recent order token"
                  >
                    🎯 Track My Placed Order ({savedLastToken})
                  </button>
                )}

                <span className="shortcuts-label">Live Tokens:</span>
                {orders.slice(0, 6).map((o) => (
                  <button
                    key={o._id}
                    type="button"
                    className={`shortcut-chip ${searchToken.toUpperCase().includes(o.tokenNumber.toUpperCase()) ? "active" : ""}`}
                    onClick={() => setSearchToken(o.tokenNumber)}
                  >
                    {o.tokenNumber}
                  </button>
                ))}
              </div>
            </div>

            {/* 4-STAGE VISUAL PROGRESS JOURNEY CARD WITH ALL 6 BEST FEATURES */}
            {trackedOrder && (
              <div className="tracked-order-card">
                {/* Header Identity */}
                <div className="tracked-header">
                  <div className="tracked-identity">
                    <span className="tracked-tag">LIVE QUEUE MONITOR</span>
                    <h3 className="tracked-token-big">{trackedOrder.tokenNumber}</h3>
                    <span className="tracked-student">Order Token: <strong>{trackedOrder.tokenNumber}</strong> ({trackedOrder.items.length} items ordered)</span>
                  </div>

                  <div className="tracked-status-callout">
                    {trackedOrder.orderStatus === "Ready" && (
                      <div className="status-notice notice-ready">
                        <span className="notice-icon">🎉</span>
                        <div>
                          <strong className="notice-title">READY AT COUNTER 1!</strong>
                          <p className="notice-hindi">Aapka khana ready hai! Counter 1 par jakar collect karein.</p>
                        </div>
                      </div>
                    )}
                    {trackedOrder.orderStatus === "Preparing" && (
                      <div className="status-notice notice-preparing">
                        <span className="notice-icon">👨‍🍳</span>
                        <div>
                          <strong className="notice-title">COOKING IN KITCHEN</strong>
                          <p className="notice-hindi">Chef aapka khana bana rahe hain. Lagbhag 2-3 minute me ready ho jayega.</p>
                        </div>
                      </div>
                    )}
                    {trackedOrder.orderStatus === "Pending" && (
                      <div className="status-notice notice-pending">
                        <span className="notice-icon">⏳</span>
                        <div>
                          <strong className="notice-title">IN QUEUE (NEXT IN LINE)</strong>
                          <p className="notice-hindi">Aapka order line me hai. Chef jald hi banana shuru karenge.</p>
                        </div>
                      </div>
                    )}
                    {trackedOrder.orderStatus === "Missed Pickup" && (
                      <div className="status-notice notice-missed">
                        <span className="notice-icon">⚠️</span>
                        <div>
                          <strong className="notice-title">MISSED PICKUP DETECTED</strong>
                          <p className="notice-hindi">
                            Aapka order ready tha lekin counter se pick nahi hua. "Your Orders" page se re-queue karein!
                          </p>
                        </div>
                      </div>
                    )}
                    {trackedOrder.orderStatus === "Completed" && (
                      <div className="status-notice notice-completed">
                        <span className="notice-icon">✅</span>
                        <div>
                          <strong className="notice-title">ORDER DELIVERED / COLLECTED</strong>
                          <p className="notice-hindi">Order safely handed over. Enjoy your meal!</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* =========================================================================
                    CORE FEATURES DASHBOARD GRID
                    Feature 1: Estimated Wait Time
                    Feature 2: Orders Ahead of You
                    Feature 4: Pickup Counter & Location
                    Order Status & Payment
                    ========================================================================= */}
                <div className="queue-features-grid">
                  {/* FEATURE 1: ESTIMATED WAITING TIME */}
                  <div className="feature-stat-card card-eta">
                    <div className="stat-card-header">
                      <ClockIcon size={16} />
                      <span>ESTIMATED WAITING TIME</span>
                    </div>
                    <div className="stat-card-value value-eta">
                      {trackedWaitTime}
                    </div>
                    <small className="stat-card-sub">
                      {trackedOrder.orderStatus === "Ready"
                        ? "Available at pickup counter"
                        : trackedOrder.orderStatus === "Preparing"
                        ? "Actively cooking on the stove"
                        : `Calculated from ${trackedOrdersAhead} order(s) ahead`}
                    </small>
                  </div>

                  {/* FEATURE 2: ORDERS AHEAD OF YOU */}
                  <div className="feature-stat-card card-ahead">
                    <div className="stat-card-header">
                      <QueueIcon size={16} />
                      <span>ORDERS AHEAD OF YOU</span>
                    </div>
                    <div className="stat-card-value value-ahead">
                      {trackedOrder.orderStatus === "Preparing"
                        ? "0 (Cooking Now!)"
                        : trackedOrder.orderStatus === "Ready"
                        ? "0 (Ready for Pickup)"
                        : `${trackedOrdersAhead} Order${trackedOrdersAhead !== 1 ? "s" : ""} Ahead`}
                    </div>
                    <small className="stat-card-sub">
                      {trackedOrdersAhead === 0
                        ? "You are next in line for pickup"
                        : `${trackedOrdersAhead} orders in kitchen before your token`}
                    </small>
                  </div>

                  {/* FEATURE 4: PICKUP COUNTER & LOCATION */}
                  <div className="feature-stat-card card-location">
                    <div className="stat-card-header">
                      <span>📍</span>
                      <span>PICKUP LOCATION & COUNTER</span>
                    </div>
                    <div className="stat-card-value value-location">
                      {trackedOrder.counterName || "Counter 1 (Express Pickup)"}
                    </div>
                    <small className="stat-card-sub">
                      {trackedOrder.canteenName || "Food Court near 34 Block"}
                    </small>
                  </div>

                  {/* ORDER STATUS & PAYMENT INFO */}
                  <div className="feature-stat-card card-status">
                    <div className="stat-card-header">
                      <ShieldCheckIcon size={16} />
                      <span>ORDER STATUS & PAYMENT</span>
                    </div>
                    <div className="stat-card-value" style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
                      <StatusBadge status={trackedOrder.orderStatus} type="order" />
                      <StatusBadge status={trackedOrder.paymentStatus} type="payment" />
                    </div>
                    <small className="stat-card-sub">
                      Payment: {trackedOrder.paymentMethod} • ₹{trackedOrder.totalAmount}
                    </small>
                  </div>
                </div>

                {/* FEATURE 5: DELAY INDICATOR (Conditional) */}
                {trackedDelayInfo?.isDelayed && (
                  <div className="queue-delay-banner">
                    <div className="delay-banner-left">
                      <AlertTriangleIcon size={20} className="delay-warn-icon" />
                      <div>
                        <strong className="delay-title">
                          High Kitchen Rush • Delayed — Estimated {trackedDelayInfo.extraMinutes} more minutes
                        </strong>
                        <p className="delay-desc">
                          The chef is managing heavy break rush. Your fresh hot meal will arrive at Counter 1 shortly.
                        </p>
                      </div>
                    </div>
                    <span className="delay-disclaimer-pill">*Estimate is not an exact guarantee</span>
                  </div>
                )}

                {/* 4-Step Animated Visual Stepper */}
                <div className="order-stepper-container">
                  {/* Step 1: Placed */}
                  <div className={`stepper-node ${getProgressStep(trackedOrder.orderStatus) >= 1 ? "completed" : ""}`}>
                    <div className="node-icon-circle">
                      <CheckCircleIcon size={18} />
                    </div>
                    <div className="node-content">
                      <span className="node-title">1. Placed</span>
                      <span className="node-sub">In Kitchen System</span>
                    </div>
                  </div>

                  <div className={`stepper-connector ${getProgressStep(trackedOrder.orderStatus) >= 2 ? "active" : ""}`}></div>

                  {/* Step 2: Cooking */}
                  <div
                    className={`stepper-node ${
                      getProgressStep(trackedOrder.orderStatus) === 2
                        ? "current"
                        : getProgressStep(trackedOrder.orderStatus) > 2
                        ? "completed"
                        : ""
                    }`}
                  >
                    <div className="node-icon-circle">
                      <FlameIcon size={18} />
                    </div>
                    <div className="node-content">
                      <span className="node-title">2. Cooking</span>
                      <span className="node-sub">On Stove (~3 min)</span>
                    </div>
                  </div>

                  <div className={`stepper-connector ${getProgressStep(trackedOrder.orderStatus) >= 3 ? "active" : ""}`}></div>

                  {/* Step 3: Ready for Counter Pickup */}
                  <div
                    className={`stepper-node ${
                      getProgressStep(trackedOrder.orderStatus) === 3
                        ? "current pulse-glow"
                        : getProgressStep(trackedOrder.orderStatus) > 3
                        ? "completed"
                        : ""
                    }`}
                  >
                    <div className="node-icon-circle">
                      <BellIcon size={18} />
                    </div>
                    <div className="node-content">
                      <span className="node-title">3. Counter 1</span>
                      <span className="node-sub">Ready for Pickup</span>
                    </div>
                  </div>

                  <div className={`stepper-connector ${getProgressStep(trackedOrder.orderStatus) >= 4 ? "active" : ""}`}></div>

                  {/* Step 4: Handed Over */}
                  <div className={`stepper-node ${getProgressStep(trackedOrder.orderStatus) >= 4 ? "completed" : ""}`}>
                    <div className="node-icon-circle">
                      <CheckCircleIcon size={18} />
                    </div>
                    <div className="node-content">
                      <span className="node-title">4. Collected</span>
                      <span className="node-sub">Handed Over</span>
                    </div>
                  </div>
                </div>

                {/* Tracked Order Details Footer */}
                <div className="tracked-footer">
                  <div className="tracked-items-list">
                    <span className="items-label">Food Items:</span>
                    {trackedOrder.items?.map((it, i) => (
                      <span key={i} className="tracked-item-chip">
                        <img
                          src={it.image || "/images/samosa.jpg"}
                          alt={it.name}
                          className="tracked-item-thumb"
                          onError={(e) => {
                            e.target.src = "/images/samosa.jpg";
                          }}
                        />
                        <span>{it.name} (×{it.quantity})</span>
                      </span>
                    ))}
                  </div>

                  <div className="tracked-meta-right">
                    <StatusBadge status={trackedOrder.paymentStatus} type="payment" />
                    <span className="tracked-total">Total: ₹{trackedOrder.totalAmount}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. AT-A-GLANCE METRICS & STAGE FILTERS */}
          <div className="queue-filter-toolbar">
            <div className="queue-stage-filters">
              <button
                type="button"
                className={`stage-filter-btn ${filterStage === "all" ? "active" : ""}`}
                onClick={() => setFilterStage("all")}
              >
                All Active ({orders.filter((o) => o.orderStatus !== "Completed").length})
              </button>
              <button
                type="button"
                className={`stage-filter-btn filter-btn-ready ${filterStage === "ready" ? "active" : ""}`}
                onClick={() => setFilterStage("ready")}
              >
                🟢 Ready ({readyOrders.length})
              </button>
              <button
                type="button"
                className={`stage-filter-btn filter-btn-cooking ${filterStage === "preparing" ? "active" : ""}`}
                onClick={() => setFilterStage("preparing")}
              >
                🔥 Cooking ({preparingOrders.length})
              </button>
              <button
                type="button"
                className={`stage-filter-btn filter-btn-pending ${filterStage === "pending" ? "active" : ""}`}
                onClick={() => setFilterStage("pending")}
              >
                ⏳ In Line ({pendingOrders.length})
              </button>
            </div>

            <div className="queue-wait-estimate" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <ClockIcon size={14} />
              {isVendorView && selectedCanteen ? (
                <span>Canteen Terminal: <strong>{selectedCanteen.name} ({selectedCanteen.counter})</strong></span>
              ) : (
                <>
                  <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "600" }}>Canteen:</span>
                  <select
                    style={{
                      background: "#ffffff",
                      border: "1.5px solid #cbd5e1",
                      borderRadius: "8px",
                      padding: "4px 8px",
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      color: "#1e293b",
                      cursor: "pointer"
                    }}
                    value={activeCanteenFilter}
                    onChange={(e) => setActiveCanteenFilter(e.target.value)}
                  >
                    {canteensList.map((c) => (
                      <option key={c.id || c.canteenId} value={c.id || c.canteenId}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </div>

          {/* 4. MODERN 4-COLUMN KIOSK BOARD (Refined Swimlanes) */}
          <div className="queue-board">
            {/* Column 1: Ready for Pickup */}
            {(filterStage === "all" || filterStage === "ready") && (
              <div className="queue-column queue-column-ready">
                <div className="queue-column-header header-ready">
                  <div className="header-icon-title">
                    <BellIcon size={18} />
                    <span>Ready for Pickup</span>
                  </div>
                  <span className="badge badge-ready">{readyOrders.length}</span>
                </div>

                <div className="queue-column-body">
                  {readyOrders.length === 0 ? (
                    <div className="empty-column-state">
                      <span style={{ fontSize: "1.8rem", display: "block", marginBottom: "8px" }}>🔔</span>
                      <p>No orders waiting at the counter right now</p>
                      <small>Food ready in kitchen will arrive here</small>
                    </div>
                  ) : (
                    readyOrders.map((order) => {
                      const isCurrentMyOrder = isMyOrder(order);
                      return (
                        <div
                          key={order._id}
                          className={`queue-card card-ready-pulsing ${isCurrentMyOrder ? "card-my-order-highlight" : ""} ${searchToken.toUpperCase().includes(order.tokenNumber.toUpperCase()) ? "card-highlight" : ""}`}
                          onClick={() => setSearchToken(order.tokenNumber)}
                        >
                          {isCurrentMyOrder && (
                            <div className="my-order-accent-banner banner-ready">
                              <span className="accent-tag">🎉 AAPKA ORDER READY HAI!</span>
                              <strong className="accent-sub">Counter 1 par jakar collect karein</strong>
                            </div>
                          )}
                          <div className="queue-card-top">
                            <div className="queue-card-identity">
                              <img
                                src={order.items[0]?.image || "/images/samosa.jpg"}
                                alt="Item"
                                className="queue-card-img"
                                onError={(e) => {
                                  e.target.src = "/images/samosa.jpg";
                                }}
                              />
                              <div>
                                <div className="token-display-ready">{order.tokenNumber}</div>
                                <div className="ready-counter-sub">Counter 1 • Pickup Ready</div>
                              </div>
                            </div>

                            <div className="pickup-callout">
                              <span className="pickup-pulse-dot"></span>
                              <span>COUNTER 1</span>
                            </div>
                          </div>

                          <div className="queue-card-footer">
                            <div className="queue-items-text">
                              {order.items.map((i) => `${i.name} (×${i.quantity})`).join(", ")}
                            </div>
                            <StatusBadge status={order.paymentStatus} type="payment" />
                          </div>

                          {/* Vendor quick action if in vendor view */}
                          {isVendorView && onVendorAction && (
                            <div className="vendor-card-quick-action">
                              <button
                                type="button"
                                className="btn btn-primary btn-xs w-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onVendorAction(order._id, "Completed");
                                }}
                              >
                                ✓ Mark Handed Over
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Column 2: Cooking in Kitchen */}
            {(filterStage === "all" || filterStage === "preparing") && (
              <div className="queue-column queue-column-preparing">
                <div className="queue-column-header header-preparing">
                  <div className="header-icon-title">
                    <ChefIcon size={18} />
                    <span>Cooking in Kitchen</span>
                  </div>
                  <span className="badge badge-preparing">{preparingOrders.length}</span>
                </div>

                <div className="queue-column-body">
                  {preparingOrders.length === 0 ? (
                    <div className="empty-column-state">
                      <span style={{ fontSize: "1.8rem", display: "block", marginBottom: "8px" }}>👨‍🍳</span>
                      <p>Chef is all caught up!</p>
                      <small>Waiting for new orders</small>
                    </div>
                  ) : (
                    preparingOrders.map((order) => {
                      const isCurrentMyOrder = isMyOrder(order);
                      return (
                        <div
                          key={order._id}
                          className={`queue-card card-preparing ${isCurrentMyOrder ? "card-my-order-highlight" : ""} ${searchToken.toUpperCase().includes(order.tokenNumber.toUpperCase()) ? "card-highlight" : ""}`}
                          onClick={() => setSearchToken(order.tokenNumber)}
                        >
                          {isCurrentMyOrder && (
                            <div className="my-order-accent-banner banner-cooking">
                              <span className="accent-tag">👨‍🍳 AAPKA ORDER COOK HO RAHA HAI!</span>
                              <strong className="accent-sub">Chef is cooking your fresh order</strong>
                            </div>
                          )}
                          <div className="queue-card-top">
                            <div className="queue-card-identity">
                              <img
                                src={order.items[0]?.image || "/images/samosa.jpg"}
                                alt="Item"
                                className="queue-card-img"
                                onError={(e) => {
                                  e.target.src = "/images/samosa.jpg";
                                }}
                              />
                              <div>
                                <div className="token-display-preparing">{order.tokenNumber}</div>
                                <div className="prep-status-sub">On Stove • Fresh Cooking</div>
                              </div>
                            </div>
                            <span className="wait-pill">~3 min</span>
                          </div>

                          <div className="queue-card-footer">
                            <div className="queue-items-text">
                              {order.items.map((i) => `${i.name} (×${i.quantity})`).join(", ")}
                            </div>
                            <StatusBadge status={order.paymentStatus} type="payment" />
                          </div>

                          {/* Vendor quick action if in vendor view */}
                          {isVendorView && onVendorAction && (
                          <div className="vendor-card-quick-action">
                            <button
                              type="button"
                              className="btn btn-success btn-xs w-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                onVendorAction(order._id, "Ready");
                              }}
                            >
                              🔔 Mark Ready for Counter
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                  )}
                </div>
              </div>
            )}

            {/* Column 3: In Line (Pending) */}
            {(filterStage === "all" || filterStage === "pending") && (
              <div className="queue-column queue-column-pending">
                <div className="queue-column-header header-pending">
                  <div className="header-icon-title">
                    <ClockIcon size={18} />
                    <span>Next in Line</span>
                  </div>
                  <span className="badge badge-pending">{pendingOrders.length}</span>
                </div>

                <div className="queue-column-body">
                  {/* Top Banner if logged-in student has an active order in pending queue */}
                  {(() => {
                    const myPendingIdx = pendingOrders.findIndex(isMyOrder);
                    if (myPendingIdx === -1) return null;
                    const myPendingOrder = pendingOrders[myPendingIdx];
                    return (
                      <div className="next-in-line-my-banner">
                        <div className="my-banner-badge">
                          <span className="my-badge-pos">#{myPendingIdx + 1}</span>
                          <span className="my-badge-lbl">IN LINE</span>
                        </div>
                        <div className="my-banner-info">
                          <div className="my-banner-title">
                            {myPendingIdx === 0
                              ? "🔥 AAPKA ORDER NEXT HAI!"
                              : `⏳ AAPKE AAGE ${myPendingIdx} ORDER${myPendingIdx > 1 ? "S" : ""} ${myPendingIdx > 1 ? "HAIN" : "HAI"}`}
                          </div>
                          <div className="my-banner-sub">
                            Token <strong>{myPendingOrder.tokenNumber}</strong> • {myPendingIdx === 0 ? "Chef starts cooking right next" : `Est. wait ~${(myPendingIdx + 1) * 3} mins`}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {pendingOrders.length === 0 ? (
                    <div className="empty-column-state">
                      <span style={{ fontSize: "1.8rem", display: "block", marginBottom: "8px" }}>⏳</span>
                      <p>No waiting tokens</p>
                      <small>New orders will queue here</small>
                    </div>
                  ) : (
                    pendingOrders.map((order, idx) => {
                      const isCurrentMyOrder = isMyOrder(order);
                      return (
                        <div
                          key={order._id}
                          className={`queue-card card-pending ${isCurrentMyOrder ? "card-my-order-highlight" : ""} ${searchToken.toUpperCase().includes(order.tokenNumber.toUpperCase()) ? "card-highlight" : ""}`}
                          onClick={() => setSearchToken(order.tokenNumber)}
                        >
                          {/* Prominent accent badge if this is the student's order */}
                          {isCurrentMyOrder && (
                            <div className="my-order-accent-banner">
                              <span className="accent-tag">⭐ AAPKA ORDER</span>
                              <strong className="accent-sub">
                                {idx === 0
                                  ? "🔥 NEXT UP TO COOK!"
                                  : `👉 ${idx} ORDER${idx > 1 ? "S" : ""} AHEAD OF YOU`}
                              </strong>
                            </div>
                          )}

                          <div className="queue-card-top">
                            <div className="queue-card-identity">
                              <div className={`line-pos-badge ${idx === 0 ? "pos-first" : ""}`}>
                                #{idx + 1}
                              </div>
                              <div>
                                <div className="token-display-pending">{order.tokenNumber}</div>
                                <div className="queue-ahead-sub">
                                  {idx === 0 ? (
                                    <span className="pill-ahead-first">🔥 0 ahead • Next to cook</span>
                                  ) : (
                                    <span className="pill-ahead-count">
                                      ⏳ <strong>{idx}</strong> {idx === 1 ? "order" : "orders"} ahead
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="queue-card-right-stats">
                              <span className="queue-wait-chip">~{(idx + 1) * 3}m wait</span>
                              <span className="queue-total-price">₹{order.totalAmount}</span>
                            </div>
                          </div>

                          <div className="queue-card-footer">
                            <div className="queue-items-text" title={order.items.map((i) => `${i.name} (×${i.quantity})`).join(", ")}>
                              {order.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                            </div>
                            <span className="queue-item-badge">
                              {order.items.reduce((s, it) => s + it.quantity, 0)} item{order.items.reduce((s, it) => s + it.quantity, 0) > 1 ? "s" : ""}
                            </span>
                          </div>

                          {/* Instant clarity strip: dekhte hi samajh jaye kitne ke baad mera hai */}
                          <div className="queue-position-clarity-strip">
                            {idx === 0 ? (
                              <span>👨‍🍳 Chef will prepare this token next as soon as pan frees up</span>
                            ) : (
                              <span>
                                ⏳ Is order se pehle kitchen me <strong>{idx}</strong> order{idx > 1 ? "s" : ""} cook honge
                              </span>
                            )}
                          </div>

                          {/* Vendor quick action if in vendor view */}
                          {isVendorView && onVendorAction && (
                            <div className="vendor-card-quick-action">
                              <button
                                type="button"
                                className="btn btn-secondary btn-xs w-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onVendorAction(order._id, "Preparing");
                                }}
                              >
                                👨‍🍳 Start Cooking
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Column 4: Picked Up (Completed) */}
            {filterStage === "all" && (
              <div className="queue-column queue-column-completed">
                <div className="queue-column-header header-completed">
                  <div className="header-icon-title">
                    <CheckCircleIcon size={18} />
                    <span>Picked Up</span>
                  </div>
                  <span className="badge badge-completed">{completedOrders.length}</span>
                </div>

                <div className="queue-column-body">
                  {completedOrders.length === 0 ? (
                    <div className="empty-column-state">
                      <p>No pickups yet today</p>
                    </div>
                  ) : (
                    completedOrders.map((order) => (
                      <div key={order._id} className="queue-card card-completed">
                        <div className="queue-card-top">
                          <div>
                            <strong className="token-display-completed">{order.tokenNumber}</strong>
                            <span className="collected-time-sub" style={{ marginLeft: "8px", fontSize: "0.78rem", color: "#64748b" }}>
                              {new Date(order.updatedAt || order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <span className="collected-check-tag">✓ Handed Over</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 5. Chronological Full Order Queue Table */}
          <div className="card" style={{ marginTop: "32px" }}>
            <div className="card-header">
              <h3 className="card-title">
                <span>🧾</span> Chronological Order Registry
              </h3>
              <span className="table-count-tag">Showing {orders.length} orders today</span>
            </div>

            {orders.length === 0 ? (
              <p className="empty-vendor-state">No orders registered today.</p>
            ) : (
              <div className="table-container">
                <table className="order-table">
                  <thead>
                    <tr>
                      <th>Token No.</th>
                      <th>Items Ordered</th>
                      <th>Total</th>
                      <th>Order Status</th>
                      <th>Payment Status</th>
                      <th>Order Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr
                        key={order._id}
                        className={searchToken.toUpperCase().includes(order.tokenNumber.toUpperCase()) ? "row-highlight" : ""}
                      >
                        <td>
                          <span className="token-table-badge">{order.tokenNumber}</span>
                        </td>
                        <td>
                          <div className="table-items-cell">
                            {order.items.map((i, idx) => (
                              <div key={idx} className="table-item-row">
                                <img
                                  src={i.image || "/images/samosa.jpg"}
                                  alt={i.name}
                                  className="table-item-thumb"
                                  onError={(e) => {
                                    e.target.src = "/images/samosa.jpg";
                                  }}
                                />
                                <span>{i.name} × <strong>{i.quantity}</strong></span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td>
                          <strong className="table-price">₹{order.totalAmount}</strong>
                        </td>
                        <td>
                          <StatusBadge status={order.orderStatus} type="order" />
                        </td>
                        <td>
                          <StatusBadge status={order.paymentStatus} type="payment" />
                          <span style={{ fontSize: "0.78rem", color: "#64748b", marginLeft: "6px" }}>
                            ({order.paymentMethod})
                          </span>
                        </td>
                        <td className="table-timestamp">
                          {new Date(order.createdAt).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
    );
  }

  // =========================================================================
  // REDESIGNED STUDENT LIVE QUEUE (ONLY Shows Student's Order + Time + Ahead)
  // No Chronological Order Registry & No Other Students' Orders!
  // =========================================================================
  const studentMatchedOrders = orders.filter((o) => {
    if (!o) return false;
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
    if (studentProfile?.phone && o.studentPhone && String(o.studentPhone).trim() === String(studentProfile.phone).trim()) {
      return true;
    }
    if (savedLastToken && (o.tokenNumber === savedLastToken || o._id === savedLastToken)) {
      return true;
    }
    if (studentProfile?.email && o.studentEmail && o.studentEmail.toLowerCase() === studentProfile.email.toLowerCase()) {
      return true;
    }
    if (studentProfile?.name && o.studentName && o.studentName.trim().toLowerCase() === studentProfile.name.trim().toLowerCase()) {
      return true;
    }
    return false;
  });

  const activeStudentOrders = studentMatchedOrders.filter((o) =>
    ["Pending", "Preparing", "Ready"].includes(o.orderStatus)
  );
  const pastStudentOrders = studentMatchedOrders.filter((o) =>
    ["Completed", "Missed Pickup"].includes(o.orderStatus)
  );

  const [selectedStudentOrderId, setSelectedStudentOrderId] = useState(null);

  const currentStudentOrder = (() => {
    if (selectedStudentOrderId) {
      const match = studentMatchedOrders.find((o) => o._id === selectedStudentOrderId);
      if (match) return match;
    }
    return activeStudentOrders[0] || pastStudentOrders[0] || null;
  })();

  const currentOrdersAhead = currentStudentOrder ? getOrdersAhead(currentStudentOrder) : 0;
  const currentWaitTime = currentStudentOrder ? getEstimatedWaitTime(currentStudentOrder) : "";
  const currentProgressStep = currentStudentOrder ? getProgressStep(currentStudentOrder.orderStatus) : 0;

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

      {/* 2. MAIN STUDENT QUEUE TRACKER LAYOUT */}
      <div className={`student-queue-layout ${activeStudentOrders.length > 1 ? "has-sidebar" : ""}`}>
        {/* Left Vertical Column: Active Orders Selector (When student has multiple orders) */}
        {activeStudentOrders.length > 1 && (
          <aside className="student-orders-vertical-sidebar">
            <div className="sidebar-header">
              <div className="sidebar-title-row">
                <span className="sidebar-title">Your Active Orders</span>
                <span className="sidebar-count-badge">{activeStudentOrders.length}</span>
              </div>
              <p className="sidebar-subtitle">Tap token to track live status</p>
            </div>

            <div className="student-orders-vertical-list">
              {activeStudentOrders.map((ord) => {
                const isSelected = currentStudentOrder?._id === ord._id;
                const ahead = getOrdersAhead(ord);
                const totalItems = ord.items?.reduce((s, it) => s + it.quantity, 0) || 0;

                return (
                  <button
                    key={ord._id}
                    type="button"
                    className={`student-order-vertical-card ${isSelected ? "active" : ""}`}
                    onClick={() => setSelectedStudentOrderId(ord._id)}
                  >
                    <div className="vertical-card-top">
                      <span className="vertical-card-token">{ord.tokenNumber}</span>
                      <span className={`vertical-status-chip status-${ord.orderStatus?.toLowerCase().replace(/\s+/g, '-')}`}>
                        {ord.orderStatus}
                      </span>
                    </div>

                    <div className="vertical-card-items" title={ord.items?.map((i) => `${i.name} (×${i.quantity})`).join(", ")}>
                      {ord.items?.map((i) => `${i.name} ×${i.quantity}`).join(", ") || `${totalItems} items`}
                    </div>

                    <div className="vertical-card-meta">
                      <span className="vertical-meta-wait">
                        {ord.orderStatus === "Ready"
                          ? "🎉 Ready"
                          : ord.orderStatus === "Preparing"
                          ? "🔥 Cooking"
                          : ahead === 0
                          ? "⭐ Next up"
                          : `${ahead} ahead`}
                      </span>
                      <span className="vertical-meta-amount">₹{ord.totalAmount}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
        )}

        {/* Right / Main Column: Active Order Details or Empty State */}
        <div className="student-tracker-main-col">
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
                    Aapka khana ready hai! Please head to Counter 1 and present your token number to collect.
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

          {/* 4. 4-STAGE ANIMATED VISUAL PROGRESS STEPPER */}
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
      </div>
    </div>
  );
}
