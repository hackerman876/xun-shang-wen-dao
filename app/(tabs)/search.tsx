import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface Merchant {
  id: number;
  businessName: string;
  category: string;
  description: string;
  rating: number;
  reviewCount: number;
  address: string;
  phone: string;
}

interface OnlineMerchant {
  name: string;
  category: string;
  description: string;
  rating?: string;
  address?: string;
}

const HOT_SEARCHES = ["餐厅预约", "美容美发", "家政保洁", "法律咨询", "医疗健康", "教育培训"];
const HOT_INDUSTRIES = ["餐饮行业", "美容行业", "教育培训", "医疗健康", "家政服务", "法律咨询"];

export default function SearchScreen() {
  const colors = useColors();
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Merchant[]>([]);
  const [onlineResults, setOnlineResults] = useState<OnlineMerchant[]>([]);
  const [onlineSummary, setOnlineSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingOnline, setLoadingOnline] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchedAt, setSearchedAt] = useState("");
  const [activeTab, setActiveTab] = useState<"local" | "online">("local");
  const [industryAnalysis, setIndustryAnalysis] = useState("");
  const [analyzingIndustry, setAnalyzingIndustry] = useState("");

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    setActiveTab("local");
    try {
      const res = await api.merchant.search(q);
      setResults((res as { merchants?: Merchant[] })?.merchants || []);
    } catch { setResults([]); } finally {
      setLoading(false);
    }
  }, []);

  const doOnlineSearch = useCallback(async (q: string) => {
    if (!q.trim() || !token) return;
    setLoadingOnline(true);
    setActiveTab("online");
    setSearched(true);
    try {
      const res = await api.merchant.searchOnline({ query: q }, token) as {
        merchants?: OnlineMerchant[];
        summary?: string;
        searchedAt?: string;
      };
      setOnlineResults(res?.merchants || []);
      setOnlineSummary(res?.summary || "");
      setSearchedAt(res?.searchedAt ? new Date(res.searchedAt).toLocaleTimeString("zh-CN") : "");
    } catch {
      setOnlineResults([]);
      setOnlineSummary("联网搜索暂时不可用");
    } finally {
      setLoadingOnline(false);
    }
  }, [token]);

  const doIndustryAnalysis = useCallback(async (industry: string) => {
    if (!token) return;
    setAnalyzingIndustry(industry);
    try {
      const res = await api.ai.industryAnalysis({ industry }, token) as { analysis?: string };
      setIndustryAnalysis(res?.analysis || "");
    } catch {
      setIndustryAnalysis("行业分析暂时不可用，请稍后再试。");
    } finally {
      setAnalyzingIndustry("");
    }
  }, [token]);

  const s = StyleSheet.create({
    header: {
      paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
      backgroundColor: colors.surface,
      borderBottomWidth: 0.5, borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 20, fontWeight: "800", color: colors.foreground, marginBottom: 12 },
    searchBar: {
      flexDirection: "row", alignItems: "center",
      backgroundColor: colors.background, borderRadius: 14,
      borderWidth: 1.5, borderColor: colors.border,
      paddingHorizontal: 12, gap: 8,
    },
    searchInput: {
      flex: 1, paddingVertical: 12, fontSize: 15,
      color: colors.foreground,
    },
    searchBtnRow: { flexDirection: "row", gap: 8, marginTop: 10 },
    searchBtn: {
      flex: 1, backgroundColor: colors.primary, borderRadius: 10,
      paddingVertical: 9, alignItems: "center",
    },
    searchBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
    onlineBtn: {
      flex: 1, borderRadius: 10, paddingVertical: 9, alignItems: "center",
      borderWidth: 1.5, borderColor: colors.primary,
      flexDirection: "row", justifyContent: "center", gap: 4,
    },
    onlineBtnText: { color: colors.primary, fontSize: 13, fontWeight: "700" },
    tabRow: {
      flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, gap: 10,
    },
    tab: {
      paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20,
      borderWidth: 1.5,
    },
    tabText: { fontSize: 13, fontWeight: "600" },
    onlineBadge: {
      flexDirection: "row", alignItems: "center", gap: 6,
      marginHorizontal: 16, marginBottom: 10,
      padding: 10, borderRadius: 12,
      backgroundColor: colors.success + "12",
      borderWidth: 1, borderColor: colors.success + "30",
    },
    onlineBadgeText: { fontSize: 12, color: colors.success, flex: 1 },
    hotSection: { padding: 20 },
    hotTitle: { fontSize: 15, fontWeight: "700", color: colors.foreground, marginBottom: 12 },
    hotTags: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    hotTag: {
      paddingVertical: 8, paddingHorizontal: 14,
      backgroundColor: colors.surface, borderRadius: 20,
      borderWidth: 1, borderColor: colors.border,
    },
    hotTagText: { fontSize: 13, color: colors.foreground },
    industrySection: { paddingHorizontal: 20, paddingBottom: 20 },
    industryTitle: { fontSize: 15, fontWeight: "700", color: colors.foreground, marginBottom: 12 },
    industryTag: {
      paddingVertical: 8, paddingHorizontal: 14,
      backgroundColor: colors.primary + "10", borderRadius: 20,
      borderWidth: 1, borderColor: colors.primary + "30",
    },
    industryTagText: { fontSize: 13, color: colors.primary, fontWeight: "500" },
    analysisCard: {
      marginHorizontal: 16, marginBottom: 16, borderRadius: 16,
      backgroundColor: colors.surface, padding: 16,
      borderWidth: 1, borderColor: colors.border,
    },
    analysisTitle: { fontSize: 14, fontWeight: "700", color: colors.foreground, marginBottom: 8 },
    analysisText: { fontSize: 13, color: colors.foreground, lineHeight: 20 },
    resultItem: {
      marginHorizontal: 16, marginBottom: 10, borderRadius: 14,
      backgroundColor: colors.surface, padding: 16,
      borderWidth: 1, borderColor: colors.border,
    },
    resultName: { fontSize: 16, fontWeight: "700", color: colors.foreground },
    resultCat: {
      fontSize: 11, color: colors.primary, fontWeight: "600",
      backgroundColor: `${colors.primary}15`, paddingHorizontal: 8,
      paddingVertical: 2, borderRadius: 8, alignSelf: "flex-start", marginTop: 4,
    },
    resultDesc: { fontSize: 13, color: colors.muted, marginTop: 6, lineHeight: 18 },
    resultMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
    bookBtn: {
      backgroundColor: colors.primary, borderRadius: 10,
      paddingVertical: 8, paddingHorizontal: 14,
    },
    bookBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
    emptyWrap: { alignItems: "center", paddingVertical: 60 },
    emptyText: { fontSize: 15, color: colors.muted, marginTop: 12 },
    resultCount: {
      paddingHorizontal: 20, paddingVertical: 8,
      fontSize: 13, color: colors.muted,
    },
    onlineResultItem: {
      marginHorizontal: 16, marginBottom: 10, borderRadius: 14,
      backgroundColor: colors.surface, padding: 16,
      borderWidth: 1, borderColor: colors.success + "40",
    },
    onlineTag: {
      fontSize: 10, color: colors.success, fontWeight: "600",
      backgroundColor: colors.success + "15", paddingHorizontal: 6,
      paddingVertical: 2, borderRadius: 6, alignSelf: "flex-start",
    },
  });

  const renderLocalResult = ({ item }: { item: Merchant }) => (
    <TouchableOpacity
      style={s.resultItem}
      onPress={() => router.push({ pathname: "/merchant/[id]", params: { id: item.id } } as never)}
      activeOpacity={0.8}
    >
      <Text style={s.resultName}>{item.businessName}</Text>
      <Text style={s.resultCat}>{item.category}</Text>
      <Text style={s.resultDesc} numberOfLines={2}>{item.description}</Text>
      <View style={s.resultMeta}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={{ color: "#F59E0B" }}>★</Text>
          <Text style={{ fontSize: 13, color: colors.foreground, fontWeight: "600" }}>
            {item.rating?.toFixed(1) || "5.0"}
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted }}>({item.reviewCount || 0})</Text>
        </View>
        <TouchableOpacity
          style={s.bookBtn}
          onPress={() => router.push({ pathname: "/appointment/new", params: { merchantId: item.id, merchantName: item.businessName } } as never)}
        >
          <Text style={s.bookBtnText}>立即预约</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderOnlineResult = ({ item }: { item: OnlineMerchant }) => (
    <View style={s.onlineResultItem}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Text style={s.resultName}>{item.name}</Text>
        <Text style={s.onlineTag}>实时数据</Text>
      </View>
      <Text style={s.resultCat}>{item.category}</Text>
      <Text style={s.resultDesc} numberOfLines={3}>{item.description}</Text>
      {(item.rating || item.address) ? (
        <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
          {item.rating ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Text style={{ color: "#F59E0B" }}>★</Text>
              <Text style={{ fontSize: 13, color: colors.foreground, fontWeight: "600" }}>{item.rating}</Text>
            </View>
          ) : null}
          {item.address ? (
            <Text style={{ fontSize: 12, color: colors.muted }} numberOfLines={1}>📍 {item.address}</Text>
          ) : null}
        </View>
      ) : null}
      <TouchableOpacity
        style={[s.bookBtn, { marginTop: 10, alignSelf: "flex-end" }]}
        onPress={() => router.push({ pathname: "/appointment/new", params: { merchantId: 0, merchantName: item.name } } as never)}
      >
        <Text style={s.bookBtnText}>AI帮我预约</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenContainer>
      <View style={s.header}>
        <Text style={s.headerTitle}>🔍 发现商家</Text>
        <View style={s.searchBar}>
          <IconSymbol name="magnifyingglass" size={18} color={colors.muted} />
          <TextInput
            style={s.searchInput}
            placeholder="搜索商家、服务..."
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={() => doSearch(query)}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(""); setResults([]); setOnlineResults([]); setSearched(false); }}>
              <IconSymbol name="xmark.circle.fill" size={18} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
        <View style={s.searchBtnRow}>
          <TouchableOpacity style={s.searchBtn} onPress={() => doSearch(query)}>
            <Text style={s.searchBtnText}>本地搜索</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.onlineBtn}
            onPress={() => doOnlineSearch(query)}
            disabled={loadingOnline}
          >
            {loadingOnline ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Text style={{ fontSize: 14 }}>🌐</Text>
                <Text style={s.onlineBtnText}>AI联网搜索</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.muted, marginTop: 12 }}>搜索中...</Text>
        </View>
      ) : !searched ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={s.hotSection}>
            <Text style={s.hotTitle}>🔥 热门搜索</Text>
            <View style={s.hotTags}>
              {HOT_SEARCHES.map((tag) => (
                <TouchableOpacity key={tag} style={s.hotTag} onPress={() => { setQuery(tag); doSearch(tag); }}>
                  <Text style={s.hotTagText}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={s.industrySection}>
            <Text style={s.industryTitle}>📊 AI实时行业分析</Text>
            <View style={s.hotTags}>
              {HOT_INDUSTRIES.map((ind) => (
                <TouchableOpacity
                  key={ind}
                  style={s.industryTag}
                  onPress={() => doIndustryAnalysis(ind)}
                  disabled={analyzingIndustry === ind}
                >
                  {analyzingIndustry === ind ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={s.industryTagText}>{ind}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {industryAnalysis ? (
            <View style={s.analysisCard}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Text style={{ fontSize: 16 }}>🌐</Text>
                <Text style={s.analysisTitle}>AI实时行业分析报告</Text>
                <View style={{
                  paddingHorizontal: 6, paddingVertical: 2,
                  backgroundColor: colors.success + "20", borderRadius: 6,
                }}>
                  <Text style={{ fontSize: 10, color: colors.success, fontWeight: "600" }}>实时数据</Text>
                </View>
              </View>
              <Text style={s.analysisText}>{industryAnalysis}</Text>
            </View>
          ) : null}
        </ScrollView>
      ) : (
        <>
          {/* 标签切换 */}
          {(results.length > 0 || onlineResults.length > 0) && (
            <View style={s.tabRow}>
              <TouchableOpacity
                style={[s.tab, {
                  backgroundColor: activeTab === "local" ? colors.primary : "transparent",
                  borderColor: activeTab === "local" ? colors.primary : colors.border,
                }]}
                onPress={() => setActiveTab("local")}
              >
                <Text style={[s.tabText, { color: activeTab === "local" ? "#fff" : colors.foreground }]}>
                  本地 {results.length > 0 ? `(${results.length})` : ""}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.tab, {
                  backgroundColor: activeTab === "online" ? colors.success : "transparent",
                  borderColor: activeTab === "online" ? colors.success : colors.border,
                }]}
                onPress={() => setActiveTab("online")}
              >
                <Text style={[s.tabText, { color: activeTab === "online" ? "#fff" : colors.foreground }]}>
                  🌐 AI联网 {onlineResults.length > 0 ? `(${onlineResults.length})` : ""}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {activeTab === "online" && onlineSummary ? (
            <View style={s.onlineBadge}>
              <Text style={{ fontSize: 14 }}>🌐</Text>
              <Text style={s.onlineBadgeText}>{onlineSummary}</Text>
              {searchedAt ? <Text style={{ fontSize: 11, color: colors.muted }}>{searchedAt}</Text> : null}
            </View>
          ) : null}

          {activeTab === "local" ? (
            results.length === 0 ? (
              <View style={s.emptyWrap}>
                <Text style={{ fontSize: 48 }}>🔍</Text>
                <Text style={s.emptyText}>本地未找到相关商家</Text>
                <TouchableOpacity
                  style={{ marginTop: 16, backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 }}
                  onPress={() => doOnlineSearch(query)}
                >
                  <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>🌐 AI联网搜索试试</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={results}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderLocalResult}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={<Text style={s.resultCount}>找到 {results.length} 个本地结果</Text>}
              />
            )
          ) : (
            loadingOnline ? (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator size="large" color={colors.success} />
                <Text style={{ color: colors.muted, marginTop: 12 }}>🌐 AI正在联网搜索...</Text>
                <Text style={{ color: colors.muted, marginTop: 4, fontSize: 12 }}>通义千问实时搜索中</Text>
              </View>
            ) : onlineResults.length === 0 ? (
              <View style={s.emptyWrap}>
                <Text style={{ fontSize: 48 }}>🌐</Text>
                <Text style={s.emptyText}>AI联网未找到相关结果</Text>
                <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>换个关键词试试</Text>
              </View>
            ) : (
              <FlatList
                data={onlineResults}
                keyExtractor={(item, idx) => `online_${idx}`}
                renderItem={renderOnlineResult}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                  <Text style={s.resultCount}>
                    🌐 AI联网找到 {onlineResults.length} 个结果（实时数据）
                  </Text>
                }
              />
            )
          )}
        </>
      )}
    </ScreenContainer>
  );
}
