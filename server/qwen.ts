/**
 * QwenMax AI 调用模块 - 联网搜索全开
 * 主要AI引擎：通义千问 qwen-max-latest（支持联网搜索）
 * 失败时回退到内置LLM
 */

import { invokeLLM } from "./_core/llm";

export interface QwenMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface QwenResponse {
  reply: string;
  model: string;
  searchResults?: SearchResult[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

const QWEN_API_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
// 使用 qwen-max-latest 支持联网搜索插件
const QWEN_MODEL = "qwen-max-latest";
const QWEN_MODEL_FALLBACK = "qwen-max";

/**
 * 解析联网搜索引用来源
 */
function parseSearchResults(content: string): { cleanContent: string; sources: SearchResult[] } {
  const sources: SearchResult[] = [];
  // 提取引用标记 [数字] 和对应的来源
  const refPattern = /\[(\d+)\]\s*([^\n]+)/g;
  let match;
  while ((match = refPattern.exec(content)) !== null) {
    sources.push({ title: match[2], url: "", snippet: "" });
  }
  // 清理引用标记，保留正文
  const cleanContent = content
    .replace(/\[\d+\]†source/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return { cleanContent, sources };
}

/**
 * 核心调用函数 - 联网搜索全开
 */
export async function invokeQwen(
  messages: QwenMessage[],
  maxTokens = 2048,
  enableSearch = true
): Promise<QwenResponse> {
  const apiKey = process.env.QWEN_API_KEY;

  if (apiKey) {
    // 先尝试 qwen-max-latest（联网版）
    for (const model of [QWEN_MODEL, QWEN_MODEL_FALLBACK]) {
      try {
        const body: Record<string, unknown> = {
          model,
          messages,
          max_tokens: maxTokens,
          temperature: 0.7,
          top_p: 0.9,
          stream: false,
        };

        // 开启联网搜索插件
        if (enableSearch) {
          body.tools = [
            {
              type: "web_search",
              web_search: {
                enable: true,
                search_strategy: "pro", // 深度搜索策略
                result_format: "text",
              },
            },
          ];
          // 允许模型自主决定是否搜索
          body.tool_choice = "auto";
        }

        const response = await fetch(QWEN_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "X-DashScope-SSE": "disable",
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`[QwenMax:${model}] API错误 ${response.status}: ${errText}`);
          if (response.status === 400 && errText.includes("web_search")) {
            // 该模型不支持联网，禁用后重试
            console.log(`[QwenMax:${model}] 不支持联网搜索，禁用后重试`);
            const body2 = { ...body };
            delete body2.tools;
            delete body2.tool_choice;
            const r2 = await fetch(QWEN_API_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
              },
              body: JSON.stringify(body2),
            });
            if (r2.ok) {
              const d2 = await r2.json() as QwenAPIResponse;
              const reply2 = extractContent(d2);
              console.log(`[QwenMax:${model}] ✅ 无联网调用成功`);
              return { reply: reply2, model };
            }
          }
          throw new Error(`QwenMax API failed: ${response.status}`);
        }

        const data = await response.json() as QwenAPIResponse;
        const reply = extractContent(data);
        const { cleanContent, sources } = parseSearchResults(reply);

        console.log(`[QwenMax:${model}] ✅ 调用成功，联网=${enableSearch}，tokens=${data.usage?.total_tokens || 0}`);
        return {
          reply: cleanContent || reply,
          model,
          searchResults: sources.length > 0 ? sources : undefined,
          usage: data.usage,
        };
      } catch (err) {
        console.error(`[QwenMax:${model}] 调用失败:`, err);
        if (model === QWEN_MODEL_FALLBACK) {
          console.error("[QwenMax] 所有Qwen模型失败，回退到内置LLM");
        }
      }
    }
  } else {
    console.log("[QwenMax] 未配置QWEN_API_KEY，使用内置LLM");
  }

  // 回退到内置LLM（Manus forge）
  try {
    const result = await invokeLLM({ messages });
    const reply = result.choices[0]?.message?.content as string || "";
    return { reply, model: "gemini-2.5-flash (fallback)" };
  } catch (err) {
    console.error("[LLM Fallback] 内置LLM也失败:", err);
    return { reply: "AI服务暂时不可用，请稍后再试。", model: "error" };
  }
}

