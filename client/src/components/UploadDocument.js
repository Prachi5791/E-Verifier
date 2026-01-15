// import React, { useState, useRef } from "react";
// import axios from "axios";
// import { ethers } from "ethers";
// import { QRCodeCanvas } from "qrcode.react";
// import { generateAesKey, rawToBase64, encryptBuffer } from "../utils/crypto";
// import contractArtifact from "../contracts/DocumentVerificationV2.json";
// import "./UploadDocument.css";

// const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

// const UploadForm = () => {
//   const [file, setFile] = useState(null);
//   const [domain, setDomain] = useState("");
//   const [title, setTitle] = useState("");
//   const [description, setDescription] = useState("");
//   const [message, setMessage] = useState("");
//   const [metadata, setMetadata] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const qrRef = useRef();

//   // Allowed domains list
//   const domainOptions = [
//     "Education",
//     "Healthcare",
//     "Finance",
//     "Government",
//     "Legal",
//   ];

//   const onSubmit = async (e) => {
//     e.preventDefault();
//     if (!file || !domain || !title) {
//       return setMessage("Please fill all required fields and select a file.");
//     }

//     setLoading(true);
//     setMessage("");

//     try {
//       const arrayBuffer = await file.arrayBuffer();
//       const uint8 = new Uint8Array(arrayBuffer);

//       // Compute keccak256 rootHash
//       const rootHash = ethers.keccak256(uint8);

//       // Pre-check for duplicate document
//       setMessage("Checking for duplicate document...");
//       const dupCheckRes = await axios.get(
//         `http://localhost:5000/doc/exists?rootHash=${rootHash}`
//       );
//       if (dupCheckRes.data.exists) {
//         setMessage("❌ This document has already been uploaded.");
//         setLoading(false);
//         return;
//       }

//       if (!window.ethereum) throw new Error("Metamask not detected");

//       setMessage("Connecting to wallet...");
//       const provider = new ethers.BrowserProvider(window.ethereum);
//       const signer = await provider.getSigner();
//       const uploaderAddress = await signer.getAddress();

//       const balanceWei = await provider.getBalance(uploaderAddress);
//       const balanceEth = Number(ethers.formatEther(balanceWei));
//       // console.log("Wallet balance (ETH):", balanceEth);

//       const minRequiredEth = 3;
//       if (balanceEth < minRequiredEth) {
//         setMessage(
//           `❌ Insufficient ETH balance. Minimum ${minRequiredEth} ETH is required.`
//         );
//         setLoading(false);
//         return;
//       }

//       // Generate AES key and encrypt file
//       const { key: rawKey, raw } = await generateAesKey();
//       const { cipher, iv } = await encryptBuffer(raw, arrayBuffer);
//       const aesKeyBase64 = rawToBase64(raw);

//       // --- Step 1: Upload encrypted file + metadata to backend ---
//       const form = new FormData();
//       form.append("encrypted", new Blob([cipher]));
//       form.append("rootHash", rootHash);
//       form.append("aesKeyBase64", aesKeyBase64);
//       form.append("ivBase64", iv);
//       form.append("domain", domain);
//       form.append("title", title);
//       form.append("description", description || "Uploaded via secure flow");
//       form.append("fileName", file.name);
//       form.append("fileType", file.type);
//       form.append("fileExtension", file.name.split(".").pop());

//       setMessage("Uploading to IPFS...");

//       const res = await axios.post(
//         "http://localhost:5000/doc/pin", // backend now only pins
//         form,
//         { withCredentials: true }
//       );

//       const { fileCid, metaCid } = res.data;

//       // --- Step 2: Call Smart Contract with Metamask ---
//       const contract = new ethers.Contract(
//         CONTRACT_ADDRESS,
//         contractArtifact.abi,
//         signer
//       );

//       setMessage("Submitting to blockchain...");
//       const tx = await contract.uploadDocumentRoot(
//         rootHash,
//         metaCid,
//         domain,
//         title,
//         description,
//         0 // expiresAt (set later when you add docType rules)
//       );

//       setMessage("Transaction sent, waiting for confirmation...");
//       const receipt = await tx.wait();

//       // --- Step 3: Notify backend for DB save ---
//       setMessage("Saving to database...");
//       await axios.post(
//         "http://localhost:5000/doc/save",
//         {
//           uploaderAddress,
//           rootHash,
//           domain,
//           title,
//           description,
//           fileCid,
//           metaCid,
//           aesKeyBase64,
//           ivBase64: iv,
//           fileName: file.name,
//           fileType: file.type,
//           fileExtension: file.name.split(".").pop(),
//           txHash: receipt.hash,
//         },
//         { withCredentials: true }
//       );

