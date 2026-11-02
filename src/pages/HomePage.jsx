import { useState, useEffect } from "react";
import { CAMPUS_CANTEENS } from "../data/canteens";
import {
  CartIcon,
  ChefIcon,
  PhoneIcon,
  LockIcon,
  UserIcon,
  IdCardIcon,
  MailIcon,
  EyeIcon,
  EyeOffIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  LogOutIcon,
  QueueIcon,
  GraduationCapIcon,
  StoreIcon
} from "../components/Icons";

export default function HomePage({
  onSelectRole,
  setActiveTab,
  onStudentLoginSuccess,
  studentProfile: propProfile,
  onLogout
}) {
  // Role switcher: "student" | "vendor"
  const [selectedRole, setSelectedRole] = useState("student");

  // Student mode: "login" | "signup"
  const [studentAuthMode, setStudentAuthMode] = useState("login");

  // Active student profile state
  const [studentProfile, setStudentProfile] = useState(() => {
    if (propProfile?.name && propProfile?.phone) return propProfile;
    try {
      const saved = localStorage.getItem("canteenGo_studentProfile");
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  useEffect(() => {
    if (propProfile?.name && propProfile?.phone) {
      setStudentProfile(propProfile);
    }
  }, [propProfile]);

  // Student Login Fields
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Student Signup Fields
  const [signupName, setSignupName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupStudentId, setSignupStudentId] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Vendor Fields
  const [selectedCanteenId, setSelectedCanteenId] = useState(() => {
    try {
      const saved = localStorage.getItem("canteenGo_vendorCanteen");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.id) return parsed.id;
      }
    } catch {}
    return CAMPUS_CANTEENS[0].id;
  });
  const [vendorPin, setVendorPin] = useState("");
  const [showVendorPin, setShowVendorPin] = useState(false);
  const [vendorRemember, setVendorRemember] = useState(true);

  // Feedback states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const currentCanteenObj =
    CAMPUS_CANTEENS.find((c) => c.id === selectedCanteenId) || CAMPUS_CANTEENS[0];

  // ==========================================
  // HANDLERS: STUDENT AUTH (JWT)
  // ==========================================
  const handleStudentLogin = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setSuccessMsg("");

    const identifierClean = loginIdentifier.trim();
    if (!identifierClean) {
      setError("Please enter your mobile number or college email.");
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

      if (data.token) {
        try {
          localStorage.setItem("canteenGo_studentToken", data.token);
        } catch {}
      }

      const profileData = {
        _id: data.student._id,
        name: data.student.name,
        phone: data.student.phone,
        email: data.student.email || "",
        studentId: data.student.studentId || "",
        token: data.token || ""
      };

      try {
        localStorage.setItem("canteenGo_studentProfile", JSON.stringify(profileData));
        localStorage.setItem("canteenGo_rememberMe", rememberMe ? "true" : "false");
      } catch {}

      setStudentProfile(profileData);
      setSuccessMsg("Logged in successfully! Redirecting...");

      setTimeout(() => {
        if (onStudentLoginSuccess) {
          onStudentLoginSuccess(profileData);
        } else if (onSelectRole) {
          onSelectRole("student");
        } else if (setActiveTab) {
          setActiveTab("student");
        }
      }, 300);
    } catch (err) {
      setError(err.message || "Failed to log in.");
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSignup = async (e) => {
    e.preventDefault();
    if (loading) return;

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

      if (data.token) {
        try {
          localStorage.setItem("canteenGo_studentToken", data.token);
        } catch {}
      }

      const profileData = {
        _id: data.student._id,
        name: data.student.name,
        phone: data.student.phone,
        email: data.student.email || "",
        studentId: data.student.studentId || "",
        token: data.token || ""
      };

      try {
        localStorage.setItem("canteenGo_studentProfile", JSON.stringify(profileData));
        localStorage.setItem("canteenGo_rememberMe", "true");
      } catch {}

      setStudentProfile(profileData);
      setSuccessMsg("Account created! Redirecting...");

      setTimeout(() => {
        if (onStudentLoginSuccess) {
          onStudentLoginSuccess(profileData);
        } else if (onSelectRole) {
          onSelectRole("student");
        } else if (setActiveTab) {
          setActiveTab("student");
        }
      }, 350);
    } catch (err) {
      setError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // HANDLERS: VENDOR AUTH
  // ==========================================
  const handleVendorSubmit = (e) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setSuccessMsg("");

    if (!vendorPin.trim()) {
      setError("Please enter staff counter PIN.");
      return;
    }

    const validPins = ["1234", "9999", "0000", currentCanteenObj?.staffPin || "1234"];
    if (!validPins.includes(vendorPin.trim())) {
      setError("Incorrect staff PIN. Default demo PIN: 1234");
      return;
    }

    try {
      if (vendorRemember) {
        localStorage.setItem(
          "canteenGo_vendorSession",
          JSON.stringify({
            canteenId: selectedCanteenId,
            canteenName: currentCanteenObj.name,
            loggedInAt: Date.now()
          })
        );
      }
      localStorage.setItem("canteenGo_vendorCanteen", JSON.stringify(currentCanteenObj));
    } catch {}

    setSuccessMsg(`Accessing ${currentCanteenObj.name} console...`);

    setTimeout(() => {
      if (onSelectRole) {
        onSelectRole("vendor", "orders", currentCanteenObj);
      } else if (setActiveTab) {
        setActiveTab("vendor");
      }
    }, 250);
  };

  const handleStudentLogout = async () => {
    try {
      await fetch("/api/auth/student/logout", { method: "POST" }).catch(() => {});
      localStorage.removeItem("canteenGo_studentProfile");
      localStorage.removeItem("canteenGo_studentToken");
    } catch {}
    setStudentProfile(null);
    if (onLogout) onLogout();
  };

  return (
    <div className="auth-page-outer">
      {/* Centered Dual-Panel Unified Card (Matching Reference Screenshot) */}
      <div className="auth-card-unified">
        {/* =========================================================================
            LEFT PANEL: ORANGE BRAND VISUAL SHOWCASE
            ========================================================================= */}
        <div className="auth-panel-visual">
          {/* Subtle curved ambient waves */}
          <div className="auth-visual-wave-top"></div>
          <div className="auth-visual-wave-bottom"></div>

          {/* Hero Meal Platter Illustration (3D Burger, Fries, Drink, Pizza Tray) */}
          <div className="auth-visual-img-wrap">
            <img
              src="/images/meal-tray-hero.svg"
              alt="CanteenGo Meal Platter"
              className="auth-visual-meal-img"
            />
          </div>

          {/* Brand Wordmark with brush underline */}
          <div className="auth-visual-brand-group">
            <h2 className="auth-visual-brand-name">CanteenGo</h2>
            <img
              src="/images/brush-underline.svg"
              alt=""
              className="auth-visual-brush-stroke"
              aria-hidden="true"
            />
          </div>

          {/* Bold Tagline & Subtitle */}
          <h3 className="auth-visual-headline">Order. Eat. Skip the Queue.</h3>
          <p className="auth-visual-subtext">
            Pre-order meals and track your campus canteen token.
          </p>

          {/* Bottom Carousel Indicator Dots */}
          <div className="auth-visual-indicators" aria-hidden="true">
            <span className="dot dot-pill"></span>
            <span className="dot dot-circle"></span>
            <span className="dot dot-circle"></span>
          </div>
        </div>

        {/* =========================================================================
            RIGHT PANEL: WHITE CLEAN AUTH CARD
            ========================================================================= */}
        <div className="auth-panel-form">
          {/* Top Logo Badge + Brand Title */}
          <div className="auth-header-brand">
            <div className="auth-cloche-icon-box">
              {/* Clean Cloche / Dish Icon */}
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 4v2" />
                <path d="M4 18h16" />
                <path d="M4 18a8 8 0 0 1 16 0" />
                <path d="M2 20h20" />
              </svg>
            </div>
            <span className="auth-header-title">CanteenGo</span>
          </div>

          {/* Welcome Titles */}
          <div className="auth-headings">
            <h1 className="auth-main-title">Welcome to CanteenGo</h1>
            <p className="auth-main-subtitle">
              {selectedRole === "student"
                ? studentAuthMode === "signup"
                  ? "Create your student account to order meals"
                  : "Sign in to your campus canteen account"
                : "Enter counter PIN to access vendor terminal"}
            </p>
          </div>

          {/* ROLE SELECTOR: Real SVG Icons (Student vs Canteen Vendor) */}
          <div className="auth-role-tabs">
            <button
              type="button"
              className={`auth-role-tab ${selectedRole === "student" ? "active" : ""}`}
              onClick={() => {
                setSelectedRole("student");
                setError("");
                setSuccessMsg("");
              }}
            >
              <GraduationCapIcon size={17} className="auth-role-svg" />
              <span>Student</span>
            </button>

            <button
              type="button"
              className={`auth-role-tab ${selectedRole === "vendor" ? "active" : ""}`}
              onClick={() => {
                setSelectedRole("vendor");
                setError("");
                setSuccessMsg("");
              }}
            >
              <StoreIcon size={17} className="auth-role-svg" />
              <span>Canteen Vendor</span>
            </button>
          </div>

          {/* Feedback Alerts */}
          {error && <div className="alert alert-error auth-alert-banner">{error}</div>}
          {successMsg && <div className="alert alert-success auth-alert-banner">{successMsg}</div>}

          {/* =====================================================================
              VIEW 1: STUDENT AUTHENTICATION
              ========================================================= */}
          {selectedRole === "student" && (
            <div className="auth-form-content">
              {/* If user is already logged in */}
              {studentProfile?.name && studentProfile?.phone ? (
                <div className="auth-active-student-card">
                  <div className="active-student-badge">
                    <UserIcon size={18} />
                    <div>
                      <h4 className="active-student-name">{studentProfile.name}</h4>
                      <p className="active-student-phone">
                        {studentProfile.phone}
                        {studentProfile.studentId ? ` • ID: ${studentProfile.studentId}` : ""}
                      </p>
                    </div>
                  </div>

                  <span className="auth-status-badge">
                    <CheckCircleIcon size={13} /> Active Student Session
                  </span>

                  <div className="active-student-actions">
                    <button
                      type="button"
                      className="btn-auth-submit-primary"
                      onClick={() => {
                        if (onSelectRole) onSelectRole("student");
                        else if (setActiveTab) setActiveTab("student");
                      }}
                    >
                      <span>Continue to Food Menu</span>
                      <ArrowRightIcon size={16} />
                    </button>

                    <button
                      type="button"
                      className="btn-auth-secondary"
                      onClick={() => {
                        if (onSelectRole) onSelectRole("queue");
                        else if (setActiveTab) setActiveTab("queue");
                      }}
                    >
                      <QueueIcon size={15} />
                      <span>View Live Queue Board</span>
                    </button>

                    <button
                      type="button"
                      className="btn-auth-logout"
                      onClick={handleStudentLogout}
                    >
                      <LogOutIcon size={14} />
                      <span>Switch / Log Out Account</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* If NOT logged in */
                <div>
                  {/* STUDENT LOG IN FORM */}
                  {studentAuthMode === "login" && (
                    <form onSubmit={handleStudentLogin} className="auth-clean-form">
                      {/* Mobile or Email Input */}
                      <div className="auth-input-field">
                        <span className="auth-field-icon">
                          <PhoneIcon size={17} />
                        </span>
                        <input
                          type="text"
                          className="auth-text-input"
                          placeholder="Mobile number or college email"
                          value={loginIdentifier}
                          onChange={(e) => {
                            setError("");
                            setLoginIdentifier(e.target.value);
                          }}
                          disabled={loading}
                          required
                        />
                      </div>

                      {/* Password Input */}
                      <div className="auth-input-field">
                        <span className="auth-field-icon">
                          <LockIcon size={17} />
                        </span>
                        <input
                          type={showLoginPassword ? "text" : "password"}
                          className="auth-text-input"
                          placeholder="Password"
                          value={loginPassword}
                          onChange={(e) => {
                            setError("");
                            setLoginPassword(e.target.value);
                          }}
                          disabled={loading}
                          required
                        />
                        <button
                          type="button"
                          className="auth-eye-btn"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          title={showLoginPassword ? "Hide password" : "Show password"}
                          tabIndex="-1"
                        >
                          {showLoginPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                        </button>
                      </div>

                      {/* Remember Me & Forgot Password Row */}
                      <div className="auth-remember-row">
                        <label className="auth-checkbox-label">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="auth-checkbox"
                            disabled={loading}
                          />
                          <span>Remember me</span>
                        </label>

                        <button
                          type="button"
                          className="auth-forgot-link"
                          onClick={() =>
                            setError("For password assistance, please contact the campus canteen desk or create a new student account.")
                          }
                          tabIndex="-1"
                        >
                          Forgot password?
                        </button>
                      </div>

                      {/* Primary Orange Login Button */}
                      <button
                        type="submit"
                        className={`btn-auth-submit-primary ${loading ? "is-loading" : ""}`}
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <span className="btn-spinner"></span>
                            <span>Logging in...</span>
                          </>
                        ) : (
                          <span>Log in</span>
                        )}
                      </button>

                      {/* STRICTLY NO "OR" DIVIDER, NO "SIGN IN WITH GOOGLE" */}

                      {/* Switch to Register */}
                      <div className="auth-bottom-switch">
                        <span>New to campus dining? </span>
                        <button
                          type="button"
                          className="auth-bottom-link"
                          onClick={() => {
                            setStudentAuthMode("signup");
                            setError("");
                            setSuccessMsg("");
                          }}
                          disabled={loading}
                        >
                          Create an account
                        </button>
                      </div>
                    </form>
                  )}

                  {/* STUDENT SIGN UP FORM */}
                  {studentAuthMode === "signup" && (
                    <form onSubmit={handleStudentSignup} className="auth-clean-form">
                      {/* Full Name */}
                      <div className="auth-input-field">
                        <span className="auth-field-icon">
                          <UserIcon size={17} />
                        </span>
                        <input
                          type="text"
                          className="auth-text-input"
                          placeholder="Full Name (e.g. Ankit Sharma)"
                          value={signupName}
                          onChange={(e) => {
                            setError("");
                            setSignupName(e.target.value);
                          }}
                          disabled={loading}
                          required
                        />
                      </div>

                      {/* Phone & Student ID row */}
                      <div className="auth-input-row">
                        <div className="auth-input-field">
                          <span className="auth-field-icon">
                            <PhoneIcon size={17} />
                          </span>
                          <input
                            type="tel"
                            maxLength="10"
                            className="auth-text-input"
                            placeholder="Mobile (10 digits)"
                            value={signupPhone}
                            onChange={(e) => {
                              setError("");
                              setSignupPhone(e.target.value.replace(/\D/g, ""));
                            }}
                            disabled={loading}
                            required
                          />
                        </div>

                        <div className="auth-input-field">
                          <span className="auth-field-icon">
                            <IdCardIcon size={17} />
                          </span>
                          <input
                            type="text"
                            className="auth-text-input"
                            placeholder="Roll No (Optional)"
                            value={signupStudentId}
                            onChange={(e) => setSignupStudentId(e.target.value)}
                            disabled={loading}
                          />
                        </div>
                      </div>

                      {/* College Email */}
                      <div className="auth-input-field">
                        <span className="auth-field-icon">
                          <MailIcon size={17} />
                        </span>
                        <input
                          type="email"
                          className="auth-text-input"
                          placeholder="College Email (Optional)"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          disabled={loading}
                        />
                      </div>

                      {/* Password & Confirm */}
                      <div className="auth-input-row">
                        <div className="auth-input-field">
                          <span className="auth-field-icon">
                            <LockIcon size={17} />
                          </span>
                          <input
                            type={showSignupPassword ? "text" : "password"}
                            className="auth-text-input"
                            placeholder="Password (min 4)"
                            value={signupPassword}
                            onChange={(e) => {
                              setError("");
                              setSignupPassword(e.target.value);
                            }}
                            disabled={loading}
                            required
                          />
                        </div>

                        <div className="auth-input-field">
                          <span className="auth-field-icon">
                            <LockIcon size={17} />
                          </span>
                          <input
                            type={showSignupPassword ? "text" : "password"}
                            className="auth-text-input"
                            placeholder="Confirm Password"
                            value={signupConfirmPassword}
                            onChange={(e) => {
                              setError("");
                              setSignupConfirmPassword(e.target.value);
                            }}
                            disabled={loading}
                            required
                          />
                          <button
                            type="button"
                            className="auth-eye-btn"
                            onClick={() => setShowSignupPassword(!showSignupPassword)}
                            tabIndex="-1"
                          >
                            {showSignupPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Create Account Button */}
                      <button
                        type="submit"
                        className={`btn-auth-submit-primary ${loading ? "is-loading" : ""}`}
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <span className="btn-spinner"></span>
                            <span>Creating Account...</span>
                          </>
                        ) : (
                          <span>Create an account</span>
                        )}
                      </button>

                      {/* Switch back to Log In */}
                      <div className="auth-bottom-switch">
                        <span>Already registered? </span>
                        <button
                          type="button"
                          className="auth-bottom-link"
                          onClick={() => {
                            setStudentAuthMode("login");
                            setError("");
                            setSuccessMsg("");
                          }}
                          disabled={loading}
                        >
                          Log in
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* =====================================================================
              VIEW 2: CANTEEN VENDOR AUTHENTICATION
              ===================================================================== */}
          {selectedRole === "vendor" && (
            <form onSubmit={handleVendorSubmit} className="auth-clean-form">
              {/* Canteen Selector Dropdown */}
              <div className="auth-input-field">
                <span className="auth-field-icon">
                  <StoreIcon size={17} />
                </span>
                <select
                  className="auth-text-input auth-select-input"
                  value={selectedCanteenId}
                  onChange={(e) => setSelectedCanteenId(e.target.value)}
                  disabled={loading}
                >
                  {CAMPUS_CANTEENS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.counter})
                    </option>
                  ))}
                </select>
              </div>

              {/* Staff PIN */}
              <div className="auth-input-field">
                <span className="auth-field-icon">
                  <LockIcon size={17} />
                </span>
                <input
                  type={showVendorPin ? "text" : "password"}
                  className="auth-text-input"
                  placeholder="Staff Counter PIN (e.g. 1234)"
                  value={vendorPin}
                  onChange={(e) => {
                    setError("");
                    setVendorPin(e.target.value);
                  }}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowVendorPin(!showVendorPin)}
                  title={showVendorPin ? "Hide PIN" : "Show PIN"}
                  tabIndex="-1"
                >
                  {showVendorPin ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                </button>
              </div>

              {/* Remember Session & Demo PIN Row */}
              <div className="auth-remember-row">
                <label className="auth-checkbox-label">
                  <input
                    type="checkbox"
                    checked={vendorRemember}
                    onChange={(e) => setVendorRemember(e.target.checked)}
                    className="auth-checkbox"
                    disabled={loading}
                  />
                  <span>Remember terminal</span>
                </label>

                <span className="auth-demo-pin-hint">
                  Demo PIN: <strong>1234</strong>
                </span>
              </div>

              {/* Primary Button */}
              <button
                type="submit"
                className={`btn-auth-submit-primary ${loading ? "is-loading" : ""}`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="btn-spinner"></span>
                    <span>Accessing Console...</span>
                  </>
                ) : (
                  <span>Log in to Canteen Terminal</span>
                )}
              </button>

              {/* Prompt to switch back to Student */}
              <div className="auth-bottom-switch">
                <span>Ordering meals as a student? </span>
                <button
                  type="button"
                  className="auth-bottom-link"
                  onClick={() => {
                    setSelectedRole("student");
                    setError("");
                    setSuccessMsg("");
                  }}
                >
                  Student Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Subtle quick access to Live Queue board */}
      <div className="auth-footer-quick-access">
        <button
          type="button"
          className="auth-quick-queue-btn"
          onClick={() => {
            if (onSelectRole) onSelectRole("queue");
            else if (setActiveTab) setActiveTab("queue");
          }}
        >
          <QueueIcon size={14} />
          <span>Check Live Campus Queue Board</span>
        </button>
      </div>
    </div>
  );
}
