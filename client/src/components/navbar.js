import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./navbar.css";

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!user) return null;

  const role = (user.role || "").toLowerCase();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const isActiveLink = (path) => {
    return location.pathname === path;
  };

  const renderNavLinks = () => {
    switch (role) {
      case "uploader":
        return (
          <>
            <div className="navbar-nav-item">
              <Link
                to="/uploader"
                className={`navbar-link ${
                  isActiveLink("/uploader") ? "active" : ""
                }`}
              >
                Upload
              </Link>
            </div>
            <div className="navbar-divider"></div>
            <div className="navbar-nav-item">
              <Link
                to="/uploader/verify"
                className={`navbar-link ${
                  isActiveLink("/uploader/verify") ? "active" : ""
                }`}
              >
                Verify
              </Link>
            </div>
            <div className="navbar-divider"></div>
            <div className="navbar-nav-item">
              <Link
                to="/uploader/myuploads"
                className={`navbar-link ${
                  isActiveLink("/uploader/myuploads") ? "active" : ""
                }`}
              >
                My Uploads
              </Link>
            </div>
            <div className="navbar-divider"></div>
            <div className="navbar-nav-item">
              <Link
                to="/uploader/request-verifier"
                className={`navbar-link ${
                  isActiveLink("/uploader/request-verifier") ? "active" : ""
                }`}
              >
                Request Verifier
              </Link>
            </div>
          </>
        );

      case "verifier":
        return (
          <>
            <div className="navbar-nav-item">
              <Link
                to="/verifier"
                className={`navbar-link ${
                  isActiveLink("/verifier") ? "active" : ""
                }`}
              >
                Dashboard
              </Link>
            </div>
            <div className="navbar-divider"></div>
            <div className="navbar-nav-item">
              <Link
                to="/verifier/verify"
                className={`navbar-link ${
                  isActiveLink("/verifier/verify") ? "active" : ""
                }`}
              >
                Scan Doc
              </Link>
            </div>
            <div className="navbar-divider"></div>
            <div className="navbar-nav-item">
              <Link
                to="/verifier/verify-panel"
                className={`navbar-link ${
                  isActiveLink("/verifier/verify-panel") ? "active" : ""
                }`}
              >
                Verify Panel
              </Link>
            </div>
          </>
        );

      case "admin":
        return (
          <>
            <div className="navbar-nav-item">
              <Link
                to="/admin"
                className={`navbar-link ${
                  isActiveLink("/admin") ? "active" : ""
                }`}
              >
                Manage Verifiers
              </Link>
            </div>
            <div className="navbar-divider"></div>
            <div className="navbar-nav-item">
              <Link
                to="/admin/revokeDoc"
                className={`navbar-link ${
                  isActiveLink("/admin/revokeDoc") ? "active" : ""
                }`}
              >
                Revoke Docs
              </Link>
            </div>
            <div className="navbar-divider"></div>
            <div className="navbar-nav-item">
              <Link
                to="/admin/reports"
                className={`navbar-link ${
                  isActiveLink("/admin/reports") ? "active" : ""
                }`}
              >
                Reports
              </Link>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <nav className={`navbar ${isLoggingOut ? "loading" : ""}`} data-role={role}>
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          DocVerify
        </Link>

        <div className="navbar-nav">{renderNavLinks()}</div>

        <div className="navbar-actions">
          <div className="navbar-user">
            <span>Welcome, {user.name || user.email}</span>
            <span className="navbar-user-role">{role}</span>
          </div>
          <button
            className="navbar-logout"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <>
                <span className="spinner">⏳</span>
                Logging out...
              </>
            ) : (
              <>Logout</>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
