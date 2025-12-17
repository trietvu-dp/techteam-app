import {
  type User,
  type InsertUser,
  type School,
  type InsertSchool,
  type Ticket,
  type InsertTicket,
  type TicketNote,
  type InsertTicketNote,
  type Challenge,
  type InsertChallenge,
  type ChallengeCompletion,
  type InsertChallengeCompletion,
  type WorkLog,
  type InsertWorkLog,
  type Resource,
  type InsertResource,
  type Achievement,
  type InsertAchievement,
  type UserAchievement,
  type InsertUserAchievement,
  type Certification,
  type InsertCertification,
  type UserCertification,
  type InsertUserCertification,
  type Session,
  type InsertSession,
} from '@shared/schema.ts';

// Filter interfaces
export interface TicketFilters {
  status?: string;
  deviceType?: string;
  assignedTo?: string;
  search?: string;
}

export interface WorkLogFilters {
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export interface ResourceFilters {
  category?: string;
  contentType?: string;
  search?: string;
}

// Extended types for joined queries
export interface ChallengeWithProgress extends Challenge {
  completed?: boolean;
  progress?: number;
}

export interface UserWithRank extends User {
  rank?: number;
}

// Storage interface with all CRUD methods
export interface IStorage {
  // School operations
  createSchool(school: InsertSchool): Promise<School>;
  getSchool(id: string): Promise<School | undefined>;
  getAllSchools(): Promise<School[]>;
  updateSchool(id: string, updates: Partial<School>): Promise<School>;

  // User operations (custom auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: InsertUser): Promise<User>; // Create or update
  getUsersBySchool(schoolId: string): Promise<User[]>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  updateUserPoints(userId: string, pointsDelta: number): Promise<User>;
  getRankings(schoolId: string, limit?: number): Promise<UserWithRank[]>;

  // Session operations
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: string): Promise<Session | undefined>;
  getSessionByToken(token: string): Promise<Session | undefined>;
  revokeSession(id: string): Promise<void>;
  revokeAllUserSessions(userId: string): Promise<void>;
  cleanupExpiredSessions(): Promise<void>;
  
  // Ticket operations
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  getTickets(schoolId: string, filters?: TicketFilters): Promise<Ticket[]>;
  getTicket(id: string, schoolId: string): Promise<Ticket | undefined>;
  updateTicket(id: string, schoolId: string, updates: Partial<Ticket>): Promise<Ticket>;
  deleteTicket(id: string, schoolId: string): Promise<void>;
  getTicketsByUser(userId: string, schoolId: string): Promise<Ticket[]>;
  
  // Ticket notes operations
  createTicketNote(note: InsertTicketNote): Promise<TicketNote>;
  getTicketNotes(ticketId: string, schoolId: string): Promise<TicketNote[]>;
  
  // Challenge operations (global, not school-specific)
  getChallenges(activeOnly?: boolean): Promise<Challenge[]>;
  getChallenge(id: string): Promise<Challenge | undefined>;
  createChallenge(challenge: InsertChallenge): Promise<Challenge>;
  updateChallenge(id: string, updates: Partial<Challenge>): Promise<Challenge>;
  getActiveChallengesForUser(userId: string, schoolId: string): Promise<ChallengeWithProgress[]>;
  getRecommendedChallenges(userId: string, schoolId: string, limit?: number): Promise<Challenge[]>;
  
  // Challenge completion operations (school-scoped through user)
  completeChallenge(completion: InsertChallengeCompletion): Promise<ChallengeCompletion>;
  getUserChallengeCompletions(userId: string, schoolId: string): Promise<ChallengeCompletion[]>;
  isChallengeCompleted(userId: string, challengeId: string, schoolId: string): Promise<boolean>;
  
  // Work log operations
  createWorkLog(log: InsertWorkLog): Promise<WorkLog>;
  getWorkLogs(schoolId: string, filters?: WorkLogFilters): Promise<WorkLog[]>;
  getWorkLogsByUser(userId: string, schoolId: string): Promise<WorkLog[]>;
  updateWorkLog(id: string, schoolId: string, updates: Partial<WorkLog>): Promise<WorkLog>;
  deleteWorkLog(id: string, schoolId: string): Promise<void>;
  
  // Resource operations (global)
  getResources(filters?: ResourceFilters): Promise<Resource[]>;
  getResource(id: string): Promise<Resource | undefined>;
  createResource(resource: InsertResource): Promise<Resource>;
  updateResource(id: string, updates: Partial<Resource>): Promise<Resource>;
  
