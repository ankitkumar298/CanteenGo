import { useState, useEffect, useRef } from "react";
import { CartIcon, ChefIcon, QueueIcon, ReceiptIcon, LogOutIcon } from "./Icons";

export default function Navbar({
  userRole,
  setUserRole,
  studentTab,
  setStudentTab,
  cartCount = 0,
  studentProfile,
  onOpenProfile,
  onLogout
}) {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initial = studentProfile?.name ? studentProfile.name.trim().charAt(0).toUpperCase() : "A";
  const firstName = studentProfile?.name ? studentProfile.name.trim().split(" ")[0] : "Student";
  const userSubText = studentProfile?.studentId || studentProfile?.rollNo || studentProfile?.phone || "Student";
  return (
    <header className="navbar">
      {/* Left: Brand Logo & Title */}
      <div
        className="brand"
        onClick={() => {
          if (userRole === "student") {
            setStudentTab("order");
          } else {
            setUserRole(null);
          }
        }}
      >
        <div className="brand-logo-container">
          <img src="/images/canteengo-logo.png" alt="canteenGo Logo" className="brand-img" />
        </div>
        <div className="brand-text-wrap">
          <span className="brand-title">
            canteen<span className="brand-highlight">Go</span>
          </span>
          <span className="brand-badge">
            {userRole === "vendor" ? "Vendor Terminal" : "Campus Canteen"}
          </span>
        </div>
      </div>

      {/* Middle Center: ONLY Order Food & Live Queue when Student */}
      {userRole === "student" && (
        <div className="nav-center-container">
          <div className="nav-dual-switcher">
            <button
              type="button"
              className={`nav-switch-tab ${studentTab === "order" ? "active" : ""}`}
              onClick={() => setStudentTab("order")}
            >
              <CartIcon size={17} />
              <span>Order Food</span>
              {cartCount > 0 && <span className="nav-cart-badge">{cartCount}</span>}
            </button>

            <button
              type="button"
              className={`nav-switch-tab ${studentTab === "queue" ? "active" : ""}`}
              onClick={() => setStudentTab("queue")}
            >
              <QueueIcon size={17} />
              <span>Live Queue</span>
            </button>

            <button
              type="button"
              className={`nav-switch-tab ${studentTab === "my-orders" ? "active" : ""}`}
              onClick={() => setStudentTab("my-orders")}
            >
              <ReceiptIcon size={17} />
              <span>Your Orders</span>
            </button>
          </div>
        </div>
      )}

      {/* Middle Center when in Vendor Mode */}
      {userRole === "vendor" && (
        <div className="nav-center-container">
          <span className="nav-vendor-active-chip">
            <ChefIcon size={16} /> Live Kitchen Vendor Console
          </span>
        </div>
      )}

      {/* Right Container:
          - If student: NO Vendor Panel button (Student CANNOT access Vendor)
          - Shows only "Exit / Switch Role" to return to Home if needed
      */}
      <div className="nav-right-container">
        {userRole === "student" && !studentProfile?.name && (
          <button
            type="button"
            className="btn btn-primary btn-sm btn-nav-login"
            onClick={onOpenProfile}
            title="Log In or Sign Up as Student"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 14px", borderRadius: "var(--radius-sm)" }}
          >
            <span>🔑 Login / Sign Up</span>
          </button>
        )}

        {userRole === "student" && studentProfile?.name && (
          <div className="nav-profile-menu-wrapper" ref={profileDropdownRef}>
            <button
              type="button"
              className="nav-student-profile-chip"
              onClick={() => setIsProfileDropdownOpen((prev) => !prev)}
              aria-expanded={isProfileDropdownOpen}
              title="Student Account & Orders"
            >
              <div className="profile-chip-avatar-circle">{initial}</div>
              <div className="profile-chip-text">
                <span className="profile-chip-name">{firstName}</span>
                <span className="profile-chip-phone">{userSubText}</span>
              </div>
              <span className={`profile-chip-chevron ${isProfileDropdownOpen ? "open" : ""}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </button>

            {/* Dropdown Menu matching exact user design */}
            {isProfileDropdownOpen && (
              <div className="nav-profile-dropdown-menu">
                {/* 1. My Profile */}
                <button
                  type="button"
                  className="nav-profile-dropdown-item"
                  onClick={() => {
                    setIsProfileDropdownOpen(false);
                    if (onOpenProfile) onOpenProfile();
                  }}
                >
                  <span className="dropdown-item-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <span className="dropdown-item-label">My Profile</span>
                </button>

                {/* 2. My Orders */}
                <button
                  type="button"
                  className="nav-profile-dropdown-item"
                  onClick={() => {
                    setIsProfileDropdownOpen(false);
                    if (setStudentTab) setStudentTab("my-orders");
                  }}
                >
                  <span className="dropdown-item-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m7.5 4.27 9 5.15" />
                      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                      <path d="m3.3 7 8.7 5 8.7-5" />
                      <path d="M12 22V12" />
                    </svg>
                  </span>
                  <span className="dropdown-item-label">My Orders</span>
                </button>

                <div className="nav-profile-dropdown-divider" />

                {/* 3. Log Out */}
                <button
                  type="button"
                  className="nav-profile-dropdown-item item-logout"
                  onClick={() => {
                    setIsProfileDropdownOpen(false);
                    if (window.confirm("Are you sure you want to log out of your student profile?")) {
                      if (onLogout) onLogout();
                    }
                  }}
                >
                  <span className="dropdown-item-icon item-logout-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  </span>
                  <span className="dropdown-item-label item-logout-label">Log Out</span>
                </button>
              </div>
            )}
          </div>
        )}

        {userRole === "vendor" && (
          <button
            type="button"
            className="nav-logout-btn"
            onClick={() => {
              try {
                localStorage.removeItem("canteenGo_vendorSession");
              } catch {}
              setUserRole(null);
            }}
            title="Exit Vendor Console"
          >
            <LogOutIcon size={14} />
            <span>Exit Console</span>
          </button>
        )}
      </div>
    </header>
  );
}
