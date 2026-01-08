import { useState, useEffect, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Clock,
  AlertCircle,
  CheckCircle,
  Wrench,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Ticket, TicketNote } from "@shared/schema";

interface RepairsProps {
  triggerNew?: boolean;
  onTriggerComplete?: () => void;
}

export function Repairs({ triggerNew, onTriggerComplete }: RepairsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const sessionUser = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("auth:user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);
  const effectiveUser = user ?? sessionUser;
  const isStudentFromSession = sessionUser?.role === "student";
  const [showNewRepair, setShowNewRepair] = useState(false);
  const [showUpdateStatus, setShowUpdateStatus] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<
    "pending" | "in_progress" | "completed" | "issue"
  >("pending");

  const [selectedRepair, setSelectedRepair] = useState<null | {
    id: string;
    device: string;
    student: string;
    issue: string;
    priority: string;
    status: string;
    submitted: string;
    assignedTo: string
  }>(null);

  const [newDeviceNumber, setNewDeviceNumber] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentGrade, setNewStudentGrade] = useState("");
  const [newDeviceType, setNewDeviceType] = useState<
    "" | "ipad" | "chromebook" | "laptop" | "pc_laptop" | "macbook"
  >("");
  const [newIssueDescription, setNewIssueDescription] = useState("");
  const [newIssueType, setNewIssueType] = useState<"repair">("repair");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">(
    "medium",
  );
  const [lastSubmittedRepair, setLastSubmittedRepair] = useState<null | {
    deviceNumber: string;
    studentName: string;
    studentGrade: string;
    deviceType: "" | "ipad" | "chromebook" | "laptop" | "pc_laptop" | "macbook";
    issueDescription: string;
    issueType: "repair";
    priority: "low" | "medium" | "high";
  }>(null);

  // Filter state
  const [filters, setFilters] = useState({
    status: 'all',
    deviceType: 'all',
    assignedToMe: false,
  });

  // Notes state
  const [ticketNotes, setTicketNotes] = useState<TicketNote[]>([]);
  const [newNoteText, setNewNoteText] = useState("");
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Fetch repairs from the database
  const { data: repairsData = [], isLoading: repairsLoading, error: repairsError } = useQuery<Ticket[]>({
    queryKey: ['/api/student/repairs'],
    enabled: !!effectiveUser,
  });

  // Transform repairs data to match UI expectations
  const repairs = useMemo<Array<{
    id: string;
    device: string;
    student: string;
    issue: string;
    priority: string;
    status: string;
    submitted: string;
    assignedTo: string;
  }>>(() =>
    repairsData.map((repair) => ({
      id: repair.id,
      device: `${repair.deviceType} ${repair.deviceNumber || ''}`,
      student: repair.studentName,
      issue: repair.issueDescription,
      priority: repair.priority || 'medium',
      status: repair.status,
      submitted: formatRelativeTime(repair.createdAt),
      assignedTo: repair.assignedTo === effectiveUser?.id ? 'You' : 'Tech Team',
    }))
  , [repairsData, effectiveUser]);

  // Calculate actual counts from data with memoization
  const { pendingRepairsCount, inProgressCount, completedCount } = useMemo(() => ({
    pendingRepairsCount: repairs.filter(r => r.status === 'pending').length,
    inProgressCount: repairs.filter(r => r.status === 'in_progress').length,
    completedCount: repairs.filter(r => r.status === 'completed').length,
  }), [repairs]);

  // Filter repairs based on current filters
  const filteredRepairs = useMemo(() => {
    return repairs.filter(repair => {
      if (filters.status !== 'all' && repair.status !== filters.status) return false;
      if (filters.deviceType !== 'all' && !repair.device.toLowerCase().includes(filters.deviceType)) return false;
      if (filters.assignedToMe && repair.assignedTo !== 'You') return false;
      return true;
    });
  }, [repairs, filters]);

  function formatRelativeTime(dateInput: string | Date) {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    if (diffInDays === 1) return '1 day ago';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  }

  // Effect to handle external trigger
  useEffect(() => {
    if (triggerNew) {
      setShowNewRepair(true);
      onTriggerComplete?.();
    }
  }, [triggerNew]);

  // Auto-populate student name from session storage for students
  useEffect(() => {
    if (isStudentFromSession && sessionUser) {
      const fullName = `${sessionUser.firstName || ''} ${sessionUser.lastName || ''}`.trim();
      setNewStudentName(fullName);
    }
  }, [isStudentFromSession, sessionUser]);

  // Fetch notes when a repair is selected
  useEffect(() => {
    if (selectedRepair) {
      setIsLoadingNotes(true);
      fetch(`/api/tickets/${selectedRepair.id}/notes`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          setTicketNotes(Array.isArray(data) ? data : []);
        })
        .catch(err => {
          console.error('Failed to fetch notes:', err);
          setTicketNotes([]);
        })
        .finally(() => setIsLoadingNotes(false));
    } else {
      setTicketNotes([]);
      setNewNoteText("");
    }
  }, [selectedRepair]);

  // Handle adding a new note
  const handleAddNote = async () => {
    if (!selectedRepair || !newNoteText.trim()) return;
    setIsAddingNote(true);
    try {
      const res = await apiRequest('POST', `/api/tickets/${selectedRepair.id}/notes`, {
        noteText: newNoteText.trim()
      });
      const newNote = await res.json();
      setTicketNotes(prev => [...prev, newNote]);
      setNewNoteText("");
      toast({
        title: 'Note added',
        description: 'Your note has been saved.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add note',
        variant: 'destructive',
      });
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleSubmitRepair = async () => {
    const payload = {
      deviceNumber: newDeviceNumber,
      studentName: newStudentName,
      studentGrade: isStudentFromSession ? newStudentGrade : "N/A",
      deviceType: newDeviceType,
      issueDescription: newIssueDescription,
      issueType: newIssueType,
      status: 'pending',
      priority: newPriority,
    };

    setLastSubmittedRepair(payload);
    console.log(payload);

    if (!payload.deviceType) {
      setShowNewRepair(false);
      return;
    }

    if (isStudentFromSession && !payload.studentGrade) {
      setShowNewRepair(false);
      return;
    }
    try {
      const res = await apiRequest('POST', '/api/tickets', payload);
      const repairResponse = await res.json();
      console.log(repairResponse);
      queryClient.invalidateQueries({ queryKey: ["/api/student/repairs"] });
    } catch (error) {
      console.error(error);
    }

    setShowNewRepair(false);
  };

  const handleOpenUpdateStatus = () => {
    if (!selectedRepair) return;
    setUpdateStatus(selectedRepair.status as "pending" | "in_progress" | "completed" | "issue");
    setShowUpdateStatus(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedRepair) return;
    try {
      await apiRequest("PATCH", `/api/tickets/${selectedRepair.id}`, {
        status: updateStatus,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/student/repairs"] });
      setSelectedRepair({ ...selectedRepair, status: updateStatus });
      setShowUpdateStatus(false);
    } catch (error) {
      console.error(error);
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: "bg-red-100 text-red-700",
      medium: "bg-orange-100 text-orange-700",
      low: "bg-blue-100 text-blue-700",
    };
    return colors[priority] || colors.medium;
  };

  const getStatusInfo = (status: string) => {
    const info: Record<
      string,
      { icon: any; label: string; className: string }
    > = {
      pending: {
        icon: Clock,
        label: "Pending",
        className: "bg-slate-100 text-slate-700",
      },
      in_progress: {
        icon: Wrench,
        label: "In Progress",
        className: "bg-blue-100 text-blue-700",
      },
      completed: {
        icon: CheckCircle,
        label: "Completed",
        className: "bg-green-100 text-green-700",
      },
      issue: {
        icon: AlertCircle,
        label: "Issue",
        className: "bg-red-100 text-red-700",
      },
    };
    return info[status] || info.pending;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2>Repair Tracking</h2>
          <p className="text-slate-600">Monitor device repairs</p>
        </div>
        <Button onClick={() => setShowNewRepair(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Repair Ticket
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <div className="text-orange-600">
            {repairsLoading ? '...' : pendingRepairsCount}
          </div>
          <p className="text-xs text-slate-600">Pending</p>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-blue-600">
            {repairsLoading ? '...' : inProgressCount}
          </div>
          <p className="text-xs text-slate-600">In Progress</p>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-green-600">
            {repairsLoading ? '...' : completedCount}
          </div>
          <p className="text-xs text-slate-600">Completed</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filters.status} onValueChange={(v) => setFilters({...filters, status: v})}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="issue">Issue</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.deviceType} onValueChange={(v) => setFilters({...filters, deviceType: v})}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Device Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Devices</SelectItem>
            <SelectItem value="ipad">iPad</SelectItem>
            <SelectItem value="chromebook">Chromebook</SelectItem>
            <SelectItem value="laptop">Laptop</SelectItem>
            <SelectItem value="pc_laptop">PC Laptop</SelectItem>
            <SelectItem value="macbook">MacBook</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={filters.assignedToMe ? "default" : "outline"}
          size="sm"
          onClick={() => setFilters({...filters, assignedToMe: !filters.assignedToMe})}
        >
          Assigned to Me
        </Button>

        {(filters.status !== 'all' || filters.deviceType !== 'all' || filters.assignedToMe) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters({ status: 'all', deviceType: 'all', assignedToMe: false })}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Repairs List */}
      <div className="space-y-2">
        {repairsLoading ? (
          <div className="text-center py-8 text-slate-500">
            Loading repairs...
          </div>
        ) : repairsError ? (
          <div className="text-center py-8">
            <p className="text-red-500 mb-2">Error loading repairs</p>
            <p className="text-sm text-slate-400">
              {repairsError instanceof Error ? repairsError.message : 'Failed to load repairs. Please try again.'}
            </p>
          </div>
        ) : filteredRepairs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500 mb-2">
              {repairs.length === 0 ? 'No repairs yet' : 'No repairs match your filters'}
            </p>
            <p className="text-sm text-slate-400">
              {repairs.length === 0 ? 'Report a new repair to get started' : 'Try adjusting your filters'}
            </p>
          </div>
        ) : (
          filteredRepairs.map((repair) => {
            const statusInfo = getStatusInfo(repair.status);
            const StatusIcon = statusInfo.icon;

            return (
              <Card
                key={repair.id}
                className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedRepair(repair)}
                data-testid={`card-repair-${repair.id}`}
              >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <StatusIcon className="w-4 h-4 text-slate-600" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span>{repair.device}</span>
                      <Badge
                        className={getPriorityColor(repair.priority)}
                        variant="secondary"
                      >
                        {repair.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">{repair.student}</p>
                  </div>
                </div>
                <Badge className={statusInfo.className}>
                  {statusInfo.label}
                </Badge>
              </div>
              <div className="text-sm">
                <p className="text-slate-700">{repair.issue}</p>
                <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
                  <span>Assigned: {repair.assignedTo}</span>
                  <span>{repair.submitted}</span>
                </div>
              </div>
            </Card>
          );
        })
        )}
      </div>

      {/* New Repair Dialog */}
      <Dialog open={showNewRepair} onOpenChange={setShowNewRepair}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Report New Repair</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="device-number">Device Number</Label>
              <Input
                id="device-number"
                placeholder="e.g., Chrome #1234"
                value={newDeviceNumber}
                onChange={(e) => setNewDeviceNumber(e.target.value)}
              />
            </div>

            {!isStudentFromSession && (
              <div>
                <Label htmlFor="student-name">Student Name</Label>
                <Input
                  id="student-name"
                  placeholder="e.g., Harry Potter"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                />
              </div>
            )}

            {isStudentFromSession && (
              <div>
                <Label htmlFor="student-grade">Student Grade</Label>
                <Input
                  id="student-grade"
                  placeholder="e.g., A, B, C, D, or F"
                  value={newStudentGrade}
                  onChange={(e) => setNewStudentGrade(e.target.value)}
                />
              </div>
            )}

            <div>
              <Label htmlFor="device-type">Device Type</Label>
              <Select value={newDeviceType} onValueChange={(v) => setNewDeviceType(v as any)}>
                <SelectTrigger id="device-type">
                  <SelectValue placeholder="Select device type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ipad">iPad</SelectItem>
                  <SelectItem value="chromebook">Chromebook</SelectItem>
                  <SelectItem value="laptop">Laptop</SelectItem>
                  <SelectItem value="pc_laptop">PC Laptop</SelectItem>
                  <SelectItem value="macbook">MacBook</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="issue">Issue Description</Label>
              <Textarea
                id="issue"
                placeholder="Describe the problem..."
                value={newIssueDescription}
                onChange={(e) => setNewIssueDescription(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="issue-type">Issue Type</Label>
              <Select value={newIssueType} onValueChange={(v) => setNewIssueType(v as "repair")}>
                <SelectTrigger id="issue-type">
                  <SelectValue placeholder="Select issue type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="repair">Repair</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={newPriority} onValueChange={(v) => setNewPriority(v as any)}>
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewRepair(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitRepair}>
              Submit Repair
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Repair Detail Dialog */}
      <Dialog
        open={!!selectedRepair}
        onOpenChange={() => setSelectedRepair(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Repair Details</DialogTitle>
          </DialogHeader>

          {selectedRepair && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Repair ID:</span>
                <span>{selectedRepair.id}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Device:</span>
                <span>{selectedRepair.device}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Student:</span>
                <span>{selectedRepair.student}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Priority:</span>
                <Badge className={getPriorityColor(selectedRepair.priority)}>
                  {selectedRepair.priority}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Status:</span>
                <Badge
                  className={getStatusInfo(selectedRepair.status).className}
                >
                  {getStatusInfo(selectedRepair.status).label}
                </Badge>
              </div>

              <div>
                <span className="text-sm text-slate-600">Issue:</span>
                <p className="mt-1">{selectedRepair.issue}</p>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Assigned To:</span>
                <span>{selectedRepair.assignedTo}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Submitted:</span>
                <span>{selectedRepair.submitted}</span>
              </div>

              {/* Notes Section */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-2">Notes</h3>
                {isLoadingNotes ? (
                  <p className="text-sm text-slate-400">Loading notes...</p>
                ) : ticketNotes.length === 0 ? (
                  <p className="text-sm text-slate-400">No notes yet</p>
                ) : (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {ticketNotes.map((note) => (
                      <div key={note.id} className="text-sm p-2 bg-slate-50 rounded">
                        <p>{note.noteText}</p>
                        <span className="text-xs text-slate-400">
                          {formatRelativeTime(note.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex gap-2">
                  <Textarea
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Add a note..."
                    className="flex-1 min-h-[60px]"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddNote}
                    disabled={isAddingNote || !newNoteText.trim()}
                  >
                    {isAddingNote ? '...' : 'Add'}
                  </Button>
                </div>
              </div>

              {selectedRepair.status !== "completed" && (
                <div className="pt-2 space-y-2">
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={handleOpenUpdateStatus}
                    data-testid="button-open-update-status"
                  >
                    Update Status
                  </Button>
                  <Button className="w-full">Mark as Complete</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={showUpdateStatus} onOpenChange={setShowUpdateStatus}>
        <DialogContent className="max-w-sm" data-testid="dialog-update-status">
          <DialogHeader>
            <DialogTitle>Update Status</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="update-status">Status</Label>
              <Select value={updateStatus} onValueChange={(v) => setUpdateStatus(v as any)}>
                <SelectTrigger id="update-status" data-testid="select-update-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="issue">Issue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUpdateStatus(false)}
              data-testid="button-cancel-update-status"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={!selectedRepair}
              data-testid="button-confirm-update-status"
            >
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
