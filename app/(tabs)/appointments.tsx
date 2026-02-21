/**
 * 预约页 — 手机号查询预约记录（无需登录）
 * ChatGPT 极简风格
 */
import { api } from "@/lib/api";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
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
  text: "#0D0D0D",
  muted: "#6E6E80",
  danger: "#EF4444",
  warning: "#F59E0B",
  success: "#10B981",
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending:   { label: "待确认", color: C.warning },
  confirmed: { label: "已确认", color: C.success },
  completed: { label: "已完成", color: C.muted },
  cancelled: { label: "已取消", color: C.danger },
};

interface Appointment {
  id: number;
  title?: string;
  merchantName?: string;
  merchantCategory?: string;
  scheduledAt?: string;
  status: string;
  notes?: string;
  description?: string;
  aiSummary?: string;
}

export default function AppointmentsScreen() {
  const [phone, setPhone] = useState("");
  const [confirmedPhone, setConfirmedPhone] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isValid = /^1[3-9]\d{9}$/.test(phone);

  const loadAppointments = async (ph: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await (api.appointment as any).list(ph) as Appointment[];
      setAppointments(Array.isArray(res) ? res : []);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleConfirm = () => {
    if (!isValid) return;
    setConfirmedPhone(phone);
    loadAppointments(phone);
  };

  const onRefresh = () => {
    if (!confirmedPhone) return;
    setRefreshing(true);
    loadAppointments(confirmedPhone, true);
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.headerTitle}>我的预约</Text>
        <Text style={s.headerSub}>查看和管理你的预约记录</Text>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          confirmedPhone ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
          ) : undefined
        }
      >
        <View style={s.phoneCard}>
          <Text style={s.label}>输入手机号查看预约</Text>
          <View style={s.phoneRow}>
            <Text style={s.prefix}>+86</Text>
            <TextInput
              style={s.phoneInput}
              placeholder="手机号"
              placeholderTextColor={C.muted}
              keyboardType="phone-pad"
              maxLength={11}
              value={phone}
              onChangeText={setPhone}
            />
          </View>
          <Pressable
            style={[s.queryBtn, !isValid && s.queryBtnDisabled]}
            onPress={handleConfirm}
            disabled={!isValid}
          >
            <Text style={s.queryBtnText}>查看预约记录</Text>
          </Pressable>
        </View>

        {loading && (
          <View style={s.center}>
            <ActivityIndicator color={C.primary} />
            <Text style={s.loadingText}>加载中...</Text>
          </View>
        )}

        {!loading && confirmedPhone && appointments.length === 0 && (
          <View style={s.emptyCard}>
            <Image source={require("@/assets/images/icon.png")} style={s.emptyLogo} />
            <Text style={s.emptyTitle}>暂无预约记录</Text>
            <Text style={s.emptyHint}>去首页和道道 AI 对话，找到心仪商家后可以直接预约</Text>
          </View>
        )}

        {!loading && appointments.map((appt) => {
          const st = STATUS_MAP[appt.status] ?? { label: appt.status, color: C.muted };
          const dt = appt.scheduledAt ? new Date(appt.scheduledAt) : null;
          return (
            <View key={appt.id} style={s.apptCard}>
              <View style={s.apptTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.merchantName}>{appt.merchantName || appt.title || "预约"}</Text>
                  {appt.merchantCategory && (
                    <Text style={s.category}>{appt.merchantCategory}</Text>
                  )}
                </View>
                <View style={[s.statusBadge, { backgroundColor: st.color + "20" }]}>
                  <Text style={[s.statusText, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>

              {dt && (
                <View style={s.timeRow}>
                  <Text style={s.timeLabel}>预约时间</Text>
                  <Text style={s.timeValue}>
                    {dt.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "short" })}
                    {"  "}
                    {dt.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
              )}

              {(appt.notes || appt.description) && (
                <View style={s.notesRow}>
                  <Text style={s.notesLabel}>备注</Text>
                  <Text style={s.notesValue}>{appt.notes || appt.description}</Text>
                </View>
              )}

              {appt.aiSummary && (
                <View style={s.aiSummaryRow}>
                  <Image source={require("@/assets/images/icon.png")} style={s.aiSummaryIcon} />
                  <Text style={s.aiSummaryText}>{appt.aiSummary}</Text>
                </View>
              )}
            </View>
          );
        })}

        <View style={s.tipCard}>
          <Text style={s.tipTitle}>关于预约</Text>
          <Text style={s.tipText}>
            通过道道 AI 匹配到商家后，可以直接在对话中发起预约。商家确认后，你会在这里看到预约详情。
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { fontSize: 28, fontWeight: "700", color: C.text },
  headerSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 60, gap: 14 },
  phoneCard: {
    borderRadius: 16, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.surface, padding: 16, gap: 12,
  },
  label: { fontSize: 14, fontWeight: "600", color: C.text },
  phoneRow: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: C.border, borderRadius: 12,
    backgroundColor: C.bg, paddingHorizontal: 14,
  },
  prefix: { fontSize: 15, color: C.text, fontWeight: "600", marginRight: 8 },
  phoneInput: { flex: 1, fontSize: 15, color: C.text, paddingVertical: 12 },
  queryBtn: {
    backgroundColor: C.primary, borderRadius: 12,
    paddingVertical: 13, alignItems: "center",
  },
  queryBtnDisabled: { backgroundColor: C.border },
  queryBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  center: { alignItems: "center", paddingTop: 40, gap: 8 },
  loadingText: { fontSize: 14, color: C.muted },
  emptyCard: {
    borderRadius: 16, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.surface, padding: 32, alignItems: "center", gap: 12,
  },
  emptyLogo: { width: 56, height: 56, borderRadius: 14, opacity: 0.5 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: C.text },
  emptyHint: { fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 20 },
  apptCard: {
    borderRadius: 16, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.bg, padding: 16, gap: 10,
  },
  apptTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  merchantName: { fontSize: 16, fontWeight: "700", color: C.text },
  category: { fontSize: 12, color: C.muted, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, alignSelf: "flex-start",
  },
  statusText: { fontSize: 12, fontWeight: "600" },
  timeRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  timeLabel: { fontSize: 12, color: C.muted, width: 56 },
  timeValue: { fontSize: 14, color: C.text, flex: 1 },
  notesRow: { gap: 4 },
  notesLabel: { fontSize: 12, color: C.muted },
  notesValue: { fontSize: 14, color: C.text },
  aiSummaryRow: {
    flexDirection: "row", gap: 8, alignItems: "flex-start",
    backgroundColor: C.primaryLight, borderRadius: 10, padding: 10,
  },
  aiSummaryIcon: { width: 20, height: 20, borderRadius: 5 },
  aiSummaryText: { flex: 1, fontSize: 13, color: C.primary, lineHeight: 20 },
  tipCard: {
    borderRadius: 16, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.surface, padding: 16, gap: 8,
  },
  tipTitle: { fontSize: 14, fontWeight: "700", color: C.text },
  tipText: { fontSize: 13, color: C.muted, lineHeight: 20 },
});
