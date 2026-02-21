/**
 * 发现页 — 浏览商家 + 商家入驻
 * ChatGPT 极简风格
 */
import { api } from "@/lib/api";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Pressable,
  ScrollView,
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
  danger: "#EF4444",
  text: "#0D0D0D",
  muted: "#6E6E80",
  gold: "#F59E0B",
};

const CATEGORIES = ["餐饮", "美容", "教育", "医疗", "家政", "法律", "金融", "健身", "装修", "其他"];
const HOT_SEARCHES = ["餐厅", "美容美发", "家政保洁", "法律咨询", "教育培训", "装修设计"];

interface Merchant {
  id: number;
  businessName: string;
  category: string;
  description: string;
  rating: number;
  reviewCount: number;
  address: string;
  phone: string;
  tags?: string;
}

interface AiCard {
  tags: string[];
  targetCustomers: string;
  highlights: string;
  aiSummary: string;
}

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // 入驻表单
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    businessName: "",
    category: "餐饮",
    description: "",
    serviceScope: "",
    area: "",
    phone: "",
    contactName: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [successCard, setSuccessCard] = useState<{ message: string; aiAnalysis: AiCard } | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.merchant.search(q);
      const data = (res as { result?: { data?: { json?: Merchant[] } } })?.result?.data?.json;
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = async () => {
    if (!form.businessName || !form.description || !form.serviceScope || !form.area || !form.phone) {
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.merchant.registerPublic(form);
      const data = (res as { result?: { data?: { json?: { message: string; aiAnalysis: AiCard } } } })?.result?.data?.json;
      if (data) {
        setSuccessCard({ message: data.message, aiAnalysis: data.aiAnalysis });
        setShowForm(false);
        setForm({ businessName: "", category: "餐饮", description: "", serviceScope: "", area: "", phone: "", contactName: "" });
      }
    } catch {
      // silently fail, user can retry
    } finally {
      setSubmitting(false);
    }
  };

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
      {item.tags ? (
        <View style={s.tagRow}>
          {item.tags.split(",").slice(0, 3).map((t, i) => (
            <View key={i} style={s.tag}><Text style={s.tagText}>{t.trim()}</Text></View>
          ))}
        </View>
      ) : null}
      {item.phone ? (
        <Pressable style={s.callBtn} onPress={() => Linking.openURL("tel:" + item.phone)}>
          <Text style={s.callBtnText}>📞 联系商家</Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>发现</Text>
          <Text style={s.headerSub}>找到志同道合的商家</Text>
        </View>
        <Pressable style={s.joinBtn} onPress={() => setShowForm(true)}>
          <Text style={s.joinBtnText}>+ 我要入驻</Text>
        </Pressable>
      </View>

      {/* Search Bar */}
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

      {/* AI入驻成功名片 */}
      {successCard && (
        <View style={s.aiCard}>
          <View style={s.aiCardHeader}>
            <Text style={s.aiCardTitle}>🎉 入驻成功！道道已为你生成专属名片</Text>
            <Pressable onPress={() => setSuccessCard(null)}>
              <Text style={s.aiCardClose}>✕</Text>
            </Pressable>
          </View>
          <Text style={s.aiCardMsg}>{successCard.message}</Text>
          <Text style={s.aiCardSummary}>{successCard.aiAnalysis.aiSummary}</Text>
          <Text style={s.aiCardLabel}>目标客群</Text>
          <Text style={s.aiCardValue}>{successCard.aiAnalysis.targetCustomers}</Text>
          <Text style={s.aiCardLabel}>服务亮点</Text>
          <Text style={s.aiCardValue}>{successCard.aiAnalysis.highlights}</Text>
          <View style={s.tagRow}>
            {successCard.aiAnalysis.tags.map((t, i) => (
              <View key={i} style={[s.tag, { backgroundColor: C.primaryLight }]}>
                <Text style={[s.tagText, { color: C.primary }]}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Hot Searches */}
      {!searched && !successCard && (
        <View style={s.hotSection}>
          <Text style={s.hotTitle}>热门搜索</Text>
          <View style={s.hotRow}>
            {HOT_SEARCHES.map((h) => (
              <Pressable key={h} style={s.hotChip} onPress={() => { setQuery(h); doSearch(h); }}>
                <Text style={s.hotChipText}>{h}</Text>
              </Pressable>
            ))}
          </View>
          <View style={s.banner}>
            <Text style={s.bannerTitle}>🤝 成为有缘人的起点</Text>
            <Text style={s.bannerDesc}>入驻后，道道AI将为你全网匹配最合适的客户，帮你找到志同道合的有缘人</Text>
            <Pressable style={s.bannerBtn} onPress={() => setShowForm(true)}>
              <Text style={s.bannerBtnText}>立即入驻 →</Text>
            </Pressable>
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

      {/* 入驻表单 Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalSafe}>
          <View style={s.modalHeader}>
            <Pressable onPress={() => setShowForm(false)}>
              <Text style={s.modalCancel}>取消</Text>
            </Pressable>
            <Text style={s.modalTitle}>商家入驻</Text>
            <Pressable
              style={[s.modalSubmit, submitting && { opacity: 0.5 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.modalSubmitText}>提交</Text>}
            </Pressable>
          </View>

          <ScrollView style={s.modalBody} contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={s.formHint}>填写信息后，道道AI将自动分析并为你生成专属名片，精准匹配有缘客户</Text>

            <Text style={s.label}>商家名称 *</Text>
            <TextInput
              style={s.input}
              placeholder="例如：张记川菜馆"
              placeholderTextColor={C.muted}
              value={form.businessName}
              onChangeText={(v) => setForm(f => ({ ...f, businessName: v }))}
            />

            <Text style={s.label}>联系人姓名</Text>
            <TextInput
              style={s.input}
              placeholder="您的姓名（可选）"
              placeholderTextColor={C.muted}
              value={form.contactName}
              onChangeText={(v) => setForm(f => ({ ...f, contactName: v }))}
            />

            <Text style={s.label}>联系电话 *</Text>
            <TextInput
              style={s.input}
              placeholder="手机号，客户将通过此号联系您"
              placeholderTextColor={C.muted}
              value={form.phone}
              onChangeText={(v) => setForm(f => ({ ...f, phone: v }))}
              keyboardType="phone-pad"
            />

            <Text style={s.label}>业务类型 *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  style={[s.catChip, form.category === cat && s.catChipActive]}
                  onPress={() => setForm(f => ({ ...f, category: cat }))}
                >
                  <Text style={[s.catChipText, form.category === cat && s.catChipTextActive]}>{cat}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={s.label}>服务描述 * <Text style={s.labelHint}>（让AI更好地了解你）</Text></Text>
            <TextInput
              style={[s.input, s.textarea]}
              placeholder="详细描述你的业务、特色、优势...越详细AI匹配越精准"
              placeholderTextColor={C.muted}
              value={form.description}
              onChangeText={(v) => setForm(f => ({ ...f, description: v }))}
              multiline
              numberOfLines={4}
            />

            <Text style={s.label}>服务范围 *</Text>
            <TextInput
              style={s.input}
              placeholder="例如：全市上门服务、线上远程、附近3公里"
              placeholderTextColor={C.muted}
              value={form.serviceScope}
              onChangeText={(v) => setForm(f => ({ ...f, serviceScope: v }))}
            />

            <Text style={s.label}>所在地区 *</Text>
            <TextInput
              style={s.input}
              placeholder="例如：北京市朝阳区"
              placeholderTextColor={C.muted}
              value={form.area}
              onChangeText={(v) => setForm(f => ({ ...f, area: v }))}
            />

            <View style={s.submitHint}>
              <Text style={s.submitHintText}>🤖 提交后，道道AI将自动分析你的信息，生成专属名片并录入匹配库，为你精准匹配有缘客户</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
  },
  headerTitle: { fontSize: 28, fontWeight: "700", color: C.text },
  headerSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  joinBtn: {
    backgroundColor: C.primary, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  joinBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
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
  hotRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  hotChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.surface,
  },
  hotChipText: { fontSize: 13, color: C.text },
  banner: {
    backgroundColor: C.primaryLight, borderRadius: 16, padding: 20, gap: 8,
  },
  bannerTitle: { fontSize: 16, fontWeight: "700", color: C.primary },
  bannerDesc: { fontSize: 13, color: C.text, lineHeight: 20 },
  bannerBtn: {
    alignSelf: "flex-start", backgroundColor: C.primary,
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, marginTop: 4,
  },
  bannerBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
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
  rating: { fontSize: 13, color: C.gold, fontWeight: "600" },
  cardName: { fontSize: 17, fontWeight: "700", color: C.text },
  cardDesc: { fontSize: 13, color: C.muted, lineHeight: 19 },
  cardAddr: { fontSize: 12, color: C.muted },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  tag: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  tagText: { fontSize: 11, color: C.muted },
  callBtn: {
    marginTop: 4, paddingVertical: 10, borderRadius: 10,
    backgroundColor: C.primaryLight, alignItems: "center",
  },
  callBtnText: { fontSize: 14, color: C.primary, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 8 },
  loadingText: { fontSize: 14, color: C.muted },
  emptyText: { fontSize: 16, fontWeight: "600", color: C.text },
  emptyHint: { fontSize: 13, color: C.muted, textAlign: "center", paddingHorizontal: 40 },
  // AI名片
  aiCard: {
    margin: 16, borderRadius: 16, backgroundColor: "#F0FDF4",
    borderWidth: 1, borderColor: "#86EFAC", padding: 16, gap: 8,
  },
  aiCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  aiCardTitle: { fontSize: 14, fontWeight: "700", color: "#166534", flex: 1 },
  aiCardClose: { fontSize: 16, color: C.muted, paddingLeft: 8 },
  aiCardMsg: { fontSize: 13, color: "#15803D", lineHeight: 19 },
  aiCardSummary: { fontSize: 14, color: C.text, fontWeight: "600", lineHeight: 20 },
  aiCardLabel: { fontSize: 11, color: C.muted, fontWeight: "700", marginTop: 4 },
  aiCardValue: { fontSize: 13, color: C.text, lineHeight: 19 },
  // Modal
  modalSafe: { flex: 1, backgroundColor: C.bg },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  modalCancel: { fontSize: 16, color: C.muted },
  modalTitle: { fontSize: 17, fontWeight: "700", color: C.text },
  modalSubmit: {
    backgroundColor: C.primary, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  modalSubmitText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  modalBody: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  formHint: {
    fontSize: 13, color: C.primary, backgroundColor: C.primaryLight,
    borderRadius: 10, padding: 12, lineHeight: 19, marginBottom: 20,
  },
  label: { fontSize: 13, fontWeight: "700", color: C.text, marginBottom: 6, marginTop: 16 },
  labelHint: { fontWeight: "400", color: C.muted },
  input: {
    borderRadius: 12, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.surface, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: C.text,
  },
  textarea: { height: 100, textAlignVertical: "top" },
  catScroll: { marginBottom: 4 },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.surface,
    marginRight: 8,
  },
  catChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  catChipText: { fontSize: 13, color: C.text },
  catChipTextActive: { color: "#fff", fontWeight: "700" },
  submitHint: {
    marginTop: 24, backgroundColor: C.surface, borderRadius: 12, padding: 14,
  },
  submitHintText: { fontSize: 13, color: C.muted, lineHeight: 19 },
});
