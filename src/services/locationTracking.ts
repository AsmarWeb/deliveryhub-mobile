import * as Location from "expo-location";
import { AppState, type AppStateStatus } from "react-native";
import api from "./api";

export type TrackingStatus =
  | "idle"
  | "starting"
  | "tracking"
  | "stopped"
  | "error";
export type TrackingSnapshot = {
  status: TrackingStatus;
  deliveryId: number | null;
  message?: string;
  lastSentAt?: string;
};
type Listener = (snapshot: TrackingSnapshot) => void;

class DriverLocationTracking {
  private subscription: Location.LocationSubscription | null = null;
  private appSubscription: ReturnType<typeof AppState.addEventListener> | null =
    null;
  private listeners = new Set<Listener>();
  private generation = 0;
  private sending = false;
  private snapshot: TrackingSnapshot = { status: "idle", deliveryId: null };

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): TrackingSnapshot {
    return this.snapshot;
  }

  private publish(patch: Partial<TrackingSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((listener) => listener(this.snapshot));
  }

  stop(): void {
    ++this.generation;
    this.subscription?.remove();
    this.subscription = null;
    this.appSubscription?.remove();
    this.appSubscription = null;
    this.publish({ status: "stopped", deliveryId: null, message: undefined });
  }

  private fail(message: string): void {
    this.stop();
    this.publish({ status: "error", message });
  }

  private async send(
    position: Location.LocationObject,
    token: number,
  ): Promise<boolean> {
    if (token !== this.generation || this.sending) return false;
    this.sending = true;
    try {
      const deliveryId = this.snapshot.deliveryId;

      if (deliveryId === null) return false;

      await api.patch("/driver/location", {
        delivery_id: deliveryId,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      if (token !== this.generation) return false;
      this.publish({ lastSentAt: new Date().toISOString() });
      return true;
    } catch (error: unknown) {
      if (token === this.generation) {
        const response = (
          error as { response?: { data?: { message?: string } } }
        )?.response;
        this.fail(
          response?.data?.message ?? "Unable to send location to server.",
        );
      }
      return false;
    } finally {
      this.sending = false;
    }
  }

  async start(deliveryId: number): Promise<void> {
    if (!Number.isInteger(deliveryId) || deliveryId <= 0)
      throw new Error("Invalid delivery ID.");
    if (
      this.snapshot.status === "tracking" &&
      this.snapshot.deliveryId === deliveryId
    )
      return;
    this.stop();
    const token = this.generation;
    this.publish({
      status: "starting",
      deliveryId,
      message: undefined,
      lastSentAt: undefined,
    });
    try {
      if (AppState.currentState !== "active")
        throw new Error("Open the app to start tracking.");
      const permission = await Location.requestForegroundPermissionsAsync();
      if (token !== this.generation) return;
      if (permission.status !== "granted")
        throw new Error("Location permission was denied.");
      if (!(await Location.hasServicesEnabledAsync()))
        throw new Error("Enable location services.");
      if (token !== this.generation) return;
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (token !== this.generation) return;
      if (!(await this.send(position, token))) return;
      if (token !== this.generation || AppState.currentState !== "active") {
        if (token === this.generation) this.stop();
        return;
      }
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 15000,
          distanceInterval: 30,
        },
        (next) => {
          void this.send(next, token);
        },
        (reason) => {
          if (token === this.generation) this.fail(reason);
        },
      );
      if (token !== this.generation || AppState.currentState !== "active") {
        subscription.remove();
        if (token === this.generation) this.stop();
        return;
      }
      this.subscription = subscription;
      this.appSubscription = AppState.addEventListener(
        "change",
        (state: AppStateStatus) => {
          if (state !== "active" && token === this.generation) this.stop();
        },
      );
      this.publish({ status: "tracking" });
    } catch (error: unknown) {
      if (token !== this.generation) return;
      const message =
        error instanceof Error ? error.message : "Unable to start tracking.";
      this.fail(message);
      throw new Error(message);
    }
  }
}

export const driverLocationTracking = new DriverLocationTracking();
