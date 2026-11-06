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
    if (studentProfile?.phone && order.studentPhone && String(order.studentPhone).trim() === String(studentProfile.phone).trim()) return true;
    if (studentProfile?.email && order.studentEmail && order.studentEmail.toLowerCase() === studentProfile.email.toLowerCase()) return true;
    if (studentProfile?.name && order.studentName && order.studentName.trim().toLowerCase() === studentProfile.name.trim().toLowerCase()) return true;
    if (searchToken && order.tokenNumber?.toUpperCase() === searchToken.trim().toUpperCase()) return true;
    return false;
  };

  // Resilient multi-canteen order matcher
  const matchesCanteen = (order, targetCanteen) => {
    if (!order || !targetCanteen) return false;
    const targetId = targetCanteen.id || targetCanteen.canteenId;
    const targetName = (targetCanteen.name || "").toLowerCase().trim();
    const targetShort = (targetCanteen.shortName || "").toLowerCase().trim();

    if (targetId && order.canteenId && String(order.canteenId).toLowerCase() === String(targetId).toLowerCase()) {
      return true;
    }

    if (order.canteenName) {
      const oName = order.canteenName.toLowerCase().trim();
      if (targetName && (oName === targetName || oName.includes(targetName) || targetName.includes(oName))) {
        return true;
      }
      if (targetShort && (oName.includes(targetShort) || targetShort.includes(oName))) {
        return true;
      }
    }

    if (targetId === "foodcourt-34" && (order.canteenName?.match(/34\s*Block/i) || order.canteenId?.includes("34"))) return true;
    if (targetId === "nk-foodcourt" && (order.canteenName?.match(/NK/i) || order.canteenId?.includes("nk"))) return true;
    if (targetId === "main-canteen" && (order.canteenName?.match(/Main\s*Canteen/i) || order.canteenId?.includes("main"))) return true;
    if (targetId === "library-cafe" && (order.canteenName?.match(/Library/i) || order.canteenId?.includes("library"))) return true;

    if (order.items && Array.isArray(order.items)) {
      return order.items.some((it) => {
        if (targetId && it.canteenId && String(it.canteenId).toLowerCase() === String(targetId).toLowerCase()) return true;
        if (it.canteenName && targetName && it.canteenName.toLowerCase().includes(targetName)) return true;
        return false;
      });
    }

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
      // For vendor console, filter by selected canteen if set; for student portal, fetch all orders
      // so student's personal tracker tracks all multi-canteen orders and the public board filters instantly!
      const canteenParam = isVendorView && activeCanteenFilter && activeCanteenFilter !== "all"
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
  // CAMPUS LIVE QUEUE (STUDENT VIEW) - Matching Exact Design
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

  // Selected Canteen for the Live Queue Display
  const [selectedBoardCanteenId, setSelectedBoardCanteenId] = useState(() => {
    if (selectedCanteen?.id) return selectedCanteen.id;
    return canteensList[0]?.id || canteensList[0]?.canteenId || "foodcourt-34";
  });

  const selectedBoardCanteen = useMemo(() => {
    return (
      canteensList.find((c) => (c.id || c.canteenId) === selectedBoardCanteenId) ||
      canteensList[0] ||
      CAMPUS_CANTEENS[0]
    );
  }, [canteensList, selectedBoardCanteenId]);

  // Canteen-specific active student orders (Only orders belonging to the currently selected canteen!)
  const canteenActiveStudentOrders = useMemo(() => {
    return activeStudentOrders.filter((o) => matchesCanteen(o, selectedBoardCanteen));
  }, [activeStudentOrders, selectedBoardCanteen]);

  const currentStudentOrder = useMemo(() => {
    if (selectedStudentOrderId) {
      const match = canteenActiveStudentOrders.find((o) => o._id === selectedStudentOrderId);
      if (match) return match;
    }
    return canteenActiveStudentOrders[0] || null;
  }, [canteenActiveStudentOrders, selectedStudentOrderId]);

  const currentOrdersAhead = currentStudentOrder ? getOrdersAhead(currentStudentOrder) : 0;
  const currentWaitTime = currentStudentOrder ? getEstimatedWaitTime(currentStudentOrder) : "";

  // Filter orders for the selected canteen
  const boardOrders = useMemo(() => {
    return orders.filter((o) => matchesCanteen(o, selectedBoardCanteen));
  }, [orders, selectedBoardCanteen]);

  const boardPreparingOrders = useMemo(() => {
    return boardOrders.filter((o) => o.orderStatus === "Preparing");
  }, [boardOrders]);

  const boardReadyOrders = useMemo(() => {
    return boardOrders.filter((o) => o.orderStatus === "Ready");
  }, [boardOrders]);

  const boardPendingOrders = useMemo(() => {
    return boardOrders
      .filter((o) => o.orderStatus === "Pending")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [boardOrders]);

  const boardWaitingCount = boardPendingOrders.length;
  const boardPreparingCount = boardPreparingOrders.length;
  const boardReadyCount = boardReadyOrders.length;

  const boardEstWaitMinutes = useMemo(() => {
    if (boardWaitingCount === 0 && boardPreparingCount === 0) return 0;
    return Math.max(3, Math.round(boardWaitingCount * 2.5 + (boardPreparingCount > 0 ? 3 : 0)));
  }, [boardWaitingCount, boardPreparingCount]);

  return (
    <div className="campus-queue-page">
      {/* 1. TOP HEADER */}
      <div className="cq-header">
        <div className="cq-header-left">
          <div className="cq-header-icon-box">
            🛎️
          </div>
          <div>
            <h2 className="cq-header-title">Campus Live Queue</h2>
            <p className="cq-header-sub">
              Public live counter monitor • Orders update in real-time as kitchen advances tokens
            </p>
          </div>
        </div>

        <div className="cq-sync-pill">
          <button
            type="button"
            className="cq-sync-time"
            onClick={() => fetchQueueOrders(true)}
            title="Click to refresh live queue"
          >
            <RefreshIcon size={14} className={loading ? "spin-refresh" : ""} />
            <span>Last Updated: {lastRefreshed}</span>
          </button>
          <div className="cq-sync-dot-badge">
            <span className="cq-pulse-green"></span>
            <span>Live Sync</span>
          </div>
        </div>
      </div>

      {/* 2. SELECT CANTEEN BAR */}
      <div className="cq-canteen-bar">
        <span className="cq-canteen-label">Select Canteen:</span>
        <div className="cq-canteen-chips">
          {canteensList.map((canteen) => {
            const cId = canteen.id || canteen.canteenId;
            const isSelected = cId === selectedBoardCanteenId;
            return (
              <button
                key={cId}
                type="button"
                className={`cq-canteen-chip ${isSelected ? "active" : ""}`}
                onClick={() => setSelectedBoardCanteenId(cId)}
              >
                <span>{canteen.icon || "🏢"}</span>
                <span>{canteen.shortName || canteen.name}</span>
                {isSelected && <span className="chip-check">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. METRICS STRIP (4 METRICS IN A ROW) */}
      <div className="cq-metrics-card">
        {/* Waiting in Queue */}
        <div className="cq-metric-item">
          <span className="cq-metric-icon">👥</span>
          <div className="cq-metric-content">
            <span className="cq-metric-title">Waiting in Queue</span>
            <span className="cq-metric-num">{boardWaitingCount}</span>
            <span className="cq-metric-sub">Orders in line</span>
          </div>
        </div>

        {/* Now Cooking */}
        <div className="cq-metric-item">
          <span className="cq-metric-icon">👨‍🍳</span>
          <div className="cq-metric-content">
            <span className="cq-metric-title">Now Cooking</span>
            <span className="cq-metric-num">{boardPreparingCount}</span>
            <span className="cq-metric-sub">Active on stove</span>
          </div>
        </div>

        {/* Ready at Counter */}
        <div className="cq-metric-item">
          <span className="cq-metric-icon">✅</span>
          <div className="cq-metric-content">
            <span className="cq-metric-title title-green">Ready at Counter</span>
            <span className="cq-metric-num num-green">{boardReadyCount}</span>
            <span className="cq-metric-sub">Waiting for pickup</span>
          </div>
        </div>

        {/* Estimated Queue Wait */}
        <div className="cq-metric-item">
          <span className="cq-metric-icon">🕒</span>
          <div className="cq-metric-content">
            <span className="cq-metric-title">Estimated Queue Wait</span>
            <span className="cq-metric-num">~{boardEstWaitMinutes} min</span>
            <span className="cq-metric-sub">From current kitchen load</span>
          </div>
        </div>
      </div>

      {/* 4. THREE MAIN COLUMNS */}
      <div className="cq-board-grid">
        {/* Column 1: Now Preparing */}
        <div className="cq-col col-prep">
          <div className="cq-col-header">
            <div className="cq-col-title-wrap">
              <FlameIcon size={18} />
              <span>Now Preparing</span>
            </div>
            <span className="cq-col-badge badge-orange">{boardPreparingOrders.length}</span>
          </div>

          <div className="cq-col-body">
            {boardPreparingOrders.length === 0 ? (
              <div className="cq-empty-state">
                <span className="empty-icon">👨‍🍳</span>
                <p>No orders cooking on stove</p>
                <small>Kitchen is ready for next orders</small>
              </div>
            ) : (
              boardPreparingOrders.map((ord) => (
                <div key={ord._id} className="cq-prep-card">
                  <div className="cq-prep-left">
                    <span className="cq-token-large-orange">{ord.tokenNumber}</span>
                    <div className="cq-prep-details">
                      <div className="cq-prep-food">
                        {ord.items?.map((i) => `${i.name} × ${i.quantity}`).join(", ") || "Snacks"}
                      </div>
                      <div className="cq-prep-sub">
                        🔥 On stove with chef • Fresh cooking
                      </div>
                    </div>
                  </div>
                  <span className="cq-counter-chip">
                    📍 {ord.counterName || selectedBoardCanteen.counter || "Counter 1"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Ready for Pickup */}
        <div className="cq-col col-ready">
          <div className="cq-col-header">
            <div className="cq-col-title-wrap">
              <BellIcon size={18} />
              <span>Ready for Pickup</span>
            </div>
            <span className="cq-col-badge badge-green">{boardReadyOrders.length}</span>
          </div>

          <div className="cq-col-body">
            {boardReadyOrders.length === 0 ? (
              <div className="cq-empty-state">
                <span className="empty-icon">🔔</span>
                <p>All ready orders collected</p>
                <small>Tokens ready for pickup appear here</small>
              </div>
            ) : (
              boardReadyOrders.map((ord) => (
                <div key={ord._id} className="cq-ready-card">
                  <div className="cq-ready-top">
                    <span className="cq-token-large-green">{ord.tokenNumber}</span>
                    <span className="cq-ready-pill">✓ READY</span>
                  </div>
                  <div className="cq-ready-collect">
                    Please collect at <strong>{ord.counterName || selectedBoardCanteen.counter || "Counter 1 (Express Delivery)"}</strong>
                  </div>
                  <div className="cq-ready-time">
                    Ready since {new Date(ord.updatedAt || ord.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Next in Queue */}
        <div className="cq-col col-queue">
          <div className="cq-col-header">
            <div className="cq-col-title-wrap">
              <ClockIcon size={18} />
              <span>Next in Queue</span>
            </div>
            <span className="cq-col-badge badge-gray">{boardPendingOrders.length}</span>
          </div>

          <div className="cq-col-body">
            {boardPendingOrders.length === 0 ? (
              <div className="cq-empty-state">
                <span className="empty-icon">⏳</span>
                <p>No waiting tokens in line</p>
                <small>Order now for instant preparation</small>
              </div>
            ) : (
              boardPendingOrders.slice(0, 5).map((ord, idx) => {
                const isMine = isMyOrder(ord);
                const itemCount = ord.items?.reduce((s, it) => s + it.quantity, 0) || 1;
                return (
                  <div
                    key={ord._id}
                    className={`cq-queue-row ${isMine ? "is-my-order" : ""}`}
                  >
                    <span className="cq-q-pos">#{idx + 1}</span>
                    <span className="cq-q-token">
                      {isMine && "⭐ "}
                      {ord.tokenNumber}
                      {isMine && <span className="cq-you-pill">YOU</span>}
                    </span>
                    <span className="cq-q-items">📦 {itemCount} item{itemCount > 1 ? "s" : ""}</span>
                    <span className="cq-q-wait">~{(idx + 1) * 3} min wait</span>
                    <span className="cq-q-private">🔒 Private</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 5. BOTTOM HIGHLIGHT STRIP: YOUR ORDER (with integrated active token switcher) */}
      {currentStudentOrder ? (
        <div className="cq-your-order-card">
          {/* Integrated token switcher inside the card header (only if multiple active orders in this canteen) */}
          {canteenActiveStudentOrders.length > 1 && (
            <div className="cq-yo-card-header">
              <div className="cq-yo-header-label">
                <span className="cq-yo-header-icon">🔄</span>
                <span>Switch Active Order in {selectedBoardCanteen.shortName || selectedBoardCanteen.name} ({canteenActiveStudentOrders.length}):</span>
              </div>
              <div className="cq-yo-token-chips">
                {canteenActiveStudentOrders.map((ord) => {
                  const isSel = currentStudentOrder?._id === ord._id;
                  return (
                    <button
                      key={ord._id}
                      type="button"
                      className={`cq-yo-tab-chip ${isSel ? "active" : ""}`}
                      onClick={() => setSelectedStudentOrderId(ord._id)}
                    >
                      <span className="cq-tab-token-num">Token {ord.tokenNumber}</span>
                      <span className={`cq-tab-badge status-${ord.orderStatus?.toLowerCase()}`}>
                        {ord.orderStatus}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="cq-yo-card-body">
            {/* Left Block */}
            <div className="cq-yo-left">
              <span className="cq-yo-bag-icon">🛍️</span>
              <div>
                <h4 className="cq-yo-title">YOUR ORDER</h4>
                <p className="cq-yo-desc">
                  Track your order in real-time with live queue updates.
                </p>
              </div>
            </div>

            {/* Token Block */}
            <div className="cq-yo-token-block">
              <span className="cq-yo-token-pill">★ YOUR TOKEN</span>
              <span className="cq-yo-token-num">{currentStudentOrder.tokenNumber}</span>
            </div>

            {/* Items & Status */}
            <div className="cq-yo-food-block">
              <div className="cq-yo-food-name">
                {currentStudentOrder.items?.[0]
                  ? `${currentStudentOrder.items[0].name} × ${currentStudentOrder.items[0].quantity}${currentStudentOrder.items.length > 1 ? ` +${currentStudentOrder.items.length - 1} more` : ""}`
                  : "Your Meal"}
              </div>
              <span className={`cq-yo-status-pill status-${currentStudentOrder.orderStatus?.toLowerCase()}`}>
                ● {currentStudentOrder.orderStatus?.toUpperCase()}
              </span>
            </div>

            {/* Stats Group */}
            <div className="cq-yo-stats-group">
              {/* Orders ahead */}
              <div className="cq-yo-stat-item">
                <span className="cq-yo-stat-icon">👥</span>
                <div>
                  <div className="cq-yo-stat-val">
                    {currentOrdersAhead === 0 ? "Next Up!" : `${currentOrdersAhead} orders`}
                  </div>
                  <div className="cq-yo-stat-lbl">before yours</div>
                </div>
              </div>

              {/* Estimated wait */}
              <div className="cq-yo-stat-item">
                <span className="cq-yo-stat-icon">🕒</span>
                <div>
                  <div className="cq-yo-stat-val">
                    {currentWaitTime || "~8 min"}
                  </div>
                  <div className="cq-yo-stat-lbl">Estimated wait</div>
                </div>
              </div>

              {/* Pickup counter */}
              <div className="cq-yo-stat-item">
                <span className="cq-yo-stat-icon">📍</span>
                <div>
                  <div className="cq-yo-stat-val">
                    {currentStudentOrder.counterName || selectedBoardCanteen.counter?.split(" ")[0] || "Counter 1"}
                  </div>
                  <div className="cq-yo-stat-lbl">Pickup counter</div>
                </div>
              </div>
            </div>

            {/* Action button */}
            <button
              type="button"
              className="cq-yo-btn"
              onClick={() => setActiveTab && setActiveTab("my-orders")}
            >
              Track My Order →
            </button>
          </div>
        </div>
      ) : (
        <div className="cq-your-order-card cq-yo-empty-card">
          <div className="cq-yo-card-body">
            <div className="cq-yo-left">
              <span className="cq-yo-bag-icon">{selectedBoardCanteen.icon || "🏢"}</span>
              <div>
                <h4 className="cq-yo-title">{selectedBoardCanteen.shortName || selectedBoardCanteen.name}</h4>
                <p className="cq-yo-desc">
                  Pickup: {selectedBoardCanteen.counter?.split(" ")[0] || "Counter 1"}
                </p>
              </div>
            </div>
            <div style={{ flex: 1, padding: "0 10px" }}>
              <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.96rem" }}>
                No Active Orders in {selectedBoardCanteen.shortName || selectedBoardCanteen.name}
              </div>
              <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                You have no active orders in this canteen. Switch canteen above to view other orders or order fresh food!
              </div>
            </div>
            <button
              type="button"
              className="cq-yo-btn"
              onClick={() => setActiveTab && setActiveTab("order")}
            >
              Order from {selectedBoardCanteen.shortName || selectedBoardCanteen.name} →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