interface QwenAPIResponse {
  choices?: Array<{
    message?: { content?: string; tool_calls?: Array<{ function?: { arguments?: string } }> };
    finish_reason?: string;
  }>;
  model?: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

function extractContent(data: QwenAPIResponse): string {
  const choice = data.choices?.[0];
  if (!choice) return "";
  const content = choice.message?.content;
  if (content) return content;
  // 如果有tool_calls（搜索结果），尝试提取
  const toolCalls = choice.message?.tool_calls;
  if (toolCalls?.length) {
    try {
      const args = JSON.parse(toolCalls[0]?.function?.arguments || "{}");
      return args.content || args.result || JSON.stringify(args);
    } catch { return ""; }
  }
  return "";
}

/**
 * 专用：AI对话（顾客/商家智能助手）- 联网搜索全开
 */
export async function qwenChat(
  messages: QwenMessage[],
  identity: "customer" | "merchant",
  userName?: string
): Promise<string> {
  const today = new Date().toLocaleDateString("zh-CN", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });

  const systemPrompt = identity === "customer"
    ? `你是"道道"，寻商问道平台的智能AI助手。今天是${today}。

你拥有实时联网搜索能力，可以搜索最新的：
- 商家信息、营业时间、用户评价、价格行情
- 周边服务推荐、优惠活动
- 行业动态、消费趋势

你的核心职责：
1. **需求收集**：通过友好对话，了解顾客的具体需求（服务类型、时间、预算、位置等）
2. **实时搜索**：联网搜索最新最合适的商家，提供真实评价和价格参考
3. **智能推荐**：根据需求和实时数据推荐最合适的商家
4. **预约协助**：帮助顾客完成预约，确认时间和细节
5. **商机推送**：主动分析顾客可能感兴趣的服务和优惠

当遇到超出能力范围的复杂问题（如法律纠纷、医疗诊断、技术开发等），在回复末尾加上：
「💡 这个问题比较复杂，建议找 **Manus AI** 帮您解决——Manus是最强的AI员工，能处理任何复杂任务。」

用户名：${userName || "朋友"}
请用亲切、简洁的中文回复，控制在400字以内。如果使用了联网搜索，请注明"（数据来源：实时搜索）"。`
    : `你是"道道"，寻商问道平台的智能AI助手。今天是${today}。

你拥有实时联网搜索能力，可以搜索最新的：
- 行业趋势、市场动态、竞争对手信息
- 目标客户群体分析、消费习惯
- 营销策略、定价参考、成功案例

你的核心职责：
1. **市场分析**：实时搜索行业数据，分析市场需求和竞争格局
2. **客户推荐**：根据商家业务推荐最匹配的潜在客户群体
3. **商机挖掘**：搜索最新商机，提供具体可执行的建议
4. **主动联系**：模拟代替商家联系潜在客户，发起预约
5. **竞争分析**：实时搜索竞争对手动态，提供差异化建议

当遇到超出能力范围的复杂问题（如复杂财税、法律纠纷、技术开发等），在回复末尾加上：
「💡 这个问题比较复杂，建议找 **Manus AI** 帮您解决——Manus是最强的AI员工，能处理任何复杂商业任务。」

商家名称：${userName || "商家朋友"}
请用专业、简洁的中文回复，控制在400字以内。如果使用了联网搜索，请注明"（数据来源：实时搜索）"。`;

  const fullMessages: QwenMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  // 联网搜索全开
  const result = await invokeQwen(fullMessages, 1500, true);
  return result.reply;
}

/**
 * 专用：每日商机分析 - 联网搜索全开
 */
