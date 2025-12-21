import { Switch, Route, Redirect } from 'wouter';
import { queryClient } from './lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import NotFound from '@/pages/not-found';
import Landing from '@/pages/landing';
import Login from '@/pages/login';
import Home from '@/pages/home';
import SuperAdminDashboard from '@/pages/super-admin-dashboard';
import SchoolAdminDashboard from '@/pages/school-admin-dashboard';
import { useAuth } from '@/hooks/useAuth';

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Show landing while checking auth
  if (isLoading) {
    return <Landing />;
  }

  // Not authenticated - show landing or login page
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/:rest*" component={Landing} />
      </Switch>
    );
  }

  // Authenticated - route based on user role
  // Determine which component to show based on role
  const getDashboard = () => {
    if (user?.role === 'super_admin') return SuperAdminDashboard;
    if (user?.role === 'admin') return SchoolAdminDashboard;
    return Home;
  };

  const Dashboard = getDashboard();

  return <Dashboard />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <ErrorBoundary>
            <Toaster />
            <Router />
          </ErrorBoundary>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
