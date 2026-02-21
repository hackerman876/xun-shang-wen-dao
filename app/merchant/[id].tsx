import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { api } from "@/lib/api";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface MerchantDetail {
  id: number;
  businessName: string;
  category: string;
  description: string;
  rating: number;
  reviewCount: number;
  address: string;
  phone: string;
  tags: string[];
  openHours: string;
  services: Array<{ name: string; price: string }>;
}

export default function MerchantDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [merchant, setMerchant] = useState<MerchantDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      api.merchant.getById(Number(id))
        .then((res) => setMerchant(res?.merchant || null))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [id]);

  const s = StyleSheet.create({
    header: {
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 16, paddingVertical: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 0.5, borderBottomColor: colors.border,
    },
    backBtn: { padding: 8, marginRight: 8 },
    headerTitle: { fontSize: 17, fontWeight: "700", color: colors.foreground, flex: 1 },
    heroCard: {
      margin: 16, borderRadius: 20, padding: 20,
      backgroundColor: colors.surface,
      borderWidth: 1, borderColor: colors.border,
    },
    merchantName: { fontSize: 22, fontWeight: "800", color: colors.foreground },
    catBadge: {
      marginTop: 6, alignSelf: "flex-start",
      backgroundColor: `${colors.primary}15`, paddingHorizontal: 10,
      paddingVertical: 4, borderRadius: 10,
    },
    catText: { fontSize: 13, color: colors.primary, fontWeight: "600" },
    ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 12, gap: 4 },
    stars: { flexDirection: "row", gap: 2 },
    ratingNum: { fontSize: 16, fontWeight: "700", color: colors.foreground },
    reviewCount: { fontSize: 13, color: colors.muted },
    desc: { fontSize: 14, color: colors.muted, marginTop: 12, lineHeight: 20 },
    infoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
    infoText: { fontSize: 13, color: colors.foreground },
    tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
    tag: {
      paddingHorizontal: 10, paddingVertical: 4,
      backgroundColor: colors.background, borderRadius: 10,
      borderWidth: 1, borderColor: colors.border,
    },
    tagText: { fontSize: 12, color: colors.muted },
    section: { marginHorizontal: 16, marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 10 },
    serviceItem: {
      flexDirection: "row", justifyContent: "space-between",
      paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border,
    },
    serviceName: { fontSize: 14, color: colors.foreground },
    servicePrice: { fontSize: 14, color: colors.primary, fontWeight: "600" },
    bookBar: {
      position: "absolute", bottom: 0, left: 0, right: 0,
      padding: 16, backgroundColor: colors.surface,
      borderTopWidth: 0.5, borderTopColor: colors.border,
      flexDirection: "row", gap: 12,
    },
    callBtn: {
      flex: 1, backgroundColor: `${colors.primary}15`,
      borderRadius: 14, paddingVertical: 14,
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
      borderWidth: 1, borderColor: `${colors.primary}30`,
    },
    callBtnText: { color: colors.primary, fontSize: 15, fontWeight: "700" },
    bookBtn: {
      flex: 2, backgroundColor: colors.primary,
      borderRadius: 14, paddingVertical: 14,
      alignItems: "center",
    },
    bookBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  });

  if (loading) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (!merchant) {
    return (
      <ScreenContainer>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <IconSymbol name="arrow.left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>商家详情</Text>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.muted }}>商家信息不存在</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <IconSymbol name="arrow.left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{merchant.businessName}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* 商家信息卡 */}
        <View style={s.heroCard}>
          <Text style={s.merchantName}>{merchant.businessName}</Text>
          <View style={s.catBadge}>
            <Text style={s.catText}>{merchant.category}</Text>
          </View>

          <View style={s.ratingRow}>
            <View style={s.stars}>
              {[1,2,3,4,5].map((i) => (
                <Text key={i} style={{ color: i <= Math.round(merchant.rating || 5) ? "#F59E0B" : colors.border, fontSize: 16 }}>★</Text>
              ))}
            </View>
            <Text style={s.ratingNum}>{merchant.rating?.toFixed(1) || "5.0"}</Text>
            <Text style={s.reviewCount}>({merchant.reviewCount || 0}条评价)</Text>
          </View>

          <Text style={s.desc}>{merchant.description}</Text>

          {merchant.address ? (
            <View style={s.infoRow}>
              <IconSymbol name="location.fill" size={14} color={colors.primary} />
              <Text style={s.infoText}>{merchant.address}</Text>
            </View>
          ) : null}
          {merchant.phone ? (
            <View style={s.infoRow}>
              <IconSymbol name="phone.fill" size={14} color={colors.primary} />
              <Text style={s.infoText}>{merchant.phone}</Text>
            </View>
          ) : null}
          {merchant.openHours ? (
            <View style={s.infoRow}>
              <IconSymbol name="clock.fill" size={14} color={colors.primary} />
              <Text style={s.infoText}>{merchant.openHours}</Text>
            </View>
          ) : null}

          {merchant.tags?.length > 0 && (
            <View style={s.tagsRow}>
              {merchant.tags.map((tag, i) => (
                <View key={i} style={s.tag}>
                  <Text style={s.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 服务项目 */}
        {merchant.services?.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>服务项目</Text>
            <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border }}>
              {merchant.services.map((svc, i) => (
                <View key={i} style={[s.serviceItem, i === merchant.services.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={s.serviceName}>{svc.name}</Text>
                  <Text style={s.servicePrice}>{svc.price}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* 底部操作栏 */}
      <View style={s.bookBar}>
        <TouchableOpacity style={s.callBtn}>
          <IconSymbol name="phone.fill" size={16} color={colors.primary} />
          <Text style={s.callBtnText}>AI电话</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.bookBtn}
          onPress={() => router.push({ pathname: "/appointment/new", params: { merchantId: merchant.id, merchantName: merchant.businessName } } as never)}
        >
          <Text style={s.bookBtnText}>立即预约</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}
