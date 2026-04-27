import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, pgEnum, date, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["super_admin", "admin", "student", "internal"]);
export const avatarTypeEnum = pgEnum("avatar_type", ["rocket", "star", "lightning", "trophy", "medal", "fire", "robot", "laptop", "wrench", "gear"]);
export const ticketStatusEnum = pgEnum("ticket_status", ["pending", "in_progress", "completed", "issue"]);
export const ticketPriorityEnum = pgEnum("ticket_priority", ["low", "medium", "high"]);
export const deviceTypeEnum = pgEnum("device_type", ["ipad", "chromebook", "laptop", "pc_laptop", "macbook"]);
export const issueTypeEnum = pgEnum("issue_type", ["check", "repair"]);
export const difficultyEnum = pgEnum("difficulty", ["beginner", "intermediate", "advanced"]);
export const categoryEnum = pgEnum("category", ["hardware", "software", "network", "security", "troubleshooting", "best_practices", "certifications"]);
export const contentTypeEnum = pgEnum("content_type", ["article", "video", "interactive", "document"]);
export const achievementIconEnum = pgEnum("achievement_icon", ["trophy", "medal", "star", "fire", "lightning", "gear", "wrench", "rocket", "shield", "crown"]);
export const courseStatusEnum = pgEnum("course_status", ["draft", "published", "archived"]);
export const lessonTypeEnum = pgEnum("lesson_type", ["video", "document", "article"]);

// Session storage table (Custom auth sessions)
export const sessions = pgTable(
  "sessions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    token: varchar("token", { length: 255 }).notNull().unique(), // Session token
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    revokedAt: timestamp("revoked_at"),
  },
  (table) => [
    index("IDX_session_token").on(table.token),
    index("IDX_session_user").on(table.userId),
    index("IDX_session_expires").on(table.expiresAt),
  ],
);

// Schools Table
export const schools = pgTable("schools", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  contactEmail: varchar("contact_email", { length: 255 }),
  adminName: varchar("admin_name", { length: 255 }),
});

// Users Table (Custom authentication)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id, { onDelete: "cascade" }), // Nullable for super admins
  username: varchar("username", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  role: userRoleEnum("role").notNull().default("student"),
  points: integer("points").default(0).notNull(),
  streak: integer("streak").default(0).notNull(),
  selectedAvatar: avatarTypeEnum("selected_avatar").default("rocket"),
  isActive: boolean("is_active").default(true).notNull(),
  passwordResetToken: varchar("password_reset_token", { length: 255 }),
  passwordResetExpires: timestamp("password_reset_expires"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_user_school").on(table.schoolId),
  index("IDX_user_role").on(table.role),
  index("IDX_user_email").on(table.email),
]);

// Tickets Table (for both device checks and repairs)
export const tickets = pgTable("tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id, { onDelete: "cascade" }).notNull(),
  assignedTo: varchar("assigned_to").references(() => users.id, { onDelete: "set null" }),
  studentName: varchar("student_name", { length: 255 }).notNull(),
  studentGrade: varchar("student_grade", { length: 50 }).notNull(),
  deviceType: deviceTypeEnum("device_type").notNull(),
  deviceNumber: varchar("device_number", { length: 100 }),
  issueType: issueTypeEnum("issue_type").notNull(),
  issueDescription: text("issue_description").notNull(),
  status: ticketStatusEnum("status").default("pending").notNull(),
  priority: ticketPriorityEnum("priority").default("medium"),
  // Device check specific fields
  teacher: varchar("teacher", { length: 255 }),
  roomNumber: varchar("room_number", { length: 50 }),
  allPresent: boolean("all_present"),
  missingStudents: text("missing_students").array(),
  allCharged: boolean("all_charged"),
  notChargedStudents: text("not_charged_students").array(),
  anyMissing: boolean("any_missing"),
  missingDeviceStudents: text("missing_device_students").array(),
  anyBroken: boolean("any_broken"),
  brokenAssetTag: varchar("broken_asset_tag", { length: 100 }),
  lteWorking: boolean("lte_working"),
  lteBrokenAssetTag: varchar("lte_broken_asset_tag", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_ticket_school").on(table.schoolId),
  index("IDX_ticket_status").on(table.status),
  index("IDX_ticket_created").on(table.createdAt),
  index("IDX_ticket_assigned").on(table.assignedTo),
]);

// Ticket Notes Table
export const ticketNotes = pgTable("ticket_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id, { onDelete: "cascade" }).notNull(),
  ticketId: varchar("ticket_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  noteText: text("note_text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Challenges Table (global - not school-specific)
export const challenges = pgTable("challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  difficulty: difficultyEnum("difficulty").notNull(),
  points: integer("points").notNull(),
  category: categoryEnum("category").notNull(),
  daysToComplete: integer("days_to_complete"),
  participants: integer("participants").default(0),
  isActive: boolean("is_active").default(true).notNull(),
});

// Challenge Completions Table
export const challengeCompletions = pgTable("challenge_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  challengeId: varchar("challenge_id").references(() => challenges.id, { onDelete: "restrict" }).notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  pointsEarned: integer("points_earned").notNull(),
});

// Work Logs Table
export const workLogs = pgTable("work_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  logDate: date("log_date").notNull(),
  hoursWorked: integer("hours_worked"), // In minutes for precision
  category: varchar("category", { length: 100 }),
  description: text("description").notNull(),
});

// Resources Table (global, not school-specific)
export const resources = pgTable("resources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  category: categoryEnum("category").notNull(),
  contentType: contentTypeEnum("content_type").notNull(),
  url: varchar("url", { length: 500 }),
  description: text("description"),
  thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
  duration: varchar("duration", { length: 50 }), // e.g., "5 min", "0:45"
  views: integer("views").default(0),
});

