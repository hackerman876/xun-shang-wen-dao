/**
 * API 客户端 - 直接调用后端接口
 * 使用 fetch 直接调用 tRPC HTTP 端点
 */

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:3000";

async function trpcQuery(path: string, input?: unknown) {
  const wrappedInput = input !== undefined ? { json: input } : undefined;
  const url = `${API_BASE}/api/trpc/${path}${wrappedInput !== undefined ? `?input=${encodeURIComponent(JSON.stringify(wrappedInput))}` : ""}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error?.json?.message || json.error?.message || "API Error");
  return json.result?.data?.json ?? json.result?.data;
}

async function trpcMutation(path: string, input?: unknown, token?: string) {
  const url = `${API_BASE}/api/trpc/${path}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ json: input }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error?.json?.message || json.error?.message || "API Error");
  return json.result?.data?.json ?? json.result?.data;
}

export const api = {
  auth: {
    sendCode: (phone: string) => trpcMutation("auth.sendCode", { phone }),
    loginWithPhone: (data: { phone: string; code: string; name?: string; identity?: "customer" | "merchant" }) =>
      trpcMutation("auth.loginWithPhone", data),
    me: (token?: string) => trpcQuery("auth.me"),
    logout: (token?: string) => trpcMutation("auth.logout", undefined, token),
    updateProfile: (data: { name?: string; identity?: "customer" | "merchant" }, token: string) =>
      trpcMutation("auth.updateProfile", data, token),
  },
  merchant: {
    search: (query: string, category?: string) => trpcQuery("merchant.search", { query, category }),
    getById: (id: number) => trpcQuery("merchant.getById", { id }),
    categories: () => trpcQuery("merchant.categories"),
    upsert: (data: Record<string, unknown>, token: string) => trpcMutation("merchant.upsert", data, token),
    myMerchant: (token: string) => trpcQuery("merchant.myMerchant"),
    searchOnline: (data: { query: string; location?: string }, token: string) =>
      trpcMutation("merchant.searchOnline", data, token),
  },
  appointment: {
    create: (data: Record<string, unknown>, token: string) => trpcMutation("appointment.create", data, token),
    list: (phone: string) => trpcQuery("appointment.listByPhone", { phone }),
    myList: (token: string) => trpcQuery("appointment.myList"),
    merchantList: (token: string) => trpcQuery("appointment.merchantList"),
    updateStatus: (data: { id: number; status: string }, token: string) =>
      trpcMutation("appointment.updateStatus", data, token),
    simulateCall: (data: { appointmentId: number; targetPhone: string }, token: string) =>
      trpcMutation("appointment.simulateCall", data, token),
  },
  ai: {
    chat: (data: { message: string; sessionId: string; identity?: string }, token: string) =>
      trpcMutation("ai.chat", data, token),
    history: (sessionId: string) => trpcQuery("ai.history", { sessionId }),
    industryAnalysis: (data: { industry: string }, token: string) =>
      trpcMutation("ai.industryAnalysis", data, token),
  },
  match: {
    findCustomers: (data: { businessType: string; description?: string; targetArea?: string; requirements?: string }, token: string) =>
      trpcMutation("match.findCustomers", data, token),
    findMerchants: (data: { need: string; budget?: string; area?: string; urgency?: string }, token: string) =>
      trpcMutation("match.findMerchants", data, token),
    // 无需登录的统一匹配入口
    find: (data: { identity: "customer" | "merchant"; phone: string; need: string }) =>
      trpcMutation("match.findPublic", data),
    // AI多轮追问对话（无需登录）
    chat: (data: { sessionId?: string; phone: string; identity: "customer" | "merchant"; message: string }) =>
      trpcMutation("match.chat", data),
    // 获取用户画像
    getProfile: (phone: string) =>
      trpcQuery("match.getProfile", { phone }),
  },
  insight: {
    today: (token: string) => trpcQuery("insight.today"),
  },
};
