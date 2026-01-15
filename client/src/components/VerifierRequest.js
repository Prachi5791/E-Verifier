import React, { useState } from "react";
import "./VerifierRequest.css";

const RequestVerifier = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    organization: "",
    note: "",
    domain: "",
  });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const domains = ["Finance", "Education", "Health", "Legal", "Tech"];

  // 🔹 Client-side validators
  const validateForm = () => {
    if (!form.name.trim()) return "Name is required.";
    if (!form.email.trim()) return "Email is required.";

    // Email regex (simple validation)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) return "Invalid email format.";

    if (!form.domain) return "Please select a domain.";
    if (form.note.trim().length < 10)
      return "Please provide at least 10 characters in the reason/note.";

    return null; // no errors
  };

  const request = async () => {
    const error = validateForm();
    if (error) {
      setMsg(error);
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      const res = await fetch("http://localhost:5000/doc/request-verifier", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Failed");
      } else {
        setMsg("✅ Request submitted successfully!");
        setForm({
          name: "",
          email: "",
          organization: "",
          note: "",
          domain: "",
        });
      }
    } catch (err) {
      setMsg("Request failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getMessageType = () => {
    if (msg.startsWith("✅")) return "success";
    if (
      msg.toLowerCase().includes("error") ||
      msg.toLowerCase().includes("failed")
    )
      return "error";
    return "info";
  };

  return (
    <div className="request-verifier">
      <div className="card">
        <div className="card-header">
          <h3>Request Verifier Access</h3>
        </div>

        <div className="card-body">
          <div className="form-group">
            <input
              type="text"
              placeholder="Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="form-input"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <input
              type="email"
              placeholder="Email *"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="form-input"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <input
              type="text"
              placeholder="Organization (optional)"
              value={form.organization}
              onChange={(e) =>
                setForm({ ...form, organization: e.target.value })
              }
              className="form-input"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <textarea
              placeholder="Reason / Note * (min 10 characters)"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="form-textarea"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <select
              value={form.domain}
              onChange={(e) => setForm({ ...form, domain: e.target.value })}
              className="form-select"
              disabled={loading}
              required
            >
              <option value="">Select Domain *</option>
              {domains.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={request}
            className={`submit-btn ${loading ? "loading" : ""}`}
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit Request"}
          </button>

          {msg && <div className={`message ${getMessageType()}`}>{msg}</div>}
        </div>
      </div>
    </div>
  );
};

export default RequestVerifier;
