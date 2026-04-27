import { useState } from "react";
import { Route, Switch, useLocation, Link } from "wouter";
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
} from "@/components/ui/sidebar";
import {
  ClipboardCheck,
  Wrench,
  BookOpen,
  User as UserIcon,
  Home as HomeIcon,
  LogOut,
  Library,
} from "lucide-react";
import { Dashboard } from "@/components/Dashboard";
import { DeviceChecks } from "@/components/DeviceChecks";
import { Repairs } from "@/components/Repairs";
import { Learn } from "@/components/Learn";
import { CourseViewer } from "@/components/CourseViewer";
import { Resources } from "@/components/Resources";
import { Profile } from "@/components/Profile";
import { Onboarding } from "@/components/Onboarding";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuth } from "@/hooks/useAuth";
import logoImage from "@assets/vilspasslogo-1.png";

export default function Home() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [triggerDeviceCheck, setTriggerDeviceCheck] = useState(false);
  const [triggerRepair, setTriggerRepair] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleDeviceCheckTrigger = () => {
    if (location !== "/device-checks") {
      setLocation("/device-checks");
    }
    setTriggerDeviceCheck(true);
  };

  const handleRepairTrigger = () => {
    if (location !== "/repairs") {
      setLocation("/repairs");
    }
    setTriggerRepair(true);
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      window.location.href = "/";
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const menuItems = [
    { title: "Dashboard", url: "/", icon: HomeIcon },
    { title: "Device Checks", url: "/device-checks", icon: ClipboardCheck },
    { title: "Repairs", url: "/repairs", icon: Wrench },
    { title: "Learn", url: "/learn", icon: BookOpen },
    { title: "Resources", url: "/resources", icon: Library },
    { title: "Profile", url: "/profile", icon: UserIcon },
  ];

  if (showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <div className="p-4 border-b">
                <h1 className="text-lg font-bold">TechTeam</h1>
                <p className="text-xs text-slate-600">Student Tech Support</p>
              </div>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={location === item.url}
                        data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
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
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <img
                src={logoImage}
                alt="Verizon Digital Promise Logo"
                className="h-10 object-contain"
                data-testid="img-logo"
                style={{ width: "150px", height: "auto" }}
              />
            </div>
            <div className="flex-1"></div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground" data-testid="text-welcome">
                Welcome,{" "}
                {user?.firstName && user?.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user?.username}
              </div>
              <ThemeToggle />
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6 bg-background">
            <div className="max-w-7xl mx-auto">
              <ErrorBoundary>
                <Switch>
                  <Route path="/">
                    <Dashboard
                      onStartDeviceCheck={handleDeviceCheckTrigger}
                      onStartRepair={handleRepairTrigger}
                    />
                  </Route>
                  <Route path="/device-checks">
                    <DeviceChecks
                      triggerNew={triggerDeviceCheck}
                      onTriggerComplete={() => setTriggerDeviceCheck(false)}
                    />
                  </Route>
                  <Route path="/repairs">
                    <Repairs
                      triggerNew={triggerRepair}
                      onTriggerComplete={() => setTriggerRepair(false)}
                    />
                  </Route>
                  <Route path="/learn/courses/:id">
                    <CourseViewer />
                  </Route>
                  <Route path="/learn">
                    <Learn />
                  </Route>
                  <Route path="/resources">
                    <Resources />
                  </Route>
                  <Route path="/profile">
                    <Profile onShowOnboarding={() => setShowOnboarding(true)} />
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
