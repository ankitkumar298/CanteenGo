"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { BellIcon, CheckCircleIcon, ClockIcon, ChefIcon } from "./Icons";

export default function NotificationBell({ studentProfile }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);

  // Track previous order states to detect status changes and callOuts
  const prevOrdersStateRef = useRef({});

  // Load saved notifications from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("canteenGo_studentNotifications");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setNotifications(parsed);
        }
      }
    } catch {}
  }, []);

  // Save notifications to localStorage when updated
  const saveNotifications = (newNotifs) => {
    setNotifications(newNotifs);
    try {
      localStorage.setItem("canteenGo_studentNotifications", JSON.stringify(newNotifs));
    } catch {}
  };

  // Touch / Pointer Drag-down & Exit Animation States
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const dragStartYRef = useRef(0);
  const currentDragYRef = useRef(0);
  const isClosingRef = useRef(false);

  const handleCloseWithAnimation = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsClosing(true);
    setDragOffset(0);

    setTimeout(() => {
      setIsClosing(false);
      isClosingRef.current = false;
      setIsOpen(false);
    }, 280);
  };

  const handlePointerDown = (e) => {
    if (isClosingRef.current) return;
    if (e.button && e.button !== 0) return;
    const startY = e.clientY;
    dragStartYRef.current = startY;
    currentDragYRef.current = startY;
    setIsDragging(true);

    const onPointerMove = (moveEvt) => {
      currentDragYRef.current = moveEvt.clientY;
      const deltaY = moveEvt.clientY - startY;
      if (deltaY > 0) {
        setDragOffset(deltaY);
      } else {
        setDragOffset(deltaY * 0.15);
      }
    };

    const onPointerUp = (upEvt) => {
      setIsDragging(false);
      const deltaY = upEvt.clientY - startY;
      if (deltaY > 55) {
        handleCloseWithAnimation();
      } else {
        setDragOffset(0);
      }
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  const handleTouchStart = (e) => {
    if (isClosingRef.current) return;
    const startY = e.touches[0].clientY;
    dragStartYRef.current = startY;
    currentDragYRef.current = startY;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging || isClosingRef.current) return;
    const currentY = e.touches[0].clientY;
    currentDragYRef.current = currentY;
    const deltaY = currentY - dragStartYRef.current;
    if (deltaY > 0) {
      setDragOffset(deltaY);
    } else {
      setDragOffset(deltaY * 0.15);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging || isClosingRef.current) return;
    setIsDragging(false);
    const deltaY = currentDragYRef.current - dragStartYRef.current;
    if (deltaY > 55) {
      handleCloseWithAnimation();
    } else {
      setDragOffset(0);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setDragOffset(0);
      setIsDragging(false);
      isClosingRef.current = false;
    }
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lock mobile body scroll and auto-hide floating bottom dock when notification sheet is open
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.classList.toggle("notif-sheet-open", isOpen);
    }
    return () => {
      if (typeof document !== "undefined") {
        document.body.classList.remove("notif-sheet-open");
      }
    };
  }, [isOpen]);

  // Poll for updates on student orders
  useEffect(() => {
    const checkOrderUpdates = async () => {
      try {
        const res = await fetch("/api/orders");
        if (!res.ok) return;
        const allOrders = await res.json();
        if (!Array.isArray(allOrders)) return;

        // Collect student's placed order tokens/IDs from localStorage & profile
        let placedTokens = [];
        try {
          const savedToken = localStorage.getItem("canteenGo_lastToken");
          if (savedToken) placedTokens.push(savedToken.toLowerCase());

          const placedList = localStorage.getItem("canteenGo_placedOrders");
          if (placedList) {
            const parsed = JSON.parse(placedList);
            if (Array.isArray(parsed)) {
              placedTokens.push(...parsed.map((t) => String(t).toLowerCase()));
            }
          }
        } catch {}

        const studentEmail = (studentProfile?.email || "").toLowerCase();
        const studentPhone = (studentProfile?.phone || "").trim();

        // Match orders belonging to this student
        const myOrders = allOrders.filter((o) => {
          if (studentEmail && o.studentEmail?.toLowerCase() === studentEmail) return true;
          if (studentPhone && o.studentPhone === studentPhone) return true;
          const tok = (o.tokenNumber || "").toLowerCase();
          return placedTokens.includes(tok) || placedTokens.includes(tok.replace("t-", ""));
        });

        const newAlerts = [];
        const prevState = { ...prevOrdersStateRef.current };

        myOrders.forEach((order) => {
          const id = order._id;
          const prev = prevState[id];
          const token = order.tokenNumber;
          const counter = order.counterName || "Counter 1";

          if (prev) {
            // 1. Detect Call Out from Vendor
            if (order.calledAt && order.calledAt !== prev.calledAt) {
              newAlerts.push({
                id: `call_${id}_${Date.now()}`,
                type: "call_out",
                icon: "📢",
                title: `Counter Call Out: Token ${token}`,
                message: `Your order Token ${token} has been called at ${counter}! Please proceed to collect immediately.`,
                token: token,
                time: new Date().toISOString(),
                read: false
              });
            }

            // 2. Detect Status Transitions
            if (order.orderStatus !== prev.orderStatus) {
              if (order.orderStatus === "Preparing") {
                newAlerts.push({
                  id: `prep_${id}_${Date.now()}`,
                  type: "accepted",
                  icon: "👨‍🍳",
                  title: `Order Accepted: Token ${token}`,
                  message: `Kitchen accepted Token ${token}! Chef started preparing your food.`,
                  token: token,
                  time: new Date().toISOString(),
                  read: false
                });
              } else if (order.orderStatus === "Ready") {
                newAlerts.push({
                  id: `ready_${id}_${Date.now()}`,
                  type: "ready",
                  icon: "🎉",
                  title: `Ready for Pickup: Token ${token}`,
                  message: `Token ${token} is READY at ${counter}! Present Pickup PIN: ${order.pickupCode || "****"}.`,
                  token: token,
                  time: new Date().toISOString(),
                  read: false
                });
              } else if (order.orderStatus === "Cancelled") {
                newAlerts.push({
                  id: `cancel_${id}_${Date.now()}`,
                  type: "declined",
                  icon: "✕",
                  title: `Order Declined: Token ${token}`,
                  message: `Token ${token} was declined by kitchen.${order.cancellationReason ? ` Reason: ${order.cancellationReason}` : ""}`,
                  token: token,
                  time: new Date().toISOString(),
                  read: false
                });
              } else if (order.orderStatus === "Missed Pickup") {
                newAlerts.push({
                  id: `missed_${id}_${Date.now()}`,
                  type: "missed",
                  icon: "⚠️",
                  title: `Missed Pickup: Token ${token}`,
                  message: `Token ${token} was called at ${counter} but was not collected in time. Please reschedule pickup from Your Orders.`,
                  token: token,
                  time: new Date().toISOString(),
                  read: false
                });
              } else if (order.orderStatus === "Completed") {
                newAlerts.push({
                  id: `complete_${id}_${Date.now()}`,
                  type: "completed",
                  icon: "✓",
                  title: `Order Handed Over: Token ${token}`,
                  message: `Token ${token} verified and handed over. Enjoy your meal!`,
                  token: token,
                  time: new Date().toISOString(),
                  read: false
                });
              }
            }
          }

          // Update tracked state
          prevState[id] = {
            orderStatus: order.orderStatus,
            calledAt: order.calledAt
          };
        });

        prevOrdersStateRef.current = prevState;

        if (newAlerts.length > 0) {
          setNotifications((current) => {
            const merged = [...newAlerts, ...current].slice(0, 30);
            try {
              localStorage.setItem("canteenGo_studentNotifications", JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      } catch {}
    };

    // Run immediately then poll every 5 seconds
    checkOrderUpdates();
    const interval = setInterval(checkOrderUpdates, 5000);
    return () => clearInterval(interval);
  }, [studentProfile]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    saveNotifications(updated);
  };

  const clearAllNotifications = () => {
    saveNotifications([]);
  };

  const handleNotificationClick = (notif) => {
    // Mark as read
    const updated = notifications.map((n) =>
      n.id === notif.id ? { ...n, read: true } : n
    );
    saveNotifications(updated);
    setIsOpen(false);

    // Save token to localStorage to auto-track on Queue page
    if (notif.token) {
      try {
        localStorage.setItem("canteenGo_lastToken", notif.token);
      } catch {}
    }

    if (notif.type === "ready" || notif.type === "call_out" || notif.type === "accepted") {
      router.push("/queue");
    } else {
      router.push("/orders");
    }
  };

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return "";
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="nav-notif-wrap" ref={dropdownRef} style={{ position: "relative" }}>
      <button
        type="button"
        className={`nav-notif-bell-btn ${unreadCount > 0 ? "has-unread" : ""}`}
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen && unreadCount > 0) {
            markAllAsRead();
          }
        }}
        aria-label="Student Notifications"
        title={unreadCount > 0 ? `${unreadCount} new notifications` : "Notifications"}
      >
        <BellIcon size={19} />
        {unreadCount > 0 && (
          <span className="nav-notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      {isOpen && (
        <>
          <div
            className={`nav-notif-mobile-backdrop ${isClosing ? "backdrop-closing" : ""}`}
            onClick={handleCloseWithAnimation}
            aria-hidden="true"
          />
          <div
            className={`nav-notif-dropdown ${isClosing ? "sheet-closing" : ""} ${isDragging ? "sheet-dragging" : ""}`}
            style={{
              transform: isClosing
                ? "translateY(100%)"
                : dragOffset > 0
                ? `translateY(${dragOffset}px)`
                : undefined,
              transition: isDragging
                ? "none"
                : "transform 0.28s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.22s ease"
            }}
          >
            {/* Top Interactive Drag Handle Zone for Mobile Bottom Sheet */}
            <div
              className="sheet-drag-handle-zone notif-mobile-drag-handle-zone"
              onPointerDown={handlePointerDown}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={handleCloseWithAnimation}
              role="button"
              tabIndex={0}
              aria-label="Drag down or tap to close notifications"
              title="Drag down or tap to close"
            >
              <div className="notif-mobile-drag-handle" aria-hidden="true" />
            </div>

            <div className="nav-notif-header">
              <div className="notif-header-title">
                <span className="notif-title-text">Notifications</span>
                {unreadCount > 0 && (
                  <span className="notif-unread-tag">{unreadCount} new</span>
                )}
              </div>

              <div className="notif-header-actions">
                {notifications.length > 0 && (
                  <button
                    type="button"
                    className="btn-notif-text-action"
                    onClick={clearAllNotifications}
                    title="Clear all notifications"
                  >
                    Clear all
                  </button>
                )}
                <button
                  type="button"
                  className="btn-notif-close-mobile"
                  onClick={handleCloseWithAnimation}
                  title="Close notifications"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

          <div className="nav-notif-list">
            {notifications.length === 0 ? (
              <div className="nav-notif-empty">
                <span className="empty-bell-icon">🔔</span>
                <p className="empty-title">No notifications yet</p>
                <small className="empty-sub">
                  Live updates for order acceptance, food ready, and counter call-outs will appear here.
                </small>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notif-item ${!n.read ? "unread" : ""} type-${n.type}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className={`notif-icon-circle type-${n.type}`}>
                    <span>{n.icon || "🔔"}</span>
                  </div>

                  <div className="notif-body">
                    <div className="notif-item-header">
                      <strong className="notif-item-title">{n.title}</strong>
                      <span className="notif-item-time">{getTimeAgo(n.time)}</span>
                    </div>

                    <p className="notif-item-msg">{n.message}</p>

                    <div className="notif-item-footer">
                      {n.token && (
                        <span className="notif-token-pill">{n.token}</span>
                      )}
                      <span className="notif-view-link">View in Queue →</span>
                    </div>
                  </div>

                  {!n.read && <span className="notif-unread-dot"></span>}
                </div>
              ))
            )}
          </div>
        </div>
        </>
      )}
    </div>
  );
}

