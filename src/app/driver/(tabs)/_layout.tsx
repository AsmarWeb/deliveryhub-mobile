import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, type ColorValue } from "react-native";

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

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIconStyle: styles.tabIcon,
        sceneStyle: { backgroundColor: "#F5F7FB" },
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
    borderTopColor: "#E2E8F0",
    height: Platform.OS === "ios" ? 88 : 70,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 24 : 9,
    elevation: 8,
    shadowColor: "#0B1730",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  tabItem: { paddingTop: 3 },
  tabIcon: { marginBottom: 2 },
  tabLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
});
