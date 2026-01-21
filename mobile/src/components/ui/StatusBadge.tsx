import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { OrderStatus } from "@/types";

interface StatusBadgeProps {
  status: OrderStatus;
  size?: "sm" | "md";
}

const statusConfig: Record<
  OrderStatus,
  { label: string; backgroundColor: string; textColor: string }
> = {
  NEW: {
    label: "Nowe",
    backgroundColor: "#DBEAFE",
    textColor: "#1D4ED8",
  },
  ACCEPTED: {
    label: "Zaakceptowane",
    backgroundColor: "#E0E7FF",
    textColor: "#4338CA",
  },
  IN_TRANSIT: {
    label: "W transporcie",
    backgroundColor: "#FEF3C7",
    textColor: "#D97706",
  },
  LOADING: {
    label: "Załadunek",
    backgroundColor: "#FED7AA",
    textColor: "#EA580C",
  },
  UNLOADING: {
    label: "Rozładunek",
    backgroundColor: "#FBCFE8",
    textColor: "#DB2777",
  },
  DELIVERED: {
    label: "Dostarczono",
    backgroundColor: "#D1FAE5",
    textColor: "#059669",
  },
  COMPLETED: {
    label: "Zakończone",
    backgroundColor: "#DCFCE7",
    textColor: "#16A34A",
  },
  CANCELLED: {
    label: "Anulowane",
    backgroundColor: "#FEE2E2",
    textColor: "#DC2626",
  },
};

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <View
      style={[
        styles.badge,
        size === "sm" && styles.badgeSm,
        { backgroundColor: config.backgroundColor },
      ]}
    >
      <Text
        style={[
          styles.text,
          size === "sm" && styles.textSm,
          { color: config.textColor },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: "flex-start",
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  text: {
    fontSize: 14,
    fontWeight: "600",
  },
  textSm: {
    fontSize: 12,
  },
});
