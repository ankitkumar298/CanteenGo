export default function Footer() {
  return (
    <footer className="app-main-footer">
      <div className="app-footer-inner">
        {/* Top Section - Centered */}
        <div className="app-footer-top footer-centered">
          {/* 1. Logo & Brand */}
          <div className="app-footer-col app-footer-brand-col">
            <img
              src="/images/canteengo-logo.png"
              alt="canteenGo"
              className="app-footer-logo-img"
            />
            <div className="app-footer-brand-text">
              <span className="app-footer-brand-title">
                canteen<span className="brand-accent">Go</span>
              </span>
              <span className="app-footer-brand-sub">CAMPUS CANTEEN</span>
            </div>
          </div>

          <div className="app-footer-v-divider" />

          {/* 2. Contact & GitHub */}
          <div className="app-footer-col app-footer-contact-col">
            <a
              href="mailto:contact@canteengo.in"
              className="app-footer-contact-row"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0f172a"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <span>contact@canteengo.in</span>
            </a>

            <a
              href="https://github.com/ankitkumar298/CanteenGo"
              target="_blank"
              rel="noopener noreferrer"
              className="app-footer-contact-row"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="#0f172a"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>canteengo</span>
            </a>
          </div>

          <div className="app-footer-v-divider" />

          {/* 3. Navigation Links */}
          <div className="app-footer-col app-footer-links-col">
            <a
              href="https://github.com/ankitkumar298/CanteenGo"
              target="_blank"
              rel="noopener noreferrer"
              className="app-footer-nav-link"
            >
              About
            </a>
            <a
              href="mailto:contact@canteengo.in"
              className="app-footer-nav-link"
            >
              Support
            </a>
            <span className="app-footer-nav-link app-footer-nav-span">
              Privacy Policy
            </span>
            <span className="app-footer-nav-link app-footer-nav-span">
              Terms of Use
            </span>
          </div>
        </div>

        {/* Bottom Section - Centered */}
        <div className="app-footer-bottom footer-centered">
          <span className="app-footer-copyright">
            © 2026 canteenGo. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
