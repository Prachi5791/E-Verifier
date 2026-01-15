// import React, { useState } from "react";
// import { ethers } from "ethers";
// import { useAuth } from "../context/AuthContext";
// import { useNavigate } from "react-router-dom";

// const Login = () => {
//   const [loading, setLoading] = useState(false);
//   const { refresh } = useAuth();
//   const navigate = useNavigate();

//   const loginWithMetaMask = async () => {
//     try {
//       setLoading(true);

//       if (!window.ethereum) return alert("Install MetaMask");

//       await window.ethereum.request({ method: "eth_requestAccounts" });
//       const provider = new ethers.BrowserProvider(window.ethereum);
//       const signer = await provider.getSigner();
//       const walletAddress = await signer.getAddress();

//       // 1) Request nonce
//       const nonceRes = await fetch("http://localhost:5000/auth/request-nonce", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ walletAddress }),
//       });
//       const { nonce } = await nonceRes.json();

//       // 2) Sign nonce
//       const message = `Login nonce: ${nonce}`;
//       const signature = await signer.signMessage(message);

//       // 3) Verify signature (sets cookie on backend)
//       const verifyRes = await fetch(
//         "http://localhost:5000/auth/verify-signature",
//         {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ walletAddress, signature }),
//           credentials: "include", // 👈 important for cookies
//         }
//       );

//       const data = await verifyRes.json();
//       if (!verifyRes.ok) throw new Error(data.error || "Login failed");

//       // 4) Refresh context (fetch user info)
//       await refresh();

//       // 5) Navigate based on role
//       const role = (data.role || "").toLowerCase();
//       if (role === "admin") navigate("/admin", { replace: true });
//       else if (role === "verifier") navigate("/verifier", { replace: true });
//       else navigate("/uploader", { replace: true });
//     } catch (err) {
//       alert(err.message || "Login error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div style={{ textAlign: "center", marginTop: 40 }}>
//       <h2>Login with MetaMask</h2>
//       <button onClick={loginWithMetaMask} disabled={loading}>
//         {loading ? "Connecting..." : "Connect MetaMask"}
//       </button>
//     </div>
//   );
// };

// export default Login;

import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [walletDetected, setWalletDetected] = useState(false);
  const [connectionStep, setConnectionStep] = useState(0);
  const { refresh } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if MetaMask is installed
    setWalletDetected(!!window.ethereum);
  }, []);

  const loginWithMetaMask = async () => {
    try {
      setLoading(true);
      setError("");
      setConnectionStep(1);

      if (!window.ethereum) {
        throw new Error(
          "MetaMask is not installed. Please install MetaMask to continue."
        );
      }

      setConnectionStep(2);
      await window.ethereum.request({ method: "eth_requestAccounts" });

      setConnectionStep(3);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const walletAddress = await signer.getAddress();

      setConnectionStep(4);
      // 1) Request nonce
      const nonceRes = await fetch("http://localhost:5000/auth/request-nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });

      if (!nonceRes.ok) {
        throw new Error("Failed to get authentication nonce");
      }

      const { nonce } = await nonceRes.json();

      setConnectionStep(5);
      // 2) Sign nonce
      const message = `Login nonce: ${nonce}`;
      const signature = await signer.signMessage(message);

      setConnectionStep(6);
      // 3) Verify signature (sets cookie on backend)
      const verifyRes = await fetch(
        "http://localhost:5000/auth/verify-signature",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress, signature }),
          credentials: "include", // 👈 important for cookies
        }
      );

      const data = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(data.error || "Authentication failed");

      setConnectionStep(7);
      // 4) Refresh context (fetch user info)
      await refresh();

      // 5) Navigate based on role
      setTimeout(() => {
        const role = (data.role || "").toLowerCase();
        if (role === "admin") navigate("/admin", { replace: true });
        else if (role === "verifier") navigate("/verifier", { replace: true });
        else navigate("/uploader", { replace: true });
      }, 1000);
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Login failed. Please try again.");
      setConnectionStep(0);
    } finally {
      setLoading(false);
    }
  };

  const connectionSteps = [
    "Click to connect",
    "Requesting wallet access",
    "Connecting to MetaMask",
    "Getting wallet address",
    "Requesting authentication",
    "Signing message",
    "Verifying signature",
    "Login successful!",
  ];

  return (
    <div className={`login-container ${loading ? "login-loading" : ""}`}>
      <div className="login-card">
        <div className="login-header">
          <h2 className="login-title">🔐 Secure Login</h2>
          <p className="login-subtitle">
            Connect your MetaMask wallet to access the document verification
            system
          </p>
        </div>

        <div className="login-content">
          <div className="metamask-icon">🦊</div>

          <button
            onClick={loginWithMetaMask}
            disabled={loading}
            className={`connect-button ${loading ? "loading" : ""}`}
          >
            {loading ? "Connecting..." : "Connect MetaMask Wallet"}
          </button>

          {error && <div className="login-error">⚠️ {error}</div>}

          {!walletDetected && (
            <div className="wallet-status not-detected">
              ⚠️ MetaMask not detected.
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="wallet-install-link"
              >
                Install MetaMask
              </a>
            </div>
          )}

          {walletDetected && !loading && (
            <div className="wallet-status detected">
              ✅ MetaMask detected and ready
            </div>
          )}
        </div>

        {loading && (
          <div className="connection-steps">
            <div className="connection-steps-title">Connection Progress</div>
            <div className="steps-list">
              {connectionSteps.map((step, index) => (
                <div
                  key={index}
                  className={`step-item ${
                    index < connectionStep
                      ? "completed"
                      : index === connectionStep
                      ? "active"
                      : ""
                  }`}
                >
                  <div className="step-number">{index + 1}</div>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* <div className="login-features">
          <h4 className="features-title">Why use MetaMask?</h4>
          <div className="features-list">
            <div className="feature-item">
              <div className="feature-icon">✓</div>
              <span>Secure cryptographic authentication</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">✓</div>
              <span>No passwords required</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">✓</div>
              <span>Blockchain-based verification</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">✓</div>
              <span>Complete control over your identity</span>
            </div>
          </div>
        </div>

        <div className="security-notice">
          <div className="security-notice-title">🔒 Security Notice</div>
          <p className="security-notice-text">
            Your wallet signature is used only for authentication. We never
            store your private keys or have access to your funds. The signature
            proves you own the wallet address without compromising your
            security.
          </p>
        </div> */}
      </div>
    </div>
  );
};

export default Login;
