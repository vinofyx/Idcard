import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import LoginPage      from './pages/LoginPage';
import RegisterPage   from './pages/RegisterPage';
import DashboardPage  from './pages/DashboardPage';
import UploadPage     from './pages/UploadPage';
import RecordsPage    from './pages/RecordsPage';
import TemplatePage   from './pages/TemplatePage';
import SettingsPage   from './pages/SettingsPage';
import BillingPage    from './pages/BillingPage';
import AnalyticsPage  from './pages/AnalyticsPage';
import AcceptInvitePage  from './pages/AcceptInvitePage';
import ManualEntryPage   from './pages/ManualEntryPage';
import OnboardingPage    from './pages/OnboardingPage';
import Layout from './components/Layout';

const Spinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <span className="spinner" />
  </div>
);

/** Authenticated users only. Sends new orgs (onboardingDone === false) to /onboarding. */
function PrivateRoute({ children }) {
  const { user, organization, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (organization?.onboardingDone === false) return <Navigate to="/onboarding" replace />;
  return children;
}

/** Wraps /onboarding — must be logged in; once done redirects to dashboard. */
function OnboardingRoute({ children }) {
  const { user, organization, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  // If onboarding is already done (true or undefined for legacy orgs) go to dashboard
  if (organization?.onboardingDone !== false) return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login"          element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register"       element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/accept-invite"  element={<AcceptInvitePage />} />

        {/* Onboarding wizard — shown once after first registration */}
        <Route path="/onboarding" element={<OnboardingRoute><OnboardingPage /></OnboardingRoute>} />

        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"  element={<DashboardPage />} />
          <Route path="upload"     element={<UploadPage />} />
          <Route path="manual"     element={<ManualEntryPage />} />
          <Route path="records"    element={<RecordsPage />} />
          <Route path="templates"  element={<TemplatePage />} />
          <Route path="analytics"  element={<AnalyticsPage />} />
          <Route path="billing"    element={<BillingPage />} />
          <Route path="settings"   element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
