import { and, desc, eq, gte, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertAppointment,
  InsertMerchant,
  InsertUser,
  appointments,
  chatMessages,
  matchSessions,
  merchants,
  phoneCodes,
  userProfiles,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ── 用户相关 ─────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const fields = ["name", "email", "loginMethod", "phone", "avatar", "identity"] as const;
    for (const f of fields) {
      const v = user[f];
      if (v === undefined) continue;
      const n = v ?? null;
      (values as Record<string, unknown>)[f] = n;
      updateSet[f] = n;
    }
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return r[0];
}

export async function getUserByPhone(phone: string) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  return r[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return r[0];
}

export async function updateUserProfile(id: number, data: { name?: string; avatar?: string; identity?: "customer" | "merchant" }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id));
}

export async function getAllActiveUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).limit(500);
}

// ── 手机验证码 ────────────────────────────────────────────────────

export async function savePhoneCode(phone: string, code: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(phoneCodes).set({ used: true }).where(eq(phoneCodes.phone, phone));
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await db.insert(phoneCodes).values({ phone, code, used: false, expiresAt });
}

export async function verifyPhoneCode(phone: string, code: string): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = new Date();
  const r = await db.select().from(phoneCodes).where(
    and(eq(phoneCodes.phone, phone), eq(phoneCodes.code, code), eq(phoneCodes.used, false), gte(phoneCodes.expiresAt, now))
  ).limit(1);
  if (!r[0]) return false;
  await db.update(phoneCodes).set({ used: true }).where(eq(phoneCodes.id, r[0].id));
  return true;
}

// ── 商家相关 ─────────────────────────────────────────────────────

export async function createMerchant(data: InsertMerchant): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const r = await db.insert(merchants).values(data);
  return (r as unknown as { insertId: number }).insertId;
}

export async function getMerchantByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(merchants).where(eq(merchants.userId, userId)).limit(1);
  return r[0];
}

export async function getMerchantById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(merchants).where(eq(merchants.id, id)).limit(1);
  return r[0];
}

export async function searchMerchants(query: string, category?: string) {
  const db = await getDb();
  if (!db) return [];
  const conds: ReturnType<typeof eq>[] = [eq(merchants.isActive, true)];
  if (category && category !== "全部") conds.push(eq(merchants.category, category));
  if (query) conds.push(or(like(merchants.businessName, `%${query}%`), like(merchants.description, `%${query}%`)) as ReturnType<typeof eq>);
  return db.select().from(merchants).where(and(...conds)).limit(20);
}

export async function getAllMerchants(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(merchants).where(eq(merchants.isActive, true)).limit(limit);
}

export async function updateMerchant(id: number, data: Partial<InsertMerchant>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(merchants).set({ ...data, updatedAt: new Date() }).where(eq(merchants.id, id));
}

export async function getAllActiveMerchants() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(merchants).where(eq(merchants.isActive, true)).limit(500);
}

// ── 预约相关 ─────────────────────────────────────────────────────

export async function createAppointment(data: InsertAppointment): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const r = await db.insert(appointments).values(data);
  return (r as unknown as { insertId: number }).insertId;
}

export async function getAppointmentsByCustomer(customerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(appointments).where(eq(appointments.customerId, customerId)).orderBy(desc(appointments.createdAt));
}

export async function getAppointmentsByMerchant(merchantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(appointments).where(eq(appointments.merchantId, merchantId)).orderBy(desc(appointments.createdAt));
}

export async function updateAppointmentStatus(
  id: number,
  status: "pending" | "confirmed" | "completed" | "cancelled",
  extra?: { callStatus?: "none" | "calling" | "completed" | "failed"; callSummary?: string; aiSummary?: string }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(appointments).set({ status, ...extra, updatedAt: new Date() }).where(eq(appointments.id, id));
}

// ── AI对话记录 ────────────────────────────────────────────────────

export async function saveChatMessage(data: {
  userId: number; sessionId: string;
  role: "user" | "assistant" | "system"; content: string; metadata?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(chatMessages).values(data);
}

export async function getChatHistory(userId: number, sessionId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chatMessages)
    .where(and(eq(chatMessages.userId, userId), eq(chatMessages.sessionId, sessionId)))
    .orderBy(chatMessages.createdAt).limit(50);
}

// ── 用户画像（基于手机号）────────────────────────────────────────

export async function getUserProfileByPhone(phone: string) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(userProfiles).where(eq(userProfiles.phone, phone)).limit(1);
  return r[0];
}

export async function upsertUserProfile(data: {
  phone: string;
  identity?: "customer" | "merchant";
  name?: string;
  area?: string;
  profileJson?: string;
  needsHistory?: string;
  matchHistory?: string;
  totalMatches?: number;
}) {
  const db = await getDb();
  if (!db) return;
  const updateSet: Record<string, unknown> = { updatedAt: new Date() };
  if (data.identity) updateSet.identity = data.identity;
  if (data.name) updateSet.name = data.name;
  if (data.area) updateSet.area = data.area;
  if (data.profileJson) updateSet.profileJson = data.profileJson;
  if (data.needsHistory) updateSet.needsHistory = data.needsHistory;
  if (data.matchHistory) updateSet.matchHistory = data.matchHistory;
  if (data.totalMatches !== undefined) updateSet.totalMatches = data.totalMatches;
  await db.insert(userProfiles).values({
    phone: data.phone,
    identity: data.identity || "customer",
    name: data.name,
    area: data.area,
    profileJson: data.profileJson,
    needsHistory: data.needsHistory,
    matchHistory: data.matchHistory,
    totalMatches: data.totalMatches || 0,
  }).onDuplicateKeyUpdate({ set: updateSet });
}

// ── 匹配对话会话 ──────────────────────────────────────────────────

export async function getMatchSession(sessionId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(matchSessions).where(eq(matchSessions.sessionId, sessionId)).limit(1);
  return r[0];
}

export async function createMatchSession(data: {
  sessionId: string;
  phone: string;
  identity: "customer" | "merchant";
  messages: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(matchSessions).values({
    ...data,
    isMatched: false,
  });
}

export async function updateMatchSession(sessionId: string, data: {
  messages?: string;
  collectedInfo?: string;
  isMatched?: boolean;
  matchResult?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(matchSessions).set({ ...data, updatedAt: new Date() }).where(eq(matchSessions.sessionId, sessionId));
}
