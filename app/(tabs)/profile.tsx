/**
 * 我的画像页 — 基于手机号查询AI用户画像（无需登录）
 * ChatGPT 极简风格
 */
import { api } from "@/lib/api";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
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
  text: "#0D0D0D",
  muted: "#6E6E80",
};

interface Profile {
  phone: string;
  identity: string;
  name?: string;
  area?: string;
  profileJson?: Record<string, unknown>;
  needsHistory?: string[];
  totalMatches?: number;
  updatedAt?: string;
}

export default function ProfileScreen() {
  const [phone, setPhone] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const loadProfile = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.match.getProfile(phone) as Profile | null;
      setProfile(res);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const profileData = profile?.profileJson as Record<string, unknown> | undefined;

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.headerTitle}>我的画像</Text>
        <Text style={s.headerSub}>AI 为你构建的专属画像</Text>
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.phoneSection}>
          <Text style={s.label}>输入手机号查看你的 AI 画像</Text>
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
            style={[s.queryBtn, !/^1[3-9]\d{9}$/.test(phone) && s.queryBtnDisabled]}
            onPress={loadProfile}
            disabled={!/^1[3-9]\d{9}$/.test(phone)}
          >
            <Text style={s.queryBtnText}>查看我的画像</Text>
          </Pressable>
        </View>

        {loading && (
          <View style={s.center}>
            <ActivityIndicator color={C.primary} />
            <Text style={s.loadingText}>正在加载...</Text>
          </View>
        )}

        {searched && !loading && !profile && (
          <View style={s.emptyCard}>
            <Image source={require("@/assets/images/icon.png")} style={s.emptyLogo} />
            <Text style={s.emptyTitle}>还没有画像</Text>
            <Text style={s.emptyHint}>去首页和道道 AI 对话，AI 会自动为你构建专属画像</Text>
          </View>
        )}

        {profile && (
          <View style={s.profileCard}>
            <View style={s.profileTop}>
              <Image source={require("@/assets/images/icon.png")} style={s.profileAvatar} />
              <View style={{ flex: 1 }}>
                <Text style={s.profilePhone}>{profile.phone.slice(0, 3)}****{profile.phone.slice(-4)}</Text>
                <View style={s.identityBadge}>
                  <Text style={s.identityText}>{profile.identity === "customer" ? "顾客" : "商家"}</Text>
                </View>
              </View>
              {profile.totalMatches != null && (
                <View style={s.matchCount}>
                  <Text style={s.matchCountNum}>{profile.totalMatches}</Text>
                  <Text style={s.matchCountLabel}>次匹配</Text>
                </View>
              )}
            </View>

            {profile.area && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>所在地区</Text>
                <Text style={s.infoValue}>📍 {profile.area}</Text>
              </View>
            )}

{(() => {
              const tags = Array.isArray(profileData?.tags) ? (profileData!.tags as string[]) : [];
              return tags.length > 0 ? (
                <View style={s.tagsSection}>
                  <Text style={s.infoLabel}>AI 标签</Text>
                  <View style={s.tagsRow}>
                    {tags.map((tag: string, i: number) => (
                      <View key={i} style={s.tag}>
                        <Text style={s.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null;
            })()}

            {!!profileData?.preferences && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>偏好描述</Text>
                <Text style={s.infoValue}>{String(profileData!.preferences as string)}</Text>
              </View>
            )}

            {profile.needsHistory && profile.needsHistory.length > 0 && (
              <View style={s.historySection}>
                <Text style={s.infoLabel}>历史需求</Text>
                {profile.needsHistory.slice(0, 3).map((need, i) => (
                  <View key={i} style={s.historyItem}>
                    <Text style={s.historyText}>• {need}</Text>
                  </View>
                ))}
              </View>
            )}

            {profile.updatedAt && (
              <Text style={s.updatedAt}>
                最后更新：{new Date(profile.updatedAt).toLocaleDateString("zh-CN")}
              </Text>
            )}
          </View>
        )}

        <View style={s.tipCard}>
          <Text style={s.tipTitle}>关于 AI 画像</Text>
          <Text style={s.tipText}>
            每次与道道 AI 对话，AI 都会自动学习你的偏好和需求，构建专属画像。画像越丰富，匹配越精准。
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
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 60, gap: 16 },
  phoneSection: {
    borderRadius: 16, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.surface, padding: 16, gap: 12,
  },
  label: { fontSize: 14, color: C.text, fontWeight: "600" },
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
  profileCard: {
    borderRadius: 16, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.bg, padding: 16, gap: 14,
  },
  profileTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  profileAvatar: { width: 48, height: 48, borderRadius: 12 },
  profilePhone: { fontSize: 16, fontWeight: "700", color: C.text },
  identityBadge: {
    marginTop: 4, backgroundColor: C.primaryLight,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: "flex-start",
  },
  identityText: { fontSize: 11, color: C.primary, fontWeight: "600" },
  matchCount: { alignItems: "center" },
  matchCountNum: { fontSize: 22, fontWeight: "700", color: C.primary },
  matchCountLabel: { fontSize: 11, color: C.muted },
  infoRow: { gap: 4 },
  infoLabel: { fontSize: 12, color: C.muted, fontWeight: "600" },
  infoValue: { fontSize: 14, color: C.text },
  tagsSection: { gap: 8 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, backgroundColor: C.primaryLight,
  },
  tagText: { fontSize: 12, color: C.primary, fontWeight: "500" },
  historySection: { gap: 8 },
  historyItem: { paddingLeft: 4 },
  historyText: { fontSize: 13, color: C.text, lineHeight: 20 },
  updatedAt: { fontSize: 11, color: C.muted, textAlign: "right" },
  tipCard: {
    borderRadius: 16, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.surface, padding: 16, gap: 8,
  },
  tipTitle: { fontSize: 14, fontWeight: "700", color: C.text },
  tipText: { fontSize: 13, color: C.muted, lineHeight: 20 },
});
