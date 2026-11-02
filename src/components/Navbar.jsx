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
            {userRole === "vendor" ? "Vendor Console" : "College Canteen Express"}
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

      {/* Middle Center when on Home (Role Selection) */}
      {!userRole && (
        <div className="nav-center-container">
          <span className="nav-home-portal-chip">
            Choose Role: Student or Canteen Vendor
          </span>
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
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 14px", borderRadius: "9999px" }}
          >
            <span>🔑 Login / Sign Up</span>
          </button>
        )}

        {userRole === "student" && studentProfile?.name && (
          <button
            type="button"
            className="nav-student-profile-chip"
            onClick={onOpenProfile}
            title="View Student Profile"
          >
            <span className="profile-chip-avatar">🎓</span>
            <div className="profile-chip-text">
              <span className="profile-chip-name">{studentProfile.name.split(" ")[0]}</span>
              <span className="profile-chip-phone">{studentProfile.phone}</span>
            </div>
          </button>
        )}

        {userRole === "student" && onLogout && (
          <button
            type="button"
            className="nav-logout-btn"
            onClick={() => {
              if (window.confirm("Are you sure you want to log out of your student profile?")) {
                onLogout();
              }
            }}
            title="Log out and clear student profile"
          >
            <LogOutIcon size={14} />
            <span>Log Out</span>
          </button>
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

        {!userRole && (
          <span className="nav-guest-hint">Select a portal below</span>
        )}
      </div>
    </header>
  );
}
