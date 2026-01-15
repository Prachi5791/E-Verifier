import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { QRCodeCanvas } from "qrcode.react";

const MyUploads = () => {
  const [uploads, setUploads] = useState([]);
  const [message, setMessage] = useState("");
  const qrRefs = useRef({});

  useEffect(() => {
    const fetchUploads = async () => {
      try {
        const res = await axios.get("http://localhost:5000/doc/my-uploads", {
          withCredentials: true,
        });
        setUploads(res.data.uploads);
      } catch (err) {
        console.error(err);
        setMessage("Failed to fetch uploads: " + err.message);
      }
    };
    fetchUploads();
  }, []);

  const downloadQR = (upload) => {
    const ref = qrRefs.current[upload.rootHash];
    if (!ref) return;
    const canvas = ref.querySelector("canvas");
    if (!canvas) return;
    const pngUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = pngUrl;
    a.download = `${upload.title}-metadata-qr.png`;
    a.click();
  };

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "auto" }}>
      <h3>My Uploaded Documents</h3>
      {message && <p>{message}</p>}

      {uploads.length === 0 ? (
        <p>No uploads found.</p>
      ) : (
        uploads.map((upload) => (
          <div
            key={upload.rootHash}
            style={{
              border: "1px solid #ccc",
              borderRadius: "8px",
              padding: "15px",
              marginBottom: "20px",
            }}
          >
            <p>
              <b>Title:</b> {upload.title}
            </p>
            <p>
              <b>Domain:</b> {upload.domain}
            </p>
            <p>
              <b>Description:</b> {upload.description}
            </p>
            <p>
              <b>Status:</b>{" "}
              {upload.status ? upload.status : "Pending verification"}
            </p>
            <p>
              <b>Root Hash:</b> {upload.rootHash}
            </p>
            <p>
              <b>Tx Hash:</b> {upload.txHash || "Not available yet"}
            </p>

            <div
              ref={(el) => (qrRefs.current[upload.rootHash] = el)}
              style={{ margin: "15px 0" }}
            >
              <QRCodeCanvas
                value={JSON.stringify(upload)}
                size={160}
                includeMargin={true}
              />
            </div>
            <button onClick={() => downloadQR(upload)}>Download QR</button>

            <div style={{ marginTop: "10px" }}>
              <a
                href={`https://gateway.pinata.cloud/ipfs/${upload.fileCid}`}
                download={upload.title}
                target="_blank"
                rel="noopener noreferrer"
              >
                Download Encrypted File
              </a>
              <br />
              <a
                href={`https://gateway.pinata.cloud/ipfs/${upload.metaCid}`}
                download={`${upload.title}-metadata.json`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Download Metadata JSON
              </a>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default MyUploads;