  // Achievement operations (global)
  getAchievements(): Promise<Achievement[]>;
  getAchievement(id: string): Promise<Achievement | undefined>;
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;
  
  // User achievement operations
  awardAchievement(userAchievement: InsertUserAchievement): Promise<UserAchievement>;
  getUserAchievements(userId: string, schoolId: string): Promise<UserAchievement[]>;
  
  // Certification operations (global)
  getCertifications(): Promise<Certification[]>;
  getCertification(id: string): Promise<Certification | undefined>;
  createCertification(certification: InsertCertification): Promise<Certification>;
  
  // User certification operations
  createUserCertification(userCert: InsertUserCertification): Promise<UserCertification>;
  getUserCertifications(userId: string, schoolId: string): Promise<UserCertification[]>;
  updateUserCertification(id: string, schoolId: string, updates: Partial<UserCertification>): Promise<UserCertification>;
}

// Database storage implementation using Drizzle ORM
import { db } from "./db.ts";
import { eq, and, desc, sql as drizzleSql, or, ilike, gte, lte } from "drizzle-orm";
import * as schemaTypes from "@shared/schema.ts";

export class DbStorage implements IStorage {
  constructor() {
    // Database storage - no initialization needed
  }

  // School operations
  async createSchool(insertSchool: InsertSchool): Promise<School> {
    const [school] = await db.insert(schemaTypes.schools).values(insertSchool).returning();
    return school;
  }

  async getSchool(id: string): Promise<School | undefined> {
    const [school] = await db.select().from(schemaTypes.schools).where(eq(schemaTypes.schools.id, id));
    return school;
  }

  async getAllSchools(): Promise<School[]> {
    return await db.select().from(schemaTypes.schools).orderBy(schemaTypes.schools.name);
  }

