import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { PlusCircle, BookOpen } from 'lucide-react';
import type { Course } from '@shared/schema';

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-700',
  published: 'bg-green-100 text-green-700',
  archived: 'bg-slate-100 text-slate-700',
};

const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  advanced: 'bg-red-100 text-red-700',
};

export function CoursesList() {
  const { data: courses = [], isLoading } = useQuery<Course[]>({
    queryKey: ['/api/courses'],
  });

  if (isLoading) {
    return <div className="text-center py-8 text-slate-500">Loading courses...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Courses</h2>
          <p className="text-slate-600">Manage learning content</p>
        </div>
        <Link href="/internal/courses/new">
          <Button>
            <PlusCircle className="w-4 h-4 mr-2" />
            New Course
          </Button>
        </Link>
      </div>

      {courses.length === 0 ? (
        <Card className="p-8 text-center">
          <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">No courses yet. Create your first course!</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <Link key={course.id} href={`/internal/courses/${course.id}`}>
              <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer h-full">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-lg leading-tight">{course.title}</h3>
                    <Badge className={statusColors[course.status] || ''}>
                      {course.status}
                    </Badge>
                  </div>
                  {course.description && (
                    <p className="text-sm text-slate-600 line-clamp-2">{course.description}</p>
                  )}
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="capitalize">{course.category.replace('_', ' ')}</Badge>
                    <Badge className={difficultyColors[course.difficulty] || ''}>
                      {course.difficulty}
                    </Badge>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
