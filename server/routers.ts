import { TRPCError } from "@trpc/server";
import * as jose from "jose";
import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { qwenChat, qwenDailyInsight, qwenAppointmentSummary, qwenSimulateCall, qwenSearchMerchant, qwenIndustryAnalysis, qwenMatchCustomers, qwenMatchMerchants, qwenDeepNeedChat, qwenPreciseMatch, qwenBuildProfile, qwenAnalyzeMerchant } from "./qwen";
import { randomUUID } from "crypto";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "xun-shang-wen-dao-secret-2026"
);

async function signToken(payload: Record<string, unknown>) {
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

const CATEGORIES = ["餐饮", "美容", "教育", "医疗", "家政", "法律", "金融", "健身", "装修", "其他"];

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),

    sendCode: publicProcedure
      .input(z.object({ phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入正确的手机号") }))
      .mutation(async ({ input }) => {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        await db.savePhoneCode(input.phone, code);
        console.log(`[SMS] 手机号 ${input.phone} 验证码: ${code}`);
        return {
          success: true,
          devCode: process.env.NODE_ENV !== "production" ? code : undefined,
          message: "验证码已发送，请注意查收",
        };
      }),

    loginWithPhone: publicProcedure
      .input(z.object({
        phone: z.string().regex(/^1[3-9]\d{9}$/),
        code: z.string().length(6),
        name: z.string().min(1).max(20).optional(),
        identity: z.enum(["customer", "merchant"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const valid = await db.verifyPhoneCode(input.phone, input.code);
        if (!valid) throw new TRPCError({ code: "BAD_REQUEST", message: "验证码错误或已过期" });

        const openId = `phone_${input.phone}`;
        let user = await db.getUserByPhone(input.phone);
        const isNewUser = !user;

        await db.upsertUser({
          openId,
          phone: input.phone,
          name: input.name || `用户${input.phone.slice(-4)}`,
          identity: input.identity || "customer",
          loginMethod: "phone",
          lastSignedIn: new Date(),
        });
        user = await db.getUserByPhone(input.phone);

        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "用户创建失败" });

        const token = await signToken({ userId: user.id, openId: user.openId, phone: user.phone });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });

        return { success: true, token, user, isNewUser };
      }),

    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(20).optional(),
        avatar: z.string().optional(),
        identity: z.enum(["customer", "merchant"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  merchant: router({
    search: publicProcedure
      .input(z.object({ query: z.string().default(""), category: z.string().optional() }))
      .query(async ({ input }) => {
        if (!input.query && !input.category) return db.getAllMerchants(20);
        return db.searchMerchants(input.query, input.category);
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const m = await db.getMerchantById(input.id);
        if (!m) throw new TRPCError({ code: "NOT_FOUND", message: "商家不存在" });
        return m;
      }),

    myMerchant: protectedProcedure.query(async ({ ctx }) => {
      return db.getMerchantByUserId(ctx.user.id);
    }),

    upsert: protectedProcedure
      .input(z.object({
        businessName: z.string().min(1).max(100),
        category: z.enum(CATEGORIES as [string, ...string[]]),
        description: z.string().max(500).optional(),
        address: z.string().max(200).optional(),
        phone: z.string().optional(),
        tags: z.string().optional(),
        openHours: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getMerchantByUserId(ctx.user.id);
        if (existing) {
          await db.updateMerchant(existing.id, input);
          return { id: existing.id };
        }
        const id = await db.createMerchant({ ...input, userId: ctx.user.id });
        return { id };
      }),

    categories: publicProcedure.query(() => CATEGORIES),
    // 公开入驻接口（无需登录），AI自动分析并录入匹配库
    registerPublic: publicProcedure
      .input(z.object({
        businessName: z.string().min(2).max(100),
        category: z.enum(CATEGORIES as [string, ...string[]]),
        description: z.string().min(10).max(500),
        serviceScope: z.string().min(5).max(200),
        area: z.string().min(2).max(100),
        phone: z.string().min(11).max(20),
        contactName: z.string().max(50).optional(),
      }))
      .mutation(async ({ input }) => {
        // AI分析商家信息
        const aiAnalysis = await qwenAnalyzeMerchant({
          businessName: input.businessName,
          category: input.category,
          description: input.description,
          serviceScope: input.serviceScope,
          area: input.area,
        });
        // 录入数据库（创建一个匿名用户ID用于关联）
        const userId = await db.getOrCreateAnonymousUser(input.phone);
        const existing = await db.getMerchantByUserId(userId);
        let merchantId: number;
        if (existing) {
          await db.updateMerchant(existing.id, {
            businessName: input.businessName,
            category: input.category,
            description: aiAnalysis.aiSummary || input.description,
            address: input.area,
            phone: input.phone,
            tags: aiAnalysis.tags.join(","),
          });
          merchantId = existing.id;
        } else {
          merchantId = await db.createMerchant({
            userId,
            businessName: input.businessName,
            category: input.category,
            description: aiAnalysis.aiSummary || input.description,
            address: input.area,
            phone: input.phone,
            tags: aiAnalysis.tags.join(","),
          });
        }
        return {
          id: merchantId,
          aiAnalysis,
          message: `${input.businessName} 已成功入驻！AI已为你生成专属名片，道道将为你精准匹配有缘客户。`,
        };
      }),

    // 联网实时搜索商家
    searchOnline: protectedProcedure
      .input(z.object({
        query: z.string().min(1),
        location: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await qwenSearchMerchant(input.query, input.location);
        return { success: true, ...result, searchedAt: new Date().toISOString() };
      }),
  }),

  appointment: router({
    create: protectedProcedure
      .input(z.object({
        merchantId: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        scheduledAt: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const merchant = await db.getMerchantById(input.merchantId);
        if (!merchant) throw new TRPCError({ code: "NOT_FOUND", message: "商家不存在" });

        let aiSummary = "";
        try {
          aiSummary = await qwenAppointmentSummary(merchant.businessName, input.title, input.description);
        } catch { /* ignore */ }

        const id = await db.createAppointment({
          customerId: ctx.user.id,
          merchantId: input.merchantId,
          title: input.title,
          description: input.description,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
          aiSummary,
        });
        return { id, aiSummary };
      }),

    myList: protectedProcedure.query(async ({ ctx }) => {
      return db.getAppointmentsByCustomer(ctx.user.id);
    }),

    merchantList: protectedProcedure.query(async ({ ctx }) => {
      const merchant = await db.getMerchantByUserId(ctx.user.id);
      if (!merchant) return [];
      return db.getAppointmentsByMerchant(merchant.id);
    }),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
      }))
      .mutation(async ({ input }) => {
        await db.updateAppointmentStatus(input.id, input.status);
        return { success: true };
      }),

    simulateCall: protectedProcedure
      .input(z.object({ appointmentId: z.number(), targetPhone: z.string() }))
      .mutation(async ({ input }) => {
        await db.updateAppointmentStatus(input.appointmentId, "pending", { callStatus: "calling" });

        let callSummary = "";
        try {
          callSummary = await qwenSimulateCall(input.appointmentId, "商家", "预约服务");
        } catch {
          callSummary = "AI通话模拟完成，预约信息已传达。";
        }

        await db.updateAppointmentStatus(input.appointmentId, "confirmed", {
          callStatus: "completed",
          callSummary,
        });

        return { success: true, callSummary };
      }),
    listByPhone: publicProcedure
      .input(z.object({ phone: z.string() }))
      .query(async ({ input }) => {
        const user = await db.getUserByPhone(input.phone);
        if (!user) return [];
        return db.getAppointmentsByCustomer(user.id);
      }),
  }),

  ai: router({
    chat: protectedProcedure
      .input(z.object({
        message: z.string().min(1).max(2000),
        sessionId: z.string(),
        identity: z.enum(["customer", "merchant"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.saveChatMessage({
          userId: ctx.user.id,
          sessionId: input.sessionId,
          role: "user",
          content: input.message,
        });

        const history = await db.getChatHistory(ctx.user.id, input.sessionId);
        const messages = history.slice(-10).map((m) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        }));

        const identity = input.identity || ctx.user.identity || "customer";
        // 主要使用QwenMax，失败时自动回退到内置LLM
        const reply = await qwenChat(
          messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content as string })),
          identity as "customer" | "merchant",
          ctx.user.name || undefined
        );

        await db.saveChatMessage({
          userId: ctx.user.id,
          sessionId: input.sessionId,
          role: "assistant",
          content: reply,
        });

        return { reply, sessionId: input.sessionId };
      }),

    history: protectedProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ ctx, input }) => {
        return db.getChatHistory(ctx.user.id, input.sessionId);
      }),

    // 行业实时分析
    industryAnalysis: protectedProcedure
      .input(z.object({ industry: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const analysis = await qwenIndustryAnalysis(input.industry);
        return { success: true, analysis, industry: input.industry, analyzedAt: new Date().toISOString() };
      }),
  }),

  // AI全网匹配有缘人
  match: router({
    // 商家找客户：AI全网匹配潜在客户群体
    findCustomers: protectedProcedure
      .input(z.object({
        businessType: z.string().min(1),
        description: z.string().optional(),
        targetArea: z.string().optional(),
        requirements: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await qwenMatchCustomers(input);
        return { success: true, ...result, matchedAt: new Date().toISOString() };
      }),

    // 用户找商家：AI全网匹配最合适商家
    findMerchants: protectedProcedure
      .input(z.object({
        need: z.string().min(1),
        budget: z.string().optional(),
        area: z.string().optional(),
        urgency: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // 先搜索本地商家库
        const localMerchants = await db.searchMerchants(input.need);
        const result = await qwenMatchMerchants({
          ...input,
          localMerchants: localMerchants.map((m) => ({
            id: m.id,
            businessName: m.businessName,
            category: m.category,
            description: m.description || undefined,
          })),
        });
        return { success: true, ...result, localMerchants, matchedAt: new Date().toISOString() };
      }),

    // 多轮追问对话（无需登录，基于手机号）
    chat: publicProcedure
      .input(z.object({
        sessionId: z.string().optional(),
        phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入正确的手机号"),
        identity: z.enum(["customer", "merchant"]),
        message: z.string().min(1).max(500),
      }))
      .mutation(async ({ input }) => {
        const { phone, identity, message } = input;
        let sessionId = input.sessionId;

        // 获取或创建会话
        let session = sessionId ? await db.getMatchSession(sessionId) : null;
        if (!session) {
          sessionId = randomUUID();
          // 获取用户历史画像
          const profile = await db.getUserProfileByPhone(phone);
          const welcomeMsg = identity === "customer"
            ? `你好！我是道道，你的AI匹配顾问 🧭\n\n我会帮你找到最合适的商家有缘人。${profile?.profileJson ? "我记得你之前的偏好，" : ""}请告诉我，你现在需要什么服务或产品？`
            : `你好！我是道道，你的AI匹配顾问 🧭\n\n我会帮你找到最合适的目标客户。${profile?.profileJson ? "我记得你的业务信息，" : ""}请告诉我，你的业务是做什么的？`;

          const initMessages = JSON.stringify([{ role: "assistant", content: welcomeMsg, timestamp: Date.now() }]);
          await db.createMatchSession({ sessionId, phone, identity, messages: initMessages });
          session = await db.getMatchSession(sessionId);
        }

        if (!session) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "会话创建失败" });

        // 解析历史消息
        const messages: Array<{ role: string; content: string; timestamp: number }> = JSON.parse(session.messages || "[]");
        messages.push({ role: "user", content: message, timestamp: Date.now() });

        // 获取用户画像
        const profile = await db.getUserProfileByPhone(phone);

        // 调用AI多轮追问
        const aiResult = await qwenDeepNeedChat({
          identity,
          phone,
          messages: messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
          userProfile: profile?.profileJson,
          collectedInfo: session.collectedInfo,
        });

        messages.push({ role: "assistant", content: aiResult.reply, timestamp: Date.now() });

        // 更新会话
        await db.updateMatchSession(sessionId!, {
          messages: JSON.stringify(messages),
          collectedInfo: aiResult.updatedCollectedInfo,
        });

        // 如果AI认为信息足够，开始精准匹配
        if (aiResult.shouldMatch) {
          const matchResult = await qwenPreciseMatch({
            identity,
            phone,
            collectedInfo: aiResult.updatedCollectedInfo,
            userProfile: profile?.profileJson,
          });

          // 构建/更新用户画像
          const newProfileJson = await qwenBuildProfile({
            identity,
            collectedInfo: aiResult.updatedCollectedInfo,
            existingProfile: profile?.profileJson,
            matchTags: matchResult.profileTags,
          });

          // 更新需求历史
          const needsHistory = JSON.parse(profile?.needsHistory || "[]");
          needsHistory.unshift({ need: aiResult.updatedCollectedInfo.slice(0, 100), matchedAt: new Date().toISOString() });
          if (needsHistory.length > 20) needsHistory.pop();

          await db.upsertUserProfile({
            phone,
            identity,
            profileJson: newProfileJson,
            needsHistory: JSON.stringify(needsHistory),
            totalMatches: (profile?.totalMatches || 0) + 1,
          });

          await db.updateMatchSession(sessionId!, {
            isMatched: true,
            matchResult: JSON.stringify(matchResult),
          });

          return {
            sessionId,
            reply: aiResult.reply,
            shouldMatch: true,
            matchResult,
            collectedInfo: aiResult.updatedCollectedInfo,
          };
        }

        return {
          sessionId,
          reply: aiResult.reply,
          shouldMatch: false,
          matchResult: null,
          collectedInfo: aiResult.updatedCollectedInfo,
        };
      }),

    // 获取用户画像
    getProfile: publicProcedure
      .input(z.object({ phone: z.string().regex(/^1[3-9]\d{9}$/) }))
      .query(async ({ input }) => {
        const profile = await db.getUserProfileByPhone(input.phone);
        if (!profile) return null;
        return {
          phone: profile.phone,
          identity: profile.identity,
          name: profile.name,
          area: profile.area,
          profileJson: profile.profileJson ? JSON.parse(profile.profileJson) : null,
          needsHistory: profile.needsHistory ? JSON.parse(profile.needsHistory) : [],
          totalMatches: profile.totalMatches,
          updatedAt: profile.updatedAt,
        };
      }),
  }),

  insight: router({
    today: protectedProcedure.query(async ({ ctx }) => {
      const identity = ctx.user.identity || "customer";
      const allMerchants = await db.getAllMerchants(10);
      const merchantNames = allMerchants.map((m) => `${m.businessName}(${m.category})`).join("、");
      const dateStr = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" });

      try {
        // 主要使用QwenMax进行商机分析
        const data = await qwenDailyInsight(identity as "customer" | "merchant", merchantNames || undefined);
        return { success: true, identity, data, generatedAt: new Date().toISOString() };
      } catch {
        return { success: false, identity, data: { title: "今日商机", tips: "AI分析服务暂时不可用，请稍后再试。" }, generatedAt: new Date().toISOString() };
      }
    }),

    runDailyAnalysis: publicProcedure
      .input(z.object({ secret: z.string() }))
      .mutation(async ({ input }) => {
        if (input.secret !== (process.env.CRON_SECRET || "xswd-cron-2026")) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        const users = await db.getAllActiveUsers();
        console.log(`[每日商机] 开始为 ${users.length} 个用户生成商机分析...`);
        return { success: true, userCount: users.length, runAt: new Date().toISOString() };
      }),
  }),
});

export type AppRouter = typeof appRouter;