  async updateSchool(id: string, updates: Partial<School>): Promise<School> {
    const [school] = await db.update(schemaTypes.schools)
      .set(updates)
      .where(eq(schemaTypes.schools.id, id))
      .returning();
    if (!school) throw new Error('School not found');
    return school;
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(schemaTypes.users).where(eq(schemaTypes.users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(schemaTypes.users).where(eq(schemaTypes.users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(schemaTypes.users).where(eq(schemaTypes.users.username, username));
    console.log(user);
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(schemaTypes.users).values(insertUser).returning();
    return user;
  }

  async upsertUser(insertUser: InsertUser): Promise<User> {
    // Try to find existing user by email
    const existing = await this.getUserByEmail(insertUser.email);
    
    if (existing) {
      // Update existing
      const [user] = await db.update(schemaTypes.users)
        .set({ ...insertUser, updatedAt: new Date() })
        .where(eq(schemaTypes.users.id, existing.id))
        .returning();
      return user;
    } else {
      // Create new
      return this.createUser(insertUser);
    }
  }

  // Session operations
  async createSession(insertSession: InsertSession): Promise<Session> {
    const [session] = await db.insert(schemaTypes.sessions).values(insertSession).returning();
    return session;
  }

  async getSession(id: string): Promise<Session | undefined> {
    const [session] = await db.select().from(schemaTypes.sessions).where(eq(schemaTypes.sessions.id, id));
    return session;
  }

  async getSessionByToken(token: string): Promise<Session | undefined> {
    const [session] = await db.select().from(schemaTypes.sessions)
      .where(and(
        eq(schemaTypes.sessions.token, token),
        drizzleSql`${schemaTypes.sessions.revokedAt} IS NULL`
      ));
    return session;
  }

  async revokeSession(id: string): Promise<void> {
    await db.update(schemaTypes.sessions)
      .set({ revokedAt: new Date() })
      .where(eq(schemaTypes.sessions.id, id));
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await db.update(schemaTypes.sessions)
      .set({ revokedAt: new Date() })
      .where(and(
        eq(schemaTypes.sessions.userId, userId),
        drizzleSql`${schemaTypes.sessions.revokedAt} IS NULL`
      ));
  }

  async cleanupExpiredSessions(): Promise<void> {
    await db.delete(schemaTypes.sessions)
      .where(drizzleSql`${schemaTypes.sessions.expiresAt} < NOW()`);
  }

  async getUsersBySchool(schoolId: string): Promise<User[]> {
    return await db.select().from(schemaTypes.users).where(eq(schemaTypes.users.schoolId, schoolId));
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [user] = await db.update(schemaTypes.users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schemaTypes.users.id, id))
      .returning();
    if (!user) throw new Error('User not found');
    return user;
  }

  async updateUserPoints(userId: string, pointsDelta: number): Promise<User> {
    const [user] = await db.update(schemaTypes.users)
      .set({ points: drizzleSql`${schemaTypes.users.points} + ${pointsDelta}` })
      .where(eq(schemaTypes.users.id, userId))
      .returning();
    if (!user) throw new Error('User not found');
    return user;
  }

  async getRankings(schoolId: string, limit = 10): Promise<UserWithRank[]> {
    const users = await db.select()
      .from(schemaTypes.users)
      .where(eq(schemaTypes.users.schoolId, schoolId))
      .orderBy(desc(schemaTypes.users.points))
      .limit(limit);
    
    return users.map((user, index) => ({
      ...user,
      rank: index + 1,
    }));
  }

  // Ticket operations
  async createTicket(insertTicket: InsertTicket): Promise<Ticket> {
    const [ticket] = await db.insert(schemaTypes.tickets).values(insertTicket).returning();
    return ticket;
  }

  async getTickets(schoolId: string, filters?: TicketFilters): Promise<Ticket[]> {
    const conditions = [eq(schemaTypes.tickets.schoolId, schoolId)];
    
    if (filters?.status) {
      conditions.push(eq(schemaTypes.tickets.status, filters.status as any));
    }
    if (filters?.deviceType) {
      conditions.push(eq(schemaTypes.tickets.deviceType, filters.deviceType as any));
    }
    if (filters?.assignedTo) {
      conditions.push(eq(schemaTypes.tickets.assignedTo, filters.assignedTo));
    }
    if (filters?.search) {
      conditions.push(
        or(
          ilike(schemaTypes.tickets.studentName, `%${filters.search}%`),
          ilike(schemaTypes.tickets.issueDescription, `%${filters.search}%`)
        )!
      );
    }
    
    return await db.select()
      .from(schemaTypes.tickets)
      .where(and(...conditions))
      .orderBy(desc(schemaTypes.tickets.createdAt));
  }

  async getTicket(id: string, schoolId: string): Promise<Ticket | undefined> {
    const [ticket] = await db.select()
      .from(schemaTypes.tickets)
      .where(and(
        eq(schemaTypes.tickets.id, id),
        eq(schemaTypes.tickets.schoolId, schoolId)
      ));
    return ticket;
  }

  async updateTicket(id: string, schoolId: string, updates: Partial<Ticket>): Promise<Ticket> {
    const [ticket] = await db.update(schemaTypes.tickets)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(schemaTypes.tickets.id, id),
        eq(schemaTypes.tickets.schoolId, schoolId)
      ))
      .returning();
    if (!ticket) throw new Error('Ticket not found');
    return ticket;
  }

  async deleteTicket(id: string, schoolId: string): Promise<void> {
    const result = await db.delete(schemaTypes.tickets)
      .where(and(
        eq(schemaTypes.tickets.id, id),
        eq(schemaTypes.tickets.schoolId, schoolId)
      ))
      .returning();
    if (result.length === 0) throw new Error('Ticket not found');
  }

  async getTicketsByUser(userId: string, schoolId: string): Promise<Ticket[]> {
    return await db.select()
      .from(schemaTypes.tickets)
      .where(and(
        eq(schemaTypes.tickets.schoolId, schoolId),
        eq(schemaTypes.tickets.assignedTo, userId)
      ));
  }

  // Ticket notes
  async createTicketNote(insertNote: InsertTicketNote): Promise<TicketNote> {
    const [note] = await db.insert(schemaTypes.ticketNotes).values(insertNote).returning();
    return note;
  }

  async getTicketNotes(ticketId: string, schoolId: string): Promise<TicketNote[]> {
    return await db.select()
      .from(schemaTypes.ticketNotes)
      .where(and(
        eq(schemaTypes.ticketNotes.ticketId, ticketId),
        eq(schemaTypes.ticketNotes.schoolId, schoolId)
      ))
      .orderBy(schemaTypes.ticketNotes.createdAt);
  }

  // Challenges
  async getChallenges(activeOnly = true): Promise<Challenge[]> {
    if (activeOnly) {
      return await db.select()
        .from(schemaTypes.challenges)
        .where(eq(schemaTypes.challenges.isActive, true));
    }
    return await db.select().from(schemaTypes.challenges);
  }

  async getChallenge(id: string): Promise<Challenge | undefined> {
    const [challenge] = await db.select()
      .from(schemaTypes.challenges)
      .where(eq(schemaTypes.challenges.id, id));
    return challenge;
  }

  async createChallenge(insertChallenge: InsertChallenge): Promise<Challenge> {
    const [challenge] = await db.insert(schemaTypes.challenges).values(insertChallenge).returning();
    return challenge;
  }

  async updateChallenge(id: string, updates: Partial<Challenge>): Promise<Challenge> {
    const [challenge] = await db.update(schemaTypes.challenges)
      .set(updates)
      .where(eq(schemaTypes.challenges.id, id))
      .returning();
    if (!challenge) throw new Error('Challenge not found');
    return challenge;
  }

  async getActiveChallengesForUser(userId: string, schoolId: string): Promise<ChallengeWithProgress[]> {
    const completions = await this.getUserChallengeCompletions(userId, schoolId);
    const completedIds = new Set(completions.map((c) => c.challengeId));
    
    const challenges = await this.getChallenges(true);
    return challenges
      .filter((c) => completedIds.has(c.id))
      .map((c) => ({ ...c, completed: true, progress: 100 }));
  }

  async getRecommendedChallenges(userId: string, schoolId: string, limit = 5): Promise<Challenge[]> {
    const completions = await this.getUserChallengeCompletions(userId, schoolId);
    const completedIds = new Set(completions.map((c) => c.challengeId));
    
    const challenges = await this.getChallenges(true);
    return challenges
      .filter((c) => !completedIds.has(c.id))
      .slice(0, limit);
  }

  // Challenge completions
  async completeChallenge(insertCompletion: InsertChallengeCompletion): Promise<ChallengeCompletion> {
    const [completion] = await db.insert(schemaTypes.challengeCompletions)
      .values(insertCompletion)
      .returning();
    return completion;
  }

  async getUserChallengeCompletions(userId: string, schoolId: string): Promise<ChallengeCompletion[]> {
    return await db.select()
      .from(schemaTypes.challengeCompletions)
      .where(and(
        eq(schemaTypes.challengeCompletions.userId, userId),
        eq(schemaTypes.challengeCompletions.schoolId, schoolId)
      ));
  }

  async isChallengeCompleted(userId: string, challengeId: string, schoolId: string): Promise<boolean> {
    const [completion] = await db.select()
      .from(schemaTypes.challengeCompletions)
      .where(and(
        eq(schemaTypes.challengeCompletions.userId, userId),
        eq(schemaTypes.challengeCompletions.challengeId, challengeId),
        eq(schemaTypes.challengeCompletions.schoolId, schoolId)
      ))
      .limit(1);
    return !!completion;
  }

  // Work logs
  async createWorkLog(insertLog: InsertWorkLog): Promise<WorkLog> {
    const [log] = await db.insert(schemaTypes.workLogs).values(insertLog).returning();
    return log;
  }

  async getWorkLogs(schoolId: string, filters?: WorkLogFilters): Promise<WorkLog[]> {
    const conditions = [eq(schemaTypes.workLogs.schoolId, schoolId)];
    
    if (filters?.userId) {
      conditions.push(eq(schemaTypes.workLogs.userId, filters.userId));
    }
    if (filters?.startDate) {
      conditions.push(gte(schemaTypes.workLogs.logDate, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(schemaTypes.workLogs.logDate, filters.endDate));
    }
    
    return await db.select()
      .from(schemaTypes.workLogs)
      .where(and(...conditions))
      .orderBy(desc(schemaTypes.workLogs.logDate));
  }

  async getWorkLogsByUser(userId: string, schoolId: string): Promise<WorkLog[]> {
    return this.getWorkLogs(schoolId, { userId });
  }

  async updateWorkLog(id: string, schoolId: string, updates: Partial<WorkLog>): Promise<WorkLog> {
    const [log] = await db.update(schemaTypes.workLogs)
      .set(updates)
      .where(and(
        eq(schemaTypes.workLogs.id, id),
        eq(schemaTypes.workLogs.schoolId, schoolId)
      ))
      .returning();
    if (!log) throw new Error('Work log not found');
    return log;
  }

  async deleteWorkLog(id: string, schoolId: string): Promise<void> {
    const result = await db.delete(schemaTypes.workLogs)
      .where(and(
        eq(schemaTypes.workLogs.id, id),
        eq(schemaTypes.workLogs.schoolId, schoolId)
      ))
      .returning();
    if (result.length === 0) throw new Error('Work log not found');
  }

  // Resources
  async getResources(filters?: ResourceFilters): Promise<Resource[]> {
    const conditions = [];
    
    if (filters?.category) {
      conditions.push(eq(schemaTypes.resources.category, filters.category as any));
    }
    if (filters?.contentType) {
      conditions.push(eq(schemaTypes.resources.contentType, filters.contentType as any));
    }
    if (filters?.search) {
      conditions.push(
        or(
          ilike(schemaTypes.resources.title, `%${filters.search}%`),
          ilike(schemaTypes.resources.description, `%${filters.search}%`)
        )!
      );
    }
    
    if (conditions.length > 0) {
      return await db.select()
        .from(schemaTypes.resources)
        .where(and(...conditions));
    }
    return await db.select().from(schemaTypes.resources);
  }

  async getResource(id: string): Promise<Resource | undefined> {
    const [resource] = await db.select()
      .from(schemaTypes.resources)
      .where(eq(schemaTypes.resources.id, id));
    return resource;
  }

  async createResource(insertResource: InsertResource): Promise<Resource> {
    const [resource] = await db.insert(schemaTypes.resources).values(insertResource).returning();
    return resource;
  }

  async updateResource(id: string, updates: Partial<Resource>): Promise<Resource> {
    const [resource] = await db.update(schemaTypes.resources)
      .set(updates)
      .where(eq(schemaTypes.resources.id, id))
      .returning();
    if (!resource) throw new Error('Resource not found');
    return resource;
  }

  // Achievements
  async getAchievements(): Promise<Achievement[]> {
    return await db.select().from(schemaTypes.achievements);
  }

  async getAchievement(id: string): Promise<Achievement | undefined> {
    const [achievement] = await db.select()
      .from(schemaTypes.achievements)
      .where(eq(schemaTypes.achievements.id, id));
    return achievement;
  }

  async createAchievement(insertAchievement: InsertAchievement): Promise<Achievement> {
    const [achievement] = await db.insert(schemaTypes.achievements)
      .values(insertAchievement)
      .returning();
    return achievement;
  }

  // User achievements
  async awardAchievement(insertUserAchievement: InsertUserAchievement): Promise<UserAchievement> {
    const [userAchievement] = await db.insert(schemaTypes.userAchievements)
      .values(insertUserAchievement)
      .returning();
    return userAchievement;
  }

  async getUserAchievements(userId: string, schoolId: string): Promise<UserAchievement[]> {
    return await db.select()
      .from(schemaTypes.userAchievements)
      .where(and(
        eq(schemaTypes.userAchievements.userId, userId),
        eq(schemaTypes.userAchievements.schoolId, schoolId)
      ));
  }

  // Certifications
  async getCertifications(): Promise<Certification[]> {
    return await db.select().from(schemaTypes.certifications);
  }

  async getCertification(id: string): Promise<Certification | undefined> {
    const [certification] = await db.select()
      .from(schemaTypes.certifications)
      .where(eq(schemaTypes.certifications.id, id));
    return certification;
  }

  async createCertification(insertCertification: InsertCertification): Promise<Certification> {
    const [certification] = await db.insert(schemaTypes.certifications)
      .values(insertCertification)
      .returning();
    return certification;
  }

  // User certifications
  async createUserCertification(insertUserCert: InsertUserCertification): Promise<UserCertification> {
    const [userCert] = await db.insert(schemaTypes.userCertifications)
      .values(insertUserCert)
      .returning();
    return userCert;
  }

  async getUserCertifications(userId: string, schoolId: string): Promise<UserCertification[]> {
    return await db.select()
      .from(schemaTypes.userCertifications)
      .where(and(
        eq(schemaTypes.userCertifications.userId, userId),
        eq(schemaTypes.userCertifications.schoolId, schoolId)
      ));
  }

  async updateUserCertification(
    id: string,
    schoolId: string,
    updates: Partial<UserCertification>
  ): Promise<UserCertification> {
    const [cert] = await db.update(schemaTypes.userCertifications)
      .set(updates)
      .where(and(
        eq(schemaTypes.userCertifications.id, id),
        eq(schemaTypes.userCertifications.schoolId, schoolId)
      ))
      .returning();
    if (!cert) throw new Error('User certification not found');
    return cert;
  }
}

export const storage = new DbStorage();
