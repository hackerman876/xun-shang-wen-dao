import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const CATEGORIES = [
  { id: "all", label: "全部", icon: "🌟" },
  { id: "餐饮", label: "餐饮", icon: "🍜" },
  { id: "美容", label: "美容", icon: "💄" },
  { id: "教育", label: "教育", icon: "📚" },
  { id: "医疗", label: "医疗", icon: "🏥" },
  { id: "家政", label: "家政", icon: "🏠" },
  { id: "维修", label: "维修", icon: "🔧" },
  { id: "法律", label: "法律", icon: "⚖️" },
];

interface Merchant {
  id: number;
  businessName: string;
  category: string;
  description: string;
  rating: number;
  reviewCount: number;
  address: string;
}

interface InsightData {
  title?: string;
  recommendations?: Array<{ type: string; title: string; desc: string }>;
  hotMerchants?: Array<{ name: string; reason: string }>;
  tips?: string;
  suggestion?: string;
  customerInsights?: Array<{ type: string; title: string; desc: string }>;
  trends?: Array<{ title: string; desc: string }>;
  competition?: string;
  action?: string;
}

export default function HomeScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const [selectedCat, setSelectedCat] = useState("all");
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [insight, setInsight] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isCustomer = user?.identity === "customer";

  const loadData = async () => {
    try {
      const [mRes, iRes] = await Promise.allSettled([
        api.merchant.search("", selectedCat === "all" ? undefined : selectedCat),
        api.insight.today(user?.id?.toString() || ""),
      ]);
      if (mRes.status === "fulfilled") {
        const data = mRes.value;
        setMerchants((data as { merchants?: Merchant[] })?.merchants || (Array.isArray(data) ? data : []) as Merchant[]);
      }
      if (iRes.status === "fulfilled") {
        setInsight((iRes.value as { data?: InsightData })?.data || null);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, [selectedCat]);

  const s = StyleSheet.create({
    header: {
      paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14,
      backgroundColor: colors.surface,
      borderBottomWidth: 0.5, borderBottomColor: colors.border,
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    },
    logoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    logoCircle: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: "center", justifyContent: "center",
    },
    logoText: { fontSize: 16, color: "#fff", fontWeight: "800" },
    appName: { fontSize: 18, fontWeight: "800", color: colors.foreground, letterSpacing: 1 },
    greeting: { fontSize: 13, color: colors.muted },
    notifBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: colors.background,
      alignItems: "center", justifyContent: "center",
      borderWidth: 1, borderColor: colors.border,
    },
    // AI入口卡片
    aiCard: {
      margin: 16, borderRadius: 20, padding: 20,
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35, shadowRadius: 16, elevation: 10,
    },
    aiCardTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
    aiCardIcon: {
      width: 40, height: 40, borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center", justifyContent: "center",
    },
    aiCardTitle: { fontSize: 17, fontWeight: "800", color: "#fff" },
    aiCardSub: { fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 19 },
    aiCardBtn: {
      marginTop: 14, backgroundColor: "rgba(255,255,255,0.22)",
      borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16,
      flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start",
    },
    aiCardBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
    // 商机卡片
    insightCard: {
      marginHorizontal: 16, marginBottom: 16, borderRadius: 18,
      backgroundColor: colors.surface, padding: 18,
      borderWidth: 1, borderColor: colors.border,
    },
    insightHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
    insightTitle: { fontSize: 15, fontWeight: "700", color: colors.foreground, flex: 1 },
    insightBadge: {
      paddingHorizontal: 8, paddingVertical: 3,
      backgroundColor: colors.success + "20",
      borderRadius: 8,
    },
    insightBadgeText: { fontSize: 11, color: colors.success, fontWeight: "600" },
    insightItem: {
      flexDirection: "row", alignItems: "flex-start",
      gap: 10, marginBottom: 10, paddingBottom: 10,
      borderBottomWidth: 0.5, borderBottomColor: colors.border,
    },
    insightItemLast: {
      flexDirection: "row", alignItems: "flex-start", gap: 10,
    },
    insightNum: {
      width: 22, height: 22, borderRadius: 11,
      backgroundColor: colors.primary + "20",
      alignItems: "center", justifyContent: "center",
    },
    insightNumText: { fontSize: 11, color: colors.primary, fontWeight: "700" },
    insightItemTitle: { fontSize: 14, fontWeight: "600", color: colors.foreground },
    insightItemDesc: { fontSize: 12, color: colors.muted, lineHeight: 18, marginTop: 2 },
    insightTip: {
      marginTop: 12, padding: 12,
      backgroundColor: colors.primary + "10",
      borderRadius: 12, borderLeftWidth: 3, borderLeftColor: colors.primary,
    },
    insightTipText: { fontSize: 13, color: colors.foreground, lineHeight: 19 },
    // 分类
    sectionHeader: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      paddingHorizontal: 20, marginBottom: 12,
    },
    sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.foreground },
    seeAll: { fontSize: 13, color: colors.primary, fontWeight: "600" },
    catScroll: { paddingHorizontal: 16, paddingBottom: 4, gap: 8 },
    catItem: {
      alignItems: "center", paddingVertical: 8,
      paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5,
    },
    catIcon: { fontSize: 18, marginBottom: 2 },
    catLabel: { fontSize: 12, fontWeight: "600" },
    // 商家卡片
    merchantCard: {
      marginHorizontal: 16, marginBottom: 12, borderRadius: 18,
      backgroundColor: colors.surface, padding: 16,
      borderWidth: 1, borderColor: colors.border,
      shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    merchantTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    merchantName: { fontSize: 16, fontWeight: "700", color: colors.foreground, flex: 1 },
    merchantCatBadge: {
      fontSize: 11, color: colors.primary, fontWeight: "600",
      backgroundColor: colors.primary + "15", paddingHorizontal: 8,
      paddingVertical: 3, borderRadius: 8, marginTop: 4, alignSelf: "flex-start",
    },
    merchantDesc: { fontSize: 13, color: colors.muted, marginTop: 8, lineHeight: 19 },
    merchantMeta: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 12 },
    ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
    ratingText: { fontSize: 13, color: colors.foreground, fontWeight: "600" },
    reviewText: { fontSize: 12, color: colors.muted },
    bookBtn: {
      backgroundColor: colors.primary, borderRadius: 10,
      paddingVertical: 8, paddingHorizontal: 14,
      flexDirection: "row", alignItems: "center", gap: 4,
    },
    bookBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
    emptyWrap: { alignItems: "center", paddingVertical: 40 },
    emptyText: { fontSize: 15, color: colors.muted, marginTop: 8 },
    emptySubText: { fontSize: 13, color: colors.muted, marginTop: 4 },
  });

  const renderInsight = () => {
    if (!insight) return null;
    const items = isCustomer
      ? (insight.recommendations || []).map((r) => ({ title: r.title, desc: r.desc }))
      : (insight.customerInsights || insight.trends || []).map((r) => ({ title: r.title, desc: r.desc }));
    const tip = insight.tips || insight.suggestion || insight.action;

    if (items.length === 0 && !tip) return null;

    return (
      <View style={s.insightCard}>
        <View style={s.insightHeader}>
          <Text style={{ fontSize: 18 }}>📊</Text>
          <Text style={s.insightTitle}>{insight.title || "今日商机分析"}</Text>
          <View style={s.insightBadge}>
            <Text style={s.insightBadgeText}>AI生成</Text>
          </View>
        </View>
        {items.slice(0, 3).map((item, i) => (
          <View key={i} style={i < Math.min(items.length, 3) - 1 ? s.insightItem : s.insightItemLast}>
            <View style={s.insightNum}>
              <Text style={s.insightNumText}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.insightItemTitle}>{item.title}</Text>
              {item.desc ? <Text style={s.insightItemDesc}>{item.desc}</Text> : null}
            </View>
          </View>
        ))}
        {tip ? (
          <View style={s.insightTip}>
            <Text style={s.insightTipText}>💡 {tip}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  const renderMerchant = ({ item }: { item: Merchant }) => (
    <TouchableOpacity
      style={s.merchantCard}
      onPress={() => router.push({ pathname: "/merchant/[id]", params: { id: item.id } } as never)}
      activeOpacity={0.8}
    >
      <View style={s.merchantTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.merchantName}>{item.businessName}</Text>
          <Text style={s.merchantCatBadge}>{item.category}</Text>
        </View>
        <TouchableOpacity
          style={s.bookBtn}
          onPress={() => router.push({ pathname: "/appointment/new", params: { merchantId: item.id, merchantName: item.businessName } } as never)}
        >
          <Text style={{ fontSize: 13 }}>📅</Text>
          <Text style={s.bookBtnText}>预约</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.merchantDesc} numberOfLines={2}>{item.description}</Text>
      <View style={s.merchantMeta}>
        <View style={s.ratingRow}>
          <Text style={{ color: "#F59E0B", fontSize: 14 }}>★</Text>
          <Text style={s.ratingText}>{item.rating?.toFixed(1) || "5.0"}</Text>
          <Text style={s.reviewText}>({item.reviewCount || 0}条评价)</Text>
        </View>
        {item.address ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
            <Text style={{ fontSize: 12 }}>📍</Text>
            <Text style={s.reviewText} numberOfLines={1}>{item.address}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "早上好" : hour < 18 ? "下午好" : "晚上好";

  return (
    <ScreenContainer>
      {/* 顶部导航 */}
      <View style={s.header}>
        <View style={s.logoRow}>
          <View style={s.logoCircle}>
            <Text style={s.logoText}>寻</Text>
          </View>
          <View>
            <Text style={s.appName}>寻商问道</Text>
            <Text style={s.greeting}>{timeGreeting}，{user?.name || "朋友"} {isCustomer ? "🛒" : "🏪"}</Text>
          </View>
        </View>
        <TouchableOpacity style={s.notifBtn}>
          <Text style={{ fontSize: 18 }}>🔔</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadData(); }}
            tintColor={colors.primary}
          />
        }
      >
        {/* AI 入口卡片 */}
        <TouchableOpacity
          style={s.aiCard}
          onPress={() => router.push("/(tabs)/ai-chat" as never)}
          activeOpacity={0.92}
        >
          <View style={s.aiCardTop}>
            <View style={s.aiCardIcon}>
              <Text style={{ fontSize: 22 }}>✨</Text>
            </View>
            <Text style={s.aiCardTitle}>道道 AI 助手</Text>
          </View>
          <Text style={s.aiCardSub}>
            {isCustomer
              ? "告诉AI您的需求，自动帮您找到最合适的商家并完成预约"
              : "让AI分析市场需求，精准推荐潜在客户，主动联系预约"}
          </Text>
          <View style={s.aiCardBtn}>
            <Text style={{ fontSize: 16 }}>💬</Text>
            <Text style={s.aiCardBtnText}>开始对话</Text>
          </View>
        </TouchableOpacity>

        {/* 今日商机 */}
        {loading ? (
          <View style={{ alignItems: "center", padding: 24 }}>
            <ActivityIndicator color={colors.primary} />
            <Text style={{ color: colors.muted, marginTop: 8, fontSize: 13 }}>AI正在分析今日商机...</Text>
          </View>
        ) : renderInsight()}

        {/* 商家/客户列表 */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>
            {isCustomer ? "推荐商家" : "潜在客户群"}
          </Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/search" as never)}>
            <Text style={s.seeAll}>查看全部 →</Text>
          </TouchableOpacity>
        </View>

        {/* 分类筛选 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.catScroll}
          style={{ marginBottom: 12 }}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                s.catItem,
                {
                  borderColor: selectedCat === cat.id ? colors.primary : colors.border,
                  backgroundColor: selectedCat === cat.id ? colors.primary + "15" : colors.surface,
                },
              ]}
              onPress={() => setSelectedCat(cat.id)}
            >
              <Text style={s.catIcon}>{cat.icon}</Text>
              <Text style={[s.catLabel, { color: selectedCat === cat.id ? colors.primary : colors.muted }]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : merchants.length === 0 ? (
          <View style={s.emptyWrap}>
            <Text style={{ fontSize: 48 }}>🏪</Text>
            <Text style={s.emptyText}>暂无商家</Text>
            <Text style={s.emptySubText}>
              {isCustomer ? "快去AI对话让助手帮您找" : "注册成为商家，获取更多客户"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={merchants.slice(0, 8)}
            renderItem={renderMerchant}
            keyExtractor={(item) => String(item.id)}
            scrollEnabled={false}
          />
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </ScreenContainer>
  );
}
