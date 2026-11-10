"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  UserIcon,
  PhoneIcon,
  MailIcon,
  IdCardIcon,
  EditIcon,
  CheckCircleIcon,
  LogOutIcon,
  LockIcon
} from "../components/Icons";
import StudentMobileBottomNav from "../components/mobile/StudentMobileBottomNav";
import { useAppContext } from "@/context/AppContext";

export default function AccountPage({
  studentProfile,
  onSaveProfile,
  onLogout
}) {
  const router = useRouter();
  const { cart, handleLogout, handleSaveStudentProfile, isMobileCartOpen, setIsMobileCartOpen } = useAppContext();

  // Single edit mode toggle (clean, without individual buttons on each row)
  const [isEditing, setIsEditing] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [studentId, setStudentId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Initial fetch directly from MongoDB to ensure real database values are loaded
  useEffect(() => {
    fetch("/api/auth/student/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.authenticated && data.student) {
          setName(data.student.name || "");
          setPhone(data.student.phone || "");
          setEmail(data.student.email || "");
          setStudentId(data.student.studentId || "");
          if (onSaveProfile) onSaveProfile(data.student);
          else if (handleSaveStudentProfile) handleSaveStudentProfile(data.student);
        }
      })
      .catch(() => {});
  }, []);

  // Sync state with profile prop
  useEffect(() => {
    if (studentProfile) {
      setName(studentProfile?.name || "");
      setPhone(studentProfile?.phone || "");
      setEmail(studentProfile?.email || "");
      setStudentId(studentProfile?.studentId || studentProfile?.rollNo || studentProfile?.regNo || "");
    }
  }, [studentProfile]);

  const initials = (name || "Student")
    .trim()
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Save profile & password changes directly to MongoDB via Mongoose PUT API
  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMsg("Please enter your full name.");
      return;
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length !== 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (newPassword && newPassword.trim().length < 4) {
      setErrorMsg("Password must be at least 4 characters long.");
      return;
    }

    try {
      setIsSaving(true);

      const token = typeof window !== "undefined" ? localStorage.getItem("canteenGo_studentToken") : null;
      const res = await fetch("/api/auth/student/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: cleanName,
          phone: cleanPhone,
          email: (email || "").trim(),
          studentId: (studentId || "").trim(),
          password: newPassword ? newPassword.trim() : undefined,
          studentDbId: studentProfile?._id || studentProfile?.id
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update profile in database.");
      }

      const updatedStudent = data.student;

      // Update local storage
      try {
        localStorage.setItem("canteenGo_studentProfile", JSON.stringify(updatedStudent));
        localStorage.setItem("canteenGo_studentPhone", updatedStudent.phone);
        if (data.token) {
          localStorage.setItem("canteenGo_studentToken", data.token);
        }
      } catch {}

      // Update state & AppContext
      if (onSaveProfile) {
        onSaveProfile(updatedStudent);
      } else if (handleSaveStudentProfile) {
        handleSaveStudentProfile(updatedStudent);
      }

      setName(updatedStudent.name || "");
      setPhone(updatedStudent.phone || "");
      setEmail(updatedStudent.email || "");
      setStudentId(updatedStudent.studentId || "");
      setNewPassword("");
      setShowPassword(false);

      setSuccessMsg("✓ Profile & password updated directly in MongoDB database!");
      setIsEditing(false);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setErrorMsg(err?.message || "Failed to save details. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setErrorMsg("");
    setNewPassword("");
    setShowPassword(false);
    setName(studentProfile?.name || "");
    setPhone(studentProfile?.phone || "");
    setEmail(studentProfile?.email || "");
    setStudentId(studentProfile?.studentId || studentProfile?.rollNo || studentProfile?.regNo || "");
  };

  const handleExecuteLogout = () => {
    if (window.confirm("Are you sure you want to log out of your student account?")) {
      if (onLogout) onLogout();
      else if (handleLogout) handleLogout();
      router.push("/");
    }
  };

  return (
    <div className="account-page-container">
      {/* Top Mobile App Bar */}
      <div className="account-top-bar">
        <button
          type="button"
          className="btn-account-back"
          onClick={() => router.push("/order")}
          aria-label="Back to menu"
        >
          ← Menu
        </button>
        <h2 className="account-top-title">My Account</h2>
        <span className="account-status-badge">
          <span className="account-status-dot" />
          Active
        </span>
      </div>

      <div className="account-page-content">
        {/* Alerts */}
        {successMsg && (
          <div className="account-alert success-alert" role="status">
            <CheckCircleIcon size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="account-alert error-alert" role="alert">
            <span>⚠️ {errorMsg}</span>
          </div>
        )}

        {/* 1. Profile Avatar & Hero Card */}
        <div className="account-hero-card">
          <div className="account-avatar-wrapper">
            <div className="account-avatar-circle">
              <span>{initials}</span>
            </div>
            <span className="account-avatar-check" title="Verified Campus Student">✓</span>
          </div>

          <div className="account-hero-info">
            <h3 className="account-hero-name">{name || "Student"}</h3>
            <div className="account-hero-badges">
              <span className="hero-id-chip">
                <IdCardIcon size={13} />
                <span>{studentId ? studentId : "Set student ID"}</span>
              </span>
              <span className="hero-phone-chip">
                <PhoneIcon size={13} />
                <span>{phone ? `+91 ${phone.slice(0, 5)} ${phone.slice(5)}` : "Set mobile number"}</span>
              </span>
            </div>
          </div>
        </div>

        {/* 2. Account Details Card (Clean & Focused, NO specific mini-buttons) */}
        <form onSubmit={handleSave} className="account-section-card">
          <div className="account-section-header">
            <div className="account-section-titles">
              <h4>Profile Information</h4>
              <span className="account-section-hint">
                {isEditing ? "Update your pickup details below" : "Your registered campus information"}
              </span>
            </div>

            {!isEditing ? (
              <button
                type="button"
                className="btn-edit-profile-header"
                onClick={() => {
                  setIsEditing(true);
                  setErrorMsg("");
                }}
                title="Edit profile"
              >
                <EditIcon size={14} />
                <span>Edit Profile</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn-cancel-profile-header"
                onClick={handleCancelEdit}
                title="Cancel edit"
              >
                <span>Cancel</span>
              </button>
            )}
          </div>

          <div className="account-fields-list">
            {/* Field 1: Full Name */}
            <div className={`account-field-row ${isEditing ? "editing" : ""}`}>
              <div className="field-row-icon">
                <UserIcon size={18} />
              </div>

              <div className="field-row-content">
                <label className="field-label" htmlFor="accNameInput">
                  Full Name (For Token Callout)
                </label>
                {isEditing ? (
                  <input
                    id="accNameInput"
                    type="text"
                    className="account-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ankit Verma"
                    autoFocus
                  />
                ) : (
                  name ? (
                    <strong className="field-value">{name}</strong>
                  ) : (
                    <button
                      type="button"
                      className="field-prompt-btn"
                      onClick={() => {
                        setIsEditing(true);
                        setErrorMsg("");
                      }}
                      title="Click to set your full name"
                    >
                      <span>+ Set your full name</span>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Field 2: Mobile Number */}
            <div className={`account-field-row ${isEditing ? "editing" : ""}`}>
              <div className="field-row-icon phone-icon">
                <PhoneIcon size={18} />
              </div>

              <div className="field-row-content">
                <label className="field-label" htmlFor="accPhoneInput">
                  Mobile Number (Order SMS & Alerts)
                </label>
                {isEditing ? (
                  <div className="phone-input-inline-wrap">
                    <span className="phone-prefix">🇮🇳 +91</span>
                    <input
                      id="accPhoneInput"
                      type="tel"
                      className="account-input phone-input"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="98765 43210"
                      maxLength={10}
                    />
                  </div>
                ) : (
                  phone ? (
                    <strong className="field-value">+91 {phone.slice(0, 5)} {phone.slice(5)}</strong>
                  ) : (
                    <button
                      type="button"
                      className="field-prompt-btn"
                      onClick={() => {
                        setIsEditing(true);
                        setErrorMsg("");
                      }}
                      title="Click to set mobile number"
                    >
                      <span>+ Set your mobile number</span>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Field 3: Email Address */}
            <div className={`account-field-row ${isEditing ? "editing" : ""}`}>
              <div className="field-row-icon email-icon">
                <MailIcon size={18} />
              </div>

              <div className="field-row-content">
                <label className="field-label" htmlFor="accEmailInput">
                  College Email Address
                </label>
                {isEditing ? (
                  <input
                    id="accEmailInput"
                    type="email"
                    className="account-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. yourname@college.edu"
                  />
                ) : (
                  email ? (
                    <strong className="field-value">{email}</strong>
                  ) : (
                    <button
                      type="button"
                      className="field-prompt-btn"
                      onClick={() => {
                        setIsEditing(true);
                        setErrorMsg("");
                      }}
                      title="Click to set college email"
                    >
                      <span>+ Set your college email</span>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Field 4: Student ID / Roll Number */}
            <div className={`account-field-row ${isEditing ? "editing" : ""}`}>
              <div className="field-row-icon id-icon">
                <IdCardIcon size={18} />
              </div>

              <div className="field-row-content">
                <label className="field-label" htmlFor="accStudentIdInput">
                  Student / Roll ID
                </label>
                {isEditing ? (
                  <input
                    id="accStudentIdInput"
                    type="text"
                    className="account-input"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g. 21BCSE042"
                  />
                ) : (
                  studentId ? (
                    <strong className="field-value">{studentId}</strong>
                  ) : (
                    <button
                      type="button"
                      className="field-prompt-btn"
                      onClick={() => {
                        setIsEditing(true);
                        setErrorMsg("");
                      }}
                      title="Click to set student ID"
                    >
                      <span>+ Set your student ID</span>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Field 5: Account Password & Password Update */}
            <div className={`account-field-row ${isEditing ? "editing" : ""}`}>
              <div className="field-row-icon password-icon">
                <LockIcon size={18} />
              </div>

              <div className="field-row-content">
                <label className="field-label" htmlFor="accPasswordInput">
                  {isEditing ? "Update Password (Direct MongoDB Update)" : "Account Password"}
                </label>
                {isEditing ? (
                  <div className="password-input-inline-wrap">
                    <input
                      id="accPasswordInput"
                      type={showPassword ? "text" : "password"}
                      className="account-input password-input"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Leave empty to keep existing, or enter new password"
                      minLength={4}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="btn-toggle-pwd-visibility"
                      onClick={() => setShowPassword((prev) => !prev)}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                ) : (
                  <div className="password-display-row">
                    <strong className="field-value password-dots">••••••••••••</strong>
                    <span className="field-secure-badge">🔒 Stored in MongoDB</span>
                  </div>
                )}
                {isEditing && (
                  <span className="field-input-hint">
                    Min 4 characters. Saves directly into MongoDB database.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Edit Mode Save & Cancel Actions */}
          {isEditing && (
            <div className="bulk-edit-actions-row">
              <button
                type="button"
                className="btn-bulk-cancel"
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-bulk-save"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "✓ Save Changes"}
              </button>
            </div>
          )}
        </form>

        {/* 3. Logout Button */}
        <div className="account-logout-wrap">
          <button
            type="button"
            className="btn-account-logout"
            onClick={handleExecuteLogout}
          >
            <LogOutIcon size={18} />
            <span>Log Out of Account</span>
          </button>
        </div>
      </div>

      {/* Student Floating Bottom Nav (Sticky at bottom, slot 4 'Account' active) */}
      <StudentMobileBottomNav
        studentTab="account"
        setStudentTab={(tab) => {
          if (tab === "order") router.push("/order");
          else if (tab === "queue") router.push("/queue");
          else if (tab === "my-orders") router.push("/orders");
          else if (tab === "account") router.push("/account");
        }}
        cartCount={cart?.length || 0}
        isCartOpen={Boolean(isMobileCartOpen)}
        onToggleCart={() => setIsMobileCartOpen && setIsMobileCartOpen((prev) => !prev)}
      />
    </div>
  );
}
