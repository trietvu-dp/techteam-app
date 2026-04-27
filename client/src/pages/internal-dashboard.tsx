import { Route, Switch, useLocation, Link } from 'wouter';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { BookOpen, PlusCircle, LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAuth } from '@/hooks/useAuth';
import { CoursesList } from '@/components/internal/CoursesList';
import { CourseEditor } from '@/components/internal/CourseEditor';
import { CourseDetail } from '@/components/internal/CourseDetail';

export default function InternalDashboard() {
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
    { title: 'Courses', url: '/internal', icon: BookOpen },
    { title: 'Create Course', url: '/internal/courses/new', icon: PlusCircle },
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
                <h1 className="text-lg font-bold">TechTeam</h1>
                <p className="text-xs text-slate-600">Content Management</p>
              </div>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={location === item.url}
                      >
                        <Link href={item.url}>
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={handleSignOut}>
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
            <SidebarTrigger />
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                {user?.firstName && user?.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user?.username} - Internal
              </div>
              <ThemeToggle />
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6 bg-background">
            <div className="max-w-7xl mx-auto">
              <ErrorBoundary>
                <Switch>
                  <Route path="/internal/courses/new">
                    <CourseEditor />
                  </Route>
                  <Route path="/internal/courses/:id/edit">
                    {(params) => <CourseEditor courseId={params.id} />}
                  </Route>
                  <Route path="/internal/courses/:id">
                    {(params) => <CourseDetail courseId={params.id} />}
                  </Route>
                  <Route path="/internal">
                    <CoursesList />
                  </Route>
                  <Route path="/">
                    <CoursesList />
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
