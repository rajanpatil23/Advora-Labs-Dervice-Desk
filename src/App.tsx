import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { ComingSoon } from "@/components/common/ComingSoon";
import PortalHome from "./pages/portal/PortalHome";
import PortalNewRequest from "./pages/portal/PortalNewRequest";
import PortalRequests from "./pages/portal/PortalRequests";
import PortalRequestDetail from "./pages/portal/PortalRequestDetail";
import PortalCatalog from "./pages/portal/PortalCatalog";
import PortalKnowledge, { PortalKnowledgeArticle } from "./pages/portal/PortalKnowledge";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Onboarding from "./pages/Onboarding";
import AcceptInvite from "./pages/AcceptInvite";
import AppHome from "./pages/AppHome";
import Dashboard from "./pages/Dashboard";
import MyQueue from "./pages/MyQueue";
import TeamDashboard from "./pages/TeamDashboard";
import Tickets from "./pages/Tickets";
import Incidents from "./pages/Incidents";
import Requests from "./pages/Requests";
import Users from "./pages/Users";
import Agents from "./pages/Agents";
import SLA from "./pages/SLA";
import KnowledgeBase from "./pages/KnowledgeBase";
import Reports from "./pages/Reports";
import Logs from "./pages/Logs";
import Settings from "./pages/Settings";
import Platform from "./pages/Platform";
import Approvals from "./pages/Approvals";
import Billing from "./pages/Billing";
import Security from "./pages/Security";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Navigate to="/app" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/invite" element={<AcceptInvite />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/platform" element={<Platform />} />
              <Route path="/app" element={<AppLayout />}>
                <Route index element={<AppHome />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="my-queue" element={<MyQueue />} />
                <Route path="team" element={<TeamDashboard />} />
                <Route path="tickets" element={<Tickets />} />
                <Route path="incidents" element={<Incidents />} />
                <Route path="requests" element={<Requests />} />
                <Route path="approvals" element={<Approvals />} />
                <Route path="users" element={<Users />} />
                <Route path="agents" element={<Agents />} />
                <Route path="sla" element={<SLA />} />
                <Route path="kb" element={<KnowledgeBase />} />
                <Route path="reports" element={<Reports />} />
                <Route path="logs" element={<Logs />} />
                <Route path="settings" element={<Settings />} />
                <Route path="billing" element={<Billing />} />
                <Route path="security" element={<Security />} />
              </Route>
            </Route>


            <Route element={<ProtectedRoute />}>
              <Route path="/portal" element={<PortalLayout />}>
                <Route index element={<PortalHome />} />
                <Route path="new" element={<PortalNewRequest />} />
                <Route path="requests" element={<PortalRequests />} />
                <Route path="requests/:id" element={<PortalRequestDetail />} />
                <Route path="catalog" element={<PortalCatalog />} />
                <Route path="kb" element={<PortalKnowledge />} />
                <Route path="kb/:id" element={<PortalKnowledgeArticle />} />
              </Route>
            </Route>

            <Route path="/dashboard" element={<Navigate to="/app" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
