import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocation } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Course } from '@shared/schema';

const categories = ['hardware', 'software', 'network', 'security', 'troubleshooting', 'best_practices', 'certifications'];
const difficulties = ['beginner', 'intermediate', 'advanced'];
const statuses = ['draft', 'published', 'archived'];

interface CourseEditorProps {
  courseId?: string;
}

export function CourseEditor({ courseId }: CourseEditorProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isEditing = !!courseId;

  const { data: existingCourse } = useQuery<Course>({
    queryKey: [`/api/courses/${courseId}`],
    enabled: isEditing,
  });

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'hardware',
    difficulty: 'beginner',
    status: 'draft',
    sortOrder: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingCourse) {
      setForm({
        title: existingCourse.title,
        description: existingCourse.description || '',
        category: existingCourse.category,
        difficulty: existingCourse.difficulty,
        status: existingCourse.status,
        sortOrder: existingCourse.sortOrder,
      });
    }
  }, [existingCourse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEditing) {
        await apiRequest('PATCH', `/api/courses/${courseId}`, form);
        toast({ title: 'Course updated' });
      } else {
        const res = await apiRequest('POST', '/api/courses', form);
        const course = await res.json();
        toast({ title: 'Course created' });
        setLocation(`/internal/courses/${course.id}`);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h2 className="text-2xl font-bold">{isEditing ? 'Edit Course' : 'Create Course'}</h2>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Course title"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Course description"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">{c.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Difficulty</label>
              <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {difficulties.map((d) => (
                    <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Sort Order</label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : isEditing ? 'Update Course' : 'Create Course'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setLocation('/internal')}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