// Achievements Table (global - not school-specific)
export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  icon: achievementIconEnum("icon").notNull(),
  pointsRequired: integer("points_required"),
  category: varchar("category", { length: 100 }),
});

// User Achievements Table (many-to-many)
export const userAchievements = pgTable("user_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  achievementId: varchar("achievement_id").references(() => achievements.id, { onDelete: "cascade" }).notNull(),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
});

// Certifications Table (global - not school-specific)
export const certifications = pgTable("certifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  totalSteps: integer("total_steps").default(1).notNull(),
});

// User Certifications Table
export const userCertifications = pgTable("user_certifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  certificationId: varchar("certification_id").references(() => certifications.id, { onDelete: "cascade" }).notNull(),
  status: varchar("status", { length: 50 }).default("not_started").notNull(), // "not_started", "in_progress", "earned"
  progress: integer("progress").default(0).notNull(), // percentage
  earnedAt: timestamp("earned_at"),
});

// Courses Table (global - not school-specific)
export const courses = pgTable("courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
  status: courseStatusEnum("status").default("draft").notNull(),
  category: categoryEnum("category").notNull(),
  difficulty: difficultyEnum("difficulty").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Lessons Table (belongs to a course)
export const lessons = pgTable("lessons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").references(() => courses.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  lessonType: lessonTypeEnum("lesson_type").notNull(),
  s3Key: varchar("s3_key", { length: 500 }),
  content: text("content"),
  duration: varchar("duration", { length: 50 }),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_lesson_course").on(table.courseId),
]);

// Course Progress Table (tracks per-user lesson completion)
export const courseProgress = pgTable("course_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  courseId: varchar("course_id").references(() => courses.id, { onDelete: "cascade" }).notNull(),
  lessonId: varchar("lesson_id").references(() => lessons.id, { onDelete: "cascade" }).notNull(),
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_progress_user_course").on(table.userId, table.courseId),
]);

// ==================== Zod Schemas ====================

// Schools
export const insertSchoolSchema = createInsertSchema(schools).omit({
  id: true,
});
export const selectSchoolSchema = createSelectSchema(schools);
export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type School = typeof schools.$inferSelect;

// Users
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectUserSchema = createSelectSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Login schema (for validation)
export const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8),
});
export type Login = z.infer<typeof loginSchema>;

// Sessions
export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
});
export const selectSessionSchema = createSelectSchema(sessions);
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

// Tickets
export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectTicketSchema = createSelectSchema(tickets);
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;

// Ticket Notes
export const insertTicketNoteSchema = createInsertSchema(ticketNotes).omit({
  id: true,
  createdAt: true,
});
export const selectTicketNoteSchema = createSelectSchema(ticketNotes);
export type InsertTicketNote = z.infer<typeof insertTicketNoteSchema>;
export type TicketNote = typeof ticketNotes.$inferSelect;

// Challenges
export const insertChallengeSchema = createInsertSchema(challenges).omit({
  id: true,
});
export const selectChallengeSchema = createSelectSchema(challenges);
export type InsertChallenge = z.infer<typeof insertChallengeSchema>;
export type Challenge = typeof challenges.$inferSelect;

// Challenge Completions
export const insertChallengeCompletionSchema = createInsertSchema(challengeCompletions).omit({
  id: true,
  completedAt: true,
});
export const selectChallengeCompletionSchema = createSelectSchema(challengeCompletions);
export type InsertChallengeCompletion = z.infer<typeof insertChallengeCompletionSchema>;
export type ChallengeCompletion = typeof challengeCompletions.$inferSelect;

// Work Logs
export const insertWorkLogSchema = createInsertSchema(workLogs).omit({
  id: true,
});
export const selectWorkLogSchema = createSelectSchema(workLogs);
export type InsertWorkLog = z.infer<typeof insertWorkLogSchema>;
export type WorkLog = typeof workLogs.$inferSelect;

// Resources
export const insertResourceSchema = createInsertSchema(resources).omit({
  id: true,
});
export const selectResourceSchema = createSelectSchema(resources);
export type InsertResource = z.infer<typeof insertResourceSchema>;
export type Resource = typeof resources.$inferSelect;

// Achievements
export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
});
export const selectAchievementSchema = createSelectSchema(achievements);
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type Achievement = typeof achievements.$inferSelect;

// User Achievements
export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({
  id: true,
  earnedAt: true,
});
export const selectUserAchievementSchema = createSelectSchema(userAchievements);
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;
export type UserAchievement = typeof userAchievements.$inferSelect;

// Certifications
export const insertCertificationSchema = createInsertSchema(certifications).omit({
  id: true,
});
export const selectCertificationSchema = createSelectSchema(certifications);
export type InsertCertification = z.infer<typeof insertCertificationSchema>;
export type Certification = typeof certifications.$inferSelect;

// User Certifications
export const insertUserCertificationSchema = createInsertSchema(userCertifications).omit({
  id: true,
});
export const selectUserCertificationSchema = createSelectSchema(userCertifications);
export type InsertUserCertification = z.infer<typeof insertUserCertificationSchema>;
export type UserCertification = typeof userCertifications.$inferSelect;

// Courses
export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectCourseSchema = createSelectSchema(courses);
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof courses.$inferSelect;

// Lessons
export const insertLessonSchema = createInsertSchema(lessons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectLessonSchema = createSelectSchema(lessons);
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Lesson = typeof lessons.$inferSelect;

// Course Progress
export const insertCourseProgressSchema = createInsertSchema(courseProgress).omit({
  id: true,
  createdAt: true,
});
export const selectCourseProgressSchema = createSelectSchema(courseProgress);
export type InsertCourseProgress = z.infer<typeof insertCourseProgressSchema>;
export type CourseProgress = typeof courseProgress.$inferSelect;
