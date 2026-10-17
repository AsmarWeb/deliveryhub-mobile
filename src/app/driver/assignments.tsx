import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
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

import {
  acceptAssignment,
  getDriverAssignments,
  rejectAssignment,
  type DispatchAssignment,
} from "../../services/dispatch";

export default function DriverAssignmentsScreen() {
  const [items, setItems] = useState<DispatchAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await getDriverAssignments();
      setItems(result);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function act(
    assignment: DispatchAssignment,
    action: "accept" | "reject"
  ) {
    if (busyId !== null) return;

    setBusyId(assignment.id);

    try {
      if (action === "accept") {
        await acceptAssignment(assignment.id);
      } else {
        await rejectAssignment(assignment.id);
      }

      await load(true);
    } catch {
      Alert.alert(
        "تعذر تنفيذ العملية",
        "قد تكون حالة المهمة تغيرت. حدّث القائمة وحاول مجدداً."
      );
      await load(true);
    } finally {
      setBusyId(null);
    }
  }

  function confirm(
    assignment: DispatchAssignment,
    action: "accept" | "reject"
  ) {
    Alert.alert(
      action === "accept" ? "قبول المهمة" : "رفض المهمة",
      action === "accept"
        ? "هل تريد قبول مهمة التوصيل؟"
        : "هل أنت متأكد من رفض المهمة؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "تأكيد",
          onPress: () => void act(assignment, action),
        },
      ]
    );
  }

  function renderItem({
    item,
  }: {
    item: DispatchAssignment;
  }) {
    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <Ionicons
            name="cube-outline"
            size={25}
            color="#2563EB"
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.tracking}>
              {item.delivery?.tracking_number ??
                `Delivery #${item.delivery_id}`}
            </Text>
            <Text style={styles.status}>
              الحالة: {item.status}
            </Text>
          </View>
        </View>

        {item.delivery?.recipient_name ? (
          <Text style={styles.detail}>
            المستلم: {item.delivery.recipient_name}
          </Text>
        ) : null}

        {item.status === "pending" && (
          <View style={styles.actions}>
            <Pressable
              disabled={busyId !== null}
              style={[styles.button, styles.reject]}
              onPress={() => confirm(item, "reject")}
            >
              <Text style={styles.buttonText}>رفض</Text>
            </Pressable>

            <Pressable
              disabled={busyId !== null}
              style={[styles.button, styles.accept]}
              onPress={() => confirm(item, "accept")}
            >
              {busyId === item.id ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>قبول المهمة</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons
            name="arrow-back"
            size={24}
            color="#FFFFFF"
          />
        </Pressable>
        <Text style={styles.title}>مهام التوصيل</Text>
        <Pressable onPress={() => void load(true)}>
          <Ionicons
            name="refresh"
            size={24}
            color="#FFFFFF"
          />
        </Pressable>
      </View>

      {loading && items.length === 0 ? (
        <ActivityIndicator
          size="large"
          color="#2563EB"
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(true)}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name={error ? "cloud-offline-outline" : "car-outline"}
                size={46}
                color="#94A3B8"
              />
              <Text style={styles.emptyText}>
                {error
                  ? "تعذر تحميل المهام"
                  : "لا توجد مهام حالياً"}
              </Text>
              {error && (
                <Pressable onPress={() => void load()}>
                  <Text style={styles.retry}>إعادة المحاولة</Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },
  header: {
    backgroundColor: "#0B1730",
    paddingTop: 60,
    paddingBottom: 22,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  list: {
    padding: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  tracking: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0B1730",
  },
  status: {
    color: "#64748B",
    marginTop: 5,
  },
  detail: {
    color: "#334155",
    marginBottom: 12,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  accept: {
    backgroundColor: "#059669",
  },
  reject: {
    backgroundColor: "#DC2626",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    gap: 14,
  },
  emptyText: {
    color: "#64748B",
    textAlign: "center",
  },
  retry: {
    color: "#2563EB",
    fontWeight: "800",
  },
});
