import DriverPresence from "../../components/dispatch/DriverPresence";
import ProtectedRoute from "../../components/ProtectedRoute";

export default function DriverLayout() {
  return <ProtectedRoute role="driver" accessory={<DriverPresence />} />;
}
