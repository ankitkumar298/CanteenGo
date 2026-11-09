import { useState, useRef, useEffect } from "react";
import { CartIcon, ChefIcon, QueueIcon, ReceiptIcon, LogOutIcon } from "./Icons";
import NotificationBell from "./NotificationBell";

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
  // Student Profile Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initial = (studentProfile?.name || "A").trim().charAt(0).toUpperCase();
  const displayName = studentProfile?.name ? studentProfile.name.split(" ")[0] : "Akshay";
  const idDisplay = studentProfile?.studentId || studentProfile?.rollNo || studentProfile?.regNo || studentProfile?.phone || "20TCS04210";
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
            <ChefIcon size={16} /> Vendor Dashboard
          </span>
        </div>
      )}

      {/* Right Container:
          - If student: Notifications Bell & Profile dropdown
      */}
      <div className="nav-right-container">
        {userRole === "student" && (
          <NotificationBell studentProfile={studentProfile} />
        )}

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
          <div className="nav-profile-menu-wrap" ref={dropdownRef}>
            <button
              type="button"
              className={`nav-profile-pill-btn ${isDropdownOpen ? "active" : ""}`}
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              aria-haspopup="true"
              aria-expanded={isDropdownOpen}
              title="Account Menu"
            >
              <div className="nav-profile-avatar-circle">
                <span>{initial}</span>
              </div>
              <div className="nav-profile-info-text">
                <span className="nav-profile-name">{displayName}</span>
                <span className="nav-profile-id">{idDisplay}</span>
              </div>
              <svg
                className={`nav-profile-chevron ${isDropdownOpen ? "open" : ""}`}
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            {isDropdownOpen && (
              <div className="nav-profile-dropdown-card">
                <button
                  type="button"
                  className="nav-profile-dropdown-item"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onOpenProfile();
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <span>My Profile</span>
                </button>

                <button
                  type="button"
                  className="nav-profile-dropdown-item"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setStudentTab("my-orders");
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m7.5 4.27 9 5.15"></path>
                    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path>
                    <path d="m3.3 7 8.7 5 8.7-5"></path>
                    <path d="M12 22V12"></path>
                  </svg>
                  <span>My Orders</span>
                </button>

                <div className="nav-profile-dropdown-divider" />

                <button
                  type="button"
                  className="nav-profile-dropdown-item logout"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    if (window.confirm("Are you sure you want to log out of your student profile?")) {
                      onLogout();
                    }
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span>Log Out</span>
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