export async function qwenDailyInsight(
  identity: "customer" | "merchant",
  context?: string
): Promise<Record<string, unknown>> {
  const dateStr = new Date().toLocaleDateString("zh-CN", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });

  const prompt = identity === "customer"
    ? `今天是${dateStr}。请联网搜索最新消费趋势和热门服务，为顾客生成今日商机分析报告。

要求：
1. 搜索今日热门服务、优惠活动、消费趋势
2. 基于实时数据推荐3个最值得关注的服务机会
3. 推荐2-3个热门商家（可以是真实存在的知名连锁品牌）
4. 提供一条实用的消费贴士

严格返回JSON格式（不要有多余文字或markdown标记）：
{
  "title": "今日商机",
  "isRealtime": true,
  "recommendations": [
    {"type": "服务类型", "title": "推荐标题", "desc": "推荐理由（含实时数据）"}
  ],
  "hotMerchants": [
    {"name": "商家名", "reason": "推荐原因"}
  ],
  "tips": "今日消费小贴士",
  "suggestion": "AI建议"
}
${context ? `平台现有商家参考：${context}` : ""}`
    : `今天是${dateStr}。请联网搜索最新行业动态和市场趋势，为商家生成今日商机分析报告。

要求：
1. 搜索今日行业热点、市场需求变化
2. 分析3个最有价值的潜在客户机会
3. 搜索2个最新行业趋势
4. 提供竞争分析摘要和今日行动建议

严格返回JSON格式（不要有多余文字或markdown标记）：
{
  "title": "今日商机",
  "isRealtime": true,
  "customerInsights": [
    {"type": "客户类型", "title": "商机标题", "desc": "详细描述（含实时数据）"}
  ],
  "trends": [
    {"title": "趋势标题", "desc": "趋势描述"}
  ],
  "competition": "竞争分析摘要",
  "action": "今日行动建议"
}`;

  // 联网搜索全开
  const result = await invokeQwen([
    {
      role: "system",
      content: "你是专业商业分析AI，拥有实时联网搜索能力。必须先搜索最新数据，然后返回合法JSON，不要有任何多余文字或markdown标记。"
    },
    { role: "user", content: prompt },
  ], 2000, true);

  try {
    const match = result.reply.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      parsed.isRealtime = true;
      parsed.searchedAt = new Date().toISOString();
      return parsed;
    }
  } catch { /* ignore */ }

  return {
    title: "今日商机",
    isRealtime: false,
    tips: result.reply || "AI分析服务暂时不可用，请稍后再试。",
  };
}

/**
 * 专用：实时搜索商家信息
 */
