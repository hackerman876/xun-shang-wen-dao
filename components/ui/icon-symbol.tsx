import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  // 导航
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  // 应用核心
  "sparkles": "auto-awesome",
  "magnifyingglass": "search",
  "calendar": "calendar-today",
  "person.fill": "person",
  "person.2.fill": "group",
  "building.2.fill": "business",
  "chart.bar.fill": "bar-chart",
  "bell.fill": "notifications",
  "phone.fill": "phone",
  "phone.arrow.up.right": "call-made",
  "message.fill": "chat",
  "star.fill": "star",
  "location.fill": "location-on",
  "clock.fill": "access-time",
  "checkmark.circle.fill": "check-circle",
  "xmark.circle.fill": "cancel",
  "arrow.right.circle.fill": "arrow-circle-right",
  "plus.circle.fill": "add-circle",
  "gear": "settings",
  "arrow.left": "arrow-back",
  "xmark": "close",
  "ellipsis": "more-horiz",
  "trash.fill": "delete",
  "pencil": "edit",
  "doc.text.fill": "description",
  "lightbulb.fill": "lightbulb",
  "waveform": "graphic-eq",
  "mic.fill": "mic",
  "stop.fill": "stop",
  "play.fill": "play-arrow",
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
