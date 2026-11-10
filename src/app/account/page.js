"use client";

import AccountPage from "@/pages/AccountPage";
import { useApp } from "@/context/AppContext";

export default function AccountRoute() {
  const { studentProfile, handleSaveStudentProfile, handleLogout } = useApp();

  return (
    <AccountPage
      studentProfile={studentProfile}
      onSaveProfile={handleSaveStudentProfile}
      onLogout={handleLogout}
    />
  );
}