export async function qwenSearchMerchant(query: string, location?: string): Promise<{
  merchants: Array<{ name: string; category: string; description: string; rating?: string; address?: string }>;
  summary: string;
}> {
  const searchQuery = location ? `${query} ${location}` : query;

  const result = await invokeQwen([
    {
      role: "system",
      content: "你是商家搜索AI，拥有实时联网搜索能力。请搜索用户需要的商家信息，返回JSON格式，不要有多余文字。"
    },
    {
      role: "user",
      content: `请联网搜索"${searchQuery}"相关的商家信息，返回JSON格式：
{
  "merchants": [
    {"name": "商家名", "category": "类别", "description": "简介", "rating": "评分", "address": "地址"}
  ],
  "summary": "搜索摘要（50字以内）"
}
要求：返回3-5个真实可信的商家，优先返回知名品牌或口碑好的商家。`
    },
  ], 1500, true);

  try {
    const match = result.reply.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch { /* ignore */ }

  return {
    merchants: [],
    summary: result.reply || "搜索暂时不可用",
  };
}

/**
 * 专用：预约摘要生成
 */
export async function qwenAppointmentSummary(
  merchantName: string,
  serviceTitle: string,
  description?: string
): Promise<string> {
  const result = await invokeQwen([
    { role: "system", content: "你是寻商问道AI助手，请用简洁中文生成预约确认摘要（50字以内）。" },
    { role: "user", content: `顾客预约商家"${merchantName}"，服务：${serviceTitle}，备注：${description || "无"}` },
  ], 200, false); // 摘要不需要联网
  return result.reply;
}

/**
 * 专用：AI电话模拟
 */
export async function qwenSimulateCall(
  appointmentId: number,
  merchantName: string,
  serviceTitle: string
): Promise<string> {
  const result = await invokeQwen([
    {
      role: "system",
      content: "你是寻商问道AI电话助手，请模拟一段简短的预约确认电话对话（100字以内，中文，生动真实，包含双方对话）。"
    },
    {
      role: "user",
      content: `AI助手拨打电话给商家"${merchantName}"，确认预约编号${appointmentId}，服务内容：${serviceTitle}`
    },
  ], 300, false); // 电话模拟不需要联网
  return result.reply;
}

/**
 * 专用：商家找客户 - AI全网匹配有缘客户群体
 */
export async function qwenMatchCustomers(params: {
  businessType: string;
  description?: string;
  targetArea?: string;
  requirements?: string;
}): Promise<{
  summary: string;
  matches: Array<{
    type: string;
    score: number;
    reason: string;
    profile: string;
    contactSuggestion: string;
    platform: string;
  }>;
  strategy: string;
  hotTrends: string[];
}> {
  const { businessType, description, targetArea, requirements } = params;
  const today = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });

  const result = await invokeQwen([
    {
      role: "system",
      content: "你是商业智能匹配引擎，具备全网实时搜索能力，专门帮商家匹配最有缘分的潜在客户。必须先搜索最新市场数据，然后返回合法JSON，不要有任何多余文字或markdown标记。"
    },
    {
      role: "user",
      content: `今天是${today}。请联网搜索并分析，为以下商家匹配最有缘分的潜在客户群体。

商家信息：
- 业务类型：${businessType}
- 业务描述：${description || "无"}
- 目标地区：${targetArea || "全国"}
- 特殊要求：${requirements || "无"}

请联网搜索并返回 JSON 格式：
{
  "summary": "匹配总结（100字内）",
  "matches": [
    {
      "type": "客户群体名称",
      "score": 95,
      "reason": "匹配理由",
      "profile": "客户画像描述",
      "contactSuggestion": "接触建议",
      "platform": "建议寻找渠道"
    }
  ],
  "strategy": "获客策略建议",
  "hotTrends": ["当前市场热点趋势1", "点势2"]
}

请返回5-8个匹配度最高的客户群体，按匹配度降序排列。`
    },
  ], 2000, true);

  try {
    const match = result.reply.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        summary: parsed.summary || "匹配分析完成",
        matches: parsed.matches || [],
        strategy: parsed.strategy || "",
        hotTrends: parsed.hotTrends || [],
      };
    }
  } catch { /* ignore */ }

  return {
    summary: result.reply.slice(0, 100),
    matches: [],
    strategy: "",
    hotTrends: [],
  };
}

/**
 * 专用：用户找商家 - AI全网匹配最合适商家
 */
export async function qwenMatchMerchants(params: {
  need: string;
  budget?: string;
  area?: string;
  urgency?: string;
  localMerchants?: Array<{ id: number; businessName: string; category: string; description?: string }>;
}): Promise<{
  summary: string;
  matches: Array<{
    name: string;
    category: string;
    score: number;
    reason: string;
    priceRange: string;
    highlights: string[];
    contactTip: string;
    isLocal: boolean;
    localId: number | null;
  }>;
  tips: string;
  alternatives: string[];
}> {
  const { need, budget, area, urgency, localMerchants } = params;
  const today = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });

  const result = await invokeQwen([
    {
      role: "system",
      content: "你是商业智能匹配引擎，具备全网实时搜索能力，专门帮用户匹配最合适的商家。必须先搜索最新信息，然后返回合法JSON，不要有任何多余文字或markdown标记。"
    },
    {
      role: "user",
      content: `今天是${today}。请联网搜索并分析，为以下用户匹配最有缘分的商家。

用户需求：
- 需求描述：${need}
- 预算范围：${budget || "不限"}
- 地区偏好：${area || "不限"}
- 紧迫程度：${urgency || "一般"}

平台已有商家：${localMerchants && localMerchants.length > 0 ? JSON.stringify(localMerchants) : "暂无"}

请联网搜索并返回 JSON 格式：
{
  "summary": "匹配总结（100字内）",
  "matches": [
    {
      "name": "商家名称",
      "category": "类型",
      "score": 95,
      "reason": "匹配理由",
      "priceRange": "价格区间",
      "highlights": ["亮点1", "亮点2"],
      "contactTip": "联系建议",
      "isLocal": false,
      "localId": null
    }
  ],
  "tips": "消费建议",
  "alternatives": ["备选方案1", "备选方案2"]
}

请返回5-8个匹配度最高的商家，优先匹配平台内商家，再补充全网匹配结果，按匹配度降序排列。`
    },
  ], 2000, true);

  try {
    const match = result.reply.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      // 标记本地商家
      if (parsed.matches && localMerchants) {
        parsed.matches = parsed.matches.map((m: { name: string; isLocal: boolean; localId: number | null }) => {
          const local = localMerchants.find(lm =>
            lm.businessName === m.name || m.name?.includes(lm.businessName)
          );
          if (local) { m.isLocal = true; m.localId = local.id; }
          return m;
        });
      }
      return {
        summary: parsed.summary || "匹配分析完成",
        matches: parsed.matches || [],
        tips: parsed.tips || "",
        alternatives: parsed.alternatives || [],
      };
    }
  } catch { /* ignore */ }

  return {
    summary: result.reply.slice(0, 100),
    matches: [],
    tips: "",
    alternatives: [],
  };
}

