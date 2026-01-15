import React, { useEffect, useState, useRef } from "react";
import { ethers } from "ethers";
import DocumentVerificationABI from "../contracts/DocumentVerificationV2.json";
import {
  base64ToArrayBuffer,
  base64ToRaw,
  decryptBuffer,
} from "../utils/crypto";

import "./VerifyDocument.css";

const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;

const VerifierPanel = () => {
  const [pending, setPending] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const blobUrlRef = useRef(null);
  const pollIntervalRef = useRef(null);

  const load = async () => {
    try {
      const res = await fetch("http://localhost:5000/doc/pending-docs", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load pending docs");
      const data = await res.json();
      setPending(data.docs || []);
    } catch (err) {
      console.error(err);
      setMsg("Load failed: " + err.message);
    }
  };

  // Auto-refresh every 5 seconds for real-time updates
  useEffect(() => {
    load();

    pollIntervalRef.current = setInterval(() => {
      load();
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

  async function decryptAndPrepare(versionHash, metaCid, title) {
    setLoading(true);
    setMsg("Decrypting document...");

    try {
      // 1️⃣ Fetch metadata.json via backend proxy
      const metaRes = await fetch(`http://localhost:5000/doc/ipfs/${metaCid}`);
      if (!metaRes.ok) throw new Error("Failed to fetch metadata from IPFS");

      const metadata = await metaRes.json();
      const { fileCid, ivBase64, fileName, fileType } = metadata;

      // 2️⃣ Fetch encrypted file via backend proxy
      const encRes = await fetch(`http://localhost:5000/doc/ipfs/${fileCid}`);
      if (!encRes.ok)
        throw new Error("Failed to fetch encrypted file from IPFS");

      const cipherBuffer = await encRes.arrayBuffer();

      // 3️⃣ Get AES key from backend
      const keyRes = await fetch(
        `http://localhost:5000/doc/key/${versionHash}`,
        {
          credentials: "include",
        }
      );
      if (!keyRes.ok) throw new Error("Failed to fetch AES key");

      const { aesKeyBase64 } = await keyRes.json();

      // 4️⃣ Decrypt
      const rawKey = base64ToArrayBuffer(aesKeyBase64);
      const plain = await decryptBuffer(rawKey, cipherBuffer, ivBase64);

      // 5️⃣ Prepare blob URL
      const mimeType = fileType || "application/octet-stream";
      const blob = new Blob([plain], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);

      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = blobUrl;

      setSelected({
        versionHash,
        cid: metaCid,
        title: fileName || title || "download.bin",
        blobUrl,
        mimeType,
        plainBuffer: plain,
      });

      setShowPreview(true);
      setMsg("Document decrypted successfully");
    } catch (err) {
      console.error("Decryption failed:", err);
      setMsg("Failed to decrypt file: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  const approveSelected = async (versionHash) => {
    if (!versionHash) return setMsg("No document selected");
    setLoading(true);
    setMsg("Sending on-chain verification transaction...");

    try {
      if (!window.ethereum) throw new Error("Install MetaMask");

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        contractAddress,
        DocumentVerificationABI.abi,
        signer
      );

      const tx = await contract.setVerificationStatus(versionHash, true);
      await tx.wait();

      // Sync DB
      const syncRes = await fetch("http://localhost:5000/doc/sync-verified", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionHash: versionHash,
          status: true,
        }),
      });
      if (!syncRes.ok) throw new Error("DB sync failed");

      setMsg(`Approved successfully! Tx: ${tx.hash}`);
      setExpandedRow(null);
      setShowPreview(false);
      setSelected(null);
      await load();
    } catch (err) {
      console.error(err);
      setMsg("Approve failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const rejectSelected = async (versionHash) => {
    if (!versionHash) return setMsg("No document selected");
    setLoading(true);

    try {
      const syncRes = await fetch("http://localhost:5000/doc/sync-verified", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionHash: versionHash,
          status: false,
        }),
      });
      if (!syncRes.ok) throw new Error("DB sync failed");

      setMsg("Document rejected successfully");
      setExpandedRow(null);
      setShowPreview(false);
      setSelected(null);
      await load();
    } catch (err) {
      console.error(err);
      setMsg("Reject failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadSelected = () => {
    if (!selected) return setMsg("No file selected");
    const a = document.createElement("a");
    a.href = selected.blobUrl;
    a.download = selected.title || "decrypted-file";
    a.click();
  };

  const toggleExpand = (rowKey) => {
    setExpandedRow(expandedRow === rowKey ? null : rowKey);
    if (expandedRow !== rowKey) {
      setShowPreview(false);
      setSelected(null);
    }
  };

  const closePreview = () => {
    setShowPreview(false);
    setSelected(null);
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  };

  // Flatten documents for table display
  const flattenedDocs = [];
  pending.forEach((root) => {
    root.versions.forEach((version) => {
      flattenedDocs.push({
        rootHash: root.rootHash,
        title: root.title,
        domain: root.domain,
        versionHash: version.hash,
        cid: version.cid,
        createdAt: version.createdAt || new Date().toISOString(),
      });
    });
  });

  return (
    <div className="container mt-lg">
      <div className="card">
        <div className="card-header">
          <h2 className="mb-sm">Document Verification Panel</h2>
          <p className="text-sm text-secondary mb-md">
            Review and verify pending documents. Auto-refreshes every 5 seconds.
          </p>
        </div>

        <div className="card-body">
          {msg && (
            <div
              className={`alert mb-md ${
                msg.includes("success") || msg.includes("Approved")
                  ? "alert-success"
                  : msg.includes("failed") || msg.includes("Failed")
                  ? "alert-error"
                  : "alert-info"
              }`}
            >
              {msg}
            </div>
          )}

          {flattenedDocs.length === 0 ? (
            <div className="text-center p-lg">
              <p className="text-lg text-secondary">No pending documents</p>
              <p className="text-sm text-muted">
                New documents will appear here automatically
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Document Title</th>
                    <th>Domain</th>
                    <th>Version Hash</th>
                    <th>CID</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {flattenedDocs.map((doc, index) => {
                    const rowKey = `${doc.rootHash}-${doc.versionHash}`;
                    const isExpanded = expandedRow === rowKey;

                    return (
                      <React.Fragment key={rowKey}>
                        <tr>
                          <td>
                            <div className="font-semibold">{doc.title}</div>
                          </td>
                          <td>
                            <span className="badge">{doc.domain}</span>
                          </td>
                          <td>
                            <code className="text-sm">
                              {doc.versionHash.substring(0, 16)}...
                            </code>
                          </td>
                          <td>
                            <code className="text-sm">
                              {doc.cid.substring(0, 16)}...
                            </code>
                          </td>
                          <td>
                            <div className="flex gap-sm">
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => toggleExpand(rowKey)}
                                disabled={loading}
                              >
                                {isExpanded ? "Collapse" : "Expand"}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr>
                            <td colSpan="5" className="expanded-content">
                              <div
                                className="p-lg"
                                style={{
                                  backgroundColor: "var(--bg-secondary)",
                                }}
                              >
                                <div className="flex justify-between items-center mb-md">
                                  <h4>Document Details</h4>
                                  <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => toggleExpand(rowKey)}
                                  >
                                    ✕
                                  </button>
                                </div>

                                <div className="mb-md">
                                  <p>
                                    <strong>Full Version Hash:</strong>{" "}
                                    <code>{doc.versionHash}</code>
                                  </p>
                                  <p>
                                    <strong>Full CID:</strong>{" "}
                                    <code>{doc.cid}</code>
                                  </p>
                                  <p>
                                    <strong>Root Hash:</strong>{" "}
                                    <code>{doc.rootHash}</code>
                                  </p>
                                </div>

                                <div className="flex gap-sm mb-lg">
                                  <button
                                    className="btn btn-primary"
                                    onClick={() =>
                                      decryptAndPrepare(
                                        doc.versionHash,
                                        doc.cid,
                                        doc.title
                                      )
                                    }
                                    disabled={loading}
                                  >
                                    {loading
                                      ? "Decrypting..."
                                      : "Decrypt & Preview"}
                                  </button>

                                  <a
                                    href={`https://gateway.pinata.cloud/ipfs/${doc.cid}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary"
                                  >
                                    View Raw File
                                  </a>

                                  <button
                                    className="btn btn-success"
                                    onClick={() =>
                                      approveSelected(doc.versionHash)
                                    }
                                    disabled={loading}
                                  >
                                    Approve
                                  </button>

                                  <button
                                    className="btn btn-error"
                                    onClick={() =>
                                      rejectSelected(doc.versionHash)
                                    }
                                    disabled={loading}
                                  >
                                    Reject
                                  </button>
                                </div>

                                {/* Preview Section */}
                                {showPreview &&
                                  selected &&
                                  selected.versionHash === doc.versionHash && (
                                    <div className="preview-section">
                                      <div className="flex justify-between items-center mb-md">
                                        <h5>
                                          Document Preview: {selected.title}
                                        </h5>
                                        <div className="flex gap-sm">
                                          <button
                                            className="btn btn-sm btn-secondary"
                                            onClick={downloadSelected}
                                          >
                                            Download
                                          </button>
                                          <button
                                            className="btn btn-sm btn-secondary"
                                            onClick={() =>
                                              window.open(
                                                selected.blobUrl,
                                                "_blank"
                                              )
                                            }
                                          >
                                            Open in New Tab
                                          </button>
                                          <button
                                            className="btn btn-sm btn-secondary"
                                            onClick={closePreview}
                                          >
                                            Close Preview
                                          </button>
                                        </div>
                                      </div>

                                      <div className="preview-container">
                                        {selected.mimeType ===
                                        "application/pdf" ? (
                                          <iframe
                                            src={selected.blobUrl}
                                            title="PDF Preview"
                                            style={{
                                              width: "100%",
                                              height: "600px",
                                              border:
                                                "1px solid var(--border-medium)",
                                              borderRadius: "var(--radius-md)",
                                            }}
                                          />
                                        ) : selected.mimeType.startsWith(
                                            "image/"
                                          ) ? (
                                          <img
                                            src={selected.blobUrl}
                                            alt={selected.title}
                                            style={{
                                              maxWidth: "100%",
                                              height: "auto",
                                              border:
                                                "1px solid var(--border-medium)",
                                              borderRadius: "var(--radius-md)",
                                            }}
                                          />
                                        ) : selected.mimeType ===
                                          "text/plain" ? (
                                          <iframe
                                            src={selected.blobUrl}
                                            title="Text Preview"
                                            style={{
                                              width: "100%",
                                              height: "400px",
                                              border:
                                                "1px solid var(--border-medium)",
                                              borderRadius: "var(--radius-md)",
                                            }}
                                          />
                                        ) : (
                                          <div
                                            className="text-center p-lg"
                                            style={{
                                              backgroundColor:
                                                "var(--bg-tertiary)",
                                              borderRadius: "var(--radius-md)",
                                            }}
                                          >
                                            <p>
                                              Preview not available for this
                                              file type ({selected.mimeType})
                                            </p>
                                            <p className="text-sm text-muted">
                                              Use Download or Open in New Tab to
                                              view the file
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifierPanel;
