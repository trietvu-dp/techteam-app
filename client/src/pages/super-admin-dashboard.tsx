import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Building2, UserPlus, GraduationCap, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { School, User } from '@shared/schema';

export default function SuperAdminDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('schools');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');

  // Fetch all schools
  const { data: schools = [], isLoading: schoolsLoading } = useQuery<School[]>({
    queryKey: ['/api/admin/schools'],
  });

  // Fetch all school admins (with optional school filter)
  const { data: schoolAdmins = [], isLoading: adminsLoading, error: adminsError } = useQuery<User[]>({
    queryKey: ['/api/admin/all-school-admins', selectedSchoolId],
    queryFn: async () => {
      const url = selectedSchoolId 
        ? `/api/admin/all-school-admins?schoolId=${selectedSchoolId}`
        : '/api/admin/all-school-admins';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch school admins');
      return res.json();
    },
  });

  // Fetch all students (with optional school filter)
  const { data: students = [], isLoading: studentsLoading, error: studentsError } = useQuery<User[]>({
    queryKey: ['/api/admin/all-students', selectedSchoolId],
    queryFn: async () => {
      const url = selectedSchoolId 
        ? `/api/admin/all-students?schoolId=${selectedSchoolId}`
        : '/api/admin/all-students';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch students');
      return res.json();
    },
  });

  // School form state
  const [schoolForm, setSchoolForm] = useState({
    name: '',
    address: '',
    contactEmail: '',
    adminName: '',
  });

  // School admin form state
  const [adminForm, setAdminForm] = useState({
    schoolId: '',
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });

  // Student form state
  const [studentForm, setStudentForm] = useState({
    schoolId: '',
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });

  // Create school mutation
  const createSchoolMutation = useMutation({
    mutationFn: async (data: typeof schoolForm) => {
      return await apiRequest('POST', '/api/admin/schools', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
      toast({ title: 'Success', description: 'School created successfully' });
      setSchoolForm({ name: '', address: '', contactEmail: '', adminName: '' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to create school', variant: 'destructive' });
    },
  });

  // Create school admin mutation
  const createAdminMutation = useMutation({
    mutationFn: async (data: typeof adminForm) => {
      return await apiRequest('POST', '/api/admin/school-admins', data);
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'School admin created successfully' });
      setAdminForm({ schoolId: '', username: '', email: '', password: '', firstName: '', lastName: '' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to create school admin', variant: 'destructive' });
    },
  });

  // Create student mutation
  const createStudentMutation = useMutation({
    mutationFn: async (data: typeof studentForm) => {
      return await apiRequest('POST', '/api/admin/students', data);
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Student created successfully' });
      setStudentForm({ schoolId: '', username: '', email: '', password: '', firstName: '', lastName: '' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to create student', variant: 'destructive' });
    },
  });

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" data-testid="icon-logo" />
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-title">Super Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground" data-testid="text-subtitle">Manage schools and accounts</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium" data-testid="text-username">{user?.username}</p>
              <p className="text-xs text-muted-foreground" data-testid="text-role">{user?.role}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6" data-testid="tabs-navigation">
            <TabsTrigger value="schools" data-testid="tab-schools">
              <Building2 className="h-4 w-4 mr-2" />
              Schools
            </TabsTrigger>
            <TabsTrigger value="admins" data-testid="tab-admins">
              <UserPlus className="h-4 w-4 mr-2" />
              School Admins
            </TabsTrigger>
            <TabsTrigger value="students" data-testid="tab-students">
              <GraduationCap className="h-4 w-4 mr-2" />
              Students
            </TabsTrigger>
          </TabsList>

          {/* Schools Tab */}
          <TabsContent value="schools" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Create School Form */}
              <Card data-testid="card-create-school">
                <CardHeader>
                  <CardTitle>Create New School</CardTitle>
                  <CardDescription>Add a new K-12 school to the system</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={(e) => { e.preventDefault(); createSchoolMutation.mutate(schoolForm); }} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="school-name">School Name</Label>
                      <Input
                        id="school-name"
                        data-testid="input-school-name"
                        value={schoolForm.name}
                        onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                        placeholder="Lincoln High School"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="school-address">Address</Label>
                      <Input
                        id="school-address"
                        data-testid="input-school-address"
                        value={schoolForm.address}
                        onChange={(e) => setSchoolForm({ ...schoolForm, address: e.target.value })}
                        placeholder="123 Main St, City, State"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="school-email">Contact Email</Label>
                      <Input
                        id="school-email"
                        type="email"
                        data-testid="input-school-email"
                        value={schoolForm.contactEmail}
                        onChange={(e) => setSchoolForm({ ...schoolForm, contactEmail: e.target.value })}
                        placeholder="admin@school.edu"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="school-admin-name">Admin Contact Name</Label>
                      <Input
                        id="school-admin-name"
                        data-testid="input-school-admin-name"
                        value={schoolForm.adminName}
                        onChange={(e) => setSchoolForm({ ...schoolForm, adminName: e.target.value })}
                        placeholder="John Doe"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={createSchoolMutation.isPending} data-testid="button-create-school">
                      {createSchoolMutation.isPending ? 'Creating...' : 'Create School'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Schools List */}
              <Card data-testid="card-schools-list">
                <CardHeader>
                  <CardTitle>All Schools ({schools.length})</CardTitle>
                  <CardDescription>K-12 schools in the system. Click a school to view its admins and students.</CardDescription>
                </CardHeader>
                <CardContent>
                  {schoolsLoading ? (
                    <p className="text-muted-foreground text-center py-4" data-testid="text-loading">Loading schools...</p>
                  ) : schools.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4" data-testid="text-no-schools">No schools yet. Create one to get started!</p>
                  ) : (
                    <div className="space-y-3">
                      {schools.map((school) => (
                        <div 
                          key={school.id} 
                          className="p-3 border rounded-md hover-elevate cursor-pointer" 
                          onClick={() => {
                            setSelectedSchoolId(school.id);
                            setActiveTab('admins');
                          }}
                          data-testid={`school-item-${school.id}`}
                        >
                          <p className="font-medium" data-testid={`school-name-${school.id}`}>{school.name}</p>
                          {school.address && <p className="text-sm text-muted-foreground" data-testid={`school-address-${school.id}`}>{school.address}</p>}
                          {school.contactEmail && <p className="text-xs text-muted-foreground" data-testid={`school-email-${school.id}`}>{school.contactEmail}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* School Admins Tab */}
          <TabsContent value="admins" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Create Admin Form */}
              <Card data-testid="card-create-admin">
                <CardHeader>
                  <CardTitle>Create School Admin</CardTitle>
                  <CardDescription>Add an administrator for a school</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={(e) => { e.preventDefault(); createAdminMutation.mutate(adminForm); }} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="admin-school">School</Label>
                        <select
                          id="admin-school"
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          value={adminForm.schoolId}
                          onChange={(e) => setAdminForm({ ...adminForm, schoolId: e.target.value })}
                          required
                          data-testid="select-admin-school"
                        >
                          <option value="">Select a school</option>
                          {schools.map((school) => (
                            <option key={school.id} value={school.id} data-testid={`option-school-${school.id}`}>{school.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="admin-username">Username</Label>
                        <Input
                          id="admin-username"
                          data-testid="input-admin-username"
                          value={adminForm.username}
                          onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                          placeholder="john.doe"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="admin-email">Email</Label>
                        <Input
                          id="admin-email"
                          type="email"
                          data-testid="input-admin-email"
                          value={adminForm.email}
                          onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                          placeholder="john.doe@school.edu"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="admin-password">Password</Label>
                        <Input
                          id="admin-password"
                          type="password"
                          data-testid="input-admin-password"
                          value={adminForm.password}
                          onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                          placeholder="••••••••"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="admin-first-name">First Name</Label>
                        <Input
                          id="admin-first-name"
                          data-testid="input-admin-first-name"
                          value={adminForm.firstName}
                          onChange={(e) => setAdminForm({ ...adminForm, firstName: e.target.value })}
                          placeholder="John"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="admin-last-name">Last Name</Label>
                        <Input
                          id="admin-last-name"
                          data-testid="input-admin-last-name"
                          value={adminForm.lastName}
                          onChange={(e) => setAdminForm({ ...adminForm, lastName: e.target.value })}
                          placeholder="Doe"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={createAdminMutation.isPending} data-testid="button-create-admin">
                      {createAdminMutation.isPending ? 'Creating...' : 'Create School Admin'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* School Admins List */}
              <Card data-testid="card-admins-list">
                <CardHeader>
                  <CardTitle>All School Admins ({schoolAdmins.length})</CardTitle>
                  <CardDescription>
                    {selectedSchoolId 
                      ? `Admins for ${schools.find(s => s.id === selectedSchoolId)?.name || 'selected school'}`
                      : 'Admins across all schools'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* School Filter */}
                  <div className="mb-4 space-y-2">
                    <Label htmlFor="filter-school">Filter by School</Label>
                    <select
                      id="filter-school"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={selectedSchoolId}
                      onChange={(e) => setSelectedSchoolId(e.target.value)}
                      data-testid="select-filter-school"
                    >
                      <option value="">All Schools</option>
                      {schools.map((school) => (
                        <option key={school.id} value={school.id} data-testid={`option-filter-school-${school.id}`}>{school.name}</option>
                      ))}
                    </select>
                  </div>

                  {adminsLoading ? (
                    <p className="text-muted-foreground text-center py-4" data-testid="text-loading-admins">Loading school admins...</p>
                  ) : adminsError ? (
                    <p className="text-destructive text-center py-4" data-testid="text-error-admins">Failed to load school admins. Please try again.</p>
                  ) : schoolAdmins.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4" data-testid="text-no-admins">No school admins found.</p>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {schoolAdmins.map((admin: any) => (
                        <div key={admin.id} className="p-3 border rounded-md hover-elevate" data-testid={`admin-item-${admin.id}`}>
                          <p className="font-medium" data-testid={`admin-name-${admin.id}`}>
                            {admin.firstName && admin.lastName 
                              ? `${admin.firstName} ${admin.lastName}`
                              : admin.username}
                          </p>
                          <p className="text-sm text-muted-foreground" data-testid={`admin-email-${admin.id}`}>{admin.email}</p>
                          <p className="text-sm text-muted-foreground" data-testid={`admin-username-${admin.id}`}>@{admin.username}</p>
                          {admin.schoolName && <p className="text-xs text-muted-foreground mt-1" data-testid={`admin-school-${admin.id}`}>School: {admin.schoolName}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Create Student Form */}
              <Card data-testid="card-create-student">
                <CardHeader>
                  <CardTitle>Create Student</CardTitle>
                  <CardDescription>Add a student to any school</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={(e) => { e.preventDefault(); createStudentMutation.mutate(studentForm); }} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="student-school">School</Label>
                        <select
                          id="student-school"
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          value={studentForm.schoolId}
                          onChange={(e) => setStudentForm({ ...studentForm, schoolId: e.target.value })}
                          required
                          data-testid="select-student-school"
                        >
                          <option value="">Select a school</option>
                          {schools.map((school) => (
                            <option key={school.id} value={school.id} data-testid={`option-school-${school.id}`}>{school.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="student-username">Username</Label>
                        <Input
                          id="student-username"
                          data-testid="input-student-username"
                          value={studentForm.username}
                          onChange={(e) => setStudentForm({ ...studentForm, username: e.target.value })}
                          placeholder="jane.smith"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="student-email">Email</Label>
                        <Input
                          id="student-email"
                          type="email"
                          data-testid="input-student-email"
                          value={studentForm.email}
                          onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                          placeholder="jane.smith@student.edu"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="student-password">Password</Label>
                        <Input
                          id="student-password"
                          type="password"
                          data-testid="input-student-password"
                          value={studentForm.password}
                          onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                          placeholder="••••••••"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="student-first-name">First Name</Label>
                        <Input
                          id="student-first-name"
                          data-testid="input-student-first-name"
                          value={studentForm.firstName}
                          onChange={(e) => setStudentForm({ ...studentForm, firstName: e.target.value })}
                          placeholder="Jane"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="student-last-name">Last Name</Label>
                        <Input
                          id="student-last-name"
                          data-testid="input-student-last-name"
                          value={studentForm.lastName}
                          onChange={(e) => setStudentForm({ ...studentForm, lastName: e.target.value })}
                          placeholder="Smith"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={createStudentMutation.isPending} data-testid="button-create-student">
                      {createStudentMutation.isPending ? 'Creating...' : 'Create Student'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Students List */}
              <Card data-testid="card-students-list">
                <CardHeader>
                  <CardTitle>All Students ({students.length})</CardTitle>
                  <CardDescription>
                    {selectedSchoolId 
                      ? `Students for ${schools.find(s => s.id === selectedSchoolId)?.name || 'selected school'}`
                      : 'Students across all schools'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* School Filter */}
                  <div className="mb-4 space-y-2">
                    <Label htmlFor="filter-school-students">Filter by School</Label>
                    <select
                      id="filter-school-students"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={selectedSchoolId}
                      onChange={(e) => setSelectedSchoolId(e.target.value)}
                      data-testid="select-filter-school-students"
                    >
                      <option value="">All Schools</option>
                      {schools.map((school) => (
                        <option key={school.id} value={school.id} data-testid={`option-filter-school-students-${school.id}`}>{school.name}</option>
                      ))}
                    </select>
                  </div>

                  {studentsLoading ? (
                    <p className="text-muted-foreground text-center py-4" data-testid="text-loading-students">Loading students...</p>
                  ) : studentsError ? (
                    <p className="text-destructive text-center py-4" data-testid="text-error-students">Failed to load students. Please try again.</p>
                  ) : students.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4" data-testid="text-no-students">No students found.</p>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {students.map((student: any) => (
                        <div key={student.id} className="p-3 border rounded-md hover-elevate" data-testid={`student-item-${student.id}`}>
                          <p className="font-medium" data-testid={`student-name-${student.id}`}>
                            {student.firstName && student.lastName 
                              ? `${student.firstName} ${student.lastName}`
                              : student.username}
                          </p>
                          <p className="text-sm text-muted-foreground" data-testid={`student-email-${student.id}`}>{student.email}</p>
                          <p className="text-sm text-muted-foreground" data-testid={`student-username-${student.id}`}>@{student.username}</p>
                          {student.schoolName && <p className="text-xs text-muted-foreground mt-1" data-testid={`student-school-${student.id}`}>School: {student.schoolName}</p>}
                          <p className="text-xs text-muted-foreground" data-testid={`student-points-${student.id}`}>Points: {student.points || 0}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
