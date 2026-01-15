import { BrowserRouter, Routes, Route } from "react-router-dom";
import PrivateRoute from "./utils/PrivateRoute";
import Login from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import VerifierDashboard from "./pages/VerifierDashboard";
import UploaderDashboard from "./pages/UploaderDashboard";
import UploadDoc from "./components/UploadDocument";
import ScanDoc from "./components/ScanDocument";
import RequestVerifier from "./components/VerifierRequest";
import VerifierPanel from "./components/VerifyDocument";
import AdminPanel from "./components/AdminPanel";
import MyUploads from "./components/MyUploads";
import AdminRevokeDoc from "./components/AdminRevokeDoc";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Uploader */}
        <Route element={<PrivateRoute allowedRoles={["uploader"]} />}>
          <Route path="/uploader" element={<UploaderDashboard />}>
            <Route index element={<UploadDoc />} />
            <Route path="verify" element={<ScanDoc />} />
            <Route path="myuploads" element={<MyUploads />} />
            <Route path="request-verifier" element={<RequestVerifier />} />
          </Route>
        </Route>

        {/* Verifier */}
        <Route element={<PrivateRoute allowedRoles={["verifier"]} />}>
          <Route path="/verifier" element={<VerifierDashboard />}>
            <Route index element={<VerifierPanel />} />
            <Route path="verify" element={<ScanDoc />} />
            <Route path="verify-panel" element={<VerifierPanel />} />
          </Route>
        </Route>

        {/* Admin */}
        <Route element={<PrivateRoute allowedRoles={["admin"]} />}>
          <Route path="/admin" element={<AdminDashboard />}>
            <Route index element={<AdminPanel />} />
            <Route path="revokeDoc" element={<AdminRevokeDoc />} />
            <Route path="reports" element={<div>Reports Page</div>} />
          </Route>
        </Route>

        {/* Default */}
        <Route path="*" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
