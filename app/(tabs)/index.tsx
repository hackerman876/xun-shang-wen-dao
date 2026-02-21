import { api } from "@/lib/api";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
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
  aiMsg: "#F7F7F8",
  userMsg: "#10A37F",
  matchCard: "#FAFAFA",
  matchBorder: "#E0E0E0",
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  matchResult?: MatchResult;
};

type MatchResult = {
  summary: string;
  matches: Array<{
    name: string;
    description: string;
    reason: string;
    score: number;
    contactTip: string;
    area?: string;
    phone?: string;
    category?: string;
    highlights?: string;
  }>;
  tips: string;
};

const QUICK_STARTS_CUSTOMER = [
  "我想找一家附近的美发店",
  "需要家政保洁服务",
  "找装修设计公司",
  "寻找教育培训机构",
];
const QUICK_STARTS_MERCHANT = [
  "我是餐厅老板，想找更多回头客",
  "我开美容院，想拓展新客源",
  "我做家政服务，想找更多客户",
  "我是培训机构，想找学员",
];

export default function HomeScreen() {
  const [phase, setPhase] = useState<"setup" | "chat">("setup");
  const [identity, setIdentity] = useState<"customer" | "merchant" | null>(null);
  const [phone, setPhone] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const quickStarts = identity === "merchant" ? QUICK_STARTS_MERCHANT : QUICK_STARTS_CUSTOMER;

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const startChat = (firstMessage?: string) => {
    if (!identity || !/^1[3-9]\d{9}$/.test(phone)) return;
    setPhase("chat");
    if (firstMessage) sendMessage(firstMessage);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLoading(true);
    try {
      const res = await api.match.chat({
        sessionId,
        phone,
        identity: identity!,
        message: text.trim(),
      }) as { sessionId: string; reply: string; shouldMatch: boolean; matchResult: MatchResult | null };

      if (res.sessionId && !sessionId) setSessionId(res.sessionId);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: res.reply,
        matchResult: res.shouldMatch && res.matchResult ? res.matchResult : undefined,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "抱歉，AI 暂时繁忙，请稍后再试。",
      }]);
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    setPhase("setup");
    setMessages([]);
    setSessionId(undefined);
    setInputText("");
  };

  if (phase === "setup") {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <View style={s.header}>
          <Image source={require("@/assets/images/icon.png")} style={s.logo} />
          <View>
            <Text style={s.appName}>寻商问道</Text>
            <Text style={s.appSub}>AI 双向智能匹配平台</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={s.setupContent} keyboardShouldPersistTaps="handled">
          <Text style={s.sectionTitle}>我是</Text>
          <View style={s.identityRow}>
            {[
              { id: "customer", emoji: "🙋", label: "顾客", sub: "寻找合适的商家" },
              { id: "merchant", emoji: "🏪", label: "商家", sub: "寻找目标客户" },
            ].map((opt) => {
              const active = identity === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  style={[s.identityCard, active && s.identityCardActive]}
                  onPress={() => setIdentity(opt.id as "customer" | "merchant")}
                >
                  <Text style={s.identityEmoji}>{opt.emoji}</Text>
                  <Text style={[s.identityLabel, active && { color: C.primary }]}>{opt.label}</Text>
                  <Text style={s.identitySub}>{opt.sub}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={s.sectionTitle}>联系手机号</Text>
          <View style={s.phoneRow}>
            <Text style={s.phonePrefix}>+86</Text>
            <TextInput
              style={s.phoneInput}
              placeholder="输入手机号"
              placeholderTextColor={C.muted}
              keyboardType="phone-pad"
              maxLength={11}
              value={phone}
              onChangeText={setPhone}
            />
          </View>
          <Text style={s.phoneHint}>手机号用于保存你的偏好记忆，方便有缘人联系你</Text>

          {identity && (
            <>
              <Text style={[s.sectionTitle, { marginTop: 24 }]}>快速开始</Text>
              <View style={s.quickGrid}>
                {quickStarts.map((qs) => (
                  <Pressable
                    key={qs}
                    style={s.quickCard}
                    onPress={() => {
                      if (!/^1[3-9]\d{9}$/.test(phone)) { alert("请先输入正确的手机号"); return; }
                      startChat(qs);
                    }}
                  >
                    <Text style={s.quickCardText}>{qs}</Text>
                    <Text style={s.quickCardArrow}>→</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <Pressable
            style={[s.startBtn, (!identity || !/^1[3-9]\d{9}$/.test(phone)) && s.startBtnDisabled]}
            onPress={() => startChat()}
            disabled={!identity || !/^1[3-9]\d{9}$/.test(phone)}
          >
            <Text style={s.startBtnText}>✨ 开始 AI 匹配对话</Text>
          </Pressable>

          <View style={s.featureRow}>
            {["🧠 记住你的偏好", "🌐 全网精准匹配", "🎯 越用越准"].map((f) => (
              <View key={f} style={s.featureChip}>
                <Text style={s.featureChipText}>{f}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.chatHeader}>
        <Pressable onPress={resetChat} style={s.backBtn}>
          <Text style={s.backBtnText}>← 返回</Text>
        </Pressable>
        <View style={s.chatHeaderCenter}>
          <Text style={s.chatTitle}>道道 AI</Text>
          <View style={s.onlineDot} />
        </View>
        <Text style={s.phoneTag}>{phone.slice(0, 3)}****{phone.slice(-4)}</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView ref={scrollRef} style={s.msgList} contentContainerStyle={s.msgListContent} keyboardShouldPersistTaps="handled">
          {messages.length === 0 && (
            <View style={s.welcomeHint}>
              <Text style={s.welcomeEmoji}>🧭</Text>
              <Text style={s.welcomeTitle}>我是道道，你的 AI 匹配顾问</Text>
              <Text style={s.welcomeSub}>我会通过几个问题深度了解你的需求{"\n"}然后为你精准匹配最合适的有缘人</Text>
            </View>
          )}

          {messages.map((msg) => (
            <View key={msg.id}>
              <View style={[s.msgRow, msg.role === "user" && s.msgRowUser]}>
                {msg.role === "assistant" && (
                  <Image source={require("@/assets/images/icon.png")} style={s.aiAvatarImg} />
                )}
                <View style={[s.msgBubble, msg.role === "user" ? s.userBubble : s.aiBubble]}>
                  <Text style={[s.msgText, msg.role === "user" && { color: "#fff" }]}>{msg.content}</Text>
                </View>
              </View>

              {msg.matchResult && (
                <View style={s.matchResultContainer}>
                  <Text style={s.matchResultTitle}>🎯 为你找到的有缘人</Text>
                  <Text style={s.matchResultSummary}>{msg.matchResult.summary}</Text>
                  {msg.matchResult.matches.map((m, i) => (
                    <View key={i} style={s.matchCard}>
                      <View style={s.matchCardTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.matchName}>{m.name}</Text>
                          {m.category && <Text style={s.matchCategory}>{m.category}</Text>}
                        </View>
                        <View style={s.scoreBadge}><Text style={s.scoreText}>{m.score}分</Text></View>
                      </View>
                      {m.area && <Text style={s.matchArea}>📍 {m.area}</Text>}
                      <Text style={s.matchDesc}>{m.description}</Text>
                      {m.highlights && <Text style={s.matchHighlight}>✨ {m.highlights}</Text>}
                      <Text style={s.matchReason}>✓ {m.reason}</Text>
                      <Text style={s.matchTip}>💡 {m.contactTip}</Text>
                      {m.phone && (
                        <Pressable
                          style={s.matchCallBtn}
                          onPress={() => Linking.openURL("tel:" + m.phone)}
                        >
                          <Text style={s.matchCallBtnText}>📞 立即联系 {m.phone}</Text>
                        </Pressable>
                      )}
                    </View>
                  ))}
                  {msg.matchResult.tips && (
                    <View style={s.tipsBox}><Text style={s.tipsText}>💬 {msg.matchResult.tips}</Text></View>
                  )}
                  <Pressable style={s.rematchBtn} onPress={() => sendMessage("帮我重新匹配，有更多要求")}>
                    <Text style={s.rematchBtnText}>继续追问，更精准匹配 →</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))}

          {loading && (
            <View style={s.msgRow}>
              <Image source={require("@/assets/images/icon.png")} style={s.aiAvatarImg} />
              <View style={[s.msgBubble, s.aiBubble, { flexDirection: "row", gap: 8, alignItems: "center" }]}>
                <ActivityIndicator size="small" color={C.primary} />
                <Text style={{ fontSize: 14, color: C.muted }}>道道正在思考...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={s.inputBar}>
          <TextInput
            style={s.inputField}
            placeholder="告诉道道你的需求..."
            placeholderTextColor={C.muted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <Pressable
            style={[s.sendBtn, (!inputText.trim() || loading) && s.sendBtnDisabled]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || loading}
          >
            <Text style={s.sendBtnText}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  logo: { width: 34, height: 34, borderRadius: 8 },
  appName: { fontSize: 17, fontWeight: "700", color: C.text },
  appSub: { fontSize: 12, color: C.muted, marginTop: 1 },
  setupContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 60 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: C.muted, letterSpacing: 0.5, marginBottom: 12 },
  identityRow: { flexDirection: "row", gap: 12, marginBottom: 28 },
  identityCard: {
    flex: 1, borderRadius: 16, padding: 18, alignItems: "center", gap: 6,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface,
  },
  identityCardActive: { borderColor: C.primary, backgroundColor: C.primaryLight },
  identityEmoji: { fontSize: 28 },
  identityLabel: { fontSize: 15, fontWeight: "700", color: C.text },
  identitySub: { fontSize: 12, color: C.muted, textAlign: "center" },
  phoneRow: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: C.border, borderRadius: 12,
    backgroundColor: C.surface, paddingHorizontal: 14, marginBottom: 6,
  },
  phonePrefix: { fontSize: 15, color: C.text, fontWeight: "600", marginRight: 8 },
  phoneInput: { flex: 1, fontSize: 15, color: C.text, paddingVertical: 13 },
  phoneHint: { fontSize: 12, color: C.muted, marginBottom: 0 },
  quickGrid: { gap: 10, marginBottom: 28 },
  quickCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 14, borderRadius: 12, backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
  },
  quickCardText: { fontSize: 14, color: C.text, flex: 1 },
  quickCardArrow: { fontSize: 16, color: C.muted },
  startBtn: {
    backgroundColor: C.primary, borderRadius: 14,
    paddingVertical: 15, alignItems: "center", marginBottom: 20,
  },
  startBtnDisabled: { backgroundColor: C.border },
  startBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  featureRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  featureChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  featureChipText: { fontSize: 12, color: C.muted },
  chatHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  backBtn: { paddingVertical: 4, paddingRight: 12 },
  backBtnText: { fontSize: 14, color: C.primary, fontWeight: "600" },
  chatHeaderCenter: { flexDirection: "row", alignItems: "center", gap: 6 },
  chatTitle: { fontSize: 16, fontWeight: "700", color: C.text },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary },
  phoneTag: { fontSize: 12, color: C.muted },
  msgList: { flex: 1 },
  msgListContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20, gap: 16 },
  welcomeHint: { alignItems: "center", paddingVertical: 40, gap: 10 },
  welcomeEmoji: { fontSize: 48 },
  welcomeTitle: { fontSize: 18, fontWeight: "700", color: C.text },
  welcomeSub: { fontSize: 14, color: C.muted, textAlign: "center", lineHeight: 22 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  msgRowUser: { flexDirection: "row-reverse" },
  aiAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.primary, alignItems: "center", justifyContent: "center",
  },
  aiAvatarText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  aiAvatarImg: { width: 32, height: 32, borderRadius: 16 },
  msgBubble: { maxWidth: "78%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  aiBubble: { backgroundColor: C.aiMsg, borderBottomLeftRadius: 4 },
  userBubble: { backgroundColor: C.userMsg, borderBottomRightRadius: 4 },
  msgText: { fontSize: 15, color: C.text, lineHeight: 22 },
  matchResultContainer: {
    marginTop: 8, marginLeft: 40,
    borderRadius: 16, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.matchCard, padding: 16, gap: 10,
  },
  matchResultTitle: { fontSize: 15, fontWeight: "700", color: C.text },
  matchResultSummary: { fontSize: 13, color: C.muted, lineHeight: 20 },
  matchCard: {
    borderRadius: 12, borderWidth: 1, borderColor: C.matchBorder,
    backgroundColor: "#fff", padding: 14, gap: 5,
  },
  matchCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  matchName: { fontSize: 15, fontWeight: "700", color: C.text, flex: 1 },
  scoreBadge: {
    backgroundColor: C.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  scoreText: { fontSize: 12, fontWeight: "700", color: C.primary },
  matchArea: { fontSize: 12, color: C.muted },
  matchDesc: { fontSize: 13, color: C.text, lineHeight: 19 },
  matchReason: { fontSize: 12, color: C.primary, lineHeight: 18 },
  matchTip: { fontSize: 12, color: C.muted, lineHeight: 18 },
  matchCategory: { fontSize: 11, color: "#10A37F", fontWeight: "600", marginTop: 1 },
  matchHighlight: { fontSize: 12, color: "#0D0D0D", lineHeight: 17 },
  matchCallBtn: {
    marginTop: 8, paddingVertical: 10, borderRadius: 10,
    backgroundColor: "#10A37F", alignItems: "center",
  },
  matchCallBtnText: { fontSize: 13, color: "#fff", fontWeight: "700" },
  tipsBox: { backgroundColor: C.primaryLight, borderRadius: 10, padding: 12 },
  tipsText: { fontSize: 13, color: C.primary, lineHeight: 20 },
  rematchBtn: {
    paddingVertical: 10, alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border, marginTop: 4,
  },
  rematchBtnText: { fontSize: 13, color: C.primary, fontWeight: "600" },
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border,
    backgroundColor: C.bg,
  },
  inputField: {
    flex: 1, borderRadius: 22, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.surface, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: C.text, maxHeight: 120,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.primary, alignItems: "center", justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: C.border },
  sendBtnText: { fontSize: 20, color: "#fff", fontWeight: "700", lineHeight: 24 },
});
