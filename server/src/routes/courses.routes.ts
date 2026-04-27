import { Router } from "express";
import { storage } from "../db/storage.ts";
import { requireAuth, requireContentManager } from "../middleware/auth.ts";
import { insertCourseSchema, insertLessonSchema } from "@shared/schema.ts";
import { fromError } from "zod-validation-error";
import { getUploadPresignedUrl, getDownloadPresignedUrl, deleteS3Object, generateS3Key } from "../lib/s3.ts";

export const coursesRouter = Router();

// ============================================
// PUBLIC ENDPOINTS (all authenticated users)
// ============================================

// List courses (published for students; all for content managers)
coursesRouter.get('/', requireAuth, async (req: any, res) => {
  try {
    const isContentManager = req.user.role === 'internal' || req.user.role === 'super_admin';
    const courses = await storage.getCourses(!isContentManager);
    res.json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ message: "Failed to fetch courses" });
  }
});

// User's progress across all courses
coursesRouter.get('/progress/summary', requireAuth, async (req: any, res) => {
  try {
    const summary = await storage.getUserCourseProgressSummary(req.user.id);
    res.json(summary);
  } catch (error) {
    console.error("Error fetching progress summary:", error);
    res.status(500).json({ message: "Failed to fetch progress summary" });
  }
});

// Get single course with lessons
coursesRouter.get('/:id', requireAuth, async (req: any, res) => {
  try {
    const course = await storage.getCourse(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Non-content-managers can only see published courses
    const isContentManager = req.user.role === 'internal' || req.user.role === 'super_admin';
    if (!isContentManager && course.status !== 'published') {
      return res.status(404).json({ message: "Course not found" });
    }

    const lessons = await storage.getLessonsByCourse(course.id);

    // Generate presigned download URLs for S3 content
    const lessonsWithUrls = await Promise.all(
      lessons.map(async (lesson) => {
        if (lesson.s3Key) {
          const downloadUrl = await getDownloadPresignedUrl(lesson.s3Key);
          return { ...lesson, downloadUrl };
        }
        return lesson;
      })
    );

    res.json({ ...course, lessons: lessonsWithUrls });
  } catch (error) {
    console.error("Error fetching course:", error);
    res.status(500).json({ message: "Failed to fetch course" });
  }
});

// User's progress for a specific course
coursesRouter.get('/:id/progress', requireAuth, async (req: any, res) => {
  try {
    const progress = await storage.getCourseProgress(req.user.id, req.params.id);
    res.json(progress);
  } catch (error) {
    console.error("Error fetching course progress:", error);
    res.status(500).json({ message: "Failed to fetch course progress" });
  }
});

// Mark lesson complete
coursesRouter.post('/:courseId/lessons/:lessonId/complete', requireAuth, async (req: any, res) => {
  try {
    const progress = await storage.upsertLessonProgress({
      userId: req.user.id,
      courseId: req.params.courseId,
      lessonId: req.params.lessonId,
      completed: true,
      completedAt: new Date(),
    });
    res.json(progress);
  } catch (error) {
    console.error("Error marking lesson complete:", error);
    res.status(500).json({ message: "Failed to mark lesson complete" });
  }
});

// ============================================
// CONTENT MANAGER ENDPOINTS (internal + super_admin)
// ============================================

// Create course
coursesRouter.post('/', requireAuth, requireContentManager, async (req: any, res) => {
  try {
    const validation = insertCourseSchema.safeParse({ ...req.body, createdBy: req.user.id });
    if (!validation.success) {
      return res.status(400).json({ message: fromError(validation.error).toString() });
    }
    const course = await storage.createCourse(validation.data);
    res.status(201).json(course);
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({ message: "Failed to create course" });
  }
});

// Update course
coursesRouter.patch('/:id', requireAuth, requireContentManager, async (req: any, res) => {
  try {
    const course = await storage.updateCourse(req.params.id, req.body);
    res.json(course);
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ message: "Failed to update course" });
  }
});

// Delete course
coursesRouter.delete('/:id', requireAuth, requireContentManager, async (req: any, res) => {
  try {
    // Delete all S3 files for lessons in this course first
    const lessons = await storage.getLessonsByCourse(req.params.id);
    for (const lesson of lessons) {
      if (lesson.s3Key) {
        try {
          await deleteS3Object(lesson.s3Key);
        } catch (e) {
          console.warn(`Failed to delete S3 object ${lesson.s3Key}:`, e);
        }
      }
    }
    await storage.deleteCourse(req.params.id);
    res.json({ message: "Course deleted" });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({ message: "Failed to delete course" });
  }
});

// Create lesson
coursesRouter.post('/:courseId/lessons', requireAuth, requireContentManager, async (req: any, res) => {
  try {
    const validation = insertLessonSchema.safeParse({ ...req.body, courseId: req.params.courseId });
    if (!validation.success) {
      return res.status(400).json({ message: fromError(validation.error).toString() });
    }
    const lesson = await storage.createLesson(validation.data);
    res.status(201).json(lesson);
  } catch (error) {
    console.error("Error creating lesson:", error);
    res.status(500).json({ message: "Failed to create lesson" });
  }
});

// Update lesson
coursesRouter.patch('/:courseId/lessons/:lessonId', requireAuth, requireContentManager, async (req: any, res) => {
  try {
    const lesson = await storage.updateLesson(req.params.lessonId, req.body);
    res.json(lesson);
  } catch (error) {
    console.error("Error updating lesson:", error);
    res.status(500).json({ message: "Failed to update lesson" });
  }
});

// Delete lesson (also deletes S3 file)
coursesRouter.delete('/:courseId/lessons/:lessonId', requireAuth, requireContentManager, async (req: any, res) => {
  try {
    const lesson = await storage.getLesson(req.params.lessonId);
    if (lesson?.s3Key) {
      try {
        await deleteS3Object(lesson.s3Key);
      } catch (e) {
        console.warn(`Failed to delete S3 object ${lesson.s3Key}:`, e);
      }
    }
    await storage.deleteLesson(req.params.lessonId);
    res.json({ message: "Lesson deleted" });
  } catch (error) {
    console.error("Error deleting lesson:", error);
    res.status(500).json({ message: "Failed to delete lesson" });
  }
});

// Get presigned S3 upload URL
coursesRouter.post('/:courseId/upload-url', requireAuth, requireContentManager, async (req: any, res) => {
  try {
    const { filename, contentType, type } = req.body;
    if (!filename || !contentType) {
      return res.status(400).json({ message: "filename and contentType are required" });
    }
    const key = generateS3Key(type || "file", req.params.courseId, filename);
    const uploadUrl = await getUploadPresignedUrl(key, contentType);
    res.json({ uploadUrl, key });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    res.status(500).json({ message: "Failed to generate upload URL" });
  }
});
