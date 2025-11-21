import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { GraduationCap, Ticket, TrendingUp } from 'lucide-react';

export function AdminOverview() {
  const { user } = useAuth();
  const schoolId = user?.schoolId;

  const { data: students = [] } = useQuery<any[]>({
    queryKey: ['/api/schools', schoolId, 'students'],
    enabled: !!schoolId,
  });

  const { data: tickets = [] } = useQuery<any[]>({
    queryKey: ['/api/schools', schoolId, 'tickets'],
    enabled: !!schoolId,
  });

  const { data: learningProgress = [] } = useQuery<any[]>({
    queryKey: ['/api/schools', schoolId, 'learning-progress'],
    enabled: !!schoolId,
  });

  if (!schoolId) {
    return <div className="p-6">Loading school data...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold" data-testid="heading-overview">Overview</h2>
        <p className="text-slate-600" data-testid="text-subtitle">School dashboard summary</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-600 border-0" data-testid="card-total-students">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Total Students</CardTitle>
            <GraduationCap className="h-5 w-5 text-white" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white" data-testid="text-student-count">{students.length}</div>
            <p className="text-xs text-white">Active tech team members</p>
          </CardContent>
        </Card>

        <Card className="bg-orange-600 border-0" data-testid="card-total-tickets">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Total Tickets</CardTitle>
            <Ticket className="h-5 w-5 text-white" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white" data-testid="text-ticket-count">{tickets.length}</div>
            <p className="text-xs text-white">Device checks & repairs</p>
          </CardContent>
        </Card>

        <Card className="bg-green-600 border-0" data-testid="card-learning-activity">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Learning Activity</CardTitle>
            <TrendingUp className="h-5 w-5 text-white" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white" data-testid="text-progress-count">{learningProgress.length}</div>
            <p className="text-xs text-white">Students with progress</p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-quick-stats">
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
          <CardDescription>Summary of recent activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Open Tickets</span>
              <span className="text-sm font-medium" data-testid="text-open-tickets">
                {tickets.filter((t: any) => t.status !== 'completed').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Completed Tickets</span>
              <span className="text-sm font-medium" data-testid="text-completed-tickets">
                {tickets.filter((t: any) => t.status === 'completed').length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
