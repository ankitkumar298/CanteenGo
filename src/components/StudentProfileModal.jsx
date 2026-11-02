"use client";

import { useState, useEffect } from "react";
import {
  GraduationCapIcon,
  KeyIcon,
  UserPlusIcon,
  PhoneIcon,
  MailIcon,
  LockIcon,
  UserIcon,
  IdCardIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  EyeIcon,
  EyeOffIcon,
  LogOutIcon
} from "./Icons";

export default function StudentProfileModal({
  isOpen,
  initialProfile,
  onSave,
  onClose,
  onLogout
}) {
  // Mode: "login", "signup", or "view" (if already logged in)
  const [authMode, setAuthMode] = useState("login");

  // Remember Me State (Persisted)
  const [rememberMe, setRememberMe] = useState(true);

  // Login Form States
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Sign Up Form States
  const [signupName, setSignupName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupStudentId, setSignupStudentId] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Status & Alerts
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError("");
      setSuccessMsg("");
      if (initialProfile?.name && initialProfile?.phone) {
        setAuthMode("view");
      } else {
        setAuthMode("login");
        try {
          const isRemembered = localStorage.getItem("canteenGo_rememberMe") !== "false";
          setRememberMe(isRemembered);
          if (isRemembered) {
            const savedIdentifier = localStorage.getItem("canteenGo_savedIdentifier");
            if (savedIdentifier) {
              setLoginIdentifier(savedIdentifier);
            }
          }
        } catch {}
      }
    }
  }, [isOpen, initialProfile]);

  if (!isOpen) return null;

  // Handle Login Submit
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const identifierClean = loginIdentifier.trim();
    if (!identifierClean) {
      setError("Please enter your registered mobile number or email.");
      return;
    }
    if (!loginPassword.trim()) {
      setError("Please enter your password.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/student/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifierClean,
          password: loginPassword
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Login failed. Please verify your credentials.");
      }

      const profileData = {
        _id: data.student._id,
        name: data.student.name,
        phone: data.student.phone,
        email: data.student.email || "",
        studentId: data.student.studentId || ""
      };

      try {
        localStorage.setItem("canteenGo_studentProfile", JSON.stringify(profileData));
        if (rememberMe) {
          localStorage.setItem("canteenGo_rememberMe", "true");
          localStorage.setItem("canteenGo_savedIdentifier", identifierClean);
        } else {
          localStorage.setItem("canteenGo_rememberMe", "false");
          localStorage.removeItem("canteenGo_savedIdentifier");
        }
      } catch {}

      setSuccessMsg("Logged in successfully! Loading your session...");
      setTimeout(() => {
        onSave(profileData);
      }, 350);
    } catch (err) {
      setError(err.message || "Failed to log in.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Sign Up Submit
  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!signupName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    const cleanPhone = signupPhone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!signupPassword || signupPassword.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/student/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signupName.trim(),
          phone: cleanPhone,
          email: signupEmail.trim(),
          studentId: signupStudentId.trim(),
          password: signupPassword
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Registration failed.");
      }

      const profileData = {
        _id: data.student._id,
        name: data.student.name,
        phone: data.student.phone,
        email: data.student.email || "",
        studentId: data.student.studentId || ""
      };

      try {
        localStorage.setItem("canteenGo_studentProfile", JSON.stringify(profileData));
        localStorage.setItem("canteenGo_rememberMe", "true");
        localStorage.setItem("canteenGo_savedIdentifier", cleanPhone);
      } catch {}

      setSuccessMsg("Account created! Logging you in...");
      setTimeout(() => {
        onSave(profileData);
      }, 400);
    } catch (err) {
      setError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card student-profile-card student-auth-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="modal-header profile-modal-header">
          <div className="profile-badge-icon">
            <GraduationCapIcon size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 className="modal-title">
              {authMode === "view"
                ? "Student Profile"
                : authMode === "signup"
                ? "Create Student Account"
                : "Student Login"}
            </h3>
            <p className="modal-subtitle">
              {authMode === "view"
                ? "Your active canteenGo account details & tokens."
                : authMode === "signup"
                ? "Register to place snack orders and track live token queue."
                : "Log in with your registered mobile number & password."}
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              title="Close modal"
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </div>

        {/* Segmented Tab Switcher (Visible in Login & Signup modes) */}
        {authMode !== "view" && (
          <div className="auth-tab-switcher">
            <button
              type="button"
              className={`auth-tab-btn ${authMode === "login" ? "active" : ""}`}
              onClick={() => {
                setError("");
                setSuccessMsg("");
                setAuthMode("login");
              }}
            >
              <KeyIcon size={15} />
              <span>Log In</span>
            </button>
            <button
              type="button"
              className={`auth-tab-btn ${authMode === "signup" ? "active" : ""}`}
              onClick={() => {
                setError("");
                setSuccessMsg("");
                setAuthMode("signup");
              }}
            >
              <UserPlusIcon size={15} />
              <span>Sign Up</span>
            </button>
          </div>
        )}

        {/* Dynamic Alerts */}
        {error && <div className="alert alert-error auth-alert">{error}</div>}
        {successMsg && <div className="alert alert-success auth-alert">{successMsg}</div>}

        {/* =========================================================================
            TAB 1: STUDENT LOGIN FORM
            ========================================================================= */}
        {authMode === "login" && (
          <form onSubmit={handleLogin} className="student-profile-form">
            <div className="form-group">
              <label className="form-label">
                Mobile Number or Email <span className="required-star">*</span>
              </label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <PhoneIcon size={18} />
                </span>
                <input
                  type="text"
                  className="form-input auth-form-input"
                  placeholder="e.g. 9876543210 or student@college.edu"
                  value={loginIdentifier}
                  onChange={(e) => {
                    setError("");
                    setLoginIdentifier(e.target.value);
                  }}
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Password <span className="required-star">*</span>
              </label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <LockIcon size={18} />
                </span>
                <input
                  type={showLoginPassword ? "text" : "password"}
                  className="form-input auth-form-input"
                  placeholder="Enter your student password"
                  value={loginPassword}
                  onChange={(e) => {
                    setError("");
                    setLoginPassword(e.target.value);
                  }}
                  required
                />
                <button
                  type="button"
                  className="btn-toggle-eye"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  title={showLoginPassword ? "Hide password" : "Show password"}
                  aria-label={showLoginPassword ? "Hide password" : "Show password"}
                >
                  {showLoginPassword ? <EyeOffIcon size={17} /> : <EyeIcon size={17} />}
                </button>
              </div>
            </div>

            {/* Remember Me Option */}
            <div className="auth-options-row">
              <label className="remember-me-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="remember-me-checkbox"
                />
                <span className="remember-me-custom"></span>
                <span className="remember-me-text">Remember me on this device</span>
              </label>
            </div>

            {/* Security Note */}
            <div className="profile-security-note">
              <div className="security-note-icon">
                <ShieldCheckIcon size={17} />
              </div>
              <small>
                Aapke orders strictly aapke registered mobile number se link honge.
              </small>
            </div>

            {/* Submit Button */}
            <div className="profile-modal-actions">
              <button
                type="submit"
                className="btn btn-primary btn-save-profile w-full"
                disabled={loading}
              >
                <CheckCircleIcon size={17} />
                <span>{loading ? "Logging in..." : "Log In to Canteen"}</span>
                <ArrowRightIcon size={15} className="btn-arrow-icon" />
              </button>
            </div>

            {/* Switch Prompt */}
            <div className="auth-switch-prompt">
              <span>New to canteenGo?</span>
              <button
                type="button"
                className="btn-link-action"
                onClick={() => {
                  setError("");
                  setSuccessMsg("");
                  setAuthMode("signup");
                }}
              >
                Create an Account (Sign Up)
              </button>
            </div>
          </form>
        )}

        {/* =========================================================================
            TAB 2: STUDENT SIGN UP FORM
            ========================================================================= */}
        {authMode === "signup" && (
          <form onSubmit={handleSignUp} className="student-profile-form">
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
                  value={signupName}
                  onChange={(e) => {
                    setError("");
                    setSignupName(e.target.value);
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
                    placeholder="10-digit mobile"
                    value={signupPhone}
                    onChange={(e) => {
                      setError("");
                      setSignupPhone(e.target.value.replace(/\D/g, ""));
                    }}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Roll No. / ID (Optional)</label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">
                    <IdCardIcon size={18} />
                  </span>
                  <input
                    type="text"
                    className="form-input auth-form-input"
                    placeholder="e.g. 21CS042"
                    value={signupStudentId}
                    onChange={(e) => setSignupStudentId(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">College Email (Optional)</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <MailIcon size={18} />
                </span>
                <input
                  type="email"
                  className="form-input auth-form-input"
                  placeholder="e.g. student@college.edu"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row-2col">
              <div className="form-group">
                <label className="form-label">
                  Create Password <span className="required-star">*</span>
                </label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">
                    <LockIcon size={18} />
                  </span>
                  <input
                    type={showSignupPassword ? "text" : "password"}
                    className="form-input auth-form-input"
                    placeholder="Min 4 chars"
                    value={signupPassword}
                    onChange={(e) => {
                      setError("");
                      setSignupPassword(e.target.value);
                    }}
                    required
                  />
                  <button
                    type="button"
                    className="btn-toggle-eye"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    title={showSignupPassword ? "Hide password" : "Show password"}
                    aria-label={showSignupPassword ? "Hide password" : "Show password"}
                  >
                    {showSignupPassword ? <EyeOffIcon size={17} /> : <EyeIcon size={17} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Confirm Password <span className="required-star">*</span>
                </label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">
                    <LockIcon size={18} />
                  </span>
                  <input
                    type={showSignupPassword ? "text" : "password"}
                    className="form-input auth-form-input"
                    placeholder="Re-enter password"
                    value={signupConfirmPassword}
                    onChange={(e) => {
                      setError("");
                      setSignupConfirmPassword(e.target.value);
                    }}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="profile-security-note">
              <div className="security-note-icon">
                <GraduationCapIcon size={17} />
              </div>
              <small>
                Sign up karte hi aap canteen food order kar sakte hain aur live token track kar sakte hain.
              </small>
            </div>

            <div className="profile-modal-actions">
              <button
                type="submit"
                className="btn btn-primary btn-save-profile w-full"
                disabled={loading}
              >
                <CheckCircleIcon size={17} />
                <span>{loading ? "Creating Account..." : "Create Account & Continue"}</span>
                <ArrowRightIcon size={15} className="btn-arrow-icon" />
              </button>
            </div>

            <div className="auth-switch-prompt">
              <span>Already registered?</span>
              <button
                type="button"
                className="btn-link-action"
                onClick={() => {
                  setError("");
                  setSuccessMsg("");
                  setAuthMode("login");
                }}
              >
                Log In to your Account
              </button>
            </div>
          </form>
        )}

        {/* =========================================================================
            VIEW MODE: LOGGED IN STUDENT DETAILS
            ========================================================================= */}
        {authMode === "view" && initialProfile && (
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
                className="btn btn-secondary"
                onClick={() => {
                  setAuthMode("login");
                }}
              >
                <KeyIcon size={15} />
                <span>Switch / Re-login</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