/**
 * 专用：实时行业分析
 */
export async function qwenIndustryAnalysis(industry: string): Promise<string> {
  const result = await invokeQwen([
    {
      role: "system",
      content: "你是商业分析AI，拥有实时联网搜索能力。请搜索最新行业数据并提供分析报告（200字以内）。"
    },
    {
      role: "user",
      content: `请联网搜索"${industry}"行业的最新动态、市场规模、发展趋势和投资机会，提供简洁的分析报告。`
    },
  ], 800, true); // 行业分析全开联网
  return result.reply;
}

/**
 * AI多轮追问对话 - 深度了解用户需求
 * 根据对话历史和用户画像，决定继续追问还是开始匹配
 */
export async function qwenDeepNeedChat(params: {
  identity: "customer" | "merchant";
  phone: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  userProfile?: string | null; // 已有的用户画像JSON
  collectedInfo?: string | null; // 已收集的信息摘要
}): Promise<{
  reply: string;
  shouldMatch: boolean; // 是否已收集足够信息，可以开始匹配
  updatedCollectedInfo: string; // 更新后的信息摘要
  profileUpdate?: Record<string, unknown>; // 需要更新到用户画像的字段
}> {
  const { identity, messages, userProfile, collectedInfo } = params;
  const isCustomer = identity === "customer";

  const systemPrompt = `你是"寻商问道"平台的AI匹配顾问，名叫"道道"。你的核心任务是通过自然对话，深度了解用户需求，然后为他们精准匹配有缘人。

用户身份：${isCustomer ? "顾客（寻找商家服务）" : "商家（寻找目标客户）"}
${userProfile ? `用户历史画像：${userProfile}` : ""}
${collectedInfo ? `本次已收集信息：${collectedInfo}` : ""}

【追问策略】
你需要通过2-4轮对话收集以下关键信息：
${isCustomer ? `
顾客需要收集：
1. 具体需求是什么（服务类型、产品类型）
2. 在哪个城市/区域
3. 预算范围大概是多少
4. 时间要求（紧急程度、期望什么时候）
5. 有什么特殊要求或偏好
` : `
商家需要收集：
1. 做什么行业/提供什么服务
2. 在哪个城市/区域经营
3. 目标客户群体是谁（年龄、消费能力、特征）
4. 希望找什么类型的合作或客户
5. 有什么优势或特色
`}

【判断标准】
- 如果已收集到3个以上关键信息，且用户需求基本清晰，设置shouldMatch=true开始匹配
- 如果信息不足，继续追问，每次只问1-2个最重要的问题
- 追问要自然、友好，像朋友聊天一样，不要像填表格

【回复格式】
必须返回严格的JSON格式：
{
  "reply": "你对用户说的话（自然语言，友好亲切）",
  "shouldMatch": false,
  "updatedCollectedInfo": "更新后的信息摘要（简洁列出已知信息）",
  "profileUpdate": {
    "area": "地区（如果提到了）",
    "tags": ["标签1", "标签2"],
    "preferences": "偏好描述"
  }
}`;

  const result = await invokeQwen([
    { role: "system", content: systemPrompt },
    ...messages,
  ], 1000, false); // 追问阶段不需要联网

  try {
    const jsonMatch = result.reply.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        reply: parsed.reply || "请告诉我更多关于您的需求",
        shouldMatch: parsed.shouldMatch === true,
        updatedCollectedInfo: parsed.updatedCollectedInfo || collectedInfo || "",
        profileUpdate: parsed.profileUpdate,
      };
    }
  } catch { /* ignore */ }

  return {
    reply: result.reply,
    shouldMatch: false,
    updatedCollectedInfo: collectedInfo || "",
  };
}

