import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ClipboardCheck, Wrench, Trophy, BookOpen } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import logoImage from "@assets/vilspasslogo-1.png";

export default function Landing() {
  const handleGetStarted = () => {
    window.location.href = "/login";
  };

  const features = [
    {
      icon: ClipboardCheck,
      title: "Device Checks",
      description:
        "Track and monitor device status across your school with comprehensive check-in systems.",
    },
    {
      icon: Wrench,
      title: "Repair Management",
      description:
        "Efficiently manage device repairs with priority tracking and status updates.",
    },
    {
      icon: Trophy,
      title: "Gamified Learning",
      description:
        "Earn points, complete challenges, and build tech skills through hands-on experience.",
    },
    {
      icon: BookOpen,
      title: "Resource Library",
      description:
        "Access curated guides, videos, and documentation to expand your technical knowledge.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-background to-purple-50 dark:from-blue-950 dark:via-background dark:to-purple-950">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 text-center">
        <img
          src={logoImage}
          alt="Verizon Digital Promise Logo"
          className="mx-auto mb-8 h-16 object-contain"
          data-testid="img-logo"
        />
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
          TechTeam
        </h1>
        <p className="text-2xl text-foreground mb-4">
          Empower Student Tech Teams
        </p>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          A platform for managing device checks, repairs, and building technical
          skills.
        </p>
        <Button
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          onClick={handleGetStarted}
          data-testid="button-get-started"
        >
          Sign in to get started
        </Button>
      </div>

      {/* Features Grid
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">
          Everything You Need
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="p-6 hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-slate-600 text-sm">{feature.description}</p>
              </Card>
            );
          })}
        </div>
      </div> */}

      {/* CTA Section
      <div className="container mx-auto px-4 py-16 text-center">
        <Card className="p-12 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg text-slate-600 mb-8">
            Join schools already using TechTeam to support their students
          </p>
          <Button
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            onClick={handleGetStarted}
            data-testid="button-cta-get-started"
          >
            Sign In to Continue
          </Button>
        </Card>
      </div> */}

      {/* Footer */}
      <footer className="border-t bg-background py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 VILS|Digital Promise. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
