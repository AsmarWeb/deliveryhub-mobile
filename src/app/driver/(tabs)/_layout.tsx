import { useUnreadNotifications } from "../../../hooks/useUnreadNotifications";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StyleSheet, type ColorValue } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "../../../contexts/LanguageContext";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

type TabIconProps = {
  focused: boolean;
  color: ColorValue;
  activeIcon: IconName;
  inactiveIcon: IconName;
};

function TabIcon({ focused, color, activeIcon, inactiveIcon }: TabIconProps) {
  return (
    <Ionicons
      name={focused ? activeIcon : inactiveIcon}
      size={focused ? 25 : 23}
      color={color}
    />
  );
}

export default function DriverTabsLayout() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const unread = useUnreadNotifications();

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: "#17634F",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarStyle: [styles.tabBar, { height: 76 + insets.bottom, paddingBottom: Math.max(8, insets.bottom) }],
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIconStyle: styles.tabIcon,
        sceneStyle: { backgroundColor: "#F6F3EB" },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t("الرئيسية", "Home"),
          tabBarAccessibilityLabel: t("الصفحة الرئيسية", "Home screen"),
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              focused={focused}
              color={color}
              activeIcon="home"
              inactiveIcon="home-outline"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="orders"
        options={{
          title: t("الطلبات", "Orders"),
          tabBarAccessibilityLabel: t("طلبات السائق", "Driver orders"),
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              focused={focused}
              color={color}
              activeIcon="cube"
              inactiveIcon="cube-outline"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="deliveries"
        options={{
          title: t("التوصيل", "Deliveries"),
          tabBarAccessibilityLabel: t("مهام التوصيل", "Delivery tasks"),
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              focused={focused}
              color={color}
              activeIcon="car-sport"
              inactiveIcon="car-sport-outline"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: t("الإشعارات", "Alerts"),
          tabBarBadge: unread ? (unread > 99 ? "99+" : unread) : undefined,
          tabBarAccessibilityLabel: t(
            "الإشعارات والتنبيهات",
            "Notifications and alerts",
          ),
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              focused={focused}
              color={color}
              activeIcon="notifications"
              inactiveIcon="notifications-outline"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: t("حسابي", "Profile"),
          tabBarAccessibilityLabel: t("الملف الشخصي", "My profile"),
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              focused={focused}
              color={color}
              activeIcon="person-circle"
              inactiveIcon="person-circle-outline"
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#DDDED2",
    height: 76,
    paddingTop: 8,
    paddingBottom: 8,
    elevation: 8,
    shadowColor: "#123D35",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  tabItem: { paddingTop: 0, justifyContent: "center" },
  tabIcon: { marginBottom: 0 },
  tabLabel: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
    marginTop: 0,
  },
});
