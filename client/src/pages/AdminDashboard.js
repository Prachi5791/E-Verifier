import React from "react";
import Navbar from "../components/navbar";
import { Outlet } from "react-router-dom";
import "./Dashboard.css";

function AdminDashboard() {
  return (
    <div className="dashboard-layout">
      <Navbar />
      <div className="dashboard-content">
        <Outlet />
      </div>
    </div>
  );
}

export default AdminDashboard;
