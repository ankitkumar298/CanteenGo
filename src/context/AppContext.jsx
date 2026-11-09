"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import StudentProfileModal from "@/components/StudentProfileModal";
import StudentMobileBottomNav from "@/components/StudentMobileBottomNav";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CAMPUS_CANTEENS } from "@/data/canteens";

const AppContext = createContext(null);

export function useAppContext() {
  const context = useContext(AppContext);
  return context || {};
}

export function AppProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  // Dynamic Canteens State (Loaded from MongoDB Atlas collection)
  const [canteens, setCanteens] = useState(CAMPUS_CANTEENS);
  const [loadingCanteens, setLoadingCanteens] = useState(true);

  const refreshCanteens = async () => {
    try {
      const res = await fetch("/api/canteens");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCanteens(data);
          try {
            localStorage.setItem("canteenGo_cachedCanteens", JSON.stringify(data));
          } catch {}
        }
      }
    } catch (e) {
      console.warn("Failed to load dynamic canteens:", e);
    } finally {
      setLoadingCanteens(false);
    }
  };

  useEffect(() => {
    try {
      const cached = localStorage.getItem("canteenGo_cachedCanteens");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCanteens(parsed);
        }
      }
    } catch {}
    refreshCanteens();
  }, []);

  // Student Profile
  const [studentProfile, setStudentProfile] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Cart State (Persisted in localStorage)
  const [cart, setCart] = useState([]);
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

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

    // Verify active JWT token with backend session API
    fetch("/api/auth/student/me")
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data && data.authenticated && data.student) {
          setStudentProfile((prev) => ({
            ...prev,
            ...data.student
          }));
          try {
            localStorage.setItem("canteenGo_studentProfile", JSON.stringify(data.student));
          } catch {}
        }
      })
      .catch(() => {});
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
    if (pathname === "/") {
      router.push("/order");
    }
  };

  const handleCloseProfileModal = () => {
    setIsProfileModalOpen(false);
    if (!studentProfile?.phone) {
      router.push("/");
    }
  };

  const handleBackToHome = () => {
    setIsProfileModalOpen(false);
    router.push("/");
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/student/logout", { method: "POST" }).catch(() => {});
      localStorage.removeItem("canteenGo_studentProfile");
      localStorage.removeItem("canteenGo_studentToken");
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
        canteens,
        loadingCanteens,
        refreshCanteens,
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
        isMounted,
        isMobileCartOpen,
        setIsMobileCartOpen
      }}
    >
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {pathname !== "/" && (
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
        )}

        <main className={pathname === "/" ? "home-main-container" : "container"} style={{ flex: 1, padding: pathname === "/" ? 0 : undefined }}>
          {children}
        </main>

        {pathname !== "/" && <Footer />}

        {/* Student Mobile Bottom Pill Bar (Only icons: Order Food, Live Queue, Cart, My Orders) */}
        {userRole === "student" && pathname !== "/" && (
          <StudentMobileBottomNav
            studentTab={studentTab}
            setStudentTab={handleSetStudentTab}
            cartCount={totalCartCount}
            isCartOpen={isMobileCartOpen}
            onToggleCart={() => {
              if (!pathname?.startsWith("/order")) {
                router.push("/order");
              }
              setIsMobileCartOpen((prev) => !prev);
            }}
          />
        )}

        <StudentProfileModal
          isOpen={isProfileModalOpen}
          initialProfile={studentProfile}
          onSave={handleSaveStudentProfile}
          onClose={handleCloseProfileModal}
          onBackToHome={handleBackToHome}
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

