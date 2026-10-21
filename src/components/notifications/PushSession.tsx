import { useEffect } from "react";
import { AppState } from "react-native";
import { router } from "expo-router";
import { useLanguage } from "../../contexts/LanguageContext";
import { clearPushOpen, lastPushOpen, listenForPushOpen, listenForTokenChange, pushSupported, pushTarget, syncPush } from "../../services/push";

export default function PushSession({role}: {role: "merchant" | "driver"}) {
  const {language} = useLanguage();
  useEffect(() => {
    if (!pushSupported) return;
    let active = true;
    let busy = false;
    let opening = false;
    let controller: AbortController | null = null;
    const sync = async () => {
      if (!active || busy || AppState.currentState !== "active") return;
      busy = true; controller = new AbortController();
      try { await syncPush(language, false, controller.signal); } catch { /* No permission prompt or auth failure loop. User may retry in settings. */ }
      finally { busy = false; }
    };
    const open = async (data: unknown) => {
      if (!active || opening || !data) return;
      opening = true;
      try {
        const target = await pushTarget(data, role);
        if (active && target) { clearPushOpen(); router.push(target); }
      } catch { /* Notification center remains available if network or ownership check fails. */ }
      finally { opening = false; }
    };
    void sync(); void open(lastPushOpen());
    const response = listenForPushOpen(data => void open(data));
    const token = listenForTokenChange(() => void sync());
    const app = AppState.addEventListener("change", state => {
      if (state === "active") { void sync(); void open(lastPushOpen()); }
      else controller?.abort();
    });
    const timer = setInterval(() => void sync(), 60 * 60 * 1000);
    return () => { active = false; controller?.abort(); clearInterval(timer); response.remove(); token.remove(); app.remove(); };
  }, [role, language]);
  return null;
}
