import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Linking, Modal, Pressable, RefreshControl, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLanguage } from "../contexts/LanguageContext";
import { getCatalog, safeCatalogUrl, type CatalogProduct } from "../services/catalog";

const C = { navy: "#10223B", blue: "#2563EB", muted: "#64748B", pale: "#EDF3FF" };
export default function CatalogScreen() {
  const { t, isArabic } = useLanguage();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [page, setPage] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<CatalogProduct | null>(null);
  const request = useRef<AbortController | null>(null);
  const activeQuery = useRef(query);
  const loading = useRef(false);
  const load = useCallback(async (term: string, next: number) => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    loading.current = true; setBusy(true); setError(false);
    if (next === 1) { setProducts([]); setPage(0); setLastPage(1); }
    try {
      const result = await getCatalog(term, next, controller.signal);
      if (controller.signal.aborted) return;
      setProducts(previous => next === 1 ? result.data : [...previous, ...result.data.filter(item => !previous.some(old => old.id === item.id))]);
      setPage(result.current_page); setLastPage(result.last_page);
    } catch { if (!controller.signal.aborted) setError(true); }
    finally { if (!controller.signal.aborted) { loading.current = false; setBusy(false); } }
  }, []);
  useEffect(() => {
    activeQuery.current = query;
    const timer = setTimeout(() => { void load(query, 1); }, 0);
    return () => { clearTimeout(timer); request.current?.abort(); };
  }, [query, load]);
  const openStore = async (product: CatalogProduct) => {
    const url = safeCatalogUrl(product.product_url);
    if (!url) return;
    try { await Linking.openURL(url); }
    catch { Alert.alert(t("تعذر فتح المتجر", "Unable to open store")); }
  };
  const direction = { textAlign: isArabic ? "right" as const : "left" as const };
  return <SafeAreaView style={s.root}>
    <View style={s.top}><Pressable accessibilityRole="button" accessibilityLabel={t("رجوع", "Back")} onPress={() => router.canGoBack() ? router.back() : router.replace("/")} style={s.back}><Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={23} color={C.navy} /></Pressable><Text style={s.brand}>Raslo <Text style={{ color: C.blue }}>Discover</Text></Text><Ionicons name="storefront-outline" size={25} color={C.blue} /></View>
    <FlatList data={products} keyExtractor={item => String(item.id)} numColumns={2} contentContainerStyle={s.content} columnWrapperStyle={{ gap: 12 }}
      refreshControl={<RefreshControl refreshing={busy && page > 0} onRefresh={() => void load(activeQuery.current, 1)} />}
      ListHeaderComponent={<View><View style={s.hero}><Text style={s.eyebrow}>{t("متاجر مختارة · منتجات حقيقية", "REAL STORES · REAL PRODUCTS")}</Text><Text style={[s.title, direction]}>{t("اكتشف شيئًا يعجبك", "Find something you love")}</Text><Text style={[s.subtitle, direction]}>{t("تصفح منتجات التجار المعتمدين. الشراء حاليًا لدى المتجر.", "Explore approved merchants. Purchase currently takes place at the store.")}</Text></View><View style={s.search}><Ionicons name="search-outline" size={21} color={C.muted} /><TextInput value={search} onChangeText={setSearch} maxLength={100} placeholder={t("ابحث عن منتج", "Search products")} style={[s.input, direction]} returnKeyType="search" onSubmitEditing={() => setQuery(search.trim())} accessibilityLabel={t("بحث المنتجات", "Search products")} /><Pressable accessibilityRole="button" onPress={() => setQuery(search.trim())}><Text style={s.searchButton}>{t("بحث", "Search")}</Text></Pressable></View>{error && <View style={s.notice}><Text style={s.muted}>{t("تعذر تحميل المنتجات. تحقق من الاتصال وحاول مجددًا.", "Could not load products. Check your connection and retry.")}</Text><Pressable onPress={() => void load(query, page || 1)} accessibilityRole="button"><Text style={s.searchButton}>{t("إعادة المحاولة", "Retry")}</Text></Pressable></View>}</View>}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`${item.name}, ${item.price_minor / 100} ${item.currency}`} onPress={() => setSelected(item)} style={s.card}><ProductImage product={item} /><View style={s.cardBody}><Text numberOfLines={1} style={[s.store, direction]}>{item.store.name}</Text><Text numberOfLines={2} style={[s.productName, direction]}>{item.name}</Text><Text style={[s.price, direction]}>{(item.price_minor / 100).toFixed(2)} <Text style={s.currency}>{item.currency}</Text></Text><Text style={[s.category, direction]}>{item.category || t("اكتشف المنتج", "View product")} ↗</Text></View></Pressable>}
      ListEmptyComponent={!busy && !error ? <View style={s.empty}><Ionicons name="bag-handle-outline" size={45} color={C.muted} /><Text style={[s.productName, { marginTop: 15 }]}>{t("لا توجد منتجات متاحة حاليًا", "No products available yet")}</Text><Text style={s.muted}>{t("جرّب بحثًا آخر أو عُد لاحقًا.", "Try another search or come back later.")}</Text></View> : null}
      ListFooterComponent={<View style={s.footer}>{busy ? <ActivityIndicator color={C.blue} /> : page < lastPage && !error ? <Pressable onPress={() => { if (!loading.current) void load(query, page + 1); }} accessibilityRole="button" style={s.primary}><Text style={s.white}>{t("عرض المزيد", "Load more")}</Text></Pressable> : null}<Text style={s.footnote}>{t("الأسعار والتوفر حسب آخر مزامنة. يؤكد المتجر التفاصيل عند الشراء.", "Prices and availability reflect the latest sync. Confirm details with the store at purchase.")}</Text></View>} />
    <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}><View style={s.overlay}><View style={s.sheet}><Pressable onPress={() => setSelected(null)} accessibilityRole="button" accessibilityLabel={t("إغلاق", "Close")} style={s.close}><Ionicons name="close" size={25} color={C.navy} /></Pressable>{selected && <><ProductImage product={selected} /><Text style={[s.store, direction]}>{selected.store.name}</Text><Text style={[s.title, direction, { color: C.navy }]}>{selected.name}</Text><Text numberOfLines={6} style={[s.description, direction]}>{selected.description}</Text><Text style={[s.price, direction]}>{(selected.price_minor / 100).toFixed(2)} {selected.currency}</Text>{safeCatalogUrl(selected.product_url) && <Pressable accessibilityRole="link" onPress={() => void openStore(selected)} style={s.primary}><Text style={s.white}>{t("عرض لدى المتجر ↗", "View at store ↗")}</Text></Pressable>}</>}</View></View></Modal>
  </SafeAreaView>;
}
function ProductImage({ product }: { product: CatalogProduct }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const url = safeCatalogUrl(product.image_url);
  return url && failedUrl !== url ? <Image source={{ uri: url }} style={s.photo} resizeMode="contain" onError={() => setFailedUrl(url)} /> : <View style={[s.photo, s.placeholder]}><Ionicons name="bag-outline" size={44} color="#93A7C6" /></View>;
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F7FB", paddingTop: 25 }, top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14 }, back: { padding: 10 }, brand: { fontSize: 23, fontWeight: "900", color: C.navy }, content: { padding: 18, paddingBottom: 40 }, hero: { padding: 24, backgroundColor: C.navy, borderRadius: 24, marginBottom: 20 }, eyebrow: { fontSize: 10, color: "#93C5FD", fontWeight: "800", letterSpacing: 1 }, title: { fontSize: 27, fontWeight: "900", color: "white", marginVertical: 12 }, subtitle: { fontSize: 13, lineHeight: 22, color: "#CAD8EB" }, search: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#DFE7F1", borderRadius: 15, paddingHorizontal: 15, backgroundColor: "white", marginBottom: 22 }, input: { flex: 1, minHeight: 52, color: C.navy }, searchButton: { color: C.blue, fontWeight: "800", paddingVertical: 12 }, card: { flex: 1, maxWidth: "50%", borderRadius: 18, backgroundColor: "white", overflow: "hidden", marginBottom: 15, borderWidth: 1, borderColor: "#E4EBF4" }, photo: { height: 155, width: "100%", backgroundColor: C.pale }, placeholder: { alignItems: "center", justifyContent: "center" }, cardBody: { padding: 13 }, store: { color: C.muted, fontSize: 11, marginTop: 8 }, productName: { fontSize: 15, lineHeight: 22, fontWeight: "800", color: C.navy, marginTop: 7 }, price: { color: C.blue, fontSize: 21, fontWeight: "900", marginTop: 12 }, currency: { fontSize: 11 }, category: { color: C.muted, fontSize: 11, marginTop: 12 }, footer: { paddingVertical: 20 }, primary: { backgroundColor: C.blue, padding: 16, alignItems: "center", borderRadius: 14, marginTop: 17 }, white: { color: "white", fontWeight: "800" }, footnote: { color: C.muted, textAlign: "center", fontSize: 11, lineHeight: 20, marginTop: 22 }, empty: { alignItems: "center", paddingVertical: 45 }, muted: { color: C.muted, lineHeight: 22, textAlign: "center" }, notice: { padding: 16, alignItems: "center", marginBottom: 15 }, overlay: { flex: 1, backgroundColor: "#00000088", justifyContent: "flex-end" }, sheet: { backgroundColor: "white", borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 24, paddingBottom: 38 }, close: { alignSelf: "flex-end", padding: 8 }, description: { color: C.muted, lineHeight: 24 }
});
