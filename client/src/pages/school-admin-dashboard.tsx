import { useState } from 'react';
import { Route, Switch, useLocation, Link } from 'wouter';
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger } from '@/components/ui/sidebar';
import { GraduationCap, Ticket, BookOpen, Home as HomeIcon, ClipboardCheck, Wrench, LogOut, Settings, Library } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAuth } from '@/hooks/useAuth';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { AdminStudentsList } from '@/components/admin/AdminStudentsList';
import { AdminDeviceChecks } from '@/components/admin/AdminDeviceChecks';
import { AdminRepairs } from '@/components/admin/AdminRepairs';
import { AdminLearningProgress } from '@/components/admin/AdminLearningProgress';
import { AdminSettings } from '@/components/admin/AdminSettings';
import StudentDetail from '@/pages/student-detail';

export default function SchoolAdminDashboard() {
  const { user } = useAuth();
  const [location] = useLocation();

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const menuItems = [
    { title: 'Overview', url: '/admin', icon: HomeIcon },
    { title: 'Students', url: '/admin/students', icon: GraduationCap },
    { title: 'Device Checks', url: '/admin/device-checks', icon: ClipboardCheck },
    { title: 'Repairs', url: '/admin/repairs', icon: Wrench },
    { title: 'Learning Progress', url: '/admin/learning', icon: BookOpen },
    { title: 'Settings', url: '/admin/settings', icon: Settings },
  ];

  const style = {
    '--sidebar-width': '16rem',
    '--sidebar-width-icon': '3rem',
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <div className="p-4 border-b">
                <h1 className="text-lg font-bold">TechTeam Admin</h1>
                <p className="text-xs text-slate-600">School Administration</p>
              </div>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={location === item.url}
                        data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <Link href={item.url}>
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={handleSignOut}
                      data-testid="nav-sign-out"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign out</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground" data-testid="text-welcome">
                {user?.firstName && user?.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user?.username} - {user?.role}
              </div>
              <ThemeToggle />
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6 bg-background">
            <div className="max-w-7xl mx-auto">
              <ErrorBoundary>
                <Switch>
                  <Route path="/admin/students/:id">
                    <StudentDetail />
                  </Route>
                  <Route path="/admin/students">
                    <AdminStudentsList />
                  </Route>
                  <Route path="/admin/device-checks">
                    <AdminDeviceChecks />
                  </Route>
                  <Route path="/admin/repairs">
                    <AdminRepairs />
                  </Route>
                  <Route path="/admin/learning">
                    <AdminLearningProgress />
                  </Route>
                  <Route path="/admin/settings">
                    <AdminSettings />
                  </Route>
                  <Route path="/admin">
                    <AdminOverview />
                  </Route>
                  <Route path="/">
                    <AdminOverview />
                  </Route>
                </Switch>
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
