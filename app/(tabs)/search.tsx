/**
 * 发现页 — 浏览商家和需求（无需登录）
 * ChatGPT 极简风格
 */
import { api } from "@/lib/api";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const C = {
  bg: "#FFFFFF",
  surface: "#F7F7F8",
  border: "#E5E5E5",
  primary: "#10A37F",
  primaryLight: "#E8F5F0",
  text: "#0D0D0D",
  muted: "#6E6E80",
};

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

const HOT_SEARCHES = ["餐厅", "美容美发", "家政保洁", "法律咨询", "教育培训", "装修设计"];

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.merchant.search(q.trim()) as Merchant[];
      setResults(res || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const renderItem = ({ item }: { item: Merchant }) => (
    <View style={s.card}>
      <View style={s.cardTop}>
        <View style={s.categoryBadge}>
          <Text style={s.categoryText}>{item.category}</Text>
        </View>
        {item.rating > 0 && (
          <Text style={s.rating}>★ {item.rating.toFixed(1)}</Text>
        )}
      </View>
      <Text style={s.cardName}>{item.businessName}</Text>
      {item.description ? <Text style={s.cardDesc} numberOfLines={2}>{item.description}</Text> : null}
      {item.address ? <Text style={s.cardAddr}>📍 {item.address}</Text> : null}
      {item.phone ? (
        <Pressable style={s.callBtn} onPress={() => Linking.openURL("tel:" + item.phone)}>
          <Text style={s.callBtnText}>📞 联系商家</Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.headerTitle}>发现</Text>
        <Text style={s.headerSub}>浏览平台商家</Text>
      </View>

      <View style={s.searchBar}>
        <TextInput
          style={s.searchInput}
          placeholder="搜索商家、服务..."
          placeholderTextColor={C.muted}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={() => doSearch(query)}
        />
        <Pressable
          style={[s.searchBtn, !query.trim() && s.searchBtnDisabled]}
          onPress={() => doSearch(query)}
          disabled={!query.trim()}
        >
          <Text style={s.searchBtnText}>搜索</Text>
        </Pressable>
      </View>

      {!searched && (
        <View style={s.hotSection}>
          <Text style={s.hotTitle}>热门搜索</Text>
          <View style={s.hotRow}>
            {HOT_SEARCHES.map((h) => (
              <Pressable key={h} style={s.hotChip} onPress={() => { setQuery(h); doSearch(h); }}>
                <Text style={s.hotChipText}>{h}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {loading && (
        <View style={s.center}>
          <ActivityIndicator color={C.primary} />
          <Text style={s.loadingText}>正在搜索...</Text>
        </View>
      )}

      {searched && !loading && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={s.emptyText}>没有找到相关商家</Text>
              <Text style={s.emptyHint}>试试其他关键词，或去首页让道道AI帮你匹配</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
  },
  headerTitle: { fontSize: 28, fontWeight: "700", color: C.text },
  headerSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  searchBar: {
    flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  searchInput: {
    flex: 1, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.surface, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, color: C.text,
  },
  searchBtn: {
    backgroundColor: C.primary, borderRadius: 12,
    paddingHorizontal: 16, justifyContent: "center",
  },
  searchBtnDisabled: { backgroundColor: C.border },
  searchBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  hotSection: { paddingHorizontal: 20, paddingTop: 20 },
  hotTitle: { fontSize: 13, fontWeight: "700", color: C.muted, marginBottom: 12 },
  hotRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  hotChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.surface,
  },
  hotChipText: { fontSize: 13, color: C.text },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40, gap: 12 },
  card: {
    borderRadius: 14, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.bg, padding: 16, gap: 6,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  categoryBadge: {
    backgroundColor: C.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  categoryText: { fontSize: 11, color: C.primary, fontWeight: "600" },
  rating: { fontSize: 13, color: "#F59E0B", fontWeight: "600" },
  cardName: { fontSize: 17, fontWeight: "700", color: C.text },
  cardDesc: { fontSize: 13, color: C.muted, lineHeight: 19 },
  cardAddr: { fontSize: 12, color: C.muted },
  callBtn: {
    marginTop: 4, paddingVertical: 10, borderRadius: 10,
    backgroundColor: C.primaryLight, alignItems: "center",
  },
  callBtnText: { fontSize: 14, color: C.primary, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 8 },
  loadingText: { fontSize: 14, color: C.muted },
  emptyText: { fontSize: 16, fontWeight: "600", color: C.text },
  emptyHint: { fontSize: 13, color: C.muted, textAlign: "center", paddingHorizontal: 40 },
});
