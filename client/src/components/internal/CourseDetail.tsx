import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Link, useLocation } from 'wouter';
import { PlusCircle, Pencil, Trash2, Video, FileText, BookOpen, Upload } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useFileUpload } from '@/hooks/useFileUpload';
import type { Course, Lesson } from '@shared/schema';

interface CourseWithLessons extends Course {
  lessons: (Lesson & { downloadUrl?: string })[];
}

interface CourseDetailProps {
  courseId: string;
}

const lessonTypeIcons: Record<string, React.ReactNode> = {
  video: <Video className="w-4 h-4 text-red-600" />,
  document: <FileText className="w-4 h-4 text-blue-600" />,
  article: <BookOpen className="w-4 h-4 text-green-600" />,
};

export function CourseDetail({ courseId }: CourseDetailProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { progress: uploadProgress, uploading, upload } = useFileUpload();

  const { data: course, isLoading } = useQuery<CourseWithLessons>({
    queryKey: [`/api/courses/${courseId}`],
  });

  const [showAddLesson, setShowAddLesson] = useState(false);
  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    lessonType: 'article' as string,
    content: '',
    duration: '',
    sortOrder: 0,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const handleDeleteCourse = async () => {
    if (!confirm('Are you sure you want to delete this course? This cannot be undone.')) return;
    try {
      await apiRequest('DELETE', `/api/courses/${courseId}`);
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
      toast({ title: 'Course deleted' });
      setLocation('/internal');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleAddLesson = async () => {
    setSaving(true);
    try {
      let s3Key: string | undefined;

      // Upload file if provided
      if (selectedFile && (lessonForm.lessonType === 'video' || lessonForm.lessonType === 'document')) {
        const key = await upload(courseId, selectedFile, lessonForm.lessonType);
        if (!key) {
          setSaving(false);
          return;
        }
        s3Key = key;
      }

      await apiRequest('POST', `/api/courses/${courseId}/lessons`, {
        ...lessonForm,
        s3Key,
        content: lessonForm.lessonType === 'article' ? lessonForm.content : undefined,
      });

      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}`] });
      toast({ title: 'Lesson added' });
      setShowAddLesson(false);
      setLessonForm({ title: '', description: '', lessonType: 'article', content: '', duration: '', sortOrder: 0 });
      setSelectedFile(null);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Delete this lesson?')) return;
    try {
      await apiRequest('DELETE', `/api/courses/${courseId}/lessons/${lessonId}`);
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}`] });
      toast({ title: 'Lesson deleted' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-slate-500">Loading course...</div>;
  }

  if (!course) {
    return <div className="text-center py-8 text-slate-500">Course not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Course Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{course.title}</h2>
          {course.description && <p className="text-slate-600 mt-1">{course.description}</p>}
          <div className="flex gap-2 mt-2">
            <Badge className={
              course.status === 'published' ? 'bg-green-100 text-green-700' :
              course.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
              'bg-slate-100 text-slate-700'
            }>{course.status}</Badge>
            <Badge variant="secondary" className="capitalize">{course.category.replace('_', ' ')}</Badge>
            <Badge variant="outline">{course.difficulty}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/internal/courses/${courseId}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="w-4 h-4 mr-1" /> Edit
            </Button>
          </Link>
          <Button variant="destructive" size="sm" onClick={handleDeleteCourse}>
            <Trash2 className="w-4 h-4 mr-1" /> Delete
          </Button>
        </div>
      </div>

      {/* Lessons */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Lessons ({course.lessons?.length || 0})</h3>
          <Button size="sm" onClick={() => setShowAddLesson(true)}>
            <PlusCircle className="w-4 h-4 mr-1" /> Add Lesson
          </Button>
        </div>

        {!course.lessons?.length ? (
          <Card className="p-8 text-center">
            <p className="text-slate-500">No lessons yet. Add your first lesson!</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {course.lessons.map((lesson, index) => (
              <Card key={lesson.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-400 w-6">{index + 1}.</span>
                    {lessonTypeIcons[lesson.lessonType]}
                    <div>
                      <h4 className="font-medium">{lesson.title}</h4>
                      {lesson.description && <p className="text-sm text-slate-600">{lesson.description}</p>}
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">{lesson.lessonType}</Badge>
                        {lesson.duration && <span className="text-xs text-slate-500">{lesson.duration}</span>}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteLesson(lesson.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Lesson Dialog */}
      <Dialog open={showAddLesson} onOpenChange={setShowAddLesson}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Lesson</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={lessonForm.title}
                onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                placeholder="Lesson title"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={lessonForm.description}
                onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                placeholder="Brief description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select value={lessonForm.lessonType} onValueChange={(v) => setLessonForm({ ...lessonForm, lessonType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="article">Article</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Duration</label>
                <Input
                  value={lessonForm.duration}
                  onChange={(e) => setLessonForm({ ...lessonForm, duration: e.target.value })}
                  placeholder="e.g., 5 min"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Sort Order</label>
              <Input
                type="number"
                value={lessonForm.sortOrder}
                onChange={(e) => setLessonForm({ ...lessonForm, sortOrder: parseInt(e.target.value) || 0 })}
              />
            </div>

            {lessonForm.lessonType === 'article' ? (
              <div>
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  value={lessonForm.content}
                  onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                  placeholder="Article content..."
                  rows={8}
                />
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium">Upload File</label>
                <div className="mt-1">
                  <Input
                    type="file"
                    accept={lessonForm.lessonType === 'video' ? 'video/*' : '.pdf,.doc,.docx,.ppt,.pptx'}
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                  {uploading && (
                    <div className="mt-2">
                      <Progress value={uploadProgress} className="h-2" />
                      <p className="text-xs text-slate-500 mt-1">Uploading... {uploadProgress}%</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLesson(false)}>Cancel</Button>
            <Button onClick={handleAddLesson} disabled={saving || uploading || !lessonForm.title}>
              {saving ? 'Saving...' : 'Add Lesson'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
