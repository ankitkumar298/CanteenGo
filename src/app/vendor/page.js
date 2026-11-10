"use client";

import { useState, useEffect } from "react";
import VendorPage from "@/pages/VendorPage";
import VendorLoginModal from "@/components/VendorLoginModal";
import { useRouter } from "next/navigation";

export default function VendorRoute() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    try {
      const session = localStorage.getItem("canteenGo_vendorSession");
      if (session) {
        setIsAuthenticated(true);
      }
    } catch {}
    setChecking(false);
  }, []);

  const handleLogoutVendor = () => {
    try {
      localStorage.removeItem("canteenGo_vendorSession");
      localStorage.removeItem("canteenGo_userRole");
    } catch {}
    router.push("/");
  };

  if (checking) return null;

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <VendorLoginModal
          isOpen={true}
          onClose={() => router.push("/")}
          onSuccess={() => setIsAuthenticated(true)}
        />
      </div>
    );
  }

  return <VendorPage onExitToHome={handleLogoutVendor} />;
}

