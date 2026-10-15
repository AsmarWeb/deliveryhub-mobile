import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  acceptDriverAssignment,
  getDriverAssignments,
  rejectDriverAssignment,
  type DriverAddress,
  type DriverAssignment,
} from "../../../services/driver";

function formatAddress(address?: DriverAddress | null) {
  if (!address) return "العنوان غير متوفر";

  return (
    [
      address.label,
      address.address_line,
      address.street,
      address.area,
      address.city,
    ]
      .filter(Boolean)
      .join("، ") || "العنوان غير متوفر"
  );
}

function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "response" in error) {
    const response = (
      error as {
        response?: {
          data?: { message?: string };
        };
      }
    ).response;

    if (response?.data?.message) {
      return response.data.message;
    }
  }

  return "تعذر تنفيذ العملية. تحقق من الاتصال وحالة المهمة.";
}

export default function DriverAssignmentsScreen() {
  const [assignments, setAssignments] = useState<DriverAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async (targetPage = 1, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else if (targetPage === 1) setLoading(true);

      setError(null);

      const result = await getDriverAssignments(targetPage);

      setAssignments((current) =>
        append
          ? [
              ...current.filter(
                (item) => !result.data.some((next) => next.id === item.id),
              ),
              ...result.data,
            ]
          : result.data,
      );

      setPage(result.current_page);
      setLastPage(result.last_page);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    await load(1);
  }

  async function accept(id: number) {
    if (busyId !== null) return;

    try {
      setBusyId(id);
      await acceptDriverAssignment(id);
      await load(1);

      Alert.alert("تم قبول المهمة", "تم تحديث المهمة بنجاح.");
    } catch (err) {
      Alert.alert("تعذر القبول", errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function reject() {
    if (rejectId === null || busyId !== null) return;

    const trimmed = reason.trim();

    if (!trimmed) {
      Alert.alert("مطلوب", "يرجى كتابة سبب الرفض.");
      return;
    }

    const id = rejectId;

    try {
      setBusyId(id);

      await rejectDriverAssignment(id, trimmed);

      setRejectId(null);
      setReason("");
      await load(1);

      Alert.alert("تم رفض المهمة", "تم تسجيل سبب الرفض.");
    } catch (err) {
      Alert.alert("تعذر الرفض", errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  function confirmAccept(id: number) {
    Alert.alert("قبول المهمة", "هل أنت متأكد من قبول هذه المهمة؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "قبول",
        onPress: () => void accept(id),
      },
    ]);
  }

  function renderAssignment({ item }: { item: DriverAssignment }) {
    const delivery = item.delivery;
    const pickup = delivery?.pickup_address ?? delivery?.pickupAddress;
    const dropoff = delivery?.dropoff_address ?? delivery?.dropoffAddress;

    const pending = item.status === "pending";
    const busy = busyId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconBox}>
            <Ionicons name="cube-outline" size={23} color="#2563EB" />
          </View>

          <View style={styles.cardHeaderText}>
            <Text style={styles.tracking} selectable>
              {delivery?.tracking_number ?? `Assignment #${item.id}`}
            </Text>
            <Text style={styles.status}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.addressBlock}>
          <Ionicons name="location-outline" size={21} color="#059669" />
          <View style={styles.addressText}>
            <Text style={styles.label}>عنوان الاستلام</Text>
            <Text style={styles.value}>{formatAddress(pickup)}</Text>
          </View>
        </View>

        <View style={styles.addressBlock}>
          <Ionicons name="flag-outline" size={21} color="#EA580C" />
          <View style={styles.addressText}>
            <Text style={styles.label}>عنوان التسليم</Text>
            <Text style={styles.value}>{formatAddress(dropoff)}</Text>
          </View>
        </View>

        {delivery && (
          <Text style={styles.recipient}>
            المستلم: {delivery.recipient_name}
          </Text>
        )}

        {pending && (
          <View style={styles.actions}>
            <Pressable
              style={[styles.acceptButton, busy && styles.disabled]}
              disabled={busy}
              onPress={() => confirmAccept(item.id)}
            >
              <Text style={styles.buttonText}>قبول المهمة</Text>
            </Pressable>

            <Pressable
              style={[styles.rejectButton, busy && styles.disabled]}
              disabled={busy}
              onPress={() => {
                setReason("");
                setRejectId(item.id);
              }}
            >
              <Text style={styles.rejectText}>رفض</Text>
            </Pressable>
          </View>
        )}

        {busy && (
          <ActivityIndicator color="#2563EB" style={{ marginTop: 12 }} />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>

        <Text style={styles.headerTitle}>مهام السائق</Text>

        <Pressable onPress={() => void refresh()}>
          <Ionicons name="refresh-outline" size={23} color="#FFFFFF" />
        </Pressable>
      </View>

      {loading && assignments.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text>جاري تحميل المهام...</Text>
        </View>
      ) : (
        <FlatList
          data={assignments}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderAssignment}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="clipboard-outline" size={52} color="#94A3B8" />
              <Text style={styles.emptyTitle}>
                {error ? "تعذر تحميل المهام" : "لا توجد مهام مسندة حالياً"}
              </Text>
              <Text style={styles.emptyDescription}>
                {error ?? "ستظهر هنا المهام التي يسندها النظام إلى حسابك."}
              </Text>
              {error && (
                <Pressable
                  style={styles.acceptButton}
                  onPress={() => void refresh()}
                >
                  <Text style={styles.buttonText}>إعادة المحاولة</Text>
                </Pressable>
              )}
            </View>
          }
          ListFooterComponent={
            page < lastPage ? (
              <Pressable
                style={styles.moreButton}
                disabled={loadingMore}
                onPress={() => void load(page + 1, true)}
              >
                {loadingMore ? (
                  <ActivityIndicator color="#2563EB" />
                ) : (
                  <Text style={styles.moreText}>تحميل المزيد</Text>
                )}
              </Pressable>
            ) : null
          }
        />
      )}

      {rejectId !== null && (
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>رفض المهمة</Text>

            <Text style={styles.modalDescription}>
              يرجى توضيح سبب رفض المهمة.
            </Text>

            <TextInput
              style={styles.input}
              value={reason}
              onChangeText={setReason}
              placeholder="سبب الرفض..."
              multiline
              maxLength={1000}
              textAlign="right"
            />

            <View style={styles.actions}>
              <Pressable
                style={styles.acceptButton}
                disabled={busyId !== null}
                onPress={() => void reject()}
              >
                <Text style={styles.buttonText}>تأكيد الرفض</Text>
              </Pressable>

              <Pressable
                style={styles.rejectButton}
                disabled={busyId !== null}
                onPress={() => {
                  setRejectId(null);
                  setReason("");
                }}
              >
                <Text style={styles.rejectText}>إلغاء</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },
  header: {
    backgroundColor: "#0B1730",
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  list: {
    padding: 18,
    paddingBottom: 45,
    gap: 14,
    flexGrow: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E7ECF4",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  cardHeaderText: {
    flex: 1,
    gap: 5,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  tracking: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0B1730",
  },
  status: {
    fontSize: 12,
    color: "#2563EB",
  },
  addressBlock: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
  },
  addressText: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "right",
  },
  value: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0B1730",
    marginTop: 5,
    textAlign: "right",
  },
  recipient: {
    color: "#475569",
    fontSize: 13,
    marginTop: 12,
    textAlign: "right",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectButton: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  rejectText: {
    color: "#475569",
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.5,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    padding: 25,
  },
  emptyTitle: {
    color: "#0B1730",
    fontWeight: "800",
    fontSize: 17,
    textAlign: "center",
  },
  emptyDescription: {
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
  },
  moreButton: {
    padding: 16,
    alignItems: "center",
  },
  moreText: {
    color: "#2563EB",
    fontWeight: "700",
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#00000099",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    borderRadius: 20,
    padding: 22,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0B1730",
    textAlign: "right",
  },
  modalDescription: {
    color: "#64748B",
    marginTop: 8,
    textAlign: "right",
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    minHeight: 100,
    padding: 14,
    marginTop: 16,
    textAlignVertical: "top",
  },
});
