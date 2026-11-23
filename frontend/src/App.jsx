import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import AdminLayout from "./layouts/AdminLayout";
import AgentLayout from "./layouts/AgentLayout";
import CreateAgent from "./pages/admin/CreateAgent";
import AdminTracking from "./pages/admin/AdminTracking";
import AgentLeadView from "./pages/agent/AgentLeadView";
import AssignLeadSheet from "./pages/admin/AssignLeadSheet";
import AgentsList from "./pages/admin/AgentsList";
import AgentDetail from "./pages/admin/AgentDetail";
import LeadSheetView from "./pages/admin/LeadSheetView";
import AgentReports from "./pages/agent/AgentReports";
const ProtectedRoute = ({ children, role }) => {
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user) return <Navigate to="/login" />;

  if (role && user.role !== role) return <Navigate to="/login" />;

  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />

        <Route path="/login" element={<Login />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="create-agent" element={<CreateAgent />} />
          <Route path="assign-leads" element={<AssignLeadSheet />} />
          <Route path="tracking" element={<AdminTracking />} />
          <Route path="agents" element={<AgentsList />} />
          <Route path="agents/:id" element={<AgentDetail />} />
          <Route path="lead-sheets/:sheetId" element={<LeadSheetView />} />
        </Route>

        <Route
          path="/agent"
          element={
            <ProtectedRoute role="agent">
              <AgentLayout />
            </ProtectedRoute>
          }
        >
          <Route path="leads" element={<AgentLeadView />} />
          <Route path="reports" element={<AgentReports />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}