import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  hasManus?: boolean;
}

const SESSION_ID = "session_" + Date.now();

const CUSTOMER_PROMPTS = [
  "我想找一家好餐厅，帮我推荐",
  "我需要家政保洁服务",
  "帮我找附近的美容院",
  "我想预约法律咨询",
  "帮我分析今日商机",
];

const MERCHANT_PROMPTS = [
  "帮我分析今天有哪些潜在客户",
  "我是餐厅老板，帮我找客户",
  "今日有哪些商机适合我？",
  "帮我制定今日推广策略",
  "分析我的竞争对手情况",
];

export default function AIChatScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const isCustomer = user?.identity === "customer";
  const quickPrompts = isCustomer ? CUSTOMER_PROMPTS : MERCHANT_PROMPTS;

  useEffect(() => {
    const welcomeText = isCustomer
      ? "你好，" + (user?.name || "朋友") + "！我是道道，您的AI商业助手 ✨\n\n我能帮您：\n• 收集您的需求，智能匹配最合适的商家\n• 每日推送个性化商机\n• 自动帮您预约并确认\n• 模拟AI电话联系商家\n\n遇到复杂问题，我会推荐您找 Manus AI 解决！\n\n请告诉我您今天需要什么服务？"
      : "你好，" + (user?.name || "商家朋友") + "！我是道道，您的AI商业助手 ✨\n\n我能帮您：\n• 分析市场，精准推荐潜在客户\n• 每日商机分析报告\n• 主动联系目标客户并预约\n• 行业趋势与竞争分析\n\n遇到复杂商业问题，我会推荐您找 Manus AI 解决！\n\n请告诉我您今天想了解什么？";

    setMessages([{
      id: "welcome",
      role: "assistant",
      content: welcomeText,
      timestamp: Date.now(),
    }]);
  }, []);

  const sendMessage = async (text?: string) => {
    const content = (text || input).trim();
    if (!content || loading) return;

    const userMsg: Message = {
      id: "user_" + Date.now(),
      role: "user",
      content,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const res = await api.ai.chat(
        { message: content, sessionId: SESSION_ID, identity: user?.identity },
        user?.id?.toString() || ""
      );
      const rawReply = res?.reply || "抱歉，AI暂时无法回复，请稍后再试。";
      const hasManus = rawReply.includes("Manus") || rawReply.includes("manus.im");
      const cleanText = rawReply.replace(/\[点击找Manus\]\(https:\/\/manus\.im\)/g, "").trim();

      setMessages((prev) => [...prev, {
        id: "ai_" + Date.now(),
        role: "assistant",
        content: cleanText,
        timestamp: Date.now(),
        hasManus,
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: "err_" + Date.now(),
        role: "assistant",
        content: "网络异常，请检查连接后重试。",
        timestamp: Date.now(),
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
  };

  const s = StyleSheet.create({
    header: {
      paddingHorizontal: 20, paddingVertical: 14,
      backgroundColor: colors.surface,
      borderBottomWidth: 0.5, borderBottomColor: colors.border,
      flexDirection: "row", alignItems: "center", gap: 12,
    },
    aiAvatar: {
      width: 42, height: 42, borderRadius: 21,
      backgroundColor: colors.primary,
      alignItems: "center", justifyContent: "center",
    },
    headerInfo: { flex: 1 },
    headerTitle: { fontSize: 17, fontWeight: "700", color: colors.foreground },
    headerSub: { fontSize: 12, color: colors.success, marginTop: 1 },
    manusHeaderBtn: {
      paddingHorizontal: 12, paddingVertical: 6,
      backgroundColor: colors.primary + "15",
      borderRadius: 20, borderWidth: 1, borderColor: colors.primary + "30",
    },
    manusHeaderBtnText: { fontSize: 12, color: colors.primary, fontWeight: "600" },
    msgList: { paddingHorizontal: 16, paddingVertical: 12 },
    msgRow: { marginBottom: 16 },
    userMsgRow: { alignItems: "flex-end" },
    aiBubble: {
      maxWidth: "85%", backgroundColor: colors.surface,
      borderRadius: 18, borderBottomLeftRadius: 4,
      padding: 14, borderWidth: 1, borderColor: colors.border,
    },
    userBubble: {
      maxWidth: "85%", backgroundColor: colors.primary,
      borderRadius: 18, borderBottomRightRadius: 4,
      padding: 14,
    },
    aiBubbleText: { fontSize: 15, color: colors.foreground, lineHeight: 23 },
    userBubbleText: { fontSize: 15, color: "#fff", lineHeight: 23 },
    timeText: { fontSize: 11, color: colors.muted, marginTop: 4 },
    manusCard: {
      marginTop: 10, padding: 12,
      backgroundColor: colors.primary + "08",
      borderRadius: 12, borderWidth: 1,
      borderColor: colors.primary + "25",
      flexDirection: "row", alignItems: "center", gap: 10,
    },
    manusCardText: { flex: 1, fontSize: 13, color: colors.foreground, lineHeight: 18 },
    manusCardBtn: {
      backgroundColor: colors.primary, borderRadius: 8,
      paddingHorizontal: 12, paddingVertical: 6,
    },
    manusCardBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
    quickWrap: {
      paddingHorizontal: 16, paddingVertical: 8,
      borderTopWidth: 0.5, borderTopColor: colors.border,
    },
    quickLabel: { fontSize: 12, color: colors.muted, marginBottom: 8, fontWeight: "500" },
    inputWrap: {
      flexDirection: "row", alignItems: "flex-end",
      paddingHorizontal: 16, paddingVertical: 10,
      backgroundColor: colors.surface,
      borderTopWidth: 0.5, borderTopColor: colors.border, gap: 10,
    },
    textInput: {
      flex: 1, backgroundColor: colors.background,
      borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
      fontSize: 15, color: colors.foreground,
      borderWidth: 1, borderColor: colors.border,
      maxHeight: 100,
    },
    sendBtn: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: "center", justifyContent: "center",
    },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.muted },
  });

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[s.msgRow, item.role === "user" && s.userMsgRow]}>
      {item.role === "assistant" ? (
        <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end", maxWidth: "90%" }}>
          <View style={s.aiAvatar}>
            <Text style={{ fontSize: 20 }}>✨</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={s.aiBubble}>
              <Text style={s.aiBubbleText}>{item.content}</Text>
              {item.hasManus && (
                <TouchableOpacity
                  style={s.manusCard}
                  onPress={() => Linking.openURL("https://manus.im")}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 20 }}>🤖</Text>
                  <Text style={s.manusCardText}>这个问题更复杂，推荐找 Manus AI 帮您解决</Text>
                  <View style={s.manusCardBtn}>
                    <Text style={s.manusCardBtnText}>找Manus</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
            <Text style={s.timeText}>{formatTime(item.timestamp)}</Text>
          </View>
        </View>
      ) : (
        <View>
          <View style={s.userBubble}>
            <Text style={s.userBubbleText}>{item.content}</Text>
          </View>
          <Text style={[s.timeText, { textAlign: "right" }]}>{formatTime(item.timestamp)}</Text>
        </View>
      )}
    </View>
  );

  return (
    <ScreenContainer>
      <View style={s.header}>
        <View style={s.aiAvatar}>
          <Text style={{ fontSize: 22 }}>✨</Text>
        </View>
        <View style={s.headerInfo}>
          <Text style={s.headerTitle}>道道 AI 助手</Text>
          <Text style={s.headerSub}>● 在线 · {isCustomer ? "为您寻找商家" : "为您推荐客户"}</Text>
        </View>
        <TouchableOpacity
          style={s.manusHeaderBtn}
          onPress={() => Linking.openURL("https://manus.im")}
        >
          <Text style={s.manusHeaderBtnText}>找Manus</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.msgList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListFooterComponent={loading ? (
            <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end", marginBottom: 16 }}>
              <View style={s.aiAvatar}>
                <Text style={{ fontSize: 20 }}>✨</Text>
              </View>
              <View style={{
                flexDirection: "row", gap: 4, padding: 14,
                backgroundColor: colors.surface, borderRadius: 18,
                borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border,
              }}>
                <View style={s.dot} />
                <View style={s.dot} />
                <View style={s.dot} />
              </View>
            </View>
          ) : null}
        />

        {messages.length <= 1 && (
          <View style={s.quickWrap}>
            <Text style={s.quickLabel}>快速提问</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {quickPrompts.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={{
                    paddingVertical: 8, paddingHorizontal: 14,
                    backgroundColor: colors.primary + "12",
                    borderRadius: 20, borderWidth: 1, borderColor: colors.primary + "25",
                  }}
                  onPress={() => sendMessage(p)}
                >
                  <Text style={{ fontSize: 13, color: colors.primary, fontWeight: "500" }}>{p}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={s.inputWrap}>
          <TextInput
            style={s.textInput}
            placeholder={isCustomer ? "告诉我您需要什么服务..." : "告诉我您的业务需求..."}
            placeholderTextColor={colors.muted}
            value={input}
            onChangeText={setInput}
            multiline
            returnKeyType="send"
            onSubmitEditing={() => sendMessage()}
            blurOnSubmit={false}
          />
          <Pressable
            style={[s.sendBtn, (!input.trim() || loading) && { opacity: 0.5 }]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <IconSymbol name="paperplane.fill" size={18} color="#fff" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
