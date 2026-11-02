"use client";

import QueuePage from "@/pages/QueuePage";
import { useRouter } from "next/navigation";

export default function QueueRoute() {
  const router = useRouter();

  const handleNavTab = (tab) => {
    if (tab === "order") router.push("/order");
    else if (tab === "my-orders") router.push("/orders");
    else if (tab === "queue") router.push("/queue");
  };

  return <QueuePage setActiveTab={handleNavTab} />;
}

