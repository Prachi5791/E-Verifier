import React, { useState, useRef } from "react";
import jsQR from "jsqr";
import DocumentVerificationABI from "../contracts/DocumentVerificationV2.json";
import { ethers } from "ethers";
import "./ScanDocument.css";

const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;

const VerifyDoc = () => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);

  const fileInputRef = useRef(null);

  const resetState = () => {
    setDetails(null);
    setError("");
    setUploadedImage(null);
  };

  const handleQRUpload = async (file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file");
      return;
    }

    setLoading(true);
    setError("");

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        // Display uploaded image
        setUploadedImage(event.target.result);

        const img = new Image();
        img.src = event.target.result;
        img.onload = async () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, img.width, img.height);
            const code = jsQR(imageData.data, img.width, img.height);

            if (code) {
              let qrData;
              try {
                qrData = JSON.parse(code.data);
              } catch (err) {
                setError(
                  "Invalid QR code format! Please ensure the QR code contains valid JSON data."
                );
                setLoading(false);
                return;
              }

              // Fetch details from blockchain
              await fetchDetails(qrData.metaCid);
            } else {
              setError(
                "Could not read QR code. Please ensure the image is clear and contains a valid QR code."
              );
              setLoading(false);
            }
          } catch (err) {
            console.error("QR processing error:", err);
            setError("Error processing QR code: " + err.message);
            setLoading(false);
          }
        };

        img.onerror = () => {
          setError("Failed to load image. Please try a different image.");
          setLoading(false);
        };
      } catch (err) {
        console.error("File reading error:", err);
        setError("Error reading file: " + err.message);
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setError("Failed to read the uploaded file.");
      setLoading(false);
    };

    reader.readAsDataURL(file);
  };

  const fetchDetails = async (metaCid) => {
    try {
      // Fetch metadata JSON from Pinata
      const res = await fetch(`https://gateway.pinata.cloud/ipfs/${metaCid}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch metadata: ${res.statusText}`);
      }

      const metadata = await res.json();
      const rootHash = metadata.rootHash;
      // console.log("Roothash", rootHash);

      // Connect to Ethereum provider for contract read
      if (!window.ethereum) {
        throw new Error("Please install MetaMask to verify documents");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        contractAddress,
        DocumentVerificationABI.abi,
        signer
      );

      const [
        uploader,
        revoked,
        createdAt,
        domain,
        title,
        description,
        expiresAt,
        versions,
      ] = await contract.getRoot(rootHash);

      const versionHash = versions[0]; // latest version
      const [hash, cid, verified, verifier, uploadedAt] =
        await contract.getVersion(versionHash);

      const currentTime = Date.now() / 1000;
      const isExpired =
        Number(expiresAt) > 0 && Number(expiresAt) < currentTime;

      setDetails({
        uploader,
        timestamp: new Date(Number(uploadedAt) * 1000).toLocaleString(),
        verified,
        rootHash,
        domain,
        title,
        description,
        expiresAt:
          Number(expiresAt) > 0
            ? new Date(Number(expiresAt) * 1000).toLocaleString()
            : "Never",
        verifier,
        revoked,
        isExpired,
        versionHash,
        metaCid,
      });

      setLoading(false);
    } catch (err) {
      console.error("Error fetching details:", err);
      setError("Error fetching document details: " + err.message);
      setDetails(null);
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      resetState();
      handleQRUpload(file);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      resetState();
      handleQRUpload(e.dataTransfer.files[0]);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const getVerificationStatus = () => {
    if (!details) return null;

    if (details.revoked) {
      return { status: "Revoked", className: "text-error", icon: "🚫" };
    }

    if (details.isExpired) {
      return { status: "Expired", className: "text-warning", icon: "⏰" };
    }

    if (details.verified) {
      return { status: "Verified", className: "text-success", icon: "✅" };
    }

    return { status: "Not Verified", className: "text-error", icon: "❌" };
  };

  const verificationStatus = getVerificationStatus();

  return (
    <div className="container mt-lg">
      <div className="card">
        <div className="card-header">
          <h2 className="mb-sm">Document Verification</h2>
          <p className="text-sm text-secondary mb-md">
            Upload a QR code image to verify document authenticity on the
            blockchain
          </p>
        </div>

        <div className="card-body">
          {/* Upload Area */}
          <div
            className={`upload-area ${dragActive ? "drag-active" : ""}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={openFileDialog}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="upload-content">
              {uploadedImage ? (
                <div className="uploaded-preview">
                  <img
                    src={uploadedImage}
                    alt="Uploaded QR Code"
                    className="qr-preview"
                  />
                  <p className="text-sm text-secondary mt-sm">
                    Click to upload a different image
                  </p>
                </div>
              ) : (
                <>
                  <div className="upload-icon">📷</div>
                  <h4>Upload QR Code Image</h4>
                  <p className="text-secondary">
                    Drag and drop an image here, or click to select
                  </p>
                  <p className="text-sm text-muted">
                    Supports: JPG, PNG, GIF, WebP
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Processing QR code and fetching blockchain data...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="alert alert-error">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Verification Results */}
          {details && !loading && (
            <div className="verification-results fade-in">
              <div className="result-header">
                <h3>Verification Results</h3>
                <div className={`status-badge ${verificationStatus.className}`}>
                  {verificationStatus.icon} {verificationStatus.status}
                </div>
              </div>

              <div className="result-grid">
                <div className="result-card">
                  <h4>Document Information</h4>
                  <div className="result-item">
                    <span className="label">Title:</span>
                    <span className="value">{details.title || "N/A"}</span>
                  </div>
                  <div className="result-item">
                    <span className="label">Domain:</span>
                    <span className="value badge">{details.domain}</span>
                  </div>
                  <div className="result-item">
                    <span className="label">Description:</span>
                    <span className="value">
                      {details.description || "No description provided"}
                    </span>
                  </div>
                </div>

                <div className="result-card">
                  <h4>Blockchain Details</h4>
                  <div className="result-item">
                    <span className="label">Uploader:</span>
                    <span className="value">
                      <code className="address-short">
                        {details.uploader.slice(0, 6)}...
                        {details.uploader.slice(-4)}
                      </code>
                    </span>
                  </div>
                  <div className="result-item">
                    <span className="label">Uploaded At:</span>
                    <span className="value">{details.timestamp}</span>
                  </div>
                  <div className="result-item">
                    <span className="label">Verifier:</span>
                    <span className="value">
                      {details.verifier &&
                      details.verifier !==
                        "0x0000000000000000000000000000000000000000" ? (
                        <code className="address-short">
                          {details.verifier.slice(0, 6)}...
                          {details.verifier.slice(-4)}
                        </code>
                      ) : (
                        <span className="text-muted">Not verified</span>
                      )}
                    </span>
                  </div>
                  <div className="result-item">
                    <span className="label">Expires At:</span>
                    <span className="value">{details.expiresAt}</span>
                  </div>
                </div>

                <div className="result-card full-width">
                  <h4>Technical Information</h4>
                  <div className="result-item">
                    <span className="label">Root Hash:</span>
                    <span className="value">
                      <code className="hash-display">{details.rootHash}</code>
                    </span>
                  </div>
                  <div className="result-item">
                    <span className="label">Version Hash:</span>
                    <span className="value">
                      <code className="hash-display">
                        {details.versionHash}
                      </code>
                    </span>
                  </div>
                  <div className="result-item">
                    <span className="label">Metadata CID:</span>
                    <span className="value">
                      <code className="hash-display">{details.metaCid}</code>
                    </span>
                  </div>
                </div>
              </div>

              <div className="action-buttons">
                {/* <button
                  className="btn btn-primary"
                  onClick={() =>
                    window.open(
                      `https://gateway.pinata.cloud/ipfs/${details.metaCid}`,
                      "_blank"
                    )
                  }
                >
                  View Metadata
                </button> */}
                <button className="btn btn-secondary" onClick={resetState}>
                  Verify Another Document
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyDoc;