//       // --- Step 4: UI Update ---
//       const metaDataObj = {
//         rootHash,
//         title,
//         domain,
//         description,
//         fileCid,
//         metaCid,
//         txHash: receipt.hash,
//         fileName: file.name,
//         fileType: file.type,
//       };

//       setMessage("✅ Upload completed successfully!");
//       setMetadata(metaDataObj);

//       // Reset form
//       setFile(null);
//       setDomain("");
//       setTitle("");
//       setDescription("");
//     } catch (err) {
//       console.error(err);
//       setMessage("Upload failed: " + err.message);
//       setMetadata(null);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // try {
//   //   const arrayBuffer = await file.arrayBuffer();
//   //   const uint8 = new Uint8Array(arrayBuffer);

//   //   // Compute keccak256 rootHash
//   //   const rootHash = ethers.keccak256(uint8);

//   //   // Generate AES key and encrypt file
//   //   const { key: rawKey, raw } = await generateAesKey();
//   //   const { cipher, iv } = await encryptBuffer(raw, arrayBuffer);
//   //   const aesKeyBase64 = rawToBase64(raw);
//   //   setMessage("Checking for duplicate document...");

//   //   const dupCheckRes = await axios.get(
//   //     `http://localhost:5000/doc/exists?rootHash=${rootHash}`
//   //   );
//   //   if (dupCheckRes.data.exists) {
//   //     setMessage("❌ This document has already been uploaded.");
//   //     return; // Abort upload
//   //   }

//   //   // Proceed with blockchain transaction
//   //   setMessage("Connecting to wallet...");
//   //   const provider = new ethers.BrowserProvider(window.ethereum);
//   //   const signer = await provider.getSigner();
//   //   const uploaderAddress = await signer.getAddress();
//   //   const contract = new ethers.Contract(
//   //     CONTRACT_ADDRESS,
//   //     contractArtifact.abi,
//   //     signer
//   //   );

//   //   setMessage("Submitting to blockchain...");
//   //   const tx = await contract.uploadDocumentRoot(
//   //     rootHash,
//   //     metaCid,
//   //     domain,
//   //     title,
//   //     description,
//   //     0 // expiresAt
//   //   );
//   //   setMessage("Transaction sent, waiting for confirmation...");
//   //   const receipt = await tx.wait();

//   //   // Upload to IPFS
//   //   setMessage("Uploading encrypted file to IPFS...");
//   //   const form = new FormData();
//   //   form.append("encrypted", new Blob([cipher]));
//   //   form.append("rootHash", rootHash);
//   //   form.append("aesKeyBase64", aesKeyBase64);
//   //   form.append("ivBase64", iv);
//   //   form.append("domain", domain);
//   //   form.append("title", title);
//   //   form.append("description", description || "Uploaded via secure flow");
//   //   form.append("fileName", file.name);
//   //   form.append("fileType", file.type);
//   //   form.append("fileExtension", file.name.split(".").pop());

//   //   const pinRes = await axios.post("http://localhost:5000/doc/pin", form, {
//   //     withCredentials: true,
//   //   });
//   //   const { fileCid, metaCid } = pinRes.data;

//   //   // Save to backend
//   //   setMessage("Saving to database...");
//   //   await axios.post(
//   //     "http://localhost:5000/doc/save",
//   //     {
//   //       uploaderAddress,
//   //       rootHash,
//   //       domain,
//   //       title,
//   //       description,
//   //       fileCid,
//   //       metaCid,
//   //       aesKeyBase64,
//   //       ivBase64: iv,
//   //       fileName: file.name,
//   //       fileType: file.type,
//   //       fileExtension: file.name.split(".").pop(),
//   //       txHash: receipt.hash,
//   //     },
//   //     { withCredentials: true }
//   //   );

//   //   setMessage("✅ Upload completed successfully!");
//   //   setMetadata({
//   //     rootHash,
//   //     title,
//   //     domain,
//   //     description,
//   //     fileCid,
//   //     metaCid,
//   //     txHash: receipt.hash,
//   //     fileName: file.name,
//   //     fileType: file.type,
//   //   });

//   //   // Reset form fields
//   //   setFile(null);
//   //   setDomain("");
//   //   setTitle("");
//   //   setDescription("");
//   // } catch (err) {
//   //   setMessage("❌ Upload failed: " + err.message);
//   // } finally {
//   //   setLoading(false);
//   // }

//   const downloadQR = () => {
//     if (!qrRef.current) return;
//     const canvas = qrRef.current.querySelector("canvas");
//     if (!canvas) return;
//     const pngUrl = canvas.toDataURL("image/png");
//     const a = document.createElement("a");
//     a.href = pngUrl;
//     a.download = `${title || "document"}-metadata-qr.png`;
//     a.click();
//   };

