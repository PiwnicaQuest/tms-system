import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useOrder, useUpdateOrderStatus } from "@/hooks/useOrders";
import { useOrdersStore } from "@/stores/ordersStore";
import { Button, Card, StatusBadge } from "@/components/ui";
import { OrderStatus } from "@/types";
import { formatDate, formatDateTime } from "@/utils/helpers";

const statusFlow: OrderStatus[] = [
  "NEW",
  "ACCEPTED",
  "LOADING",
  "IN_TRANSIT",
  "UNLOADING",
  "DELIVERED",
  "COMPLETED",
];

const statusActions: Record<OrderStatus, { next: OrderStatus | null; label: string }> = {
  NEW: { next: "ACCEPTED", label: "Zaakceptuj zlecenie" },
  ACCEPTED: { next: "LOADING", label: "Rozpocznij załadunek" },
  LOADING: { next: "IN_TRANSIT", label: "Rozpocznij transport" },
  IN_TRANSIT: { next: "UNLOADING", label: "Rozpocznij rozładunek" },
  UNLOADING: { next: "DELIVERED", label: "Potwierdź dostawę" },
  DELIVERED: { next: "COMPLETED", label: "Zakończ zlecenie" },
  COMPLETED: { next: null, label: "" },
  CANCELLED: { next: null, label: "" },
};

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: order, isLoading, error } = useOrder(id);
  const updateStatus = useUpdateOrderStatus();
  const { setActiveOrder } = useOrdersStore();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusUpdate = async () => {
    if (!order) return;

    const action = statusActions[order.status];
    if (!action.next) return;

    // Special handling for DELIVERED status - needs signature
    if (action.next === "DELIVERED") {
      router.push(`/order/${id}/signature`);
      return;
    }

    setIsUpdating(true);
    try {
      await updateStatus.mutateAsync({ orderId: id, status: action.next });
      Alert.alert("Sukces", "Status zlecenia został zaktualizowany");
    } catch {
      Alert.alert("Błąd", "Nie udało się zaktualizować statusu");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSetActive = () => {
    if (order) {
      setActiveOrder(order);
      Alert.alert("Sukces", "Zlecenie ustawione jako aktywne");
    }
  };

  const handleOpenCamera = () => {
    router.push(`/order/${id}/photos`);
  };

  const handleOpenNavigation = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
    Linking.openURL(url);
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: true, title: "Ładowanie..." }} />
        <View style={styles.centerContent}>
          <Text>Ładowanie...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: true, title: "Błąd" }} />
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>Nie znaleziono zlecenia</Text>
          <Button title="Powrót" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const action = statusActions[order.status];

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: `#${order.orderNumber}`,
          headerStyle: { backgroundColor: "#3B82F6" },
          headerTintColor: "#FFFFFF",
        }}
      />

      <ScrollView style={styles.scrollView}>
        {/* Status Card */}
        <Card style={styles.card}>
          <View style={styles.statusHeader}>
            <StatusBadge status={order.status} />
            <TouchableOpacity onPress={handleSetActive}>
              <Ionicons name="star-outline" size={24} color="#F59E0B" />
            </TouchableOpacity>
          </View>

          {action.next && (
            <Button
              title={action.label}
              onPress={handleStatusUpdate}
              loading={isUpdating}
              style={styles.statusButton}
            />
          )}
        </Card>

        {/* Route Card */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Trasa</Text>

          {/* Loading Point */}
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, { backgroundColor: "#3B82F6" }]} />
            <View style={styles.routeContent}>
              <Text style={styles.routeLabel}>Załadunek</Text>
              <Text style={styles.routeAddress}>{order.loadingAddress}</Text>
              <Text style={styles.routeDate}>
                {formatDateTime(order.loadingDate)}
              </Text>
              {order.loadingContact && (
                <View style={styles.contactRow}>
                  <Text style={styles.contactText}>{order.loadingContact}</Text>
                  {order.loadingPhone && (
                    <TouchableOpacity onPress={() => handleCall(order.loadingPhone!)}>
                      <Ionicons name="call" size={20} color="#3B82F6" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={() => handleOpenNavigation(order.loadingAddress)}
              style={styles.navIconButton}
            >
              <Ionicons name="navigate" size={24} color="#3B82F6" />
            </TouchableOpacity>
          </View>

          <View style={styles.routeLine} />

          {/* Unloading Point */}
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, { backgroundColor: "#10B981" }]} />
            <View style={styles.routeContent}>
              <Text style={styles.routeLabel}>Rozładunek</Text>
              <Text style={styles.routeAddress}>{order.unloadingAddress}</Text>
              <Text style={styles.routeDate}>
                {formatDateTime(order.unloadingDate)}
              </Text>
              {order.unloadingContact && (
                <View style={styles.contactRow}>
                  <Text style={styles.contactText}>{order.unloadingContact}</Text>
                  {order.unloadingPhone && (
                    <TouchableOpacity onPress={() => handleCall(order.unloadingPhone!)}>
                      <Ionicons name="call" size={20} color="#10B981" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={() => handleOpenNavigation(order.unloadingAddress)}
              style={styles.navIconButton}
            >
              <Ionicons name="navigate" size={24} color="#10B981" />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Cargo Card */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Ładunek</Text>

          <View style={styles.cargoRow}>
            <Ionicons name="cube-outline" size={20} color="#6B7280" />
            <Text style={styles.cargoText}>{order.cargoDescription}</Text>
          </View>

          {order.cargoWeight && (
            <View style={styles.cargoRow}>
              <Ionicons name="scale-outline" size={20} color="#6B7280" />
              <Text style={styles.cargoText}>{order.cargoWeight} kg</Text>
            </View>
          )}

          {order.cargoVolume && (
            <View style={styles.cargoRow}>
              <Ionicons name="resize-outline" size={20} color="#6B7280" />
              <Text style={styles.cargoText}>{order.cargoVolume} m³</Text>
            </View>
          )}
        </Card>

        {/* Documents Card */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Dokumentacja</Text>

          <Button
            title="Zrób zdjęcie"
            onPress={handleOpenCamera}
            variant="outline"
            style={styles.docButton}
          />

          {order.photos && order.photos.length > 0 && (
            <Text style={styles.photosCount}>
              Liczba zdjęć: {order.photos.length}
            </Text>
          )}
        </Card>

        {/* Notes Card */}
        {order.notes && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Uwagi</Text>
            <Text style={styles.notes}>{order.notes}</Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: "#374151",
    marginVertical: 16,
  },
  card: {
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  statusButton: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  routePoint: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  routeContent: {
    flex: 1,
    marginLeft: 12,
  },
  routeLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  routeAddress: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
    marginBottom: 4,
  },
  routeDate: {
    fontSize: 14,
    color: "#6B7280",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  contactText: {
    fontSize: 14,
    color: "#374151",
    marginRight: 12,
  },
  navIconButton: {
    padding: 8,
  },
  routeLine: {
    width: 2,
    height: 32,
    backgroundColor: "#E5E7EB",
    marginLeft: 5,
    marginVertical: 8,
  },
  cargoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  cargoText: {
    fontSize: 16,
    color: "#374151",
    marginLeft: 12,
  },
  docButton: {
    marginBottom: 12,
  },
  photosCount: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  notes: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
});
