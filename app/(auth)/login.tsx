import { useColors } from "@/hooks/use-colors";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export default function LoginScreen() {
  const colors = useColors();
  const { login } = useAuth();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [identity, setIdentity] = useState<"customer" | "merchant">("customer");
  const [step, setStep] = useState<"phone" | "code" | "profile">("phone");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [devCode, setDevCode] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      Alert.alert("提示", "请输入正确的手机号");
      return;
    }
    setLoading(true);
    try {
      const res = await api.auth.sendCode(phone);
      if (res?.devCode) setDevCode(res.devCode);
      setStep("code");
      setCountdown(60);
    } catch (e: unknown) {
      Alert.alert("发送失败", (e as Error).message || "请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      Alert.alert("提示", "请输入6位验证码");
      return;
    }
    setLoading(true);
    try {
      const res = await api.auth.loginWithPhone({ phone, code });
      if (res?.isNewUser) {
        setStep("profile");
      } else {
        await login(res.token, res.user);
        router.replace("/(tabs)");
      }
    } catch (e: unknown) {
      Alert.alert("验证失败", (e as Error).message || "验证码错误");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProfile = async () => {
    if (!name.trim()) {
      Alert.alert("提示", "请输入您的昵称");
      return;
    }
    setLoading(true);
    try {
      const res = await api.auth.loginWithPhone({ phone, code, name, identity });
      await login(res.token, res.user);
      router.replace("/(tabs)");
    } catch (e: unknown) {
      Alert.alert("注册失败", (e as Error).message || "请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 28, paddingVertical: 40 },
    logoWrap: { alignItems: "center", marginBottom: 40 },
    logoCircle: {
      width: 80, height: 80, borderRadius: 20,
      backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
      marginBottom: 16,
    },
    logoText: { fontSize: 36, color: "#fff", fontWeight: "700" },
    appName: { fontSize: 28, fontWeight: "800", color: colors.foreground, letterSpacing: 2 },
    appSub: { fontSize: 14, color: colors.muted, marginTop: 6, letterSpacing: 1 },
    card: {
      backgroundColor: colors.surface, borderRadius: 20, padding: 24,
      shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    },
    stepTitle: { fontSize: 20, fontWeight: "700", color: colors.foreground, marginBottom: 6 },
    stepSub: { fontSize: 14, color: colors.muted, marginBottom: 24 },
    label: { fontSize: 13, color: colors.muted, marginBottom: 8, fontWeight: "500" },
    inputRow: {
      flexDirection: "row", alignItems: "center",
      backgroundColor: colors.background, borderRadius: 12,
      borderWidth: 1.5, borderColor: colors.border, marginBottom: 16,
    },
    inputPrefix: { paddingHorizontal: 14, fontSize: 16, color: colors.foreground, fontWeight: "600" },
    input: {
      flex: 1, paddingVertical: 14, paddingRight: 14,
      fontSize: 16, color: colors.foreground,
    },
    sendBtn: {
      paddingHorizontal: 14, paddingVertical: 14,
      borderLeftWidth: 1, borderLeftColor: colors.border,
    },
    sendBtnText: { fontSize: 13, color: colors.primary, fontWeight: "600" },
    primaryBtn: {
      backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16,
      alignItems: "center", marginTop: 8,
    },
    primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    devHint: {
      marginTop: 12, padding: 12, backgroundColor: "#FFF3CD",
      borderRadius: 10, borderWidth: 1, borderColor: "#FBBF24",
    },
    devHintText: { fontSize: 13, color: "#92400E", textAlign: "center" },
    identityRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
    identityBtn: {
      flex: 1, paddingVertical: 14, borderRadius: 12,
      borderWidth: 2, alignItems: "center",
    },
    identityBtnText: { fontSize: 14, fontWeight: "600" },
    identityIcon: { fontSize: 24, marginBottom: 4 },
  });

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Logo */}
            <View style={s.logoWrap}>
              <View style={s.logoCircle}>
                <Text style={s.logoText}>寻</Text>
              </View>
              <Text style={s.appName}>寻商问道</Text>
              <Text style={s.appSub}>AI 双向智能预约平台</Text>
            </View>

            {/* 卡片 */}
            <View style={s.card}>
              {step === "phone" && (
                <>
                  <Text style={s.stepTitle}>欢迎使用</Text>
                  <Text style={s.stepSub}>输入手机号，获取验证码登录</Text>
                  <Text style={s.label}>手机号</Text>
                  <View style={s.inputRow}>
                    <Text style={s.inputPrefix}>+86</Text>
                    <TextInput
                      style={s.input}
                      placeholder="请输入手机号"
                      placeholderTextColor={colors.muted}
                      keyboardType="phone-pad"
                      maxLength={11}
                      value={phone}
                      onChangeText={setPhone}
                      returnKeyType="done"
                      onSubmitEditing={handleSendCode}
                    />
                  </View>
                  <TouchableOpacity
                    style={[s.primaryBtn, loading && { opacity: 0.7 }]}
                    onPress={handleSendCode}
                    disabled={loading}
                  >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>获取验证码</Text>}
                  </TouchableOpacity>
                </>
              )}

              {step === "code" && (
                <>
                  <Text style={s.stepTitle}>输入验证码</Text>
                  <Text style={s.stepSub}>验证码已发送至 {phone}</Text>
                  <Text style={s.label}>验证码</Text>
                  <View style={s.inputRow}>
                    <TextInput
                      style={[s.input, { paddingLeft: 14 }]}
                      placeholder="请输入6位验证码"
                      placeholderTextColor={colors.muted}
                      keyboardType="number-pad"
                      maxLength={6}
                      value={code}
                      onChangeText={setCode}
                      returnKeyType="done"
                      onSubmitEditing={handleVerifyCode}
                    />
                    <Pressable
                      style={s.sendBtn}
                      onPress={countdown === 0 ? handleSendCode : undefined}
                    >
                      <Text style={[s.sendBtnText, countdown > 0 && { color: colors.muted }]}>
                        {countdown > 0 ? `${countdown}s` : "重新发送"}
                      </Text>
                    </Pressable>
                  </View>
                  {devCode ? (
                    <View style={s.devHint}>
                      <Text style={s.devHintText}>🔧 开发模式验证码：{devCode}</Text>
                    </View>
                  ) : null}
                  <TouchableOpacity
                    style={[s.primaryBtn, { marginTop: 16 }, loading && { opacity: 0.7 }]}
                    onPress={handleVerifyCode}
                    disabled={loading}
                  >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>验证并登录</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ alignItems: "center", marginTop: 16 }}
                    onPress={() => setStep("phone")}
                  >
                    <Text style={{ color: colors.muted, fontSize: 14 }}>修改手机号</Text>
                  </TouchableOpacity>
                </>
              )}

              {step === "profile" && (
                <>
                  <Text style={s.stepTitle}>完善资料</Text>
                  <Text style={s.stepSub}>告诉我们您的身份，获得更精准的服务</Text>
                  <Text style={s.label}>我是</Text>
                  <View style={s.identityRow}>
                    {(["customer", "merchant"] as const).map((id) => (
                      <TouchableOpacity
                        key={id}
                        style={[
                          s.identityBtn,
                          {
                            borderColor: identity === id ? colors.primary : colors.border,
                            backgroundColor: identity === id ? `${colors.primary}15` : colors.background,
                          },
                        ]}
                        onPress={() => setIdentity(id)}
                      >
                        <Text style={s.identityIcon}>{id === "customer" ? "🛒" : "🏪"}</Text>
                        <Text style={[s.identityBtnText, { color: identity === id ? colors.primary : colors.foreground }]}>
                          {id === "customer" ? "顾客" : "商家"}
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
                          {id === "customer" ? "寻找服务" : "推广业务"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={s.label}>昵称</Text>
                  <View style={s.inputRow}>
                    <TextInput
                      style={[s.input, { paddingLeft: 14 }]}
                      placeholder="请输入您的昵称"
                      placeholderTextColor={colors.muted}
                      value={name}
                      onChangeText={setName}
                      maxLength={20}
                      returnKeyType="done"
                      onSubmitEditing={handleCompleteProfile}
                    />
                  </View>
                  <TouchableOpacity
                    style={[s.primaryBtn, loading && { opacity: 0.7 }]}
                    onPress={handleCompleteProfile}
                    disabled={loading}
                  >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>开始使用 →</Text>}
                  </TouchableOpacity>
                </>
              )}
            </View>

            <Text style={{ textAlign: "center", color: colors.muted, fontSize: 12, marginTop: 24 }}>
              登录即代表同意《用户协议》和《隐私政策》
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
