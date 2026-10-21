import PushSession from "../../components/notifications/PushSession";
import ProtectedRoute from "../../components/ProtectedRoute";

export default function MerchantLayout() {
  return <ProtectedRoute role="merchant" accessory={<PushSession role="merchant" />} />;
}
