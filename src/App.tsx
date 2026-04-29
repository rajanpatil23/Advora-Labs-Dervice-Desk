import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { I18nProvider } from "@/lib/i18n-app";
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
import ReportBuilder from "./pages/ReportBuilder";
import Logs from "./pages/Logs";
import Settings from "./pages/Settings";
import Platform from "./pages/Platform";
import Approvals from "./pages/Approvals";
import Billing from "./pages/Billing";
import Security from "./pages/Security";
import Integrations from "./pages/Integrations";
import Automations from "./pages/Automations";
import Csat from "./pages/Csat";
import CsatTrends from "./pages/CsatTrends";
import PublicSurvey from "./pages/PublicSurvey";
import CustomFields from "./pages/CustomFields";
import Branding from "./pages/Branding";
import Notifications from "./pages/Notifications";
import SavedViews from "./pages/SavedViews";
import BulkActions from "./pages/BulkActions";
import ImportExport from "./pages/ImportExport";
import ActivityFeed from "./pages/ActivityFeed";
import Macros from "./pages/Macros";
import Webhooks from "./pages/Webhooks";
import Developer from "./pages/Developer";
import SsoSetup from "./pages/SsoSetup";
import Compliance from "./pages/Compliance";
import StatusPage from "./pages/StatusPage";
import MobileAgent from "./pages/MobileAgent";
import Workflows from "./pages/Workflows";
import Escalations from "./pages/Escalations";
import UnifiedInbox from "./pages/UnifiedInbox";
import Customer360 from "./pages/Customer360";
import Scheduling from "./pages/Scheduling";
import CannedResponses from "./pages/CannedResponses";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <BrandingProvider>
        <I18nProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Navigate to="/app" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/invite" element={<AcceptInvite />} />
            <Route path="/survey/:ticketNumber" element={<PublicSurvey />} />

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
                <Route path="report-builder" element={<ReportBuilder />} />
                <Route path="logs" element={<Logs />} />
                <Route path="settings" element={<Settings />} />
                <Route path="billing" element={<Billing />} />
                <Route path="security" element={<Security />} />
                <Route path="integrations" element={<Integrations />} />
                <Route path="automations" element={<Automations />} />
                <Route path="csat" element={<Csat />} />
                <Route path="csat/trends" element={<CsatTrends />} />
                <Route path="fields" element={<CustomFields />} />
                <Route path="branding" element={<Branding />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="views" element={<SavedViews />} />
                <Route path="bulk" element={<BulkActions />} />
                <Route path="data" element={<ImportExport />} />
                <Route path="activity" element={<ActivityFeed />} />
                <Route path="macros" element={<Macros />} />
                <Route path="webhooks" element={<Webhooks />} />
                <Route path="developer" element={<Developer />} />
                <Route path="sso" element={<SsoSetup />} />
                <Route path="compliance" element={<Compliance />} />
                <Route path="status" element={<StatusPage />} />
                <Route path="mobile" element={<MobileAgent />} />
                <Route path="workflows" element={<Workflows />} />
                <Route path="escalations" element={<Escalations />} />
                <Route path="inbox" element={<UnifiedInbox />} />
                <Route path="customers" element={<Customer360 />} />
                <Route path="scheduling" element={<Scheduling />} />
                <Route path="canned" element={<CannedResponses />} />
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
        </I18nProvider>
        </BrandingProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
