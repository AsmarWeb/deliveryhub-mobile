import PushSession from "../../components/notifications/PushSession";
import DriverPresence from "../../components/dispatch/DriverPresence";
import ProtectedRoute from "../../components/ProtectedRoute";

export default function DriverLayout() {
  return <ProtectedRoute role="driver" accessory={<><DriverPresence /><PushSession role="driver" /></>} />;
}