//   const getMessageType = () => {
//     if (message.includes("✅") || message.includes("success")) return "success";
//     if (message.includes("failed") || message.includes("error")) return "error";
//     return "info";
//   };

//   const handleFileChange = (e) => {
//     const selectedFile = e.target.files[0];
//     setFile(selectedFile);
//   };

//   return (
//     <div className="upload-form">
//       <h3 className="page-title">Secure Document Upload</h3>

//       <div className="card">
//         <div className="card-header">
//           <h4>Document Details</h4>
//         </div>

//         <div className="card-body">
//           <form
//             onSubmit={onSubmit}
//             className={`upload-form-container ${loading ? "loading" : ""}`}
//           >
//             <div className="form-group">
//               <label className="form-label required">Select File</label>
//               <div className={`file-upload-area ${file ? "has-file" : ""}`}>
//                 <div className="file-upload-wrapper">
//                   <input
//                     type="file"
//                     onChange={handleFileChange}
//                     disabled={loading}
//                   />
//                   <div className="file-upload-text">
//                     {file
//                       ? `Selected: ${file.name}`
//                       : "Click to select a file or drag and drop"}
//                   </div>
//                 </div>
//               </div>
//               {file && (
//                 <div className="file-info">
//                   Size: {(file.size / 1024).toFixed(2)} KB | Type: {file.type}
//                 </div>
//               )}
//             </div>

//             <div className="form-group">
//               <label className="form-label required">Domain</label>
//               <select
//                 value={domain}
//                 onChange={(e) => setDomain(e.target.value)}
//                 className="form-select"
//                 required
//                 disabled={loading}
//               >
//                 <option value="">-- Select Domain --</option>
//                 {domainOptions.map((d) => (
//                   <option key={d} value={d}>
//                     {d}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             <div className="form-group">
//               <label className="form-label required">Title</label>
//               <input
//                 type="text"
//                 placeholder="Enter document title"
//                 value={title}
//                 onChange={(e) => setTitle(e.target.value)}
//                 className="form-input"
//                 required
//                 disabled={loading}
//               />
//             </div>

//             <div className="form-group">
//               <label className="form-label">Description</label>
//               <textarea
//                 placeholder="Enter description (optional)"
//                 value={description}
//                 onChange={(e) => setDescription(e.target.value)}
//                 className="form-textarea"
//                 disabled={loading}
//               />
//             </div>

//             <button type="submit" className="submit-btn" disabled={loading}>
//               {loading ? "Processing..." : "Upload Document"}
//             </button>
//           </form>

//           {message && (
//             <div className={`message ${getMessageType()}`}>{message}</div>
//           )}
//         </div>
//       </div>

//       {metadata && (
//         <div className="metadata-section">
//           <div className="metadata-card">
//             <div className="card-header">
//               <h4>
//                 <span className="success-indicator">Upload Complete</span>
//               </h4>
//             </div>

//             <div className="card-body">
//               <div className="metadata-grid">
//                 <div className="metadata-item">
//                   <span className="metadata-label">Title:</span>
//                   <span className="metadata-value">{metadata.title}</span>
//                 </div>

//                 <div className="metadata-item">
//                   <span className="metadata-label">Domain:</span>
//                   <span className="metadata-value">{metadata.domain}</span>
//                 </div>

//                 <div className="metadata-item">
//                   <span className="metadata-label">Description:</span>
//                   <span className="metadata-value">{metadata.description}</span>
//                 </div>

//                 <div className="metadata-item">
//                   <span className="metadata-label">File Name:</span>
//                   <span className="metadata-value">{metadata.fileName}</span>
//                 </div>

//                 <div className="metadata-item">
//                   <span className="metadata-label">File Type:</span>
//                   <span className="metadata-value">{metadata.fileType}</span>
//                 </div>

//                 <div className="metadata-item">
//                   <span className="metadata-label">Root Hash:</span>
//                   <span className="metadata-hash">{metadata.rootHash}</span>
//                 </div>

//                 <div className="metadata-item">
//                   <span className="metadata-label">Transaction Hash:</span>
//                   <a
//                     href={`https://etherscan.io/tx/${metadata.txHash}`}
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     className="tx-link"
//                   >
//                     {metadata.txHash}
//                   </a>
//                 </div>
//               </div>

//               <div className="qr-container">
//                 <h5 className="qr-title">Verification QR Code</h5>
//                 <div ref={qrRef} className="qr-section">
//                   <div className="qr-canvas">
//                     <QRCodeCanvas
//                       value={JSON.stringify(metadata)}
//                       size={300}
//                       marginSize={4}
//                       level="M"
//                     />
//                   </div>
//                   <button onClick={downloadQR} className="download-btn">
//                     📥 Download QR Code
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default UploadForm;

