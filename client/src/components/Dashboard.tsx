import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ClipboardCheck, Wrench, TrendingUp, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";

interface DashboardProps {
  onStartDeviceCheck: () => void;
  onStartRepair: () => void;
}

interface DashboardStats {
  checksToday: number;
  activeRepairs: number;
  skillsProgress: number;
  pendingTasks: number;
}

interface SkillCategory {
  category: string;
  total: number;
  completed: number;
  percentage: number;
}

export function Dashboard({
  onStartDeviceCheck,
  onStartRepair,
}: DashboardProps) {
  const { user } = useAuth();

  // Fetch dashboard stats
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/student/dashboard-stats"],
    initialData: {
      checksToday: 0,
      activeRepairs: 0,
      skillsProgress: 0,
      pendingTasks: 0,
    },
  });

  // Fetch recent activity
  const { data: recentActivity = [] } = useQuery<any[]>({
    queryKey: ["/api/student/recent-activity"],
  });

  // Fetch skills progress
  const { data: skillsProgress = [] } = useQuery<SkillCategory[]>({
    queryKey: ["/api/student/skills-progress"],
  });

  const statCards = [
    {
      label: "Checks Today",
      value: stats.checksToday,
      icon: ClipboardCheck,
      bgColor: "bg-blue-600",
    },
    {
      label: "Active Repairs",
      value: stats.activeRepairs,
      icon: Wrench,
      bgColor: "bg-orange-600",
    },
    {
      label: "Skills Progress",
      value: `${stats.skillsProgress}%`,
      icon: TrendingUp,
      bgColor: "bg-green-600",
    },
    {
      label: "Pending Tasks",
      value: stats.pendingTasks,
      icon: AlertCircle,
      bgColor: "bg-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h2 data-testid="text-welcome">
          Welcome back, {user?.firstName || user?.username}!
        </h2>
        <p className="text-slate-600" data-testid="text-subtitle">
          Here's what's happening today
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((stat, index) => (
          <Card
            key={index}
            className={`p-4 ${stat.bgColor} border-0`}
            data-testid={`card-stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <div className="flex items-center justify-between mb-2">
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <div
              className="text-white text-2xl font-bold"
              data-testid={`text-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {stat.value}
            </div>
            <p className="text-xs text-white">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="mb-3">Quick Actions</h3>
        <div className="space-y-2">
          <button
            onClick={onStartDeviceCheck}
            className="w-full bg-slate-600 text-white p-3 rounded-lg flex items-center justify-center gap-2"
          >
            <ClipboardCheck className="w-5 h-5" />
            Start Device Check
          </button>
          <button
            onClick={onStartRepair}
            className="w-full bg-white border border-slate-200 p-3 rounded-lg flex items-center justify-center gap-2"
          >
            <Wrench className="w-5 h-5" />
            Report Repair
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="mb-3" data-testid="heading-recent-activity">
          Recent Activity
        </h3>
        <div className="space-y-2">
          {recentActivity.length === 0 ? (
            <Card className="p-4">
              <p
                className="text-sm text-slate-600 text-center"
                data-testid="text-no-activity"
              >
                No recent activity. Start a device check or repair to get
                started!
              </p>
            </Card>
          ) : (
            recentActivity.map((ticket, index) => (
              <Card
                key={index}
                className="p-3"
                data-testid={`card-activity-${index}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {ticket.deviceType || "Device"}
                      </span>
                      <Badge
                        variant={
                          ticket.status === "completed"
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {ticket.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">
                      {ticket.issueType === "check" ? "Device Check" : "Repair"}{" "}
                      - {ticket.issueDescription}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {formatDistanceToNow(new Date(ticket.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Skills Progress */}
      <Card className="p-4">
        <h3 className="mb-3" data-testid="heading-skills-progress">
          Your Skills Progress
        </h3>
        <div className="space-y-3">
          {skillsProgress.length === 0 ? (
            <p
              className="text-sm text-slate-600 text-center"
              data-testid="text-no-skills"
            >
              No challenges available yet. Check the Learn section to start
              building your skills!
            </p>
          ) : (
            skillsProgress.map((skill, index) => (
              <div
                key={index}
                data-testid={`skill-${skill.category.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="flex justify-between mb-1">
                  <span className="text-sm">{skill.category}</span>
                  <span className="text-sm text-slate-600">
                    {skill.percentage}% ({skill.completed}/{skill.total})
                  </span>
                </div>
                <Progress value={skill.percentage} className="h-2" />
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
