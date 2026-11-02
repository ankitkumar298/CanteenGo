"use client";

import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import StudentPage from "./pages/StudentPage";
import VendorPage from "./pages/VendorPage";
import QueuePage from "./pages/QueuePage";
import YourOrdersPage from "./pages/YourOrdersPage";
import StudentProfileModal from "./components/StudentProfileModal";

export default function App() {
  // Persisted userRole: null (Home Page / Role Selector) | "student" | "vendor"
  const [userRole, setUserRole] = useState(() => {
    try {
      const savedRole = localStorage.getItem("canteenGo_userRole");
      if (savedRole === "student" || savedRole === "vendor") {
        return savedRole;
      }
      // If student profile already exists in localStorage, automatically stay in student role
      const savedProfile = localStorage.getItem("canteenGo_studentProfile");
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        if (parsed?.name && parsed?.phone) return "student";
      }
      return null;
    } catch {
      return null;
    }
  });

  // Persisted studentTab: "order" (Order Food & Menu) | "queue" (Live Queue Board) | "my-orders" (Personal Orders)
  const [studentTab, setStudentTab] = useState(() => {
    try {
      return localStorage.getItem("canteenGo_studentTab") || "order";
    } catch {
      return "order";
    }
  });

  // Helper to persist role changes
  const handleSetUserRole = (role) => {
    setUserRole(role);
    try {
      if (role) {
        localStorage.setItem("canteenGo_userRole", role);
      } else {
        localStorage.removeItem("canteenGo_userRole");
      }
    } catch {}
  };

  // Helper to persist student tab changes
  const handleSetStudentTab = (tab) => {
    setStudentTab(tab);
    try {
      localStorage.setItem("canteenGo_studentTab", tab);
    } catch {}
  };

  // Student Profile: { name, email, phone }
  const [studentProfile, setStudentProfile] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("canteenGo_studentProfile") || "null");
    } catch {
      return null;
    }
  });

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Cart State (Persisted in localStorage so refreshing never clears the cart)
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem("canteenGo_studentCart");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      if (Array.isArray(cart)) {
        localStorage.setItem("canteenGo_studentCart", JSON.stringify(cart));
      }
    } catch {}
  }, [cart]);

  const safeCart = Array.isArray(cart) ? cart : [];
  const totalCartCount = safeCart.reduce((sum, item) => sum + (item?.quantity || 1), 0);

  // Handler for Home Page role selection
  const handleSelectRoleFromHome = (role, initialSubTab = "order") => {
    if (role === "student" || role === "queue") {
      handleSetUserRole("student");
      handleSetStudentTab(role === "queue" ? "queue" : initialSubTab);
      // Prompt for student profile (Name, Phone, Email) if not already set
      if (!studentProfile || !studentProfile.name || !studentProfile.phone) {
        setIsProfileModalOpen(true);
      }
    } else if (role === "vendor") {
      handleSetUserRole("vendor");
    }
  };

  const handleSaveStudentProfile = (profile) => {
    setStudentProfile(profile);
    setIsProfileModalOpen(false);
  };

  // Student Logout: Clears profile from localStorage & memory, resets role to Home
  const handleLogout = () => {
    try {
      localStorage.removeItem("canteenGo_studentProfile");
      localStorage.removeItem("canteenGo_userRole");
      localStorage.removeItem("canteenGo_studentTab");
      localStorage.removeItem("canteenGo_studentCart");
    } catch {}
    setStudentProfile(null);
    setUserRole(null);
    setCart([]);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar
        userRole={userRole}
        setUserRole={handleSetUserRole}
        studentTab={studentTab}
        setStudentTab={handleSetStudentTab}
        cartCount={totalCartCount}
        studentProfile={studentProfile}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onLogout={handleLogout}
      />

      <main className="container" style={{ flex: 1 }}>
        {/* VIEW 1: Home Page (Role Selection: Student or Vendor) */}
        {!userRole && (
          <HomePage onSelectRole={handleSelectRoleFromHome} />
        )}

        {/* VIEW 2: Student Mode (Order Food, Live Queue, and Personal Orders) */}
        {userRole === "student" && studentTab === "order" && (
          <StudentPage
            setActiveTab={handleSetStudentTab}
            cart={cart}
            setCart={setCart}
            studentProfile={studentProfile}
            onOpenProfile={() => setIsProfileModalOpen(true)}
            onLogout={handleLogout}
          />
        )}

        {userRole === "student" && studentTab === "queue" && (
          <QueuePage setActiveTab={handleSetStudentTab} />
        )}

        {userRole === "student" && studentTab === "my-orders" && (
          <YourOrdersPage
            studentProfile={studentProfile}
            onOpenProfile={() => setIsProfileModalOpen(true)}
            onLogout={handleLogout}
            onGoToQueue={(token) => {
              if (token) {
                try {
                  localStorage.setItem("canteenGo_lastToken", token);
                } catch {}
              }
              handleSetStudentTab("queue");
            }}
            onOrderMore={() => handleSetStudentTab("order")}
          />
        )}

        {/* VIEW 3: Vendor Panel Mode */}
        {userRole === "vendor" && (
          <VendorPage onExitToHome={() => {
            try {
              localStorage.removeItem("canteenGo_vendorSession");
            } catch {}
            handleSetUserRole(null);
          }} />
        )}
      </main>

      {/* Student Profile Setup / Edit Modal */}
      <StudentProfileModal
        isOpen={isProfileModalOpen}
        initialProfile={studentProfile}
        onSave={handleSaveStudentProfile}
        onClose={studentProfile?.phone ? () => setIsProfileModalOpen(false) : null}
        onLogout={handleLogout}
      />

      <footer
        style={{
          textAlign: "center",
          padding: "28px 20px",
          color: "#64748b",
          fontSize: "0.85rem",
          background: "#ffffff",
          borderTop: "1px solid #e2e8f0",
          marginTop: "auto"
        }}
      >
        <p style={{ fontWeight: "700", color: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          <img src="/images/canteengo-logo.png" alt="canteenGo" style={{ width: "22px", height: "22px", borderRadius: "5px" }} />
          canteenGo — Smart College Canteen Ordering & Live Queue
        </p>
        <p style={{ marginTop: "6px", color: "#94a3b8" }}>
          B.Tech CSE Capstone Project • React (Vite) + Next.js App Router + MongoDB & Mongoose
        </p>
      </footer>
    </div>
  );
}
