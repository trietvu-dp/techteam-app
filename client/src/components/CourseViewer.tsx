import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useRoute } from 'wouter';
import { Video, FileText, BookOpen, CheckCircle, Circle, ArrowLeft, Download } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type { Course, Lesson, CourseProgress } from '@shared/schema';
import { Link } from 'wouter';

interface LessonWithUrl extends Lesson {
  downloadUrl?: string;
}

interface CourseWithLessons extends Course {
  lessons: LessonWithUrl[];
}

export function CourseViewer() {
  const [, params] = useRoute('/learn/courses/:id');
  const courseId = params?.id;
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedLessonIndex, setSelectedLessonIndex] = useState(0);

  const { data: course, isLoading } = useQuery<CourseWithLessons>({
    queryKey: [`/api/courses/${courseId}`],
    enabled: !!courseId,
  });

  const { data: progress = [] } = useQuery<CourseProgress[]>({
    queryKey: [`/api/courses/${courseId}/progress`],
    enabled: !!courseId,
  });

  const completedLessonIds = new Set(progress.filter(p => p.completed).map(p => p.lessonId));

  const handleMarkComplete = async (lessonId: string) => {
    try {
      await apiRequest('POST', `/api/courses/${courseId}/lessons/${lessonId}/complete`);
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/progress`] });
      queryClient.invalidateQueries({ queryKey: ['/api/courses/progress/summary'] });
      toast({ title: 'Lesson completed!' });
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

  const lessons = course.lessons || [];
  const selectedLesson = lessons[selectedLessonIndex];
  const totalLessons = lessons.length;
  const completedCount = lessons.filter(l => completedLessonIds.has(l.id)).length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Back link & header */}
      <Link href="/learn">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Courses
        </Button>
      </Link>

      <div>
        <h2 className="text-2xl font-bold">{course.title}</h2>
        {course.description && <p className="text-slate-600 mt-1">{course.description}</p>}
        <div className="flex items-center gap-4 mt-3">
          <Progress value={progressPercent} className="flex-1 h-2" />
          <span className="text-sm text-slate-600">{completedCount}/{totalLessons} completed</span>
        </div>
      </div>

      {totalLessons === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-slate-500">This course has no lessons yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Lesson list sidebar */}
          <div className="space-y-1">
            <h3 className="font-semibold mb-2">Lessons</h3>
            {lessons.map((lesson, index) => {
              const isCompleted = completedLessonIds.has(lesson.id);
              const isActive = index === selectedLessonIndex;
              return (
                <Card
                  key={lesson.id}
                  className={`p-3 cursor-pointer transition-colors ${isActive ? 'border-blue-500 bg-blue-50' : 'hover:bg-slate-50'}`}
                  onClick={() => setSelectedLessonIndex(index)}
                >
                  <div className="flex items-center gap-2">
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{lesson.title}</p>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Badge variant="secondary" className="text-xs">{lesson.lessonType}</Badge>
                        {lesson.duration && <span>{lesson.duration}</span>}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Content area */}
          <div className="lg:col-span-2">
            {selectedLesson && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">{selectedLesson.title}</h3>
                  {!completedLessonIds.has(selectedLesson.id) ? (
                    <Button size="sm" onClick={() => handleMarkComplete(selectedLesson.id)}>
                      Mark Complete
                    </Button>
                  ) : (
                    <Badge className="bg-green-100 text-green-700">Completed</Badge>
                  )}
                </div>

                {selectedLesson.description && (
                  <p className="text-slate-600 mb-4">{selectedLesson.description}</p>
                )}

                {/* Video content */}
                {selectedLesson.lessonType === 'video' && selectedLesson.downloadUrl && (
                  <div className="mb-4">
                    <video
                      controls
                      className="w-full rounded-lg bg-black"
                      src={selectedLesson.downloadUrl}
                    >
                      Your browser does not support video playback.
                    </video>
                  </div>
                )}

                {/* Document content */}
                {selectedLesson.lessonType === 'document' && selectedLesson.downloadUrl && (
                  <div className="mb-4">
                    <a href={selectedLesson.downloadUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline">
                        <Download className="w-4 h-4 mr-2" /> Download Document
                      </Button>
                    </a>
                  </div>
                )}

                {/* Article content */}
                {selectedLesson.lessonType === 'article' && selectedLesson.content && (
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap">{selectedLesson.content}</div>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
