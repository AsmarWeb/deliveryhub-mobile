import axios from "axios";
import { Redirect, Slot, useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getApplicationStatus } from "../services/application";
import { getCurrentUser } from "../services/auth";

type Role = "merchant" | "driver";

type Status =
  | "loading"
  | "allowed"
  | "unauthorized"
  | "not-approved"
  | "offline";

export default function ProtectedRoute({ role }: { role: Role }) {
  const [status, setStatus] = useState<Status>("loading");
  const [retry, setRetry] = useState(0);

  const checkAccess = useCallback(async (isActive: () => boolean) => {
    if (isActive()) setStatus("loading");

    try {
      const token = await SecureStore.getItemAsync("deliveryhub_token");

      if (!isActive()) return;

      if (!token) {
        setStatus("unauthorized");
        return;
      }

      const user = await getCurrentUser();

      if (!isActive()) return;

      const application = await getApplicationStatus();

      if (!isActive()) return;

      // This assumes getApplicationStatus returns
      // { application: { type, status, ... } }.
      const account = application;

      if (account.status !== "active") {
        setStatus("not-approved");
        return;
      }

      const roles = user.roles?.map((item) => item.name) ?? [];

      if (account.type !== role || !roles.includes(role)) {
        setStatus("unauthorized");
        return;
      }

      setStatus("allowed");
    } catch (error) {
      if (!isActive()) return;

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        await SecureStore.deleteItemAsync("deliveryhub_token");

        if (isActive()) setStatus("unauthorized");
      } else if (
        axios.isAxiosError(error) &&
        error.response?.status === 403 &&
        error.response?.data?.code === "ACCOUNT_NOT_ACTIVE"
      ) {
        setStatus("not-approved");
      } else {
        setStatus("offline");
      }
    }
  }, []);

  // Recheck when the protected route gains focus.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      void checkAccess(() => active);

      return () => {
        active = false;
      };
    }, [checkAccess, retry]),
  );

  if (status === "allowed") {
    return <Slot />;
  }

  if (status === "unauthorized") {
    return <Redirect href="/login" />;
  }

  if (status === "not-approved") {
    return <Redirect href="/registration-status" />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <Text style={styles.icon}>D</Text>
      </View>

      <Text style={styles.title}>DeliveryHub</Text>

      {status === "loading" ? (
        <>
          <ActivityIndicator
            size="large"
            color="#2563EB"
            style={styles.loader}
          />
          <Text style={styles.description}>جاري التحقق من حسابك...</Text>
        </>
      ) : (
        <>
          <Text style={styles.description}>
            تعذر الاتصال بالخادم. تحقق من الإنترنت ثم حاول مجدداً.
          </Text>

          <Pressable
            style={styles.button}
            onPress={() => setRetry((value) => value + 1)}
          >
            <Text style={styles.buttonText}>إعادة المحاولة</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FB",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  iconBox: {
    width: 76,
    height: 76,
    backgroundColor: "#2563EB",
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  icon: {
    color: "#FFFFFF",
    fontSize: 38,
    fontWeight: "900",
  },
  title: {
    fontSize: 27,
    fontWeight: "800",
    color: "#0B1730",
  },
  loader: {
    marginTop: 30,
  },
  description: {
    marginTop: 20,
    fontSize: 14,
    lineHeight: 24,
    textAlign: "center",
    color: "#64748B",
  },
  button: {
    marginTop: 25,
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 15,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
