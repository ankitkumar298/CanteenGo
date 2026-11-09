"use client";

import { useState, useEffect } from "react";
import {
  GraduationCapIcon,
  PhoneIcon,
  MailIcon,
  UserIcon,
  IdCardIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  LogOutIcon,
  EditIcon
} from "./Icons";

export default function StudentProfileModal({
  isOpen,
  initialProfile,
  onSave,
  onClose,
  onBackToHome,
  onLogout
}) {
  // Mode: "view" (view details) or "edit" (update details)
  const [mode, setMode] = useState("view");

  // Form fields for editing/updating
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [studentId, setStudentId] = useState("");

  // Alerts & loading
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  const handleReturnHome = () => {
    if (onBackToHome) {
      onBackToHome();
    } else if (onClose) {
      onClose();
    }
  };

  // Close modal on Escape key & hide bottom nav pill
  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = "hidden";
    document.body.classList.add("profile-modal-open");

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("profile-modal-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Sync state whenever modal opens or initialProfile changes
  useEffect(() => {
    if (isOpen) {
      setError("");
      setSuccessMsg("");
      setName(initialProfile?.name || "");
      setPhone(initialProfile?.phone || "");
      setEmail(initialProfile?.email || "");
      setStudentId(initialProfile?.studentId || "");

      if (initialProfile?.name && initialProfile?.phone) {
        setMode("view");
      } else {
        setMode("edit");
      }
    }
  }, [isOpen, initialProfile]);

  if (!isOpen) return null;

  // Handle Update Details Submit
  const handleUpdateSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const cleanName = name.trim();
    if (!cleanName) {
      setError("Please enter your full name.");
      return;
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    try {
      setLoading(true);

      const updatedProfile = {
        ...(initialProfile || {}),
        name: cleanName,
        phone: cleanPhone,
        email: email.trim(),
        studentId: studentId.trim()
      };

      try {
        localStorage.setItem("canteenGo_studentProfile", JSON.stringify(updatedProfile));
        localStorage.setItem("canteenGo_rememberMe", "true");
        localStorage.setItem("canteenGo_savedIdentifier", cleanPhone);
      } catch {}

      setSuccessMsg("Details updated successfully!");

      setTimeout(() => {
        if (onSave) onSave(updatedProfile);
        setMode("view");
        setLoading(false);
      }, 350);
    } catch (err) {
      setError(err?.message || "Failed to update details. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div
        className="modal-card student-profile-card student-auth-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Navigation & Exit Bar */}
        <div className="modal-top-nav-bar">
          <button
            type="button"
            className="btn-modal-back-home"
            onClick={handleReturnHome}
            title="Return to CanteenGo Main Menu"
          >
            ← Back to Home
          </button>
        </div>

        {/* Modal Header */}
        <div className="modal-header profile-modal-header">
          <div className="profile-badge-icon">
            <GraduationCapIcon size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 className="modal-title">
              {mode === "view" ? "Student Profile" : "Update Student Details"}
            </h3>
            <p className="modal-subtitle">
              {mode === "view"
                ? "Your active canteenGo account details & tokens."
                : "Edit your name, mobile number, and student information."}
            </p>
            <span className="auth-jwt-chip">
              <ShieldCheckIcon size={12} /> {mode === "view" ? "Active Student Profile" : "Edit Details"}
            </span>
          </div>
        </div>

        {/* Dynamic Alerts */}
        {error && <div className="alert alert-error auth-alert">{error}</div>}
        {successMsg && <div className="alert alert-success auth-alert">{successMsg}</div>}

        {/* =========================================================================
            MODE 1: VIEW DETAILS
            ========================================================================= */}
        {mode === "view" && initialProfile && (
          <div className="student-profile-view">
            <div className="profile-details-card">
              <div className="profile-detail-row">
                <span className="profile-label">Student Name:</span>
                <strong className="profile-value">{initialProfile.name}</strong>
              </div>
              <div className="profile-detail-row">
                <span className="profile-label">Mobile Number:</span>
                <span className="profile-value">{initialProfile.phone}</span>
              </div>
              {initialProfile.email && (
                <div className="profile-detail-row">
                  <span className="profile-label">Email:</span>
                  <span className="profile-value">{initialProfile.email}</span>
                </div>
              )}
              {initialProfile.studentId && (
                <div className="profile-detail-row">
                  <span className="profile-label">Student ID:</span>
                  <span className="profile-value">{initialProfile.studentId}</span>
                </div>
              )}
              <div className="profile-detail-row">
                <span className="profile-label">Account Status:</span>
                <span className="profile-active-tag">
                  <CheckCircleIcon size={13} /> Active Logged In
                </span>
              </div>
            </div>

            <div className="profile-view-actions">
              <button
                type="button"
                className="btn btn-outline btn-logout-action"
                onClick={() => {
                  if (window.confirm("Are you sure you want to log out of this account?")) {
                    onLogout();
                    if (onClose) onClose();
                  }
                }}
              >
                <LogOutIcon size={16} />
                <span>Log Out</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-edit-profile"
                onClick={() => {
                  setError("");
                  setSuccessMsg("");
                  setName(initialProfile.name || "");
                  setPhone(initialProfile.phone || "");
                  setEmail(initialProfile.email || "");
                  setStudentId(initialProfile.studentId || "");
                  setMode("edit");
                }}
                title="Edit your student details"
              >
                <EditIcon size={16} />
                <span>Edit Details</span>
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODE 2: UPDATE DETAILS FORM
            ========================================================================= */}
        {mode === "edit" && (
          <form onSubmit={handleUpdateSubmit} className="student-profile-form">
            <div className="form-group">
              <label className="form-label">
                Full Name <span className="required-star">*</span>
              </label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <UserIcon size={18} />
                </span>
                <input
                  type="text"
                  className="form-input auth-form-input"
                  placeholder="e.g. Ankit Sharma"
                  value={name}
                  onChange={(e) => {
                    setError("");
                    setName(e.target.value);
                  }}
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="form-row-2col">
              <div className="form-group">
                <label className="form-label">
                  Mobile Number <span className="required-star">*</span>
                </label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">
                    <PhoneIcon size={18} />
                  </span>
                  <input
                    type="tel"
                    maxLength="10"
                    className="form-input auth-form-input"
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={(e) => {
                      setError("");
                      setPhone(e.target.value.replace(/\D/g, ""));
                    }}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Roll No. / Student ID (Optional)</label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">
                    <IdCardIcon size={18} />
                  </span>
                  <input
                    type="text"
                    className="form-input auth-form-input"
                    placeholder="e.g. 21CS042"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address (Optional)</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <MailIcon size={18} />
                </span>
                <input
                  type="email"
                  className="form-input auth-form-input"
                  placeholder="e.g. student@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="profile-security-note">
              <div className="security-note-icon">
                <GraduationCapIcon size={17} />
              </div>
              <small>
                Your updated details will be used for your canteen token calling, SMS receipts, and order tracking.
              </small>
            </div>

            <div className="profile-edit-actions">
              {initialProfile?.name && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setError("");
                    setSuccessMsg("");
                    setMode("view");
                  }}
                  disabled={loading}
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="btn btn-primary btn-save-profile"
                disabled={loading}
              >
                <CheckCircleIcon size={16} />
                <span>{loading ? "Updating Details..." : "Update Details"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
