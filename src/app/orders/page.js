"use client";

import YourOrdersPage from "@/pages/YourOrdersPage";
import { useApp } from "@/context/AppContext";
import { useRouter } from "next/navigation";

export default function OrdersRoute() {
  const { studentProfile, setIsProfileModalOpen, handleLogout } = useApp();
  const router = useRouter();

  return (
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
        router.push("/queue");
      }}
      onOrderMore={() => router.push("/order")}
    />
  );
}

