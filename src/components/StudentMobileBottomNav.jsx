"use client";

import { UtensilsIcon, QueueIcon, CartIcon, ReceiptIcon, UserIcon } from "./Icons";
import { useAppContext } from "@/context/AppContext";

/**
 * StudentMobileBottomNav
 * Floating glassmorphic dock fixed at the bottom on mobile viewports (< 768px).
 * Displays ONLY ICONS for:
 * 1. Order Food
 * 2. Live Queue
 * 3. Cart (with dynamic count badge)
 * 4. My Orders
 * 5. Account / Student Profile
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
  const { setIsProfileModalOpen, isProfileModalOpen } = useAppContext();

  const handleOpenAccount = () => {
    if (isCartOpen && onToggleCart) {
      onToggleCart();
    }
    if (onOpenProfile) {
      onOpenProfile();
    } else if (setIsProfileModalOpen) {
      setIsProfileModalOpen(true);
    }
  };

  return (
    <nav
      className="student-mobile-bottom-dock"
      aria-label="Student Mobile Navigation"
    >
      {/* 1. Order Food (Utensils / Food Menu) */}
      <button
        type="button"
        className={`student-mobile-dock-btn ${studentTab === "order" && !isCartOpen && !isProfileModalOpen ? "active" : ""}`}
        onClick={() => {
          if (isCartOpen && onToggleCart) {
            onToggleCart();
          }
          if (setStudentTab) {
            setStudentTab("order");
          }
        }}
        aria-label="Order Food"
        title="Order Food Menu"
      >
        <UtensilsIcon size={20} />
      </button>

      {/* 2. Live Queue Display */}
      <button
        type="button"
        className={`student-mobile-dock-btn ${studentTab === "queue" && !isCartOpen && !isProfileModalOpen ? "active" : ""}`}
        onClick={() => {
          if (isCartOpen && onToggleCart) {
            onToggleCart();
          }
          if (setStudentTab) {
            setStudentTab("queue");
          }
        }}
        aria-label="Live Queue"
        title="Live Queue Board"
      >
        <QueueIcon size={20} />
      </button>

      {/* 3. Cart with Live Count Badge */}
      <button
        type="button"
        className={`student-mobile-dock-btn ${isCartOpen ? "active" : ""}`}
        onClick={() => {
          if (onToggleCart) {
            onToggleCart();
          }
        }}
        aria-label={`Cart (${cartCount} items)`}
        title="View Cart & Checkout"
      >
        <CartIcon size={20} />
        {cartCount > 0 && (
          <span className="student-dock-cart-badge">{cartCount > 99 ? "99+" : cartCount}</span>
        )}
      </button>

      {/* 4. My Orders / History */}
      <button
        type="button"
        className={`student-mobile-dock-btn ${studentTab === "my-orders" && !isCartOpen && !isProfileModalOpen ? "active" : ""}`}
        onClick={() => {
          if (isCartOpen && onToggleCart) {
            onToggleCart();
          }
          if (setStudentTab) {
            setStudentTab("my-orders");
          }
        }}
        aria-label="My Orders"
        title="Your Orders & Tokens"
      >
        <ReceiptIcon size={20} />
      </button>

      {/* 5. Account / Student Profile */}
      <button
        type="button"
        className={`student-mobile-dock-btn ${isProfileModalOpen ? "active" : ""}`}
        onClick={handleOpenAccount}
        aria-label="Account Profile"
        title="Student Profile & Settings"
      >
        <UserIcon size={20} />
      </button>
    </nav>
  );
}

