/**
 * match.tsx — 功能已合并到首页，重定向到首页
 */
import { Redirect } from "expo-router";
export default function MatchScreen() {
  return <Redirect href="/(tabs)" />;
}
