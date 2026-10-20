import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { AppState } from "react-native";
import { getUnreadNotificationCount, onNotificationsChanged } from "../services/notifications";

export function useUnreadNotifications() {
  const [count, setCount] = useState<number | null>(null);
  useFocusEffect(useCallback(() => {
    let active = true;
    let request: AbortController | null = null;
    const refresh = async () => {
      if (!active || AppState.currentState !== "active" || request) return;
      const controller = new AbortController(); request = controller;
      try {
        const value = await getUnreadNotificationCount(controller.signal);
        if (active && !controller.signal.aborted) setCount(value);
      } catch { /* Preserve the last known count; never turn a network failure into zero. */ }
      finally { if (request === controller) request = null; }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 20000);
    const unsubscribe = onNotificationsChanged(() => { request?.abort(); request = null; void refresh(); });
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") void refresh();
      else { request?.abort(); request = null; }
    });
    return () => { active = false; clearInterval(timer); request?.abort(); unsubscribe(); subscription.remove(); };
  }, []));
  return count;
}
