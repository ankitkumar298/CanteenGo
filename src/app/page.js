"use client";

import HomePage from "@/pages/HomePage";
import { useApp } from "@/context/AppContext";
import { useRouter } from "next/navigation";

export default function HomeRoute() {
  const { studentProfile, handleSaveStudentProfile, handleLogout } = useApp();
  const router = useRouter();

  const handleSelectRole = (role) => {
    if (role === "student") {
      router.push("/order");
    } else if (role === "vendor") {
      router.push("/vendor");
    } else if (role === "queue") {
      router.push("/queue");
    }
  };

  const handleStudentLoginSuccess = (profile) => {
    handleSaveStudentProfile(profile);
    router.push("/order");
  };

  return (
    <HomePage
      onSelectRole={handleSelectRole}
      onStudentLoginSuccess={handleStudentLoginSuccess}
      studentProfile={studentProfile}
      onLogout={handleLogout}
    />
  );
}
