import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Appointment {
  id: number;
  title: string;
  description: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  scheduledAt: string | null;
  createdAt: string;
  aiSummary: string | null;
  callStatus: string | null;
  callSummary: string | null;
  merchantName?: string;
  customerName?: string;
}

const STATUS_MAP = {
  pending: { label: "待确认", color: "#F59E0B", bg: "#FFF3CD" },
  confirmed: { label: "已确认", color: "#10B981", bg: "#D1FAE5" },
  cancelled: { label: "已取消", color: "#EF4444", bg: "#FEE2E2" },
  completed: { label: "已完成", color: "#6B7280", bg: "#F3F4F6" },
};

export default function AppointmentsScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [callingId, setCallingId] = useState<number | null>(null);

  const isCustomer = user?.identity === "customer";

  const loadData = useCallback(async () => {
    try {
      const res = isCustomer
        ? await api.appointment.myList(user?.id?.toString() || "")
        : await api.appointment.merchantList(user?.id?.toString() || "");
      setAppointments(res?.appointments || []);
    } catch { /* ignore */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isCustomer]);

  useEffect(() => { loadData(); }, []);

  const handleSimulateCall = async (appt: Appointment) => {
    setCallingId(appt.id);
    try {
      const res = await api.appointment.simulateCall(
        { appointmentId: appt.id, targetPhone: "13800000000" },
        user?.id?.toString() || ""
      );
      Alert.alert(
        "📞 AI通话完成",
        res?.callSummary || "AI已模拟拨打电话，预约信息已传达。",
        [{ text: "确定", onPress: loadData }]
      );
    } catch (e: unknown) {
      Alert.alert("通话失败", (e as Error).message || "请稍后重试");
    } finally {
      setCallingId(null);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await api.appointment.updateStatus({ id, status }, user?.id?.toString() || "");
      loadData();
    } catch (e: unknown) {
      Alert.alert("操作失败", (e as Error).message || "请稍后重试");
    }
  };

  const s = StyleSheet.create({
    header: {
      paddingHorizontal: 20, paddingVertical: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 0.5, borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 20, fontWeight: "800", color: colors.foreground },
    headerSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
    card: {
      marginHorizontal: 16, marginBottom: 12, borderRadius: 16,
      backgroundColor: colors.surface, padding: 16,
      borderWidth: 1, borderColor: colors.border,
      shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
    cardTitle: { fontSize: 16, fontWeight: "700", color: colors.foreground, flex: 1 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    statusText: { fontSize: 12, fontWeight: "600" },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
    metaText: { fontSize: 13, color: colors.muted },
    aiSummary: {
      marginTop: 8, padding: 10,
      backgroundColor: `${colors.primary}10`,
      borderRadius: 10, borderLeftWidth: 3, borderLeftColor: colors.primary,
    },
    aiSummaryText: { fontSize: 13, color: colors.foreground, lineHeight: 18 },
    callSummary: {
      marginTop: 8, padding: 10,
      backgroundColor: `${colors.success}10`,
      borderRadius: 10, borderLeftWidth: 3, borderLeftColor: colors.success,
    },
    callSummaryText: { fontSize: 13, color: colors.foreground, lineHeight: 18 },
    actionRow: { flexDirection: "row", gap: 8, marginTop: 12 },
    callBtn: {
      flex: 1, backgroundColor: colors.primary, borderRadius: 10,
      paddingVertical: 10, flexDirection: "row", alignItems: "center",
      justifyContent: "center", gap: 6,
    },
    callBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
    confirmBtn: {
      flex: 1, backgroundColor: colors.success, borderRadius: 10,
      paddingVertical: 10, alignItems: "center",
    },
    cancelBtn: {
      flex: 1, backgroundColor: colors.error, borderRadius: 10,
      paddingVertical: 10, alignItems: "center",
    },
    btnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
    emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
    emptyText: { fontSize: 16, color: colors.muted, marginTop: 12 },
    emptyHint: { fontSize: 13, color: colors.muted, marginTop: 6 },
  });

  const renderItem = ({ item }: { item: Appointment }) => {
    const statusInfo = STATUS_MAP[item.status] || STATUS_MAP.pending;
    return (
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitle}>{item.title}</Text>
          <View style={[s.statusBadge, { backgroundColor: statusInfo.bg }]}>
            <Text style={[s.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          </View>
        </View>

        {item.merchantName && (
          <View style={s.metaRow}>
            <IconSymbol name="building.2.fill" size={14} color={colors.muted} />
            <Text style={s.metaText}>{item.merchantName}</Text>
          </View>
        )}
        {item.customerName && (
          <View style={s.metaRow}>
            <IconSymbol name="person.fill" size={14} color={colors.muted} />
            <Text style={s.metaText}>{item.customerName}</Text>
          </View>
        )}
        {item.scheduledAt && (
          <View style={s.metaRow}>
            <IconSymbol name="clock.fill" size={14} color={colors.muted} />
            <Text style={s.metaText}>{new Date(item.scheduledAt).toLocaleString("zh-CN")}</Text>
          </View>
        )}
        {item.description ? (
          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>{item.description}</Text>
        ) : null}

        {item.aiSummary ? (
          <View style={s.aiSummary}>
            <Text style={{ fontSize: 11, color: colors.primary, fontWeight: "600", marginBottom: 2 }}>✨ AI摘要</Text>
            <Text style={s.aiSummaryText}>{item.aiSummary}</Text>
          </View>
        ) : null}

        {item.callSummary ? (
          <View style={s.callSummary}>
            <Text style={{ fontSize: 11, color: colors.success, fontWeight: "600", marginBottom: 2 }}>📞 通话记录</Text>
            <Text style={s.callSummaryText}>{item.callSummary}</Text>
          </View>
        ) : null}

        {item.status === "pending" && (
          <View style={s.actionRow}>
            <TouchableOpacity
              style={s.callBtn}
              onPress={() => handleSimulateCall(item)}
              disabled={callingId === item.id}
            >
              {callingId === item.id ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <IconSymbol name="phone.fill" size={14} color="#fff" />
                  <Text style={s.callBtnText}>AI拨打电话</Text>
                </>
              )}
            </TouchableOpacity>
            {!isCustomer && (
              <>
                <TouchableOpacity style={s.confirmBtn} onPress={() => handleUpdateStatus(item.id, "confirmed")}>
                  <Text style={s.btnText}>确认</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.cancelBtn} onPress={() => handleUpdateStatus(item.id, "cancelled")}>
                  <Text style={s.btnText}>拒绝</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScreenContainer>
      <View style={s.header}>
        <Text style={s.headerTitle}>我的预约</Text>
        <Text style={s.headerSub}>
          {isCustomer ? "查看您的所有预约记录" : "管理客户预约请求"}
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : appointments.length === 0 ? (
        <View style={s.emptyWrap}>
          <Text style={{ fontSize: 48 }}>📅</Text>
          <Text style={s.emptyText}>暂无预约记录</Text>
          <Text style={s.emptyHint}>{isCustomer ? "去搜索商家并预约吧" : "等待客户预约"}</Text>
        </View>
      ) : (
        <FlatList
          data={appointments}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingVertical: 12 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
        />
      )}
    </ScreenContainer>
  );
}
