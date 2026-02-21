import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { router } from "expo-router";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ProfileScreen() {
  const colors = useColors();
  const { user, logout, switchIdentity } = useAuth();

  const isCustomer = user?.identity === "customer";

  const handleLogout = () => {
    Alert.alert("退出登录", "确定要退出登录吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "退出",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const handleSwitchIdentity = () => {
    const targetIdentity = isCustomer ? "merchant" : "customer";
    const targetLabel = isCustomer ? "商家" : "顾客";
    const currentLabel = isCustomer ? "顾客" : "商家";

    Alert.alert(
      "切换身份",
      `确定要从「${currentLabel}」切换到「${targetLabel}」身份吗？\n\n切换后，AI助手将为您提供${targetLabel}专属服务。`,
      [
        { text: "取消", style: "cancel" },
        {
          text: `切换为${targetLabel}`,
          onPress: async () => {
            try {
              // 同步到服务器
              await api.auth.updateProfile({ identity: targetIdentity }, user?.id?.toString() || "");
            } catch { /* 服务器同步失败不影响本地切换 */ }
            await switchIdentity(targetIdentity);
            Alert.alert(
              "切换成功 ✨",
              `您已切换为「${targetLabel}」身份${targetIdentity === "merchant" ? "\n\n您现在可以在「我的商家资料」中完善商家信息，开始接单！" : "\n\n您现在可以搜索商家、发起预约了！"}`,
              [{ text: "好的" }]
            );
          },
        },
      ]
    );
  };

  const s = StyleSheet.create({
    header: {
      padding: 24, paddingBottom: 32,
      backgroundColor: colors.primary,
      alignItems: "center",
    },
    avatar: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center", justifyContent: "center", marginBottom: 12,
      borderWidth: 3, borderColor: "rgba(255,255,255,0.4)",
    },
    avatarText: { fontSize: 36 },
    userName: { fontSize: 20, fontWeight: "800", color: "#fff" },
    userPhone: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 4 },
    identityRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
    identityBadge: {
      paddingHorizontal: 14, paddingVertical: 5,
      backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 20,
    },
    identityText: { fontSize: 13, color: "#fff", fontWeight: "700" },
    switchBtn: {
      flexDirection: "row", alignItems: "center", gap: 5,
      paddingHorizontal: 14, paddingVertical: 5,
      backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20,
      borderWidth: 1, borderColor: "rgba(255,255,255,0.3)",
    },
    switchBtnText: { fontSize: 13, color: "#fff", fontWeight: "600" },
    statsRow: {
      flexDirection: "row", backgroundColor: colors.surface,
      marginHorizontal: 16, marginTop: -20, borderRadius: 18,
      shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
      borderWidth: 1, borderColor: colors.border,
    },
    statItem: { flex: 1, alignItems: "center", paddingVertical: 18 },
    statNum: { fontSize: 22, fontWeight: "800", color: colors.primary },
    statLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
    statDivider: { width: 1, backgroundColor: colors.border, marginVertical: 12 },
    section: { marginTop: 20, marginHorizontal: 16 },
    sectionTitle: { fontSize: 13, color: colors.muted, fontWeight: "600", marginBottom: 8, paddingLeft: 4, textTransform: "uppercase", letterSpacing: 0.5 },
    menuCard: {
      backgroundColor: colors.surface, borderRadius: 16,
      borderWidth: 1, borderColor: colors.border, overflow: "hidden",
    },
    menuItem: {
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: 0.5, borderBottomColor: colors.border,
    },
    menuIcon: {
      width: 36, height: 36, borderRadius: 10,
      alignItems: "center", justifyContent: "center", marginRight: 12,
    },
    menuLabel: { flex: 1, fontSize: 15, color: colors.foreground, fontWeight: "500" },
    menuArrow: { opacity: 0.4 },
    identitySwitchCard: {
      marginHorizontal: 16, marginTop: 20,
      borderRadius: 16, overflow: "hidden",
      borderWidth: 1, borderColor: colors.primary + "40",
    },
    identitySwitchInner: {
      flexDirection: "row", alignItems: "center",
      padding: 16, gap: 14,
      backgroundColor: colors.primary + "08",
    },
    identitySwitchIconWrap: {
      width: 44, height: 44, borderRadius: 12,
      backgroundColor: colors.primary + "20",
      alignItems: "center", justifyContent: "center",
    },
    identitySwitchInfo: { flex: 1 },
    identitySwitchTitle: { fontSize: 15, fontWeight: "700", color: colors.foreground },
    identitySwitchSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
    identitySwitchActionBtn: {
      backgroundColor: colors.primary, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 8,
    },
    identitySwitchActionText: { color: "#fff", fontSize: 13, fontWeight: "700" },
    logoutBtn: {
      margin: 16, marginTop: 8, backgroundColor: `${colors.error}10`,
      borderRadius: 14, paddingVertical: 14, alignItems: "center",
      borderWidth: 1, borderColor: `${colors.error}25`,
    },
    logoutText: { color: colors.error, fontSize: 15, fontWeight: "700" },
    versionText: { textAlign: "center", color: colors.muted, fontSize: 12, marginBottom: 24 },
  });

  const menuItems = isCustomer ? [
    { icon: "📅", iconBg: `${colors.primary}15`, label: "我的预约", onPress: () => router.push("/(tabs)/appointments" as never) },
    { icon: "⭐", iconBg: "#FFF3CD", label: "收藏商家", onPress: () => {} },
    { icon: "🔔", iconBg: "#FEE2E2", label: "消息通知", onPress: () => {} },
    { icon: "💬", iconBg: "#EDE9FE", label: "AI对话记录", onPress: () => router.push("/(tabs)/ai-chat" as never) },
  ] : [
    { icon: "🏪", iconBg: `${colors.primary}15`, label: "商家资料", onPress: () => router.push("/merchant-profile" as never) },
    { icon: "📅", iconBg: "#D1FAE5", label: "预约管理", onPress: () => router.push("/(tabs)/appointments" as never) },
    { icon: "📊", iconBg: "#EDE9FE", label: "数据分析", onPress: () => {} },
    { icon: "🔔", iconBg: "#FEE2E2", label: "消息通知", onPress: () => {} },
    { icon: "💬", iconBg: "#E0F2FE", label: "AI对话记录", onPress: () => router.push("/(tabs)/ai-chat" as never) },
  ];

  const settingsItems = [
    { icon: "⚙️", label: "账号设置", onPress: () => {} },
    { icon: "🔒", label: "隐私政策", onPress: () => {} },
    { icon: "📄", label: "用户协议", onPress: () => {} },
    { icon: "🤖", label: "找Manus解决复杂问题", onPress: () => Linking.openURL("https://manus.im") },
  ];

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 头部 */}
        <View style={s.header}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{isCustomer ? "🛒" : "🏪"}</Text>
          </View>
          <Text style={s.userName}>{user?.name || "用户"}</Text>
          <Text style={s.userPhone}>{user?.phone || ""}</Text>
          <View style={s.identityRow}>
            <View style={s.identityBadge}>
              <Text style={s.identityText}>{isCustomer ? "顾客身份" : "商家身份"}</Text>
            </View>
            <TouchableOpacity style={s.switchBtn} onPress={handleSwitchIdentity} activeOpacity={0.8}>
              <Text style={{ fontSize: 14 }}>🔄</Text>
              <Text style={s.switchBtnText}>切换为{isCustomer ? "商家" : "顾客"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 统计 */}
        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Text style={s.statNum}>0</Text>
            <Text style={s.statLabel}>{isCustomer ? "预约次数" : "接单次数"}</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statNum}>0</Text>
            <Text style={s.statLabel}>{isCustomer ? "收藏商家" : "服务客户"}</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statNum}>0</Text>
            <Text style={s.statLabel}>AI对话</Text>
          </View>
        </View>

        {/* 身份切换提示卡 */}
        <View style={s.identitySwitchCard}>
          <View style={s.identitySwitchInner}>
            <View style={s.identitySwitchIconWrap}>
              <Text style={{ fontSize: 22 }}>{isCustomer ? "🏪" : "🛒"}</Text>
            </View>
            <View style={s.identitySwitchInfo}>
              <Text style={s.identitySwitchTitle}>
                {isCustomer ? "也想成为商家？" : "也想作为顾客预约？"}
              </Text>
              <Text style={s.identitySwitchSub}>
                {isCustomer
                  ? "切换商家身份，让AI帮您找客户"
                  : "切换顾客身份，让AI帮您找商家"}
              </Text>
            </View>
            <TouchableOpacity style={s.identitySwitchActionBtn} onPress={handleSwitchIdentity}>
              <Text style={s.identitySwitchActionText}>立即切换</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 功能菜单 */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>功能</Text>
          <View style={s.menuCard}>
            {menuItems.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[s.menuItem, i === menuItems.length - 1 && { borderBottomWidth: 0 }]}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={[s.menuIcon, { backgroundColor: item.iconBg }]}>
                  <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                </View>
                <Text style={s.menuLabel}>{item.label}</Text>
                <View style={s.menuArrow}>
                  <IconSymbol name="chevron.right" size={16} color={colors.muted} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 设置 */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>其他</Text>
          <View style={s.menuCard}>
            {settingsItems.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[s.menuItem, i === settingsItems.length - 1 && { borderBottomWidth: 0 }]}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={[s.menuIcon, { backgroundColor: `${colors.muted}15` }]}>
                  <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                </View>
                <Text style={s.menuLabel}>{item.label}</Text>
                <View style={s.menuArrow}>
                  <IconSymbol name="chevron.right" size={16} color={colors.muted} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 退出 */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutText}>退出登录</Text>
        </TouchableOpacity>

        <Text style={s.versionText}>寻商问道 v1.0.0 · AI双向预约平台</Text>
      </ScrollView>
    </ScreenContainer>
  );
}
