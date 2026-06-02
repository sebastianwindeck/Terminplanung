import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoginPage from "@/pages/LoginPage";
import SetupPage from "@/pages/SetupPage";
import Dashboard from "@/pages/Dashboard";
import ProjectDetail from "@/pages/ProjectDetail";
import ScheduleView from "@/pages/ScheduleView";
import CompanySettingsPage from "@/pages/CompanySettingsPage";
import DisruptionListPage from "@/pages/stoerungen/DisruptionListPage";
import DisruptionDetailPage from "@/pages/stoerungen/DisruptionDetailPage";
import DisruptionEditorPage from "@/pages/stoerungen/DisruptionEditorPage";
import UserManagementPage from "@/pages/admin/UserManagementPage";
import CompanyManagementPage from "@/pages/admin/CompanyManagementPage";
import DailyReportListPage from "@/pages/bautagesberichte/DailyReportListPage";
import DailyReportEditorPage from "@/pages/bautagesberichte/DailyReportEditorPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/setup" element={<SetupPage />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects/:projectId" element={<ProjectDetail />} />
        <Route path="/projects/:projectId/versions/:versionId" element={<ScheduleView />} />
        <Route path="/settings" element={<CompanySettingsPage />} />
        <Route path="/stoerungen" element={<DisruptionListPage />} />
        <Route path="/stoerungen/neu" element={<DisruptionEditorPage />} />
        <Route path="/stoerungen/:id" element={<DisruptionDetailPage />} />
        <Route path="/stoerungen/:id/bearbeiten" element={<DisruptionEditorPage />} />
        <Route path="/projects/:projectId/bautagesberichte" element={<DailyReportListPage />} />
        <Route path="/projects/:projectId/bautagesberichte/:berichtId" element={<DailyReportEditorPage />} />

        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requiredRole={["main_admin", "company_admin"]}>
              <UserManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/companies"
          element={
            <ProtectedRoute requiredRole="main_admin">
              <CompanyManagementPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
