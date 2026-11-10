"use client";

import StudentPage from "@/pages/StudentPage";
import { useApp } from "@/context/AppContext";
import { useRouter } from "next/navigation";

export default function OrderRoute() {
  const {
    cart,
    setCart,
    studentProfile,
    setIsProfileModalOpen,
    handleLogout
  } = useApp();
  const router = useRouter();

  const handleNavTab = (tab) => {
    if (tab === "queue") router.push("/queue");
    else if (tab === "my-orders") router.push("/orders");
    else if (tab === "order") router.push("/order");
    else if (tab === "account") router.push("/account");
  };

  return (
    <StudentPage
      setActiveTab={handleNavTab}
      cart={cart}
      setCart={setCart}
      studentProfile={studentProfile}
      onOpenProfile={() => setIsProfileModalOpen(true)}
      onLogout={handleLogout}
    />
  );
}

