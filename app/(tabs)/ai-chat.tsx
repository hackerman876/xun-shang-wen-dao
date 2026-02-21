/**
 * AI 对话页 — 道道 AI 顾问（无需登录）
 * ChatGPT 极简风格，直接对话，AI 实时回复
 */
import { api } from "@/lib/api";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
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
  text: "#0D0D0D",
  muted: "#6E6E80",
  aiMsg: "#F7F7F8",
  userMsg: "#10A37F",
};

type Msg = { id: string; role: "user" | "assistant"; content: string };

const QUICK_PROMPTS = [
  "帮我分析今日商机",
  "我想创业，不知道做什么好",
  "如何找到精准客户？",
  "帮我制定推广策略",
];

export default function AIChatScreen() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState("ai_" + Date.now());
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { id: Date.now().toString(), role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await api.ai.chat({ message: text.trim(), sessionId }, "") as { reply: string };
      const rawReply = res?.reply || "抱歉，AI暂时无法回复，请稍后再试。";
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: rawReply,
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "AI 服务暂时不可用，请检查网络后重试。",
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <Image source={require("@/assets/images/icon.png")} style={s.headerLogo} />
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>道道 AI</Text>
          <Text style={s.headerSub}>智能商业顾问</Text>
        </View>
        {messages.length > 0 && (
          <Pressable style={s.clearBtn} onPress={() => setMessages([])}>
            <Text style={s.clearBtnText}>清空</Text>
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          ref={scrollRef}
          style={s.msgList}
          contentContainerStyle={s.msgListContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 && (
            <View style={s.welcome}>
              <Image source={require("@/assets/images/icon.png")} style={s.welcomeLogo} />
              <Text style={s.welcomeTitle}>你好，我是道道</Text>
              <Text style={s.welcomeSub}>{"你的 AI 商业顾问\n有什么我可以帮你的？"}</Text>
              <View style={s.quickGrid}>
                {QUICK_PROMPTS.map((q) => (
                  <Pressable key={q} style={s.quickChip} onPress={() => sendMessage(q)}>
                    <Text style={s.quickChipText}>{q}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {messages.map((msg) => (
            <View key={msg.id} style={[s.msgRow, msg.role === "user" && s.msgRowUser]}>
              {msg.role === "assistant" && (
                <Image source={require("@/assets/images/icon.png")} style={s.aiAvatar} />
              )}
              <View style={[s.bubble, msg.role === "user" ? s.userBubble : s.aiBubble]}>
                <Text style={[s.bubbleText, msg.role === "user" && { color: "#fff" }]}>
                  {msg.content}
                </Text>
              </View>
            </View>
          ))}

          {loading && (
            <View style={s.msgRow}>
              <Image source={require("@/assets/images/icon.png")} style={s.aiAvatar} />
              <View style={[s.bubble, s.aiBubble, { flexDirection: "row", gap: 8, alignItems: "center" }]}>
                <ActivityIndicator size="small" color={C.primary} />
                <Text style={{ fontSize: 14, color: C.muted }}>道道正在思考...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={s.inputBar}>
          <TextInput
            style={s.inputField}
            placeholder="问道道任何问题..."
            placeholderTextColor={C.muted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
          />
          <Pressable
            style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnDisabled]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || loading}
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
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  headerLogo: { width: 32, height: 32, borderRadius: 8 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: C.text },
  headerSub: { fontSize: 11, color: C.muted },
  clearBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  clearBtnText: { fontSize: 13, color: C.muted },
  msgList: { flex: 1 },
  msgListContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20, gap: 16 },
  welcome: { alignItems: "center", paddingTop: 40, gap: 10 },
  welcomeLogo: { width: 72, height: 72, borderRadius: 18, marginBottom: 4 },
  welcomeTitle: { fontSize: 22, fontWeight: "700", color: C.text },
  welcomeSub: { fontSize: 15, color: C.muted, textAlign: "center", lineHeight: 24 },
  quickGrid: { width: "100%", gap: 10, marginTop: 16 },
  quickChip: {
    borderRadius: 12, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.surface, padding: 14,
  },
  quickChipText: { fontSize: 14, color: C.text },
  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  msgRowUser: { flexDirection: "row-reverse" },
  aiAvatar: { width: 32, height: 32, borderRadius: 16 },
  bubble: { maxWidth: "78%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  aiBubble: { backgroundColor: C.aiMsg, borderBottomLeftRadius: 4 },
  userBubble: { backgroundColor: C.userMsg, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 15, color: C.text, lineHeight: 22 },
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
