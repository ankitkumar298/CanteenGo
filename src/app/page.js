"use client";

import HomePage from "@/pages/HomePage";
import { useApp } from "@/context/AppContext";
import { useRouter } from "next/navigation";

export default function HomeRoute() {
  const { setIsProfileModalOpen, studentProfile } = useApp();
  const router = useRouter();

  const handleSelectRole = (role) => {
    if (role === "student") {
      if (!studentProfile?.name || !studentProfile?.phone) {
        setIsProfileModalOpen(true);
      }
      router.push("/order");
    } else if (role === "vendor") {
      router.push("/vendor");
    } else if (role === "queue") {
      router.push("/queue");
    }
  };

  return <HomePage onSelectRole={handleSelectRole} />;
}
