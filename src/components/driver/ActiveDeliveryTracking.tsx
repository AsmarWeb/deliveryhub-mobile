import { useCallback } from "react";
import { Alert, View } from "react-native";

import DriverTrackingControl from "./DriverTrackingControl";

import {
  syncDriverLocation,
} from "../../services/driverLocationSync";

import type {
  DriverCoordinates,
} from "../../services/driverGps";

type Props = {
  deliveryId: number;
  locationEndpoint: string;
  enabled: boolean;
};

export default function ActiveDeliveryTracking({
  deliveryId,
  locationEndpoint,
  enabled,
}: Props) {
  const handleLocation = useCallback(
    async (coordinates: DriverCoordinates) => {
      if (!enabled || !Number.isInteger(deliveryId) || deliveryId <= 0) {
        return;
      }

      await syncDriverLocation(
        coordinates,
        locationEndpoint
      );
    },
    [deliveryId, enabled, locationEndpoint]
  );

  if (!enabled) {
    return null;
  }

  return (
    <View>
      <DriverTrackingControl
        onLocationUpdate={handleLocation}
      />
    </View>
  );
}
