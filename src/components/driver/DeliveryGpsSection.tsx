import ActiveDeliveryTracking from "./ActiveDeliveryTracking";

type Props = {
  deliveryId: number;
  status: string;
};

const TRACKABLE_STATUSES = [
  "accepted",
  "pickup",
  "in_transit",
] as const;

type TrackingStatus =
  | "accepted"
  | "pickup"
  | "in_transit";

function isTrackingStatus(
  status: string
): status is TrackingStatus {
  return TRACKABLE_STATUSES.some(
    (value) => value === status
  );
}

export default function DeliveryGpsSection({
  deliveryId,
  status,
}: Props) {
  if (!isTrackingStatus(status)) {
    return null;
  }

  return (
    <ActiveDeliveryTracking
      deliveryId={deliveryId}
      status={status}
      locationEndpoint="/v1/driver/location"
    />
  );
}
