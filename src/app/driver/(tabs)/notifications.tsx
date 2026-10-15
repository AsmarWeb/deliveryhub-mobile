import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useLanguage } from "../../../contexts/LanguageContext";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type AppNotification,
} from "../../../services/notifications";

type Filter = "all" | "unread";

function messageOf(item: AppNotification, fallback: string): string {
  const data = item.data ?? {};
  const value = data.message ?? data.body ?? data.title;
  return typeof value === "string" && value.trim() ? value : fallback;
}

function errorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } })
      .response;
    if (typeof response?.data?.message === "string")
      return response.data.message;
  }
  return fallback;
}

export default function DriverNotificationsScreen() {
  const { language, t } = useLanguage();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestId = useRef(0);
  const active = useRef(false);
  const loadingMoreLock = useRef(false);
  const actionLock = useRef(false);

  const load = useCallback(async (refresh = false) => {
    const id = ++requestId.current;
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [result, count] = await Promise.all([
        getNotifications(1),
        getUnreadNotificationCount(),
      ]);
      if (!active.current || id !== requestId.current) return;
      setItems(result.data);
      setUnread(count);
      setPage(result.current_page);
      setLastPage(result.last_page);
      setError(null);
    } catch (err: unknown) {
      if (!active.current || id !== requestId.current) return;
      setError(errorMessage(err, "Unable to load notifications."));
    } finally {
      if (active.current && id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      active.current = true;
      void load();
      return () => {
        active.current = false;
        requestId.current += 1;
      };
    }, [load]),
  );

  const visible = useMemo(
    () => (filter === "unread" ? items.filter((item) => !item.read_at) : items),
    [filter, items],
  );

  const loadMore = useCallback(async () => {
    if (
      loadingMoreLock.current ||
      actionLock.current ||
      loading ||
      refreshing ||
      page >= lastPage
    )
      return;
    loadingMoreLock.current = true;
    setLoadingMore(true);
    const id = requestId.current;
    try {
      const result = await getNotifications(page + 1);
      if (!active.current || id !== requestId.current) return;
      setItems((previous) => {
        const known = new Set(previous.map((item) => item.id));
        return [
          ...previous,
          ...result.data.filter((item) => !known.has(item.id)),
        ];
      });
      setPage(result.current_page);
      setLastPage(result.last_page);
    } catch (err: unknown) {
      if (active.current && id === requestId.current) {
        Alert.alert(
          t("خطأ", "Error"),
          errorMessage(
            err,
            t(
              "تعذر تحميل المزيد من الإشعارات.",
              "Could not load more notifications.",
            ),
          ),
        );
      }
    } finally {
      loadingMoreLock.current = false;
      if (active.current) setLoadingMore(false);
    }
  }, [loading, page, lastPage, refreshing, t]);

  const markRead = useCallback(
    async (item: AppNotification) => {
      if (item.read_at || actionLock.current || loadingMoreLock.current) return;
      actionLock.current = true;
      setMarkingId(item.id);
      try {
        await markNotificationAsRead(item.id);
        if (!active.current) return;
        setItems((previous) =>
          previous.map((entry) =>
            entry.id === item.id
              ? { ...entry, read_at: new Date().toISOString() }
              : entry,
          ),
        );
        setUnread((value) => Math.max(0, value - 1));
      } catch (err: unknown) {
        if (active.current)
          Alert.alert(
            t("خطأ", "Error"),
            errorMessage(
              err,
              t("تعذر تحديث الإشعار.", "Could not update notification."),
            ),
          );
      } finally {
        actionLock.current = false;
        if (active.current) setMarkingId(null);
      }
    },
    [t],
  );

  const markAllRead = useCallback(async () => {
    if (unread === 0 || actionLock.current || loadingMoreLock.current) return;
    actionLock.current = true;
    setMarkingAll(true);
    try {
      await markAllNotificationsAsRead();
      if (!active.current) return;
      const now = new Date().toISOString();
      setItems((previous) =>
        previous.map((item) => ({ ...item, read_at: item.read_at ?? now })),
      );
      setUnread(0);
    } catch (err: unknown) {
      if (active.current)
        Alert.alert(
          t("خطأ", "Error"),
          errorMessage(
            err,
            t("تعذر تحديث الإشعارات.", "Could not update notifications."),
          ),
        );
    } finally {
      actionLock.current = false;
      if (active.current) setMarkingAll(false);
    }
  }, [unread, t]);

  const renderItem = ({ item }: { item: AppNotification }) => {
    const isUnread = !item.read_at;
    const date = new Date(item.created_at);
    const dateText = Number.isNaN(date.getTime())
      ? ""
      : date.toLocaleString(language === "ar" ? "ar-AE" : "en-AE");
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={messageOf(
          item,
          t("لديك إشعار جديد", "You have a new notification"),
        )}
        disabled={!isUnread || markingAll || markingId !== null}
        onPress={() => void markRead(item)}
        style={[styles.card, isUnread && styles.unreadCard]}
      >
        <View style={[styles.iconBox, !isUnread && styles.readIconBox]}>
          <Ionicons
            name={isUnread ? "notifications" : "notifications-outline"}
            size={22}
            color={isUnread ? "#2563EB" : "#64748B"}
          />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.message}>
            {messageOf(
              item,
              t("لديك إشعار جديد", "You have a new notification"),
            )}
          </Text>
          {!!dateText && <Text style={styles.date}>{dateText}</Text>}
          {isUnread && (
            <Text style={styles.hint}>
              {markingId === item.id
                ? t("جارٍ التحديث...", "Updating...")
                : t("اضغط لتحديده كمقروء", "Tap to mark as read")}
            </Text>
          )}
        </View>
        {markingId === item.id ? (
          <ActivityIndicator size="small" color="#2563EB" />
        ) : isUnread ? (
          <View style={styles.dot} />
        ) : null}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.caption}>DELIVERYHUB DRIVER</Text>
        <Text style={styles.title}>{t("الإشعارات", "Notifications")}</Text>
        <Text style={styles.subtitle}>
          {unread === 0
            ? t("كل الإشعارات مقروءة", "You're all caught up")
            : t(
                `لديك ${unread} إشعار غير مقروء`,
                `${unread} unread notification${unread === 1 ? "" : "s"}`,
              )}
        </Text>
      </View>

      <View style={styles.toolbar}>
        <Text style={styles.toolbarTitle}>
          {t("مركز الإشعارات", "Notification center")}
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={unread === 0 || markingAll || markingId !== null || loading}
          onPress={() => void markAllRead()}
          style={styles.markAllButton}
        >
          {markingAll ? (
            <ActivityIndicator size="small" color="#2563EB" />
          ) : (
            <Text
              style={[
                styles.markAll,
                (unread === 0 || loading) && styles.disabled,
              ]}
            >
              {t("قراءة الكل", "Mark all read")}
            </Text>
          )}
        </Pressable>
      </View>

      <View style={styles.filters}>
        {(["all", "unread"] as const).map((key) => (
          <Pressable
            key={key}
            onPress={() => setFilter(key)}
            style={[styles.filterButton, filter === key && styles.filterActive]}
          >
            <Text
              style={[
                styles.filterText,
                filter === key && styles.filterTextActive,
              ]}
            >
              {key === "all" ? t("الكل", "All") : t("غير المقروءة", "Unread")}
              {key === "unread" ? ` (${unread})` : ""}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : error && items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={42} color="#94A3B8" />
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={() => void load()} style={styles.retryButton}>
            <Text style={styles.retryText}>
              {t("إعادة المحاولة", "Try again")}
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(true)}
              tintColor="#2563EB"
            />
          }
          ListHeaderComponent={
            error ? <Text style={styles.errorBanner}>{error}</Text> : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name={
                  filter === "unread"
                    ? "checkmark-circle-outline"
                    : "notifications-off-outline"
                }
                size={52}
                color="#94A3B8"
              />
              <Text style={styles.emptyTitle}>
                {filter === "unread"
                  ? t(
                      "لا توجد إشعارات غير مقروءة",
                      "No unread notifications loaded",
                    )
                  : t("لا توجد إشعارات حالياً", "No notifications yet")}
              </Text>
              <Text style={styles.emptySubtitle}>
                {filter === "unread"
                  ? t(
                      "يمكنك العودة إلى الكل أو تحميل المزيد.",
                      "Switch to All or load more.",
                    )
                  : t(
                      "ستظهر الإشعارات الجديدة هنا.",
                      "New notifications will appear here.",
                    )}
              </Text>
            </View>
          }
          ListFooterComponent={
            page < lastPage ? (
              <Pressable
                disabled={loadingMore || markingAll || markingId !== null}
                onPress={() => void loadMore()}
                style={styles.moreButton}
              >
                {loadingMore ? (
                  <ActivityIndicator color="#2563EB" />
                ) : (
                  <Text style={styles.moreText}>
                    {t("تحميل المزيد", "Load more")}
                  </Text>
                )}
              </Pressable>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB" },
  header: {
    backgroundColor: "#0B1730",
    paddingTop: 62,
    paddingHorizontal: 22,
    paddingBottom: 25,
  },
  caption: {
    color: "#93C5FD",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  title: { color: "#FFFFFF", fontSize: 28, fontWeight: "800", marginTop: 8 },
  subtitle: { color: "#CBD5E1", marginTop: 7, fontSize: 13 },
  toolbar: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  toolbarTitle: {
    color: "#0B1730",
    fontSize: 15,
    fontWeight: "800",
    flexShrink: 1,
  },
  markAllButton: { padding: 7, minWidth: 85, alignItems: "center" },
  markAll: { color: "#2563EB", fontSize: 12, fontWeight: "800" },
  disabled: { opacity: 0.4 },
  filters: {
    flexDirection: "row",
    padding: 9,
    gap: 9,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  filterButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 11,
    alignItems: "center",
  },
  filterActive: { backgroundColor: "#EFF6FF" },
  filterText: { color: "#64748B", fontSize: 13, fontWeight: "700" },
  filterTextActive: { color: "#2563EB" },
  list: { padding: 16, gap: 12, flexGrow: 1, paddingBottom: 35 },
  card: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  unreadCard: { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" },
  iconBox: { backgroundColor: "#DBEAFE", padding: 11, borderRadius: 12 },
  readIconBox: { backgroundColor: "#F1F5F9" },
  cardBody: { flex: 1, gap: 7 },
  message: {
    color: "#0B1730",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 22,
  },
  date: { color: "#64748B", fontSize: 11 },
  hint: { color: "#2563EB", fontSize: 11, fontWeight: "600" },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#2563EB",
    marginTop: 8,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
    padding: 24,
  },
  error: { color: "#DC2626", textAlign: "center", fontSize: 13 },
  errorBanner: { color: "#B91C1C", textAlign: "center", marginBottom: 8 },
  retryButton: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryText: { color: "#2563EB", fontWeight: "800" },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    padding: 28,
  },
  emptyTitle: {
    color: "#334155",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  emptySubtitle: { color: "#64748B", textAlign: "center", fontSize: 13 },
  moreButton: { padding: 16, alignItems: "center" },
  moreText: { color: "#2563EB", fontWeight: "800" },
});
