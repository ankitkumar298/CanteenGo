"use client";

import QueuePage from "@/pages/QueuePage";
import { useApp } from "@/context/AppContext";
import { useRouter } from "next/navigation";

export default function QueueRoute() {
  const router = useRouter();
  const { setIsProfileModalOpen } = useApp();

  const handleNavTab = (tab) => {
    if (tab === "order") router.push("/order");
    else if (tab === "my-orders") router.push("/orders");
    else if (tab === "queue") router.push("/queue");
    else if (tab === "account") router.push("/account");
  };

  return (
    <QueuePage
      setActiveTab={handleNavTab}
      onOpenProfile={() => setIsProfileModalOpen(true)}
    />
  );
}

