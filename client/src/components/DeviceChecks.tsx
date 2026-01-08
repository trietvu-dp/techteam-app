import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  LayoutList,
  Table,
  Plus,
  ChevronDown,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { STUDENTS } from "@/data/students";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Ticket } from "@shared/schema";

interface Teacher {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string;
  email: string;
}

interface TransformedDevice {
  id: string;
  type: string;
  number: string;
  student: string;
  grade: string;
  status: string;
  lastCheck: string;
}

interface DeviceChecksProps {
  triggerNew?: boolean;
  onTriggerComplete?: () => void;
}

export function DeviceChecks({
  triggerNew,
  onTriggerComplete,
}: DeviceChecksProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDevice, setSelectedDevice] = useState<TransformedDevice | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "table">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    status: 'all',
    deviceType: 'all',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [checkItems, setCheckItems] = useState({
    physical: false,
    charging: false,
    screen: false,
    keyboard: false,
    software: false,
  });

  // New device check flow
  const [showNewCheckFlow, setShowNewCheckFlow] = useState(false);
  const [newCheckStep, setNewCheckStep] = useState<"device-type" | "form">(
    "device-type",
  );
  const [selectedDeviceType, setSelectedDeviceType] = useState<
    "iPad" | "Chromebook" | null
  >(null);

  // Fetch teachers for the current school (student-accessible endpoint)
  const { data: teachers = [], isLoading: teachersLoading, isError } = useQuery<Teacher[]>({
    queryKey: ['/api/student/teachers'],
    enabled: !!user,
  });

  // Form state
  const [formData, setFormData] = useState({
    teacher: "",
    roomNumber: "",
    allPresent: "",
    missingStudents: [] as string[],
    allCharged: "",
    notChargedStudents: [] as string[],
    anyMissing: "",
    missingDeviceStudents: [] as string[],
    anyBroken: "",
    brokenAssetTag: "",
    lteWorking: "",
    lteBrokenAssetTag: "",
  });

  // Search states for dropdowns
  const [teacherOpen, setTeacherOpen] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [missingStudentsOpen, setMissingStudentsOpen] = useState(false);
  const [notChargedStudentsOpen, setNotChargedStudentsOpen] = useState(false);
  const [missingDeviceStudentsOpen, setMissingDeviceStudentsOpen] =
    useState(false);

  // Effect to handle external trigger
  useEffect(() => {
    if (triggerNew) {
      handleStartNewCheck();
      onTriggerComplete?.();
    }
  }, [triggerNew]);

  // Fetch device checks from the database
  const { data: deviceChecksData = [], isLoading: deviceChecksLoading, error: deviceChecksError, refetch: refetchDeviceChecks } = useQuery<Ticket[]>({
    queryKey: ['/api/student/device-checks'],
    enabled: !!user,
  });

  // Mutation for creating a new device check
  const createDeviceCheckMutation = useMutation({
    mutationFn: async (data: {
      deviceType: string;
      teacher: string;
      roomNumber: string;
      allPresent: boolean;
      missingStudents: string[];
      allCharged: boolean;
      notChargedStudents: string[];
      anyMissing: boolean;
      missingDeviceStudents: string[];
      anyBroken: boolean;
      brokenAssetTag: string;
      lteWorking: boolean | null;
      lteBrokenAssetTag: string;
    }) => {
      const payload = {
        studentName: user?.firstName && user?.lastName
          ? `${user.firstName} ${user.lastName}`
          : user?.username || 'Unknown',
        studentGrade: 'N/A',
        deviceType: data.deviceType.toLowerCase(),
        issueType: 'check',
        issueDescription: `Device check for ${data.deviceType} in room ${data.roomNumber}`,
        teacher: data.teacher,
        roomNumber: data.roomNumber,
        allPresent: data.allPresent,
        missingStudents: data.missingStudents,
        allCharged: data.allCharged,
        notChargedStudents: data.notChargedStudents,
        anyMissing: data.anyMissing,
        missingDeviceStudents: data.missingDeviceStudents,
        anyBroken: data.anyBroken,
        brokenAssetTag: data.brokenAssetTag || null,
        lteWorking: data.lteWorking,
        lteBrokenAssetTag: data.lteBrokenAssetTag || null,
      };

      const res = await apiRequest('POST', '/api/tickets', payload);
      return res.json();
    },
    onSuccess: async () => {
      // Force refetch the device checks
      await refetchDeviceChecks();
      queryClient.invalidateQueries({ queryKey: ['/api/student/dashboard-stats'] });
      toast({
        title: 'Success',
        description: 'Device check submitted successfully!',
      });
      setShowNewCheckFlow(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation for updating device check status
  const updateDeviceCheckMutation = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: string }) => {
      const res = await apiRequest('PATCH', `/api/tickets/${ticketId}`, { status });
      return res.json();
    },
    onSuccess: async () => {
      // Force refetch the device checks
      await refetchDeviceChecks();
      queryClient.invalidateQueries({ queryKey: ['/api/student/dashboard-stats'] });
      toast({
        title: 'Success',
        description: 'Device check updated successfully!',
      });
      setSelectedDevice(null);
      setCheckItems({
        physical: false,
        charging: false,
        screen: false,
        keyboard: false,
        software: false,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Transform device checks data to match UI expectations
  const devices = useMemo(() => 
    deviceChecksData.map((check) => ({
      id: check.id,
      type: check.deviceType,
      number: check.deviceNumber || 'N/A',
      student: check.studentName,
      grade: check.studentGrade,
      status: check.status,
      lastCheck: formatRelativeTime(check.createdAt),
    }))
  , [deviceChecksData]);

  // Calculate actual counts from data with memoization
  const { checkedCount, pendingCount, issuesCount } = useMemo(() => ({
    checkedCount: devices.filter(d => d.status === 'completed').length,
    pendingCount: devices.filter(d => d.status === 'pending').length,
    issuesCount: devices.filter(d => d.status === 'issue').length,
  }), [devices]);

  // Filter devices based on search and filters
  const filteredDevices = useMemo(() => {
    return devices.filter(device => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          device.student.toLowerCase().includes(query) ||
          device.type.toLowerCase().includes(query) ||
          device.number.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      // Status filter
      if (filters.status !== 'all' && device.status !== filters.status) return false;
      // Device type filter
      if (filters.deviceType !== 'all' && device.type.toLowerCase() !== filters.deviceType) return false;
      return true;
    });
  }, [devices, searchQuery, filters]);

  function formatRelativeTime(dateInput: Date | string) {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return '1 day ago';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "issue":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-orange-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      completed: { label: "Checked", className: "bg-green-100 text-green-700" },
      issue: { label: "Issue", className: "bg-red-100 text-red-700" },
      pending: { label: "Pending", className: "bg-orange-100 text-orange-700" },
    };
    return variants[status] || variants.pending;
  };

  // Get current date and time
  const currentDate = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  }, []);

  const currentTime = useMemo(() => {
    const now = new Date();
    return now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const handleStartNewCheck = () => {
    setShowNewCheckFlow(true);
    setNewCheckStep("device-type");
    setSelectedDeviceType(null);
    setFormData({
      teacher: "",
      roomNumber: "",
      allPresent: "",
      missingStudents: [],
      allCharged: "",
      notChargedStudents: [],
      anyMissing: "",
      missingDeviceStudents: [],
      anyBroken: "",
      brokenAssetTag: "",
      lteWorking: "",
      lteBrokenAssetTag: "",
    });
  };

  const toggleStudent = (list: string[], student: string) => {
    if (list.includes(student)) {
      return list.filter((s) => s !== student);
    }
    return [...list, student];
  };

  const removeStudent = (list: string[], student: string) => {
    return list.filter((s) => s !== student);
  };

  const handleDeviceTypeSelect = (type: "iPad" | "Chromebook") => {
    setSelectedDeviceType(type);
    setNewCheckStep("form");
  };

  const handleDeviceCheckSubmit = () => {
    if (!selectedDevice) return;

    // Determine status based on check items - if all checks pass, it's completed; otherwise it's an issue
    const allChecksPassed = checkItems.physical && checkItems.charging && checkItems.screen && checkItems.keyboard && checkItems.software;
    const status = allChecksPassed ? 'completed' : 'issue';

    updateDeviceCheckMutation.mutate({
      ticketId: String(selectedDevice.id),
      status,
    });
  };

  const handleFormSubmit = () => {
    if (!selectedDeviceType) return;

    // Validate required fields
    const errors: string[] = [];
    if (!formData.teacher) errors.push('Teacher Name');
    if (!formData.roomNumber) errors.push('Room Number');
    if (!formData.allPresent) errors.push('Are all devices present');
    if (!formData.allCharged) errors.push('Are all devices charged');
    if (!formData.anyMissing) errors.push('Any devices missing or stolen');
    if (!formData.anyBroken) errors.push('Any devices broken');
    if (selectedDeviceType === 'Chromebook' && !formData.lteWorking) {
      errors.push('LTE working status');
    }

    if (errors.length > 0) {
      toast({
        title: 'Required Fields Missing',
        description: `Please fill in: ${errors.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    createDeviceCheckMutation.mutate({
      deviceType: selectedDeviceType,
      teacher: formData.teacher,
      roomNumber: formData.roomNumber,
      allPresent: formData.allPresent === 'yes',
      missingStudents: formData.missingStudents,
      allCharged: formData.allCharged === 'yes',
      notChargedStudents: formData.notChargedStudents,
      anyMissing: formData.anyMissing === 'yes',
      missingDeviceStudents: formData.missingDeviceStudents,
      anyBroken: formData.anyBroken === 'yes',
      brokenAssetTag: formData.brokenAssetTag,
      lteWorking: selectedDeviceType === 'Chromebook' ? formData.lteWorking === 'yes' : null,
      lteBrokenAssetTag: formData.lteBrokenAssetTag,
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2>Device Checks</h2>
          <p className="text-slate-600">Monitor peer device status</p>
        </div>
        <Button onClick={handleStartNewCheck} className="gap-2">
          <Plus className="w-4 h-4" />
          Start Device Check
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search student or device..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode(viewMode === "list" ? "table" : "list")}
          >
            {viewMode === "list" ? (
              <Table className="w-4 h-4" />
            ) : (
              <LayoutList className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-slate-600">Status:</Label>
              <select
                className="px-2 py-1 text-sm border rounded-md"
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
              >
                <option value="all">All</option>
                <option value="completed">Checked</option>
                <option value="pending">Pending</option>
                <option value="issue">Issue</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-slate-600">Device:</Label>
              <select
                className="px-2 py-1 text-sm border rounded-md"
                value={filters.deviceType}
                onChange={(e) => setFilters({...filters, deviceType: e.target.value})}
              >
                <option value="all">All</option>
                <option value="ipad">iPad</option>
                <option value="chromebook">Chromebook</option>
              </select>
            </div>
            {(filters.status !== 'all' || filters.deviceType !== 'all' || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilters({ status: 'all', deviceType: 'all' });
                  setSearchQuery('');
                }}
              >
                Clear All
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-2 text-sm">
        {deviceChecksLoading ? (
          <>
            <Badge className="bg-slate-100 text-slate-400">...</Badge>
            <Badge className="bg-slate-100 text-slate-400">...</Badge>
            <Badge className="bg-slate-100 text-slate-400">...</Badge>
          </>
        ) : (
          <>
            <Badge className="bg-green-100 text-green-700">{checkedCount} Checked</Badge>
            <Badge className="bg-orange-100 text-orange-700">{pendingCount} Pending</Badge>
            <Badge className="bg-red-100 text-red-700">{issuesCount} Issues</Badge>
          </>
        )}
      </div>

      {/* Device List View */}
      {viewMode === "list" && (
        <div className="space-y-2">
          {deviceChecksLoading ? (
            <div className="text-center py-8 text-slate-500">
              Loading device checks...
            </div>
          ) : deviceChecksError ? (
            <div className="text-center py-8">
              <p className="text-red-500 mb-2">Error loading device checks</p>
              <p className="text-sm text-slate-400">
                {deviceChecksError instanceof Error ? deviceChecksError.message : 'Failed to load device checks. Please try again.'}
              </p>
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500 mb-2">
                {devices.length === 0 ? 'No device checks yet' : 'No devices match your search or filters'}
              </p>
              <p className="text-sm text-slate-400">
                {devices.length === 0 ? 'Start a new device check to get started' : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            filteredDevices.map((device) => {
              const statusInfo = getStatusBadge(device.status);
              return (
                <Card
                  key={device.id}
                  className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedDevice(device)}
                  data-testid={`card-device-check-${device.id}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(device.status)}
                      <span>
                        {device.type} {device.number}
                      </span>
                    </div>
                    <Badge className={statusInfo.className}>
                      {statusInfo.label}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-slate-600">{device.student}</p>
                      <p className="text-xs text-slate-400">
                        Grade {device.grade}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400">
                      Last: {device.lastCheck}
                    </span>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Table View (Spreadsheet Style) */}
      {viewMode === "table" && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className="p-2 text-left">Student</th>
                <th className="p-2 text-left">Device ID</th>
                <th className="p-2 text-center">Physical</th>
                <th className="p-2 text-center">Screen</th>
                <th className="p-2 text-center">Keyboard</th>
                <th className="p-2 text-center">Charging</th>
                <th className="p-2 text-center">Software</th>
                <th className="p-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {filteredDevices.map((device, index) => (
                <tr
                  key={device.id}
                  className={`border-b ${index % 2 === 0 ? "bg-slate-50" : ""} cursor-pointer hover:bg-blue-50`}
                  onClick={() => setSelectedDevice(device)}
                >
                  <td className="p-2">{device.student}</td>
                  <td className="p-2">
                    {device.type} {device.number}
                  </td>
                  <td className="p-2 text-center">
                    {device.status === "completed"
                      ? "✓"
                      : device.status === "issue"
                        ? "✗"
                        : "-"}
                  </td>
                  <td className="p-2 text-center">
                    {device.status === "completed"
                      ? "✓"
                      : device.status === "issue"
                        ? "✗"
                        : "-"}
                  </td>
                  <td className="p-2 text-center">
                    {device.status === "completed"
                      ? "✓"
                      : device.status === "issue"
                        ? "✗"
                        : "-"}
                  </td>
                  <td className="p-2 text-center">
                    {device.status === "completed"
                      ? "✓"
                      : device.status === "issue"
                        ? "✗"
                        : "-"}
                  </td>
                  <td className="p-2 text-center">
                    {device.status === "completed"
                      ? "✓"
                      : device.status === "issue"
                        ? "✗"
                        : "-"}
                  </td>
                  <td className="p-2 text-center">
                    <Badge
                      className={`${getStatusBadge(device.status).className} text-xs`}
                    >
                      {getStatusBadge(device.status).label}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Check Dialog */}
      <Dialog
        open={!!selectedDevice}
        onOpenChange={() => setSelectedDevice(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Device Check: {selectedDevice?.type} {selectedDevice?.number}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-600">
                Student: {selectedDevice?.student}
              </p>
              <p className="text-sm text-slate-600">
                Grade: {selectedDevice?.grade}
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm">Check Items</h3>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="physical"
                  checked={checkItems.physical}
                  onCheckedChange={(checked) =>
                    setCheckItems({ ...checkItems, physical: !!checked })
                  }
                />
                <Label htmlFor="physical" className="text-sm">
                  Physical condition
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="charging"
                  checked={checkItems.charging}
                  onCheckedChange={(checked) =>
                    setCheckItems({ ...checkItems, charging: !!checked })
                  }
                />
                <Label htmlFor="charging" className="text-sm">
                  Charging port working
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="screen"
                  checked={checkItems.screen}
                  onCheckedChange={(checked) =>
                    setCheckItems({ ...checkItems, screen: !!checked })
                  }
                />
                <Label htmlFor="screen" className="text-sm">
                  Screen functional
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="keyboard"
                  checked={checkItems.keyboard}
                  onCheckedChange={(checked) =>
                    setCheckItems({ ...checkItems, keyboard: !!checked })
                  }
                />
                <Label htmlFor="keyboard" className="text-sm">
                  Keyboard/Input working
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="software"
                  checked={checkItems.software}
                  onCheckedChange={(checked) =>
                    setCheckItems({ ...checkItems, software: !!checked })
                  }
                />
                <Label htmlFor="software" className="text-sm">
                  Software up to date
                </Label>
              </div>
            </div>

            <div>
              <Label htmlFor="notes" className="text-sm">
                Notes (optional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Any issues or observations..."
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDevice(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleDeviceCheckSubmit}
              disabled={updateDeviceCheckMutation.isPending}
            >
              {updateDeviceCheckMutation.isPending ? 'Submitting...' : 'Submit Check'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Device Check Flow */}
      <Dialog
        open={showNewCheckFlow}
        onOpenChange={() => setShowNewCheckFlow(false)}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {newCheckStep === "device-type" && (
            <>
              <DialogHeader>
                <DialogTitle>Start Device Check</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <p className="text-sm text-slate-600">
                  Select the type of device you're checking:
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <Card
                    className={`p-6 cursor-pointer hover:shadow-md transition-all ${selectedDeviceType === "iPad" ? "ring-2 ring-blue-600" : ""}`}
                    onClick={() => handleDeviceTypeSelect("iPad")}
                  >
                    <div className="text-center space-y-2">
                      <div className="text-4xl">📱</div>
                      <p>iPad</p>
                    </div>
                  </Card>

                  <Card
                    className={`p-6 cursor-pointer hover:shadow-md transition-all ${selectedDeviceType === "Chromebook" ? "ring-2 ring-blue-600" : ""}`}
                    onClick={() => handleDeviceTypeSelect("Chromebook")}
                  >
                    <div className="text-center space-y-2">
                      <div className="text-4xl">💻</div>
                      <p>Chromebook</p>
                    </div>
                  </Card>
                </div>
              </div>
            </>
          )}

          {newCheckStep === "form" && selectedDeviceType && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedDeviceType} Check Form</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Auto-filled Date and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">
                      Current Date <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      value={currentDate}
                      disabled
                      className="mt-1 bg-slate-50"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">
                      Current Time <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      value={currentTime}
                      disabled
                      className="mt-1 bg-slate-50"
                    />
                  </div>
                </div>

                {/* Teacher Name - Searchable */}
                <div>
                  <Label className="text-sm">
                    Teacher Name <span className="text-red-600">*</span>
                  </Label>
                  <Popover open={teacherOpen} onOpenChange={setTeacherOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between mt-1"
                        data-testid="button-select-teacher"
                      >
                        {formData.teacher || (isError ? "Error loading teachers" : teachersLoading ? "Loading teachers..." : "Select teacher...")}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput
                          placeholder="Search teachers..."
                          value={teacherSearch}
                          onValueChange={setTeacherSearch}
                        />
                        <CommandList>
                          <CommandEmpty>{isError ? "Failed to load teachers. Please try again." : "No teacher found."}</CommandEmpty>
                          <CommandGroup>
                            {teachers
                              .filter((teacher) => {
                                const fullName = `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.username;
                                return fullName.toLowerCase().includes(teacherSearch.toLowerCase());
                              })
                              .map((teacher) => {
                                const fullName = `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.username;
                                return (
                                  <CommandItem
                                    key={teacher.id}
                                    value={fullName}
                                    onSelect={() => {
                                      setFormData({ ...formData, teacher: fullName });
                                      setTeacherOpen(false);
                                      setTeacherSearch("");
                                    }}
                                    data-testid={`option-teacher-${teacher.id}`}
                                  >
                                    {fullName}
                                  </CommandItem>
                                );
                              })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Room Number */}
                <div>
                  <Label className="text-sm">
                    Room Number <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    value={formData.roomNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, roomNumber: e.target.value })
                    }
                    placeholder="Enter room number"
                    className="mt-1"
                  />
                </div>

                {/* All Present */}
                <div>
                  <Label className="text-sm">
                    Are all {selectedDeviceType}s present?{" "}
                    <span className="text-red-600">*</span>
                  </Label>
                  <RadioGroup
                    value={formData.allPresent}
                    onValueChange={(value) =>
                      setFormData({ ...formData, allPresent: value })
                    }
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="present-yes" />
                      <Label htmlFor="present-yes" className="text-sm">
                        Yes
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="present-no" />
                      <Label htmlFor="present-no" className="text-sm">
                        No
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Conditional: Missing Students */}
                {formData.allPresent === "no" && (
                  <div>
                    <Label className="text-sm">
                      If all {selectedDeviceType}s not present, select students:
                    </Label>
                    <Popover
                      open={missingStudentsOpen}
                      onOpenChange={setMissingStudentsOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between mt-1 h-auto min-h-[40px]"
                        >
                          <div className="flex flex-wrap gap-1">
                            {formData.missingStudents.length > 0 ? (
                              formData.missingStudents.map((student) => (
                                <Badge
                                  key={student}
                                  variant="secondary"
                                  className="gap-1"
                                >
                                  {student}
                                  <X
                                    className="w-3 h-3 cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFormData({
                                        ...formData,
                                        missingStudents: removeStudent(
                                          formData.missingStudents,
                                          student,
                                        ),
                                      });
                                    }}
                                  />
                                </Badge>
                              ))
                            ) : (
                              <span className="text-slate-500">
                                Select students...
                              </span>
                            )}
                          </div>
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                        <Command>
                          <CommandInput placeholder="Search students..." />
                          <CommandList>
                            <CommandEmpty>No student found.</CommandEmpty>
                            <CommandGroup>
                              {STUDENTS.map((student) => (
                                <CommandItem
                                  key={student}
                                  value={student}
                                  onSelect={() => {
                                    setFormData({
                                      ...formData,
                                      missingStudents: toggleStudent(
                                        formData.missingStudents,
                                        student,
                                      ),
                                    });
                                  }}
                                >
                                  <Checkbox
                                    checked={formData.missingStudents.includes(
                                      student,
                                    )}
                                    className="mr-2"
                                  />
                                  {student}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {/* All Charged */}
                <div>
                  <Label className="text-sm">
                    Are all {selectedDeviceType}s charged?{" "}
                    <span className="text-red-600">*</span>
                  </Label>
                  <RadioGroup
                    value={formData.allCharged}
                    onValueChange={(value) =>
                      setFormData({ ...formData, allCharged: value })
                    }
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="charged-yes" />
                      <Label htmlFor="charged-yes" className="text-sm">
                        Yes
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="charged-no" />
                      <Label htmlFor="charged-no" className="text-sm">
                        No
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Conditional: Not Charged Students */}
                {formData.allCharged === "no" && (
                  <div>
                    <Label className="text-sm">
                      If all {selectedDeviceType}s not charged, select students:
                    </Label>
                    <Popover
                      open={notChargedStudentsOpen}
                      onOpenChange={setNotChargedStudentsOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between mt-1 h-auto min-h-[40px]"
                        >
                          <div className="flex flex-wrap gap-1">
                            {formData.notChargedStudents.length > 0 ? (
                              formData.notChargedStudents.map((student) => (
                                <Badge
                                  key={student}
                                  variant="secondary"
                                  className="gap-1"
                                >
                                  {student}
                                  <X
                                    className="w-3 h-3 cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFormData({
                                        ...formData,
                                        notChargedStudents: removeStudent(
                                          formData.notChargedStudents,
                                          student,
                                        ),
                                      });
                                    }}
                                  />
                                </Badge>
                              ))
                            ) : (
                              <span className="text-slate-500">
                                Select students...
                              </span>
                            )}
                          </div>
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                        <Command>
                          <CommandInput placeholder="Search students..." />
                          <CommandList>
                            <CommandEmpty>No student found.</CommandEmpty>
                            <CommandGroup>
                              {STUDENTS.map((student) => (
                                <CommandItem
                                  key={student}
                                  value={student}
                                  onSelect={() => {
                                    setFormData({
                                      ...formData,
                                      notChargedStudents: toggleStudent(
                                        formData.notChargedStudents,
                                        student,
                                      ),
                                    });
                                  }}
                                >
                                  <Checkbox
                                    checked={formData.notChargedStudents.includes(
                                      student,
                                    )}
                                    className="mr-2"
                                  />
                                  {student}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {/* Missing or Stolen */}
                <div>
                  <Label className="text-sm">
                    Any {selectedDeviceType}s missing or stolen?{" "}
                    <span className="text-red-600">*</span>
                  </Label>
                  <RadioGroup
                    value={formData.anyMissing}
                    onValueChange={(value) =>
                      setFormData({ ...formData, anyMissing: value })
                    }
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="missing-yes" />
                      <Label htmlFor="missing-yes" className="text-sm">
                        Yes
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="missing-no" />
                      <Label htmlFor="missing-no" className="text-sm">
                        No
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Conditional: Missing Device Students */}
                {formData.anyMissing === "yes" && (
                  <div>
                    <Label className="text-sm">
                      If any {selectedDeviceType}s missing, select students:
                    </Label>
                    <Popover
                      open={missingDeviceStudentsOpen}
                      onOpenChange={setMissingDeviceStudentsOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between mt-1 h-auto min-h-[40px]"
                        >
                          <div className="flex flex-wrap gap-1">
                            {formData.missingDeviceStudents.length > 0 ? (
                              formData.missingDeviceStudents.map((student) => (
                                <Badge
                                  key={student}
                                  variant="secondary"
                                  className="gap-1"
                                >
                                  {student}
                                  <X
                                    className="w-3 h-3 cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFormData({
                                        ...formData,
                                        missingDeviceStudents: removeStudent(
                                          formData.missingDeviceStudents,
                                          student,
                                        ),
                                      });
                                    }}
                                  />
                                </Badge>
                              ))
                            ) : (
                              <span className="text-slate-500">
                                Select students...
                              </span>
                            )}
                          </div>
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                        <Command>
                          <CommandInput placeholder="Search students..." />
                          <CommandList>
                            <CommandEmpty>No student found.</CommandEmpty>
                            <CommandGroup>
                              {STUDENTS.map((student) => (
                                <CommandItem
                                  key={student}
                                  value={student}
                                  onSelect={() => {
                                    setFormData({
                                      ...formData,
                                      missingDeviceStudents: toggleStudent(
                                        formData.missingDeviceStudents,
                                        student,
                                      ),
                                    });
                                  }}
                                >
                                  <Checkbox
                                    checked={formData.missingDeviceStudents.includes(
                                      student,
                                    )}
                                    className="mr-2"
                                  />
                                  {student}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {/* Any Broken */}
                <div>
                  <Label className="text-sm">
                    Are any {selectedDeviceType}s broken in any way?{" "}
                    <span className="text-red-600">*</span>
                  </Label>
                  <RadioGroup
                    value={formData.anyBroken}
                    onValueChange={(value) =>
                      setFormData({ ...formData, anyBroken: value })
                    }
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="broken-yes" />
                      <Label htmlFor="broken-yes" className="text-sm">
                        Yes
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="broken-no" />
                      <Label htmlFor="broken-no" className="text-sm">
                        No
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Conditional: Broken Asset Tag */}
                {formData.anyBroken === "yes" && (
                  <div>
                    <Label className="text-sm">
                      If any {selectedDeviceType} is broken, get asset tag from{" "}
                      {selectedDeviceType}:
                    </Label>
                    <Input
                      value={formData.brokenAssetTag}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          brokenAssetTag: e.target.value,
                        })
                      }
                      placeholder="Enter asset tag..."
                      className="mt-1"
                    />
                  </div>
                )}

                {/* LTE Working (Chromebook only) */}
                {selectedDeviceType === "Chromebook" && (
                  <>
                    <div>
                      <Label className="text-sm">
                        Is the LTE working off campus?{" "}
                        <span className="text-red-600">*</span>
                      </Label>
                      <RadioGroup
                        value={formData.lteWorking}
                        onValueChange={(value) =>
                          setFormData({ ...formData, lteWorking: value })
                        }
                        className="mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="lte-yes" />
                          <Label htmlFor="lte-yes" className="text-sm">
                            Yes
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="lte-no" />
                          <Label htmlFor="lte-no" className="text-sm">
                            No
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Conditional: LTE Broken Asset Tag */}
                    {formData.lteWorking === "no" && (
                      <div>
                        <Label className="text-sm">
                          If LTE is not working, get asset tag from Chromebook:
                        </Label>
                        <Input
                          value={formData.lteBrokenAssetTag}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              lteBrokenAssetTag: e.target.value,
                            })
                          }
                          placeholder="Enter asset tag..."
                          className="mt-1"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setNewCheckStep("device-type");
                    setSelectedDeviceType(null);
                  }}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleFormSubmit}
                  disabled={createDeviceCheckMutation.isPending}
                >
                  {createDeviceCheckMutation.isPending ? 'Submitting...' : 'Submit Check'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