/**
 * AI基于深度了解的精准匹配
 * 在收集足够信息后，进行全网精准匹配
 */
export async function qwenPreciseMatch(params: {
  identity: "customer" | "merchant";
  phone: string;
  collectedInfo: string;
  userProfile?: string | null;
}): Promise<{
  summary: string;
  matches: Array<{
    name: string;
    description: string;
    reason: string;
    score: number;
    contactTip: string;
    area?: string;
    category?: string;
  }>;
  profileTags: string[]; // 从本次对话提炼的用户标签
  tips: string;
}> {
  const { identity, collectedInfo, userProfile } = params;
  const isCustomer = identity === "customer";

  const result = await invokeQwen([
    {
      role: "system",
      content: `你是"寻商问道"平台的AI精准匹配引擎。基于用户深度需求信息，联网搜索并匹配最合适的有缘人。`
    },
    {
      role: "user",
      content: `请基于以下深度了解的用户信息，联网搜索并匹配最合适的${isCustomer ? "商家" : "客户群体"}：

用户身份：${isCustomer ? "顾客" : "商家"}
深度需求信息：${collectedInfo}
${userProfile ? `用户历史偏好：${userProfile}` : ""}

请联网搜索相关信息，返回JSON格式：
{
  "summary": "基于深度了解的匹配总结（说明为什么这些是最合适的有缘人，150字内）",
  "matches": [
    {
      "name": "${isCustomer ? "商家名称或类型" : "客户群体名称"}",
      "description": "详细描述（100字内）",
      "reason": "精准匹配理由（结合用户具体需求说明）",
      "score": 95,
      "contactTip": "具体的联系或接触建议",
      "area": "所在区域",
      "category": "类别"
    }
  ],
  "profileTags": ["标签1", "标签2", "标签3"],
  "tips": "给用户的个性化建议（结合其具体情况）"
}
返回5-6个最精准的匹配结果，按匹配度降序排列。`
    }
  ], 2500, true); // 匹配阶段全开联网

  try {
    const jsonMatch = result.reply.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || "精准匹配完成",
        matches: parsed.matches || [],
        profileTags: parsed.profileTags || [],
        tips: parsed.tips || "",
      };
    }
  } catch { /* ignore */ }

  return {
    summary: "匹配分析完成",
    matches: [],
    profileTags: [],
    tips: result.reply.slice(0, 200),
  };
}

/**
 * AI构建/更新用户画像
 */
export async function qwenBuildProfile(params: {
  identity: "customer" | "merchant";
  collectedInfo: string;
  existingProfile?: string | null;
  matchTags?: string[];
}): Promise<string> {
  const { identity, collectedInfo, existingProfile, matchTags } = params;

  const result = await invokeQwen([
    {
      role: "system",
      content: "你是用户画像分析AI。根据用户的需求信息，构建或更新用户画像，以JSON格式返回。"
    },
    {
      role: "user",
      content: `请根据以下信息构建用户画像：

用户身份：${identity === "customer" ? "顾客" : "商家"}
本次需求信息：${collectedInfo}
${existingProfile ? `已有画像：${existingProfile}` : ""}
${matchTags?.length ? `本次匹配标签：${matchTags.join("、")}` : ""}

返回JSON格式的用户画像（合并已有画像和新信息）：
{
  "tags": ["标签1", "标签2", ...],
  "area": "常驻地区",
  "preferences": "偏好描述",
  "budget": "预算范围",
  "personality": "用户特征",
  "industry": "行业（商家）或消费类型（顾客）",
  "lastNeed": "最近一次需求摘要",
  "summary": "一句话画像总结"
}`
    }
  ], 600, false);

  try {
    const jsonMatch = result.reply.match(/\{[\s\S]*\}/);
    if (jsonMatch) return jsonMatch[0];
  } catch { /* ignore */ }
  return result.reply;
}
