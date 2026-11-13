import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AppShell from "./components/AppShell";
import AdminShell from "./components/AdminShell";
import PublicLayout from "./components/PublicLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import LandingPage from "./pages/landing/LandingPage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import AccessDeniedPage from "./pages/auth/AccessDeniedPage";
import AdminLoginPage from "./pages/auth/AdminLoginPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import { TicketsPage, NewTicketPage, TicketDetailPage } from "./pages/tickets/TicketsPages";
import AssistantPage from "./pages/assistant/AssistantPage";
import NotificationsPage from "./pages/notifications/NotificationsPage";
import ProfilePage from "./pages/profile/ProfilePage";
import ServicesPage from "./pages/services/ServicesPage";
import KnowledgePage from "./pages/knowledge/KnowledgePage";
import AcademicsPage from "./pages/academics/AcademicsPage";
import LabPage from "./pages/lab/LabPage";
import IncidentDemoPage from "./pages/admin/IncidentDemoPage";
import {
  AdminOverviewPage,
  AdminIncidentsPage,
  AdminTicketsPage,
  AdminUsersPage,
  AdminNetworkPage,
  AdminNetworkLabPage,
  AdminAcademicsPage,
  AdminEmergencyPage,
} from "./pages/admin/AdminPages";

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: "/", element: <LandingPage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "/admin/login", element: <AdminLoginPage /> },
      { path: "/access-denied", element: <AccessDeniedPage /> },
      { path: "/lab", element: <LabPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/tickets", element: <TicketsPage /> },
          { path: "/tickets/new", element: <NewTicketPage /> },
          { path: "/tickets/:id", element: <TicketDetailPage /> },
          { path: "/assistant", element: <AssistantPage /> },
          { path: "/notifications", element: <NotificationsPage /> },
          { path: "/profile", element: <ProfilePage /> },
          { path: "/services", element: <ServicesPage /> },
          { path: "/knowledge", element: <KnowledgePage /> },
          { path: "/academics", element: <AcademicsPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute requireAdmin />,
    children: [
      {
        element: <AdminShell />,
        children: [
          { path: "/admin", element: <AdminOverviewPage /> },
          { path: "/admin/tickets", element: <AdminTicketsPage /> },
          { path: "/admin/users", element: <AdminUsersPage /> },
          { path: "/admin/incidents", element: <AdminIncidentsPage /> },
          { path: "/admin/network", element: <AdminNetworkPage /> },
          { path: "/admin/network-lab", element: <AdminNetworkLabPage /> },
          { path: "/admin/academics", element: <AdminAcademicsPage /> },
          { path: "/admin/emergency", element: <AdminEmergencyPage /> },
          { path: "/admin/incident-demo", element: <IncidentDemoPage /> },
          { path: "/admin/lab", element: <LabPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
], {
  basename: import.meta.env.BASE_URL,
});

export default function App() {
  return <AuthProvider><RouterProvider router={router} /></AuthProvider>;
}
