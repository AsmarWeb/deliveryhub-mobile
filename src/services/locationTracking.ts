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
  private uploadController: AbortController | null = null;
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
    this.uploadController?.abort();
    this.uploadController = null;
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

    const { latitude, longitude, accuracy } = position.coords;
    const timestamp = position.timestamp;
    const age = Date.now() - timestamp;

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 ||
      Math.abs(longitude) > 180 ||
      !Number.isFinite(timestamp) ||
      age > 30000 ||
      age < -5000 ||
      (accuracy !== null &&
        (!Number.isFinite(accuracy) ||
          accuracy < 0 ||
          accuracy > 150))
    ) {
      return false;
    }

    const controller = new AbortController();
    this.uploadController = controller;
    this.sending = true;

    try {
      const deliveryId = this.snapshot.deliveryId;

      if (deliveryId === null) return false;

      await api.patch(
        "/driver/location",
        {
          delivery_id: deliveryId,
          latitude,
          longitude,
        },
        { signal: controller.signal }
      );
      if (token !== this.generation) return false;
      this.publish({
        lastSentAt: new Date().toISOString(),
        message: undefined,
      });
      return true;
    } catch (error: unknown) {
      if (token === this.generation && !controller.signal.aborted) {
        const response = (
          error as {
            response?: {
              status?: number;
              data?: { message?: string };
            };
          }
        )?.response;

        const status = response?.status;

        // Temporary network failures should not stop GPS tracking.
        const retryable =
          status === undefined ||
          status === 408 ||
          status === 429 ||
          status >= 500;

        if (retryable) {
          this.publish({
            message:
              "Location upload failed. Waiting for the next GPS update.",
          });
        } else {
          this.fail(
            response?.data?.message ??
              "Location tracking was rejected by the server.",
          );
        }
      }
      return false;
    } finally {
      if (this.uploadController === controller) {
        this.uploadController = null;
      }
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
