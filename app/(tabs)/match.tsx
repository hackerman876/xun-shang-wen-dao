import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface CustomerMatch {
  type: string;
  score: number;
  reason: string;
  profile: string;
  contactSuggestion: string;
  platform: string;
}

interface MerchantMatch {
  name: string;
  category: string;
  score: number;
  reason: string;
  priceRange: string;
  highlights: string[];
  contactTip: string;
  isLocal: boolean;
  localId: number | null;
}

export default function MatchScreen() {
  const colors = useColors();
  const { token, user } = useAuth();
  const isMerchant = user?.identity === "merchant";

  // 商家找客户表单
  const [businessType, setBusinessType] = useState("");
  const [bizDesc, setBizDesc] = useState("");
  const [targetArea, setTargetArea] = useState("");

  // 用户找商家表单
  const [need, setNeed] = useState("");
  const [budget, setBudget] = useState("");
  const [area, setArea] = useState("");
  const [urgency, setUrgency] = useState("一般");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    summary: string;
    matches: (CustomerMatch | MerchantMatch)[];
    strategy?: string;
    tips?: string;
    hotTrends?: string[];
    alternatives?: string[];
    matchedAt?: string;
  } | null>(null);
  const [error, setError] = useState("");

  const URGENCY_OPTIONS = ["紧急", "较急", "一般", "不急"];

  const doMatch = async () => {
    if (!token) return;
    if (isMerchant && !businessType.trim()) {
      setError("请输入您的业务类型");
      return;
    }
    if (!isMerchant && !need.trim()) {
      setError("请描述您的需求");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);
    try {
      if (isMerchant) {
        const res = await api.match.findCustomers(
          { businessType, description: bizDesc, targetArea },
          token
        ) as typeof result;
        setResult(res);
      } else {
        const res = await api.match.findMerchants(
          { need, budget, area, urgency },
          token
        ) as typeof result;
        setResult(res);
      }
    } catch (e: unknown) {
      const err = e as Error;
      setError(err?.message || "匹配失败，请稍后再试");
    } finally {
      setLoading(false);
    }
  };

  const s = StyleSheet.create({
    header: {
      paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14,
      backgroundColor: colors.surface,
      borderBottomWidth: 0.5, borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 20, fontWeight: "800", color: colors.foreground },
    headerSub: { fontSize: 13, color: colors.muted, marginTop: 4 },
    identityBadge: {
      flexDirection: "row", alignItems: "center", gap: 6,
      marginTop: 10, paddingHorizontal: 12, paddingVertical: 6,
      borderRadius: 20, alignSelf: "flex-start",
      backgroundColor: isMerchant ? colors.primary + "15" : colors.success + "15",
    },
    identityText: {
      fontSize: 12, fontWeight: "700",
      color: isMerchant ? colors.primary : colors.success,
    },
    formCard: {
      margin: 16, borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1, borderColor: colors.border,
      padding: 16,
    },
    formTitle: { fontSize: 15, fontWeight: "700", color: colors.foreground, marginBottom: 14 },
    label: { fontSize: 13, color: colors.muted, marginBottom: 6, marginTop: 12 },
    input: {
      backgroundColor: colors.background, borderRadius: 12,
      borderWidth: 1.5, borderColor: colors.border,
      paddingHorizontal: 14, paddingVertical: 12,
      fontSize: 15, color: colors.foreground,
    },
    inputFocus: { borderColor: colors.primary },
    urgencyRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    urgencyBtn: {
      paddingVertical: 8, paddingHorizontal: 14,
      borderRadius: 20, borderWidth: 1.5,
    },
    urgencyText: { fontSize: 13, fontWeight: "600" },
    matchBtn: {
      margin: 16, marginTop: 4,
      backgroundColor: colors.primary, borderRadius: 14,
      paddingVertical: 16, alignItems: "center",
      flexDirection: "row", justifyContent: "center", gap: 8,
    },
    matchBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
    errorText: { color: colors.error, fontSize: 13, textAlign: "center", marginHorizontal: 16 },
    summaryCard: {
      marginHorizontal: 16, marginBottom: 12, borderRadius: 16,
      backgroundColor: colors.primary + "10",
      borderWidth: 1, borderColor: colors.primary + "30",
      padding: 16,
    },
    summaryTitle: { fontSize: 14, fontWeight: "700", color: colors.primary, marginBottom: 6 },
    summaryText: { fontSize: 14, color: colors.foreground, lineHeight: 22 },
    sectionTitle: {
      fontSize: 15, fontWeight: "700", color: colors.foreground,
      marginHorizontal: 16, marginBottom: 10, marginTop: 4,
    },
    matchCard: {
      marginHorizontal: 16, marginBottom: 10, borderRadius: 16,
      backgroundColor: colors.surface, padding: 16,
      borderWidth: 1, borderColor: colors.border,
    },
    matchCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    matchName: { fontSize: 16, fontWeight: "700", color: colors.foreground, flex: 1 },
    scoreBadge: {
      paddingHorizontal: 10, paddingVertical: 4,
      borderRadius: 20, marginLeft: 8,
    },
    scoreText: { fontSize: 13, fontWeight: "800", color: "#fff" },
    matchCat: {
      fontSize: 11, fontWeight: "600", color: colors.primary,
      backgroundColor: colors.primary + "15", paddingHorizontal: 8,
      paddingVertical: 2, borderRadius: 8, alignSelf: "flex-start", marginTop: 6,
    },
    matchReason: { fontSize: 13, color: colors.muted, marginTop: 8, lineHeight: 20 },
    matchDetail: { fontSize: 13, color: colors.foreground, marginTop: 6, lineHeight: 20 },
    highlightRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
    highlightTag: {
      paddingVertical: 4, paddingHorizontal: 10,
      backgroundColor: colors.success + "15", borderRadius: 12,
    },
    highlightText: { fontSize: 12, color: colors.success, fontWeight: "600" },
    localBadge: {
      paddingVertical: 4, paddingHorizontal: 10,
      backgroundColor: colors.primary + "20", borderRadius: 12,
    },
    localText: { fontSize: 12, color: colors.primary, fontWeight: "600" },
    contactCard: {
      marginTop: 10, padding: 10, borderRadius: 10,
      backgroundColor: colors.background,
    },
    contactText: { fontSize: 12, color: colors.muted, lineHeight: 18 },
    actionRow: { flexDirection: "row", gap: 8, marginTop: 12 },
    actionBtn: {
      flex: 1, paddingVertical: 10, borderRadius: 10,
      alignItems: "center",
    },
    actionBtnText: { fontSize: 13, fontWeight: "700" },
    strategyCard: {
      marginHorizontal: 16, marginBottom: 12, borderRadius: 16,
      backgroundColor: colors.warning + "10",
      borderWidth: 1, borderColor: colors.warning + "30",
      padding: 16,
    },
    strategyTitle: { fontSize: 14, fontWeight: "700", color: colors.warning, marginBottom: 6 },
    strategyText: { fontSize: 13, color: colors.foreground, lineHeight: 20 },
    trendRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginHorizontal: 16, marginBottom: 16 },
    trendTag: {
      paddingVertical: 6, paddingHorizontal: 12,
      backgroundColor: colors.surface, borderRadius: 20,
      borderWidth: 1, borderColor: colors.border,
    },
    trendText: { fontSize: 12, color: colors.foreground },
    emptyWrap: { alignItems: "center", paddingVertical: 40 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.foreground },
    emptyDesc: { fontSize: 13, color: colors.muted, marginTop: 6, textAlign: "center" },
  });

  const getScoreColor = (score: number) => {
    if (score >= 90) return "#10B981";
    if (score >= 75) return "#3B82F6";
    if (score >= 60) return "#F59E0B";
    return "#6B7280";
  };

  const renderCustomerMatch = (item: CustomerMatch, index: number) => (
    <View key={index} style={s.matchCard}>
      <View style={s.matchCardHeader}>
        <Text style={s.matchName}>{item.type}</Text>
        <View style={[s.scoreBadge, { backgroundColor: getScoreColor(item.score) }]}>
          <Text style={s.scoreText}>{item.score}分</Text>
        </View>
      </View>
      <Text style={s.matchReason}>{item.reason}</Text>
      <Text style={s.matchDetail}>👤 {item.profile}</Text>
      <View style={s.contactCard}>
        <Text style={[s.contactText, { fontWeight: "600", color: colors.foreground }]}>
          📱 {item.platform}
        </Text>
        <Text style={s.contactText}>💡 {item.contactSuggestion}</Text>
      </View>
      <View style={s.actionRow}>
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/(tabs)/ai-chat" as never)}
        >
          <Text style={[s.actionBtnText, { color: "#fff" }]}>AI帮我联系</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
          onPress={() => router.push("/(tabs)/ai-chat" as never)}
        >
          <Text style={[s.actionBtnText, { color: colors.foreground }]}>制定方案</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMerchantMatch = (item: MerchantMatch, index: number) => (
    <View key={index} style={s.matchCard}>
      <View style={s.matchCardHeader}>
        <Text style={s.matchName}>{item.name}</Text>
        <View style={[s.scoreBadge, { backgroundColor: getScoreColor(item.score) }]}>
          <Text style={s.scoreText}>{item.score}分</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
        <Text style={s.matchCat}>{item.category}</Text>
        {item.isLocal && <View style={s.localBadge}><Text style={s.localText}>平台商家</Text></View>}
      </View>
      <Text style={s.matchReason}>{item.reason}</Text>
      {item.priceRange ? (
        <Text style={s.matchDetail}>💰 {item.priceRange}</Text>
      ) : null}
      {item.highlights?.length > 0 && (
        <View style={s.highlightRow}>
          {item.highlights.map((h, i) => (
            <View key={i} style={s.highlightTag}>
              <Text style={s.highlightText}>✓ {h}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={s.contactCard}>
        <Text style={s.contactText}>💡 {item.contactTip}</Text>
      </View>
      <View style={s.actionRow}>
        {item.isLocal && item.localId ? (
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push({
              pathname: "/appointment/new",
              params: { merchantId: item.localId, merchantName: item.name }
            } as never)}
          >
            <Text style={[s.actionBtnText, { color: "#fff" }]}>立即预约</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(tabs)/ai-chat" as never)}
          >
            <Text style={[s.actionBtnText, { color: "#fff" }]}>AI帮我联系</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
          onPress={() => router.push("/(tabs)/ai-chat" as never)}
        >
          <Text style={[s.actionBtnText, { color: colors.foreground }]}>咨询道道</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScreenContainer>
      {/* 头部 */}
      <View style={s.header}>
        <Text style={s.headerTitle}>✨ AI全网匹配有缘人</Text>
        <Text style={s.headerSub}>
          {isMerchant ? "AI帮您找到最有缘分的客户群体" : "AI帮您匹配最合适的商家服务"}
        </Text>
        <View style={s.identityBadge}>
          <IconSymbol
            size={14}
            name={isMerchant ? "storefront.fill" : "person.fill"}
            color={isMerchant ? colors.primary : colors.success}
          />
          <Text style={s.identityText}>
            {isMerchant ? "商家模式 · 寻找客户" : "顾客模式 · 寻找商家"}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 表单区域 */}
        <View style={s.formCard}>
          <Text style={s.formTitle}>
            {isMerchant ? "🏪 描述您的业务" : "🎯 描述您的需求"}
          </Text>

          {isMerchant ? (
            <>
              <Text style={s.label}>业务类型 *</Text>
              <TextInput
                style={s.input}
                placeholder="例如：高端餐饮、美容美发、法律咨询..."
                placeholderTextColor={colors.muted}
                value={businessType}
                onChangeText={setBusinessType}
              />
              <Text style={s.label}>业务描述（选填）</Text>
              <TextInput
                style={[s.input, { minHeight: 80, textAlignVertical: "top" }]}
                placeholder="详细描述您的服务特色、优势..."
                placeholderTextColor={colors.muted}
                value={bizDesc}
                onChangeText={setBizDesc}
                multiline
              />
              <Text style={s.label}>目标地区（选填）</Text>
              <TextInput
                style={s.input}
                placeholder="例如：北京、上海、全国..."
                placeholderTextColor={colors.muted}
                value={targetArea}
                onChangeText={setTargetArea}
              />
            </>
          ) : (
            <>
              <Text style={s.label}>需求描述 *</Text>
              <TextInput
                style={[s.input, { minHeight: 80, textAlignVertical: "top" }]}
                placeholder="详细描述您需要什么服务，越具体匹配越准确..."
                placeholderTextColor={colors.muted}
                value={need}
                onChangeText={setNeed}
                multiline
              />
              <Text style={s.label}>预算范围（选填）</Text>
              <TextInput
                style={s.input}
                placeholder="例如：500元以内、1000-3000元..."
                placeholderTextColor={colors.muted}
                value={budget}
                onChangeText={setBudget}
              />
              <Text style={s.label}>地区偏好（选填）</Text>
              <TextInput
                style={s.input}
                placeholder="例如：北京朝阳区、上海浦东..."
                placeholderTextColor={colors.muted}
                value={area}
                onChangeText={setArea}
              />
              <Text style={s.label}>紧迫程度</Text>
              <View style={s.urgencyRow}>
                {URGENCY_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      s.urgencyBtn,
                      {
                        borderColor: urgency === opt ? colors.primary : colors.border,
                        backgroundColor: urgency === opt ? colors.primary + "15" : "transparent",
                      }
                    ]}
                    onPress={() => setUrgency(opt)}
                  >
                    <Text style={[s.urgencyText, { color: urgency === opt ? colors.primary : colors.muted }]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        {error ? <Text style={s.errorText}>{error}</Text> : null}

        {/* 匹配按钮 */}
        <TouchableOpacity
          style={[s.matchBtn, loading && { opacity: 0.7 }]}
          onPress={doMatch}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={s.matchBtnText}>AI全网匹配中...</Text>
            </>
          ) : (
            <>
              <IconSymbol size={20} name="sparkles" color="#fff" />
              <Text style={s.matchBtnText}>
                {isMerchant ? "AI全网找有缘客户" : "AI全网找有缘商家"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* 加载中提示 */}
        {loading && (
          <View style={s.emptyWrap}>
            <Text style={s.emptyIcon}>🔍</Text>
            <Text style={s.emptyTitle}>AI正在全网搜索匹配...</Text>
            <Text style={s.emptyDesc}>
              道道AI正在联网分析最新数据{"\n"}为您精准匹配最有缘分的{isMerchant ? "客户" : "商家"}
            </Text>
          </View>
        )}

        {/* 匹配结果 */}
        {result && !loading && (
          <>
            {/* 匹配摘要 */}
            <View style={s.summaryCard}>
              <Text style={s.summaryTitle}>✨ AI匹配分析</Text>
              <Text style={s.summaryText}>{result.summary}</Text>
              {result.matchedAt && (
                <Text style={{ fontSize: 11, color: colors.muted, marginTop: 6 }}>
                  数据来源：实时联网搜索 · {new Date(result.matchedAt).toLocaleTimeString("zh-CN")}
                </Text>
              )}
            </View>

            {/* 匹配列表 */}
            {result.matches?.length > 0 && (
              <>
                <Text style={s.sectionTitle}>
                  {isMerchant ? `🎯 匹配到 ${result.matches.length} 个有缘客户群体` : `🏪 匹配到 ${result.matches.length} 个有缘商家`}
                </Text>
                {isMerchant
                  ? (result.matches as CustomerMatch[]).map((m, i) => renderCustomerMatch(m, i))
                  : (result.matches as MerchantMatch[]).map((m, i) => renderMerchantMatch(m, i))
                }
              </>
            )}

            {/* 策略建议（商家模式） */}
            {isMerchant && result.strategy && (
              <View style={s.strategyCard}>
                <Text style={s.strategyTitle}>💡 获客策略建议</Text>
                <Text style={s.strategyText}>{result.strategy}</Text>
              </View>
            )}

            {/* 消费建议（顾客模式） */}
            {!isMerchant && result.tips && (
              <View style={s.strategyCard}>
                <Text style={s.strategyTitle}>💡 消费建议</Text>
                <Text style={s.strategyText}>{result.tips}</Text>
              </View>
            )}

            {/* 热点趋势 */}
            {result.hotTrends && result.hotTrends.length > 0 && (
              <>
                <Text style={s.sectionTitle}>🔥 当前市场热点</Text>
                <View style={s.trendRow}>
                  {result.hotTrends.map((t, i) => (
                    <View key={i} style={s.trendTag}>
                      <Text style={s.trendText}>{t}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* 备选方案 */}
            {result.alternatives && result.alternatives.length > 0 && (
              <>
                <Text style={s.sectionTitle}>🔄 备选方案</Text>
                <View style={s.trendRow}>
                  {result.alternatives.map((a, i) => (
                    <View key={i} style={s.trendTag}>
                      <Text style={s.trendText}>{a}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* 底部操作 */}
            <View style={{ margin: 16, marginTop: 8, gap: 10 }}>
              <TouchableOpacity
                style={[s.matchBtn, { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary }]}
                onPress={() => router.push("/(tabs)/ai-chat" as never)}
              >
                <IconSymbol size={18} name="sparkles" color={colors.primary} />
                <Text style={[s.matchBtnText, { color: colors.primary }]}>与道道AI深度沟通</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.matchBtn, { backgroundColor: colors.muted + "20", marginTop: 0 }]}
                onPress={() => { setResult(null); setError(""); }}
              >
                <Text style={[s.matchBtnText, { color: colors.muted }]}>重新匹配</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* 空状态 */}
        {!result && !loading && (
          <View style={s.emptyWrap}>
            <Text style={s.emptyIcon}>{isMerchant ? "🤝" : "🌟"}</Text>
            <Text style={s.emptyTitle}>
              {isMerchant ? "发现有缘客户" : "发现有缘商家"}
            </Text>
            <Text style={s.emptyDesc}>
              {isMerchant
                ? "AI联网分析全网数据\n为您精准匹配最有潜力的客户群体"
                : "AI联网搜索全网商家\n为您找到最合适的服务提供者"
              }
            </Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </ScreenContainer>
  );
}
