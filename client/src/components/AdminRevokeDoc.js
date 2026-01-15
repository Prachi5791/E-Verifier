import { ethers } from "ethers";
import React, { useState } from "react";
import DocumentVerificationABI from "../contracts/DocumentVerificationV2.json";
import "./AdminPanel.css";

const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;

function AdminRevokeDoc() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [roots, setRoots] = useState([]);

  const ADMIN_ROLE = ethers.id("ADMIN_ROLE");
  const VERIFIER_ROLE = ethers.id("VERIFIER_ROLE");

  const token = localStorage.getItem("token");

  let contract, signer;

  const loadContract = async () => {
    if (!window.ethereum) throw new Error("MetaMask not found");
    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    contract = new ethers.Contract(
      contractAddress,
      DocumentVerificationABI.abi,
      signer
    );
    return contract;
  };

  // Fetch roots (demo placeholder)
  const fetchRoots = async () => {
    setRoots([
      {
        hash: "0x1234567890abcdef...",
        title: "Demo Document",
        domain: "finance",
        description: "Quarterly report",
        expiresAt: 0,
        revoked: false,
      },
    ]);
  };

  // Revoke root
  const revokeRoot = async (rootHash) => {
    try {
      const reason = prompt("Enter reason for revocation:");
      if (!reason) return;
      setLoading(true);
      const c = await loadContract();
      const tx = await c.revokeRoot(rootHash, reason);
      await tx.wait();
      setMessage("✅ Root revoked: " + rootHash);
      fetchRoots();
    } catch (err) {
      console.error(err);
      setMessage("❌ Error revoking root: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className={`admin-panel ${loading ? "loading" : ""}`}>
      <div className="admin-section">
        <div className="admin-section-header">
          <h2 className="admin-section-title">Document Roots</h2>
        </div>
        <div className="admin-section-content">
          {roots.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-text">No document roots found</div>
              <div className="empty-state-subtext">
                Uploaded documents will appear here
              </div>
            </div>
          ) : (
            <div className="roots-list">
              {roots.map((root, idx) => (
                <div key={idx} className="root-item">
                  <div className="root-header">
                    <h4 className="root-title">{root.title}</h4>
                    <div className="root-domain">{root.domain}</div>
                  </div>

                  <div className="root-details">
                    <div className="root-detail">
                      <span className="root-detail-label">Hash</span>
                      <span className="root-detail-value">{root.hash}</span>
                    </div>
                    <div className="root-detail">
                      <span className="root-detail-label">Description</span>
                      <span className="root-detail-value">
                        {root.description}
                      </span>
                    </div>
                    <div className="root-detail">
                      <span className="root-detail-label">Status</span>
                      <span
                        className={`status-badge ${
                          root.revoked ? "status-revoked" : "status-active"
                        }`}
                      >
                        {root.revoked ? "Revoked" : "Active"}
                      </span>
                    </div>
                  </div>

                  {!root.revoked && (
                    <div className="root-actions">
                      <button
                        className="btn btn-error btn-sm"
                        onClick={() => revokeRoot(root.hash)}
                        disabled={loading}
                      >
                        🗑️ Revoke
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminRevokeDoc;
