import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import ProjectDetail from "@/pages/ProjectDetail";
import ScheduleView from "@/pages/ScheduleView";
import CompanySettingsPage from "@/pages/CompanySettingsPage";
import DisruptionListPage from "@/pages/stoerungen/DisruptionListPage";
import DisruptionDetailPage from "@/pages/stoerungen/DisruptionDetailPage";
import DisruptionEditorPage from "@/pages/stoerungen/DisruptionEditorPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects/:projectId" element={<ProjectDetail />} />
        <Route path="/projects/:projectId/versions/:versionId" element={<ScheduleView />} />
        <Route path="/settings" element={<CompanySettingsPage />} />
        <Route path="/stoerungen" element={<DisruptionListPage />} />
        <Route path="/stoerungen/neu" element={<DisruptionEditorPage />} />
        <Route path="/stoerungen/:id" element={<DisruptionDetailPage />} />
        <Route path="/stoerungen/:id/bearbeiten" element={<DisruptionEditorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
