import { useEffect } from "react";
import { AppState } from "react-native";
import { syncDispatchPresence } from "../../services/autoDispatch";
/** Runs only inside an authenticated/approved driver route; never prompts for permissions. */
export default function DriverPresence() {
  useEffect(() => {
    let busy = false;
    let stopped = false;
    let request: AbortController | null = null;
    const tick = async () => {
      if (stopped || busy || AppState.currentState !== "active") return;
      busy = true; request = new AbortController();
      try { await syncDispatchPresence(request.signal); } catch { /* Next foreground heartbeat retries. */ }
      finally { busy = false; }
    };
    void tick();
    const interval = setInterval(() => void tick(), 60000);
    const listener = AppState.addEventListener("change", state => { if (state !== "active") request?.abort(); else void tick(); });
    return () => { stopped = true; clearInterval(interval); listener.remove(); request?.abort(); };
  }, []);
  return null;
}