import React, { useState, useRef } from "react";
import axios from "axios";
import { ethers } from "ethers";
import { QRCodeCanvas } from "qrcode.react";
import { generateAesKey, rawToBase64, encryptBuffer } from "../utils/crypto";
import contractArtifact from "../contracts/DocumentVerificationV2.json";
import "./UploadDocument.css";

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;
const BACKEND = "http://localhost:5000";

const UploadForm = () => {
  const [file, setFile] = useState(null);
  const [domain, setDomain] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const qrRef = useRef(null);

  const domainOptions = [
    "Education",
    "Healthcare",
    "Finance",
    "Government",
    "Legal",
  ];

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!file || !domain || !title) {
      setMessage("Please fill all required fields and select a file.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // ---- Read file + hash
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      const rootHash = ethers.keccak256(uint8);

      // ---- Duplicate check
      setMessage("Checking for duplicate document...");
      const dup = await axios.get(`${BACKEND}/doc/exists?rootHash=${rootHash}`);
      if (dup.data.exists) {
        setMessage("❌ This document already exists.");
        setLoading(false);
        return;
      }

      if (!window.ethereum) throw new Error("MetaMask not detected");

      // ---- Wallet
      setMessage("Connecting wallet...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const uploaderAddress = await signer.getAddress();

      // ---- Encrypt file
      const { raw } = await generateAesKey();
      const { cipher, iv } = await encryptBuffer(raw, arrayBuffer);
      const aesKeyBase64 = rawToBase64(raw);

      // ---- Upload to backend / IPFS
      setMessage("Uploading encrypted file to IPFS...");
      const form = new FormData();
      form.append("encrypted", new Blob([cipher]));
      form.append("rootHash", rootHash);
      form.append("aesKeyBase64", aesKeyBase64);
      form.append("ivBase64", iv);
      form.append("domain", domain);
      form.append("title", title);
      form.append("description", description || "Uploaded securely");
      form.append("fileName", file.name);
      form.append("fileType", file.type);
      form.append("fileExtension", file.name.split(".").pop());

      const pinRes = await axios.post(`${BACKEND}/doc/pin`, form);
      const { fileCid, metaCid } = pinRes.data;

      // ---- Blockchain
      setMessage("Submitting to blockchain...");
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        contractArtifact.abi,
        signer
      );

      const tx = await contract.uploadDocumentRoot(
        rootHash,
        metaCid,
        domain,
        title,
        description,
        0
      );
      const receipt = await tx.wait();

      // ---- Save DB
      setMessage("Saving to database...");
      await axios.post(`${BACKEND}/doc/save`, {
        uploaderAddress,
        rootHash,
        domain,
        title,
        description,
        fileCid,
        metaCid,
        aesKeyBase64,
        ivBase64: iv,
        fileName: file.name,
        fileType: file.type,
        fileExtension: file.name.split(".").pop(),
        txHash: receipt.hash,
      });

      // ---- Metadata for UI
      setMetadata({
        rootHash,
        domain,
        title,
        description,
        metaCid,
        fileName: file.name,
        fileType: file.type,
        txHash: receipt.hash,
      });

      setMessage("✅ Upload completed successfully");
      setFile(null);
      setDomain("");
      setTitle("");
      setDescription("");
    } catch (err) {
      console.error(err);
      setMessage("❌ Upload failed: " + err.message);
      setMetadata(null);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- QR DOWNLOAD ----------------
  const downloadQR = () => {
    if (!qrRef.current) return;
    const canvas = qrRef.current.querySelector("canvas");
    if (!canvas) return;
    const pngUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = pngUrl;
    a.download = `${metadata.title}-verify-qr.png`;
    a.click();
  };

  // ---------------- UI ----------------
  return (
    <div className="upload-form">
      <h3 className="page-title">Secure Document Upload</h3>

      <form onSubmit={onSubmit} className="card">
        <label>File *</label>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />

        <label>Domain *</label>
        <select value={domain} onChange={(e) => setDomain(e.target.value)}>
          <option value="">Select domain</option>
          {domainOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <label>Title *</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />

        <label>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Processing..." : "Upload Document"}
        </button>

        {message && <p>{message}</p>}
      </form>

      {/* -------- QR SECTION -------- */}
      {metadata && (
        <div className="metadata-section">
          <h4>Verification QR</h4>

          {/*
            🔐 MACHINE-READABLE QR PAYLOAD
            This is what FIXES your scanner issue
          */}
          <div ref={qrRef}>
            <QRCodeCanvas
              size={300}
              level="M"
              value={JSON.stringify({
                schema: "doc-verify-v1",
                metaCid: metadata.metaCid,
                rootHash: metadata.rootHash,
              })}
            />
          </div>

          <button onClick={downloadQR}>📥 Download QR</button>
        </div>
      )}
    </div>
  );
};

export default UploadForm;
