"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import StudentProfileModal from "@/components/StudentProfileModal";
import Navbar from "@/components/Navbar";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  // Student Profile
  const [studentProfile, setStudentProfile] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Cart State (Persisted in localStorage)
  const [cart, setCart] = useState([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const savedProfile = localStorage.getItem("canteenGo_studentProfile");
      if (savedProfile) {
        setStudentProfile(JSON.parse(savedProfile));
      }
      const savedCart = localStorage.getItem("canteenGo_studentCart");
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed)) setCart(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    try {
      if (Array.isArray(cart)) {
        localStorage.setItem("canteenGo_studentCart", JSON.stringify(cart));
      }
    } catch {}
  }, [cart, isMounted]);

  const handleSaveStudentProfile = (profile) => {
    setStudentProfile(profile);
    setIsProfileModalOpen(false);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("canteenGo_studentProfile");
      localStorage.removeItem("canteenGo_userRole");
      localStorage.removeItem("canteenGo_studentTab");
      localStorage.removeItem("canteenGo_studentCart");
    } catch {}
    setStudentProfile(null);
    setCart([]);
    router.push("/");
  };

  // Derive userRole from route pathname:
  const userRole = pathname?.startsWith("/vendor")
    ? "vendor"
    : ["/order", "/queue", "/orders", "/my-orders"].some((p) => pathname?.startsWith(p))
    ? "student"
    : null;

  // Derive active tab from route pathname:
  const studentTab = pathname?.startsWith("/queue")
    ? "queue"
    : pathname?.startsWith("/orders") || pathname?.startsWith("/my-orders")
    ? "my-orders"
    : "order";

  const handleSetStudentTab = (tab) => {
    if (tab === "order") router.push("/order");
    else if (tab === "queue") router.push("/queue");
    else if (tab === "my-orders") router.push("/orders");
  };

  const handleSetUserRole = (role) => {
    if (role === "vendor") router.push("/vendor");
    else if (role === "student") router.push("/order");
    else router.push("/");
  };

  const totalCartCount = Array.isArray(cart)
    ? cart.reduce((sum, item) => sum + (item?.quantity || 1), 0)
    : 0;

  return (
    <AppContext.Provider
      value={{
        userRole,
        studentTab,
        cart,
        setCart,
        cartCount: totalCartCount,
        studentProfile,
        setStudentProfile,
        isProfileModalOpen,
        setIsProfileModalOpen,
        handleSaveStudentProfile,
        handleLogout,
        handleSetStudentTab,
        handleSetUserRole,
        isMounted
      }}
    >
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
          {children}
        </main>

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
          <p
            style={{
              fontWeight: "700",
              color: "#0f172a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}
          >
            <img
              src="/images/canteengo-logo.png"
              alt="canteenGo"
              style={{ width: "22px", height: "22px", borderRadius: "5px" }}
            />
            canteenGo — Smart College Canteen Ordering & Live Queue
          </p>
          <p style={{ marginTop: "6px", color: "#94a3b8" }}>
            B.Tech CSE Capstone Project • Next.js App Router + MongoDB & Mongoose
          </p>
        </footer>

        <StudentProfileModal
          isOpen={isProfileModalOpen}
          initialProfile={studentProfile}
          onSave={handleSaveStudentProfile}
          onClose={studentProfile?.phone ? () => setIsProfileModalOpen(false) : null}
          onLogout={handleLogout}
        />
      </div>
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}

