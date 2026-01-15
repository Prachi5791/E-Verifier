import React, { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import DocumentVerificationABI from "../contracts/DocumentVerificationV2.json";
import "./AdminPanel.css";

const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;

const AdminPanel = () => {
  const [admins, setAdmins] = useState([]);
  const [verifiers, setVerifiers] = useState([]);

  const [pending, setPending] = useState([]);
  const [newVerifier, setNewVerifier] = useState("");
  const [newAdmin, setNewAdmin] = useState("");
  const [roots, setRoots] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const blobUrlRef = useRef(null);
  const pollIntervalRef = useRef(null);

  //admin added verifier , admins
  const [newVerifierName, setNewVerifierName] = useState("");
  const [newVerifierEmail, setNewVerifierEmail] = useState("");
  const [newVerifierOrg, setNewVerifierOrg] = useState("");
  const [newVerifierDomain, setNewVerifierDomain] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminOrg, setNewAdminOrg] = useState("");
  const [newAdminDomain, setNewAdminDomain] = useState("");

  const ADMIN_ROLE = ethers.id("ADMIN_ROLE");
  const VERIFIER_ROLE = ethers.id("VERIFIER_ROLE");

  const token = localStorage.getItem("token");

  let contract, signer;

  // Auto-refresh every 5 seconds for real-time updates
  useEffect(() => {
    loadPending();

    pollIntervalRef.current = setInterval(() => {
      loadPending();
    }, 5000);

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

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

  // Fetch admins & verifiers from blockchain
  const fetchRoles = async () => {
    try {
      setLoading(true);
      const c = await loadContract();
      const adminsRes = await c.getRoleMembers(ADMIN_ROLE);
      const verifiersRes = await c.getRoleMembers(VERIFIER_ROLE);
      setAdmins(adminsRes);
      setVerifiers(verifiersRes);
    } catch (err) {
      console.error(err);
      setMessage("Error fetching roles: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch pending verifiers from backend
  const loadPending = async () => {
    try {
      const res = await fetch("http://localhost:5000/doc/pending-verifiers", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      const data = await res.json();

      if (res.ok) setPending(data.requests || []);
    } catch (err) {
      console.error(err);
      setMessage("Error fetching pending requests: " + err.message);
    }
  };

  // Approve verifier via backend
  const approve = async (walletAddress) => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:5000/doc/approve-verifier", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ walletAddress }),
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ Approved ${walletAddress} successfully!`);
        loadPending();
        fetchRoles();
      } else {
        setMessage(`❌ ${data.error || "Approve failed"}`);
      }
    } catch (err) {
      console.error(err);
      setMessage(`❌ Error approving verifier: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Reject verifier via backend
  const reject = async (walletAddress) => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:5000/doc/reject-verifier", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ walletAddress }),
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`❌ Rejected ${walletAddress}`);
        loadPending();
      } else {
        setMessage(`❌ ${data.error || "Reject failed"}`);
      }
    } catch (err) {
      console.error(err);
      setMessage(`❌ Error rejecting verifier: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Add verifier on-chain
  // const addVerifier = async () => {
  //   if (!newVerifier.trim()) {
  //     setMessage("❌ Please enter a valid wallet address");
  //     return;
  //   }
  //   try {
  //     setLoading(true);
  //     const c = await loadContract();
  //     const tx = await c.grantRole(VERIFIER_ROLE, newVerifier);
  //     await tx.wait();
  //     setMessage("✅ Verifier added on-chain: " + newVerifier);
  //     setNewVerifier("");
  //     fetchRoles();
  //   } catch (err) {
  //     console.error(err);
  //     setMessage("❌ Error adding verifier: " + err.message);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const addVerifier = async (verifierData) => {
    if (!verifierData.walletAddress.trim()) {
      setMessage("❌ Please enter a valid wallet address");
      return;
    }
    try {
      setLoading(true);
      const c = await loadContract();

      // Call smart contract to grant role
      const tx = await c.grantRole(VERIFIER_ROLE, verifierData.walletAddress);
      await tx.wait();

      setMessage("✅ Verifier added on-chain: " + verifierData.walletAddress);

      // Sync verifier data to backend using fetch
      const response = await fetch(
        "http://localhost:5000/doc/admin/addVerifier",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(verifierData),
          credentials: "include", // if cookies/auth needed
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add verifier in backend");
      }

      const data = await response.json();
      // console.log("Verifier added in DB:", data);

      // Reset relevant input states
      setNewVerifier("");
      setNewVerifierName("");
      setNewVerifierEmail("");
      fetchRoles();
    } catch (err) {
      console.error("Error adding verifier:", err);
      setMessage("❌ Error adding verifier: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add admin on-chain
  const addAdmin = async () => {
    if (!newAdmin.trim()) {
      setMessage("❌ Please enter a valid wallet address");
      return;
    }
    try {
      setLoading(true);
      const c = await loadContract();
      const tx = await c.grantRole(ADMIN_ROLE, newAdmin);
      await tx.wait();
      setMessage("✅ Admin added on-chain: " + newAdmin);
      setNewAdmin("");
      fetchRoles();
    } catch (err) {
      console.error(err);
      setMessage("❌ Error adding admin: " + err.message);
    } finally {
      setLoading(false);
    }
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

  useEffect(() => {
    fetchRoles();
    loadPending();
    fetchRoots();
  }, []);

  return (
    <div className={`admin-panel ${loading ? "loading" : ""}`}>
      <h1 className="admin-panel-title">Admin Control Panel</h1>

      {/* Section 2: Direct Role Assignment */}
      <div className="admin-section">
        <div className="admin-section-header">
          <h2 className="admin-section-title">Direct Role Assignment</h2>
        </div>
        <div className="admin-section-content">
          {/* <div className="form-group">
            <input
              type="text"
              placeholder="Enter admin wallet address (0x...)"
              value={newAdmin}
              onChange={(e) => setNewAdmin(e.target.value)}
              disabled={loading}
            />
            <button
              className="btn btn-primary"
              onClick={addAdmin}
              disabled={loading || !newAdmin.trim()}
            >
              Add Admin
            </button>
          </div>

          <div className="form-group">
            <input
              type="text"
              placeholder="Enter verifier wallet address (0x...)"
              value={newVerifier}
              onChange={(e) => setNewVerifier(e.target.value)}
              disabled={loading}
            />
            <button
              className="btn btn-success"
              onClick={addVerifier}
              disabled={loading || !newVerifier.trim()}
            >
              Add Verifier
            </button>
          </div> */}

          <div className="form-group">
            <input
              type="text"
              placeholder="Enter Admin wallet address (0x...)"
              value={newAdmin}
              onChange={(e) => setNewAdmin(e.target.value)}
              disabled={loading}
            />
            <input
              type="text"
              placeholder="Enter Admin name"
              value={newAdminName}
              onChange={(e) => setNewAdminName(e.target.value)}
              disabled={loading}
            />
            <input
              type="email"
              placeholder="Enter Admin email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              disabled={loading}
            />
            <input
              type="Org"
              placeholder="Enter Admin Org"
              value={newAdminOrg}
              onChange={(e) => setNewAdminOrg(e.target.value)}
              disabled={loading}
            />
            <input
              type="Domain"
              placeholder="Enter Admin Domain"
              value={newAdminDomain}
              onChange={(e) => setNewAdminDomain(e.target.value)}
              disabled={loading}
            />
            {/* Add other fields similarly like organization, domain, note */}

            <button
              className="btn btn-primary"
              onClick={() =>
                addAdmin({
                  walletAddress: newAdmin,
                  name: newAdminName,
                  email: newAdminEmail,
                  organization: newAdminOrg,
                  domain: newAdminDomain,
                })
              }
              disabled={loading || !newAdmin.trim()}
            >
              Add Admin
            </button>
          </div>

          <div className="form-group">
            <input
              type="text"
              placeholder="Enter Verifier wallet address (0x...)"
              value={newVerifier}
              onChange={(e) => setNewVerifier(e.target.value)}
              disabled={loading}
            />
            <input
              type="text"
              placeholder="Enter Verifier name"
              value={newVerifierName}
              onChange={(e) => setNewVerifierName(e.target.value)}
              disabled={loading}
            />
            <input
              type="email"
              placeholder="Enter Verifier email"
              value={newVerifierEmail}
              onChange={(e) => setNewVerifierEmail(e.target.value)}
              disabled={loading}
            />
            <input
              type="Org"
              placeholder="Enter Verifier Org"
              value={newVerifierOrg}
              onChange={(e) => setNewVerifierOrg(e.target.value)}
              disabled={loading}
            />

            <input
              type="Domain"
              placeholder="Enter Verifier Domain"
              value={newVerifierDomain}
              onChange={(e) => setNewVerifierDomain(e.target.value)}
              disabled={loading}
            />
            {/* Add other fields similarly */}

            <button
              className="btn btn-success"
              onClick={() =>
                addVerifier({
                  walletAddress: newVerifier,
                  name: newVerifierName,
                  email: newVerifierEmail,
                  organization: newVerifierOrg,
                  domain: newVerifierDomain,
                })
              }
              disabled={loading || !newVerifier.trim()}
            >
              Add Verifier
            </button>
          </div>
        </div>
      </div>

      {/* Section 1: Pending Verifier Requests */}
      <div className="admin-section">
        <div className="admin-section-header">
          <h2 className="admin-section-title">
            ⏳ Pending Verifier Requests
            {pending.length > 0 && (
              <span className="status-badge status-active">
                {pending.length} pending
              </span>
            )}
          </h2>
        </div>
        <div className="admin-section-content">
          {pending.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-text">No pending requests</div>
              <div className="empty-state-subtext">
                New verifier requests will appear here
              </div>
            </div>
          ) : (
            <div className="pending-requests-grid">
              {pending.map((r) => (
                <div key={r.walletAddress} className="pending-request-card">
                  <div className="request-info">
                    <div className="request-field">
                      <span className="request-field-label">Name</span>
                      <span className="request-field-value">{r.name}</span>
                    </div>
                    <div className="request-field">
                      <span className="request-field-label">Email</span>
                      <span className="request-field-value">{r.email}</span>
                    </div>
                    <div className="request-field">
                      <span className="request-field-label">Organization</span>
                      <span className="request-field-value">
                        {r.organization || "—"}
                      </span>
                    </div>
                    <div className="request-field">
                      <span className="request-field-label">Domain</span>
                      <span className="request-field-value">{r.domain}</span>
                    </div>
                    <div className="request-field">
                      <span className="request-field-label">
                        Wallet Address
                      </span>
                      <span className="request-field-value">
                        {r.walletAddress}
                      </span>
                    </div>
                    {r.note && (
                      <div className="request-note">
                        <div className="request-field-label">Note</div>
                        <div className="request-field-value">{r.note}</div>
                      </div>
                    )}
                  </div>
                  <div className="request-actions">
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => approve(r.walletAddress)}
                      disabled={loading}
                    >
                      Approve
                    </button>
                    <button
                      className="btn btn-error btn-sm"
                      onClick={() => reject(r.walletAddress)}
                      disabled={loading}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Current Roles */}
      {/* <div className="admin-section">
        <div className="admin-section-header">
          <h2 className="admin-section-title">👥 Current Role Assignments</h2>
        </div>
        <div className="admin-section-content">
          <div className="role-list">
            <h3 className="role-list-title">
              👑 Administrators ({admins.length})
            </h3>
            {admins.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-text">No administrators found</div>
              </div>
            ) : (
              <ul className="role-items">
                {admins.map((admin, idx) => (
                  <li key={idx} className="role-item admin-role-item">
                    {admin}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="role-list">
            <h3 className="role-list-title">
              ✅ Verifiers ({verifiers.length})
            </h3>
            {verifiers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-text">No verifiers found</div>
              </div>
            ) : (
              <ul className="role-items">
                {verifiers.map((verifier, idx) => (
                  <li key={idx} className="role-item verifier-role-item">
                    {verifier}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div> */}

      {/* Section 4: Document Roots */}

      {/* Message Display */}
      {message && <div className="admin-message">{message}</div>}
    </div>
  );
};

export default AdminPanel;
