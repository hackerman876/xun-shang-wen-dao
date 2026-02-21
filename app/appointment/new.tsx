import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function NewAppointmentScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const { merchantId, merchantName } = useLocalSearchParams<{ merchantId: string; merchantName: string }>();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert("提示", "请输入预约服务内容");
      return;
    }
    if (!merchantId) {
      Alert.alert("提示", "商家信息缺失");
      return;
    }
    setLoading(true);
    try {
      await api.appointment.create(
        {
          merchantId: Number(merchantId),
          title: title.trim(),
          description: description.trim(),
          scheduledAt: scheduledAt || undefined,
        },
        user?.id?.toString() || ""
      );
      Alert.alert("预约成功 ✅", "AI助手将帮您联系商家确认预约", [
        { text: "查看预约", onPress: () => { router.back(); router.push("/appointments" as never); } },
        { text: "返回首页", onPress: () => { router.back(); } },
      ]);
    } catch (e: unknown) {
      Alert.alert("预约失败", (e as Error).message || "请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const s = StyleSheet.create({
    header: {
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 16, paddingVertical: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 0.5, borderBottomColor: colors.border,
    },
    backBtn: { padding: 8, marginRight: 8 },
    headerTitle: { fontSize: 17, fontWeight: "700", color: colors.foreground },
    content: { padding: 20, gap: 20 },
    merchantInfo: {
      backgroundColor: `${colors.primary}10`, borderRadius: 14,
      padding: 14, flexDirection: "row", alignItems: "center", gap: 10,
    },
    merchantName: { fontSize: 15, fontWeight: "700", color: colors.foreground },
    merchantSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
    label: { fontSize: 14, fontWeight: "600", color: colors.foreground, marginBottom: 8 },
    required: { color: colors.error },
    input: {
      backgroundColor: colors.surface, borderRadius: 12,
      borderWidth: 1.5, borderColor: colors.border,
      paddingHorizontal: 14, paddingVertical: 12,
      fontSize: 15, color: colors.foreground,
    },
    textarea: { height: 80, textAlignVertical: "top" },
    hint: { fontSize: 12, color: colors.muted, marginTop: 4 },
    submitBtn: {
      backgroundColor: colors.primary, borderRadius: 14,
      paddingVertical: 16, alignItems: "center",
      marginTop: 8,
    },
    submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    aiNote: {
      backgroundColor: `${colors.success}10`, borderRadius: 12,
      padding: 14, borderWidth: 1, borderColor: `${colors.success}30`,
      flexDirection: "row", gap: 10, alignItems: "flex-start",
    },
    aiNoteText: { flex: 1, fontSize: 13, color: colors.foreground, lineHeight: 18 },
  });

  return (
    <ScreenContainer>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <IconSymbol name="xmark" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>发起预约</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          {/* 商家信息 */}
          <View style={s.merchantInfo}>
            <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 20 }}>🏪</Text>
            </View>
            <View>
              <Text style={s.merchantName}>{merchantName || "商家"}</Text>
              <Text style={s.merchantSub}>预约服务</Text>
            </View>
          </View>

          {/* AI提示 */}
          <View style={s.aiNote}>
            <Text style={{ fontSize: 20 }}>✨</Text>
            <Text style={s.aiNoteText}>
              预约提交后，AI助手将自动模拟拨打电话联系商家，确认您的预约时间和服务内容。
            </Text>
          </View>

          {/* 服务内容 */}
          <View>
            <Text style={s.label}>服务内容 <Text style={s.required}>*</Text></Text>
            <TextInput
              style={s.input}
              placeholder="例如：剪发、按摩、法律咨询..."
              placeholderTextColor={colors.muted}
              value={title}
              onChangeText={setTitle}
              returnKeyType="next"
              maxLength={50}
            />
          </View>

          {/* 备注 */}
          <View>
            <Text style={s.label}>备注说明</Text>
            <TextInput
              style={[s.input, s.textarea]}
              placeholder="请描述您的具体需求（可选）"
              placeholderTextColor={colors.muted}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={200}
            />
          </View>

          {/* 期望时间 */}
          <View>
            <Text style={s.label}>期望时间</Text>
            <TextInput
              style={s.input}
              placeholder="例如：2026-02-25 14:00（可选）"
              placeholderTextColor={colors.muted}
              value={scheduledAt}
              onChangeText={setScheduledAt}
              returnKeyType="done"
            />
            <Text style={s.hint}>留空则由商家确认时间</Text>
          </View>

          {/* 提交 */}
          <TouchableOpacity
            style={[s.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.submitBtnText}>确认预约 →</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
