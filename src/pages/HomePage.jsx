import { useState } from "react";
import VendorLoginModal from "../components/VendorLoginModal";
import {
  CartIcon,
  ChefIcon,
  FlameIcon,
  CheckCircleIcon
} from "../components/Icons";

export default function HomePage({ onSelectRole, setActiveTab }) {
  const [selectedRole, setSelectedRole] = useState("student");
  const [isVendorLoginOpen, setIsVendorLoginOpen] = useState(false);

  const handleContinue = (role) => {
    if (role === "vendor") {
      setIsVendorLoginOpen(true);
      return;
    }

    if (onSelectRole) {
      onSelectRole(role);
    } else if (setActiveTab) {
      if (role === "student") setActiveTab("student");
      else if (role === "queue") setActiveTab("queue");
    }
  };

  const handleVendorLoginSuccess = (chosenCanteen) => {
    setIsVendorLoginOpen(false);
    if (onSelectRole) {
      onSelectRole("vendor", "orders", chosenCanteen);
    } else if (setActiveTab) {
      setActiveTab("vendor");
    }
  };

  return (
    <div className="home-portal-wrapper">
      {/* Top Hero Brand Section */}
      <section className="portal-hero">
        <div className="portal-logo-badge">
          <img
            src="/images/canteengo-logo.png"
            alt="canteenGo"
            className="portal-brand-logo"
          />
          <span className="portal-pulse-ring"></span>
        </div>

        <div className="portal-tagline-chip">
          <FlameIcon size={14} /> Contactless Smart College Canteen
        </div>

        <h1 className="portal-main-title">
          Welcome to canteen<span>Go</span>
        </h1>

        <p className="portal-subtext">
          Beat the 15-minute recess rush! Pre-order your hot snacks or manage live kitchen queue with digital tokens.
        </p>
      </section>

      {/* PRIMARY ROLE SELECTOR: Student vs Vendor */}
      <section className="role-selector-section">
        <div className="role-selector-heading">
          <span className="role-step-number">Step 1</span>
          <h2 className="role-selector-title">Select Your Role to Continue</h2>
          <p className="role-selector-subtitle">
            Aap canteen me kis roop me enter karna chahte hain?
          </p>
        </div>

        <div className="role-cards-grid">
          {/* Card 1: Student Persona */}
          <div
            className={`role-card role-student ${selectedRole === "student" ? "selected" : ""}`}
            onClick={() => setSelectedRole("student")}
          >
            <div className="role-radio-indicator">
              <span className="radio-circle"></span>
            </div>

            <div className="role-icon-banner icon-banner-orange">
              <CartIcon size={34} />
            </div>

            <div className="role-content">
              <div className="role-header-wrap">
                <span className="role-pill pill-orange">COLLEGE STUDENTS</span>
                <h3 className="role-title">I am a Student</h3>
              </div>

              <p className="role-desc">
                Hungry between lectures? Browse live canteen menu, customize snacks, and get your digital pickup token.
              </p>

              <ul className="role-perks-list">
                <li>
                  <CheckCircleIcon size={16} className="perk-check" />
                  <span>Order in advance & skip counter crowding</span>
                </li>
                <li>
                  <CheckCircleIcon size={16} className="perk-check" />
                  <span>Pay via Cash or Instant UPI / QR</span>
                </li>
                <li>
                  <CheckCircleIcon size={16} className="perk-check" />
                  <span>Get live token & track cooking status</span>
                </li>
              </ul>

              <button
                type="button"
                className="btn btn-primary btn-role-action"
                onClick={(e) => {
                  e.stopPropagation();
                  handleContinue("student");
                }}
              >
                <span>Enter as Student (Login / Sign Up)</span>
                <span className="role-btn-arrow">→</span>
              </button>
            </div>
          </div>

          {/* Card 2: Vendor Persona */}
          <div
            className={`role-card role-vendor ${selectedRole === "vendor" ? "selected" : ""}`}
            onClick={() => setSelectedRole("vendor")}
          >
            <div className="role-radio-indicator">
              <span className="radio-circle"></span>
            </div>

            <div className="role-icon-banner icon-banner-blue">
              <ChefIcon size={34} />
            </div>

            <div className="role-content">
              <div className="role-header-wrap">
                <span className="role-pill pill-blue">CANTEEN STAFF</span>
                <h3 className="role-title">I am Canteen Vendor</h3>
              </div>

              <p className="role-desc">
                Canteen chef or counter manager? Control live cooking queues, update food items, and advance order tokens.
              </p>

              <ul className="role-perks-list">
                <li>
                  <CheckCircleIcon size={16} className="perk-check" />
                  <span>Real-time live order kitchen console</span>
                </li>
                <li>
                  <CheckCircleIcon size={16} className="perk-check" />
                  <span>1-Click status transitions (Cooking ➔ Ready)</span>
                </li>
                <li>
                  <CheckCircleIcon size={16} className="perk-check" />
                  <span>Manage menu items, prices & stock</span>
                </li>
              </ul>

              <button
                type="button"
                className="btn btn-secondary btn-role-action btn-vendor-action"
                onClick={(e) => {
                  e.stopPropagation();
                  handleContinue("vendor");
                }}
              >
                <span>Open Vendor Dashboard</span>
                <span className="role-btn-arrow">→</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Vendor Login Modal (Select Canteen & PIN) */}
      <VendorLoginModal
        isOpen={isVendorLoginOpen}
        onClose={() => setIsVendorLoginOpen(false)}
        onSuccess={handleVendorLoginSuccess}
      />
    </div>
  );
}
