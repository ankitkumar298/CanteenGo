"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UtensilsIcon, QueueIcon, CartIcon, ReceiptIcon, UserIcon } from "../Icons";
import { useAppContext } from "@/context/AppContext";

/**
 * StudentMobileBottomNav
 * Floating dock fixed at the bottom on mobile viewports (< 768px).
 * Features:
 * - Clean solid orange capsule indicator (no glassmorphism)
 * - Continuous 1:1 real-time drag following finger across options
 * - Smooth snap-to-slot on touch release without bouncing back
 * - Optimistic active state locking while route transitions execute
 *
 * Hidden on desktop (min-width: 769px).
 */
export default function StudentMobileBottomNav({
  studentTab,
  setStudentTab,
  cartCount = 0,
  isCartOpen = false,
  onToggleCart,
  onOpenProfile
}) {
  const router = useRouter();
  const {
    setIsProfileModalOpen,
    isProfileModalOpen,
    isMobileCartOpen: ctxIsCartOpen,
    setIsMobileCartOpen: ctxSetIsCartOpen,
    cartCount: ctxCartCount,
    cart: ctxCart
  } = useAppContext();

  const dockRef = useRef(null);
  const touchStartRef = useRef(null);
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragX, setDragX] = useState(null);
  const [optimisticIndex, setOptimisticIndex] = useState(null);

  const realCartCount =
    cartCount !== undefined && cartCount > 0
      ? cartCount
      : ctxCartCount || (Array.isArray(ctxCart) ? ctxCart.reduce((s, it) => s + (it.quantity || 1), 0) : 0);

  const effectiveIsCartOpen = isCartOpen || Boolean(ctxIsCartOpen);

  // Active index mapping: 0=Menu, 1=Queue, 2=Cart, 3=Orders, 4=Profile/Account
  const activeIndex = effectiveIsCartOpen
    ? 2
    : studentTab === "account"
    ? 4
    : isProfileModalOpen
    ? 4
    : studentTab === "queue"
    ? 1
    : studentTab === "my-orders"
    ? 3
    : 0;

  // Clear optimisticIndex once activeIndex syncs up
  useEffect(() => {
    if (optimisticIndex !== null && activeIndex === optimisticIndex) {
      setOptimisticIndex(null);
    }
  }, [activeIndex, optimisticIndex]);

  // Fallback safety timeout so optimistic lock doesn't hang indefinitely
  useEffect(() => {
    if (optimisticIndex !== null) {
      const timer = setTimeout(() => {
        setOptimisticIndex(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [optimisticIndex]);

  // Current slot being hovered or active
  const currentSlot =
    isDragging && dragX !== null
      ? Math.max(0, Math.min(4, Math.round((dragX - 6) / 54)))
      : optimisticIndex !== null
      ? optimisticIndex
      : activeIndex;

  const handleToggleCart = () => {
    if (onToggleCart) {
      onToggleCart();
    } else if (ctxSetIsCartOpen) {
      ctxSetIsCartOpen((prev) => !prev);
    }
  };

  const handleOpenAccount = () => {
    if (effectiveIsCartOpen) {
      if (onToggleCart) onToggleCart();
      else if (ctxSetIsCartOpen) ctxSetIsCartOpen(false);
    }
    if (studentTab === "account") {
      return;
    }
    // On mobile, navigate to the dedicated /account page!
    if (setStudentTab) {
      setStudentTab("account");
    } else {
      router.push("/account");
    }
  };

  const triggerTabByIndex = (idx) => {
    if (idx === 0) {
      if (effectiveIsCartOpen) {
        if (onToggleCart) onToggleCart();
        else if (ctxSetIsCartOpen) ctxSetIsCartOpen(false);
      }
      if (setStudentTab) setStudentTab("order");
    } else if (idx === 1) {
      if (effectiveIsCartOpen) {
        if (onToggleCart) onToggleCart();
        else if (ctxSetIsCartOpen) ctxSetIsCartOpen(false);
      }
      if (setStudentTab) setStudentTab("queue");
    } else if (idx === 2) {
      handleToggleCart();
    } else if (idx === 3) {
      if (effectiveIsCartOpen) {
        if (onToggleCart) onToggleCart();
        else if (ctxSetIsCartOpen) ctxSetIsCartOpen(false);
      }
      if (setStudentTab) setStudentTab("my-orders");
    } else if (idx === 4) {
      handleOpenAccount();
    }
  };

  const handleSlotClick = (e, idx) => {
    // If a slide gesture just ended, ignore the synthetic click
    if (isDraggingRef.current) return;
    if (e && e.stopPropagation) e.stopPropagation();
    setOptimisticIndex(idx);
    triggerTabByIndex(idx);
  };

  // Continuous real-time finger tracking across options
  const handleTouchStart = (e) => {
    if (!dockRef.current || !e.touches || e.touches.length === 0) return;
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY
    };
    isDraggingRef.current = false;
  };

  const handleTouchMove = (e) => {
    if (!touchStartRef.current || !dockRef.current || !e.touches || e.touches.length === 0) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartRef.current.y);

    // Only initiate slide drag when horizontal movement exceeds 7px
    if (!isDraggingRef.current && dx > 7 && dx > dy) {
      isDraggingRef.current = true;
      setIsDragging(true);
    }

    if (isDraggingRef.current) {
      const rect = dockRef.current.getBoundingClientRect();
      const touchX = touch.clientX - rect.left;
      const targetX = Math.max(6, Math.min(222, touchX - 24));
      setDragX(targetX);
    }
  };

  const handleTouchEnd = (e) => {
    if (isDraggingRef.current && dragX !== null) {
      // User slid across options!
      if (e.cancelable) e.preventDefault();
      const finalSlot = Math.max(0, Math.min(4, Math.round((dragX - 6) / 54)));
      isDraggingRef.current = false;
      setIsDragging(false);
      setDragX(null);
      touchStartRef.current = null;
      setOptimisticIndex(finalSlot);
      triggerTabByIndex(finalSlot);
    } else {
      // User simply tapped/clicked without sliding — let handleSlotClick deal with it
      isDraggingRef.current = false;
      setIsDragging(false);
      setDragX(null);
      touchStartRef.current = null;
    }
  };

  const handleTouchCancel = () => {
    isDraggingRef.current = false;
    setIsDragging(false);
    setDragX(null);
    touchStartRef.current = null;
  };

  // When dragging: follow finger directly at dragX with zero delay
  // When resting: snap smoothly to 6 + targetSlot * 54
  const sliderTranslateX =
    isDragging && dragX !== null
      ? dragX
      : 6 + (optimisticIndex !== null ? optimisticIndex : activeIndex) * 54;

  return (
    <nav
      ref={dockRef}
      className="student-mobile-bottom-dock"
      aria-label="Student Mobile Navigation"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      {/* Sliding Active Capsule Indicator (Solid Orange, No glassmorphism) */}
      <div
        className={`student-dock-slider-pill ${isDragging ? "dragging" : ""}`}
        style={{ transform: `translateX(${sliderTranslateX}px)` }}
        aria-hidden="true"
      />

      {/* 1. Order Food (Utensils / Food Menu) */}
      <button
        type="button"
        className={`student-mobile-dock-btn ${currentSlot === 0 ? "active" : ""}`}
        onClick={(e) => handleSlotClick(e, 0)}
        aria-label="Order Food"
        title="Order Food Menu"
      >
        <UtensilsIcon size={20} />
      </button>

      {/* 2. Live Queue Display */}
      <button
        type="button"
        className={`student-mobile-dock-btn ${currentSlot === 1 ? "active" : ""}`}
        onClick={(e) => handleSlotClick(e, 1)}
        aria-label="Live Queue"
        title="Live Queue Board"
      >
        <QueueIcon size={20} />
      </button>

      {/* 3. Cart with Live Count Badge */}
      <button
        type="button"
        className={`student-mobile-dock-btn ${currentSlot === 2 ? "active" : ""}`}
        onClick={(e) => handleSlotClick(e, 2)}
        aria-label={`Cart (${realCartCount} items)`}
        title="View Cart & Checkout"
      >
        <CartIcon size={20} />
        {realCartCount > 0 && (
          <span className="student-dock-cart-badge">{realCartCount > 99 ? "99+" : realCartCount}</span>
        )}
      </button>

      {/* 4. My Orders / History */}
      <button
        type="button"
        className={`student-mobile-dock-btn ${currentSlot === 3 ? "active" : ""}`}
        onClick={(e) => handleSlotClick(e, 3)}
        aria-label="My Orders"
        title="Your Orders & Tokens"
      >
        <ReceiptIcon size={20} />
      </button>

      {/* 5. Account / Student Profile */}
      <button
        type="button"
        className={`student-mobile-dock-btn ${currentSlot === 4 ? "active" : ""}`}
        onClick={(e) => handleSlotClick(e, 4)}
        aria-label="Account Profile"
        title="Student Profile & Settings"
      >
        <UserIcon size={20} />
      </button>
    </nav>
  );
}

