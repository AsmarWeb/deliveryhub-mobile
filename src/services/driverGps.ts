import * as Location from "expo-location";

export type DriverCoordinates = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
};

export async function requestDriverLocationPermission(): Promise<boolean> {
  const result = await Location.requestForegroundPermissionsAsync();
  return result.status === "granted";
}

export async function getDriverCoordinates(): Promise<DriverCoordinates> {
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    timestamp: position.timestamp,
  };
}

export function watchDriverCoordinates(
  onLocation: (coordinates: DriverCoordinates) => void
): Promise<Location.LocationSubscription> {
  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 10000,
      distanceInterval: 20,
    },
    (position) => {
      onLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      });
    }
  );
}
