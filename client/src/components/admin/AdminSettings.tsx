import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Building, User, Users, Save, UserPlus, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'wouter';
import type { School, User as UserType } from '@shared/schema';

export function AdminSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const schoolId = user?.schoolId;

  // Invite dialog state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');

  // Fetch school data
  const { data: school, isLoading: schoolLoading } = useQuery<School>({
    queryKey: ['/api/schools', schoolId],
    enabled: !!schoolId,
  });

  // School form state
  const [schoolForm, setSchoolForm] = useState({
    name: '',
    contactEmail: '',
    address: '',
  });

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });

  // Invite student mutation
  const inviteStudentMutation = useMutation({
    mutationFn: async (data: { email: string; firstName: string; lastName: string }) => {
      return await apiRequest('POST', '/api/admin/students/invite', {
        ...data,
        schoolId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/students'] });
      toast({ title: 'Success', description: 'Invitation sent successfully' });
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteFirstName('');
      setInviteLastName('');
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to send invitation', variant: 'destructive' });
    },
  });

  // Initialize forms when data loads
  useEffect(() => {
    if (school) {
      setSchoolForm({
        name: school.name || '',
        contactEmail: school.contactEmail || '',
        address: school.address || '',
      });
    }
  }, [school]);

  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
      });
    }
  }, [user]);

  // Update school mutation
  const updateSchoolMutation = useMutation({
    mutationFn: async (data: typeof schoolForm) => {
      return await apiRequest('PUT', `/api/schools/${schoolId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schools', schoolId] });
      toast({ title: 'Success', description: 'School information updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to update school', variant: 'destructive' });
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileForm) => {
      return await apiRequest('PUT', '/api/users/me', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({ title: 'Success', description: 'Profile updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to update profile', variant: 'destructive' });
    },
  });

  if (!schoolId) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold" data-testid="heading-settings">Settings</h2>
        <p className="text-slate-600" data-testid="text-subtitle">Manage school and profile settings</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* School Information */}
        <Card data-testid="card-school-info">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              School Information
            </CardTitle>
            <CardDescription>Update your school's details</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateSchoolMutation.mutate(schoolForm);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="school-name">School Name</Label>
                <Input
                  id="school-name"
                  data-testid="input-school-name"
                  value={schoolForm.name}
                  onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                  placeholder="Enter school name"
                  disabled={schoolLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">Contact Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  data-testid="input-contact-email"
                  value={schoolForm.contactEmail}
                  onChange={(e) => setSchoolForm({ ...schoolForm, contactEmail: e.target.value })}
                  placeholder="admin@school.edu"
                  disabled={schoolLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  data-testid="input-address"
                  value={schoolForm.address}
                  onChange={(e) => setSchoolForm({ ...schoolForm, address: e.target.value })}
                  placeholder="123 School Street"
                  disabled={schoolLoading}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={updateSchoolMutation.isPending || schoolLoading}
                data-testid="button-update-school"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateSchoolMutation.isPending ? 'Saving...' : 'Save School Info'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Profile Settings */}
        <Card data-testid="card-profile">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Settings
            </CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateProfileMutation.mutate(profileForm);
              }}
              className="space-y-4"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First Name</Label>
                  <Input
                    id="first-name"
                    data-testid="input-first-name"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input
                    id="last-name"
                    data-testid="input-last-name"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  data-testid="input-email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  placeholder="admin@school.edu"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={updateProfileMutation.isPending}
                data-testid="button-update-profile"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Team Management */}
        <Card data-testid="card-team" className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Management
            </CardTitle>
            <CardDescription>Manage your tech team students</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Tech Team Students</p>
                <p className="text-sm text-muted-foreground">Add, edit, or remove students from your tech team</p>
              </div>
              <Link href="/admin/students">
                <Button variant="outline" data-testid="button-manage-students">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Students
                </Button>
              </Link>
            </div>

            {/* Invite Student Section */}
            <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div>
                <p className="font-medium">Invite New Student</p>
                <p className="text-sm text-muted-foreground">Send an email invitation to join your tech team</p>
              </div>
              <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-invite-student">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Student
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Invite Student</DialogTitle>
                    <DialogDescription>
                      Send an email invitation to a student to join your tech team.
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      inviteStudentMutation.mutate({
                        email: inviteEmail,
                        firstName: inviteFirstName,
                        lastName: inviteLastName,
                      });
                    }}
                    className="space-y-4"
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="invite-first-name">First Name</Label>
                        <Input
                          id="invite-first-name"
                          data-testid="input-invite-first-name"
                          value={inviteFirstName}
                          onChange={(e) => setInviteFirstName(e.target.value)}
                          placeholder="John"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="invite-last-name">Last Name</Label>
                        <Input
                          id="invite-last-name"
                          data-testid="input-invite-last-name"
                          value={inviteLastName}
                          onChange={(e) => setInviteLastName(e.target.value)}
                          placeholder="Doe"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invite-email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="invite-email"
                          type="email"
                          data-testid="input-invite-email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="student@school.edu"
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setInviteDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={inviteStudentMutation.isPending}
                        data-testid="button-send-invite"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        {inviteStudentMutation.isPending ? 'Sending...' : 'Send Invitation'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
